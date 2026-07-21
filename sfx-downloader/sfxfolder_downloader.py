#!/usr/bin/env python3
"""
sfxfolder_downloader.py
=======================

A polite, dependency-free downloader for the FREE assets on
https://sfxfolder.com (sound effects, background music, etc.).

It fetches the site's own public catalog listing, organizes everything into
folders by theme (e.g. WHOOSH, RISER, IMPACTS, SFX_MEMES), and downloads the
audio files - skipping anything you already have (resumable) and writing a
manifest.csv.

HOW IT FINDS THE SOUNDS
-----------------------
It calls the site's public listing endpoint (`/api/resources`), the same one
the website itself uses when you scroll the page, and reads each item's public
`download_url`. No login and no API keys are involved.

PLEASE BE CONSIDERATE
---------------------
* SFXFolder's assets are free for personal and commercial use with no
  attribution required - but please read their Terms of Service:
  https://sfxfolder.com/terms
* NOTE: the site's robots.txt marks `/api/` as Disallow. This tool uses that
  endpoint (gently: only a handful of listing requests) to enumerate items.
  If you'd rather not, don't run it. The listing is a tiny load; the actual
  audio files come from a public storage bucket that isn't disallowed.
* Keep the pacing gentle (defaults are conservative) and only grab what you
  will actually use. The site is ad-funded; be a good citizen.

USAGE
-----
  python3 sfxfolder_downloader.py --list-folders        # see the themes + counts
  python3 sfxfolder_downloader.py                        # download ALL sound effects
  python3 sfxfolder_downloader.py --folder WHOOSH        # only folders matching "WHOOSH"
  python3 sfxfolder_downloader.py --exclude SFX_MEMES    # everything except memes
  python3 sfxfolder_downloader.py --match minecraft      # fuzzy match on tag/name
  python3 sfxfolder_downloader.py --dry-run --limit 20   # preview, don't download

No third-party packages required (Python standard library only).
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://sfxfolder.com"
API = f"{BASE}/api/resources"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
PAGE_SIZE = 200  # items per listing request


# --------------------------------------------------------------------------- #
# HTTP helpers
# --------------------------------------------------------------------------- #
def _request(url: str, timeout: int = 45, retries: int = 3, backoff: float = 2.0) -> bytes:
    last = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": USER_AGENT, "Referer": f"{BASE}/sound-effects"}
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            last = e
            if attempt < retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"request failed after {retries} tries: {url} ({last})")


def get_json(url: str):
    return json.loads(_request(url).decode("utf-8", "ignore"))


# --------------------------------------------------------------------------- #
# Catalog enumeration (via the site's public listing endpoint)
# --------------------------------------------------------------------------- #
def fetch_catalog(category: str, delay: float) -> list[dict]:
    """Page through the public listing endpoint and return normalized items."""
    items, offset = [], 0
    while True:
        url = f"{API}?categorySlug={category}&limit={PAGE_SIZE}&offset={offset}&sort=newest"
        batch = get_json(url)
        if not batch:
            break
        for raw in batch:
            items.append(normalize(raw))
        offset += PAGE_SIZE
        if len(batch) < PAGE_SIZE:
            break
        if delay:
            time.sleep(delay)
    return items


def normalize(raw: dict) -> dict:
    folder = (raw.get("folder") or raw.get("folders") or {}).get("name") or "UNSORTED"
    return {
        "name": raw.get("name") or raw.get("slug") or "untitled",
        "slug": raw.get("slug") or "",
        "folder": folder,
        "tags": [t.lower() for t in (raw.get("tags") or [])],
        "download_url": raw.get("download_url") or raw.get("downloadUrl"),
        "is_premium": bool(raw.get("is_premium") or raw.get("isPremium")),
        "format": (raw.get("file_format") or raw.get("fileFormat") or "").lower(),
        "size": raw.get("file_size") or raw.get("fileSize") or 0,
    }


# --------------------------------------------------------------------------- #
# Filtering
# --------------------------------------------------------------------------- #
_STOP = {"free", "sound", "effects", "effect", "download", "sfx", "the", "and", "for"}


def keep(item: dict, args) -> bool:
    if args.free_only and item["is_premium"]:
        return False
    fname = item["folder"].lower()
    if args.folder and not any(f.lower() in fname for f in args.folder):
        return False
    if args.exclude and any(x.lower() in fname for x in args.exclude):
        return False
    if args.tag:
        if not any(t in item["tags"] for t in (x.lower() for x in args.tag)):
            return False
    if args.match:
        hay = set(item["tags"]) | {item["slug"].lower(), item["folder"].lower()}
        words = set(re.findall(r"[a-z0-9]+", item["name"].lower())) - _STOP
        hay |= words
        terms = [x.lower() for x in args.match]
        if not any(any(t in h for h in hay) or t in item["slug"].lower() for t in terms):
            return False
    return True


# --------------------------------------------------------------------------- #
# Downloading
# --------------------------------------------------------------------------- #
def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.strip().lower()).strip("-") or "untitled"


def safe_name(item: dict) -> str:
    ext = os.path.splitext((item["download_url"] or "").split("?")[0])[1].lower()
    if not ext:
        ext = "." + (item["format"] or "bin")
    return slugify(item["slug"] or item["name"]) + ext


def sanitize_folder(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_&+\- ]+", "", name).strip().replace(" ", "_") or "UNSORTED"


def download_one(item: dict, out_root: str, group: bool, delay: float) -> dict:
    sub = sanitize_folder(item["folder"]) if group else ""
    folder = os.path.join(out_root, "sound-effects", sub) if sub else os.path.join(out_root, "sound-effects")
    os.makedirs(folder, exist_ok=True)
    dest = os.path.join(folder, safe_name(item))
    rel = os.path.relpath(dest, out_root)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return {**item, "saved": rel, "status": "skip"}
    tmp = dest + ".part"
    try:
        data = _request(item["download_url"])
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, dest)
        if delay:
            time.sleep(delay)
        return {**item, "saved": rel, "status": "ok", "bytes": len(data)}
    except Exception as e:  # noqa: BLE001
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass
        return {**item, "saved": rel, "status": "error", "detail": str(e)}


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def human(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def main() -> int:
    ap = argparse.ArgumentParser(description="Download free assets from sfxfolder.com, organized by theme folder.")
    ap.add_argument("--category", default="sound-effects", help="Catalog category (default: sound-effects).")
    ap.add_argument("--out", default="./downloads", help="Output directory (default: ./downloads).")
    ap.add_argument("--delay", type=float, default=0.6, help="Seconds to pause between requests (default: 0.6).")
    ap.add_argument("--workers", type=int, default=3, help="Concurrent download workers (default: 3).")
    ap.add_argument("--limit", type=int, default=0, help="Only process the first N items (0 = all).")
    ap.add_argument("--folder", nargs="+", help="Only folders whose name contains any of these (e.g. --folder WHOOSH RISER).")
    ap.add_argument("--exclude", nargs="+", help="Skip folders whose name contains any of these (e.g. --exclude SFX_MEMES).")
    ap.add_argument("--tag", nargs="+", help="Strict tag filter (e.g. --tag meme).")
    ap.add_argument("--match", nargs="+", help="Fuzzy filter on tag/name/slug/folder (e.g. --match minecraft).")
    ap.add_argument("--free-only", dest="free_only", action="store_true", default=True, help="Only free items (default on).")
    ap.add_argument("--no-group", dest="group", action="store_false", default=True, help="Do NOT split into theme subfolders.")
    ap.add_argument("--list-folders", action="store_true", help="List theme folders with counts/sizes, then exit.")
    ap.add_argument("--dry-run", action="store_true", help="List what would download, without downloading.")
    args = ap.parse_args()

    print(f"[*] Fetching catalog listing for '{args.category}' ...")
    catalog = fetch_catalog(args.category, args.delay)
    print(f"[*] Catalog has {len(catalog)} items.")

    if args.list_folders:
        from collections import defaultdict
        agg = defaultdict(lambda: [0, 0])
        for it in catalog:
            agg[it["folder"]][0] += 1
            agg[it["folder"]][1] += it["size"]
        print(f"\n[*] Theme folders (use --folder NAME to pick one):\n")
        for f, (n, s) in sorted(agg.items(), key=lambda x: -x[1][1]):
            print(f"    {n:4}  {human(s):>9}  {f}")
        total = sum(it["size"] for it in catalog)
        print(f"\n    TOTAL: {len(catalog)} items, {human(total)}")
        return 0

    # filter
    items = [it for it in catalog if it["download_url"] and keep(it, args)]
    if args.limit:
        items = items[: args.limit]
    sel_size = sum(it["size"] for it in items)
    print(f"[*] {len(items)} item(s) selected  (~{human(sel_size)}).")
    if not items:
        print("[!] Nothing matched your filters. Try --list-folders to see options.")
        return 0

    os.makedirs(args.out, exist_ok=True)
    rows = []

    if args.dry_run:
        print("[*] Dry run - showing what WOULD download:")
        for it in items:
            sub = sanitize_folder(it["folder"]) if args.group else ""
            print(f"    sound-effects/{sub + '/' if sub else ''}{safe_name(it)}")
            rows.append({**it, "saved": "", "status": "dry-run"})
    else:
        print(f"[*] Downloading with {args.workers} workers (delay {args.delay}s)...")
        counts = {"ok": 0, "skip": 0, "error": 0}
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futs = [ex.submit(download_one, it, args.out, args.group, args.delay) for it in items]
            for i, fut in enumerate(as_completed(futs), 1):
                r = fut.result()
                rows.append(r)
                counts[r["status"]] = counts.get(r["status"], 0) + 1
                extra = human(r["bytes"]) if r.get("bytes") else r.get("detail", "")
                print(f"    [{i}/{len(items)}] {r['status'].upper():5} {r['saved']}  {extra}")
        print(f"[*] Done. downloaded={counts.get('ok',0)} skipped={counts.get('skip',0)} errors={counts.get('error',0)}")

    manifest = os.path.join(args.out, "manifest.csv")
    with open(manifest, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["folder", "name", "slug", "tags", "format", "size", "download_url", "saved_path", "status"])
        for r in rows:
            w.writerow([r["folder"], r["name"], r["slug"], ", ".join(r["tags"]), r["format"],
                        r["size"], r["download_url"], r.get("saved", ""), r["status"]])
    print(f"[*] Manifest written to {manifest}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n[!] Interrupted. Re-run to resume (already-downloaded files are skipped).")
        sys.exit(130)
