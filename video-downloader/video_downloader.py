#!/usr/bin/env python3
"""
video_downloader.py
===================

Downloads the portfolio videos linked from
https://xandrix-llaguno.netlify.app/ into folders organized by category
(3D Animations, UGC, VSL, Commercial, News Cast).

It reads the site's public `script.js`, extracts the direct .mp4 links listed
there, and downloads them - skipping anything you already have (resumable) and
writing a manifest.csv.

PLEASE NOTE
-----------
These videos are someone's portfolio / client work. They are publicly
accessible and manually downloadable, but they are NOT free-to-reuse stock
assets. Use responsibly: keep them for personal reference or with the owner's
permission, and do not republish them as your own.

USAGE
-----
  python3 video_downloader.py --list              # list videos + categories
  python3 video_downloader.py                      # download everything
  python3 video_downloader.py --category UGC VSL   # only these categories
  python3 video_downloader.py --limit 2            # first 2 (quick test)
  python3 video_downloader.py --dry-run            # show what would download

No third-party packages required (Python standard library only).
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

SITE = "https://xandrix-llaguno.netlify.app"
SCRIPT_URL = f"{SITE}/script.js"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"

VIDEO_RE = re.compile(r'https://[^"\']+?/videos/[^"\']+?\.mp4', re.IGNORECASE)


def _request(url: str, timeout: int = 120, retries: int = 3, backoff: float = 3.0) -> bytes:
    safe = urllib.parse.quote(url, safe=":/?&=%")
    last = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                safe, headers={"User-Agent": USER_AGENT, "Referer": f"{SITE}/"}
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            last = e
            if attempt < retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"request failed after {retries} tries: {url} ({last})")


def get_video_urls() -> list[str]:
    js = _request(SCRIPT_URL, timeout=45).decode("utf-8", "ignore")
    urls = sorted(set(VIDEO_RE.findall(js)))
    return urls


def category_of(url: str) -> str:
    # .../videos/<Category>/<file>.mp4  (category may contain spaces)
    m = re.search(r"/videos/(.+?)/[^/]+\.mp4$", url)
    return m.group(1) if m else "Uncategorized"


def sanitize(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_&+\- ]+", "", name).strip().replace(" ", "_") or "Uncategorized"


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def download_one(url: str, out_root: str, delay: float) -> dict:
    cat = category_of(url)
    folder = os.path.join(out_root, sanitize(cat))
    os.makedirs(folder, exist_ok=True)
    fname = os.path.basename(urllib.parse.urlparse(url).path)
    dest = os.path.join(folder, fname)
    rel = os.path.relpath(dest, out_root)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return {"url": url, "category": cat, "saved": rel, "status": "skip"}
    tmp = dest + ".part"
    try:
        data = _request(url)
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, dest)
        if delay:
            time.sleep(delay)
        return {"url": url, "category": cat, "saved": rel, "status": "ok", "bytes": len(data)}
    except Exception as e:  # noqa: BLE001
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass
        return {"url": url, "category": cat, "saved": rel, "status": "error", "detail": str(e)}


def main() -> int:
    ap = argparse.ArgumentParser(description="Download portfolio videos organized by category.")
    ap.add_argument("--out", default="./video-downloads", help="Output directory (default: ./video-downloads).")
    ap.add_argument("--category", nargs="+", help="Only these categories (e.g. --category UGC VSL). Case-insensitive.")
    ap.add_argument("--workers", type=int, default=3, help="Concurrent downloads (default: 3).")
    ap.add_argument("--delay", type=float, default=0.5, help="Pause between requests (default: 0.5s).")
    ap.add_argument("--limit", type=int, default=0, help="Only the first N videos (0 = all).")
    ap.add_argument("--list", action="store_true", help="List videos + categories, then exit.")
    ap.add_argument("--dry-run", action="store_true", help="Show what would download, without downloading.")
    args = ap.parse_args()

    print("[*] Reading video list from the site...")
    urls = get_video_urls()
    print(f"[*] Found {len(urls)} videos.")

    if args.category:
        wanted = [c.lower() for c in args.category]
        urls = [u for u in urls if any(w in category_of(u).lower() for w in wanted)]
        print(f"[*] {len(urls)} match category filter {args.category}.")

    if args.limit:
        urls = urls[: args.limit]

    if args.list:
        from collections import Counter
        c = Counter(category_of(u) for u in urls)
        print("\n[*] Categories:")
        for cat, n in sorted(c.items()):
            print(f"    {n:3}  {cat}")
        print(f"\n    TOTAL: {len(urls)} videos")
        return 0

    if not urls:
        print("[!] Nothing to download.")
        return 0

    os.makedirs(args.out, exist_ok=True)
    rows = []

    if args.dry_run:
        print("[*] Dry run - would download:")
        for u in urls:
            print(f"    {sanitize(category_of(u))}/{os.path.basename(urllib.parse.urlparse(u).path)}")
            rows.append({"url": u, "category": category_of(u), "saved": "", "status": "dry-run"})
    else:
        print(f"[*] Downloading {len(urls)} videos with {args.workers} workers "
              f"(these are large files - this can take a while)...")
        counts = {"ok": 0, "skip": 0, "error": 0}
        total_bytes = 0
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futs = [ex.submit(download_one, u, args.out, args.delay) for u in urls]
            for i, fut in enumerate(as_completed(futs), 1):
                r = fut.result()
                rows.append(r)
                counts[r["status"]] = counts.get(r["status"], 0) + 1
                total_bytes += r.get("bytes", 0)
                extra = human(r["bytes"]) if r.get("bytes") else r.get("detail", "")
                print(f"    [{i}/{len(urls)}] {r['status'].upper():5} {r['saved']}  {extra}")
        print(f"[*] Done. downloaded={counts.get('ok',0)} skipped={counts.get('skip',0)} "
              f"errors={counts.get('error',0)}  (~{human(total_bytes)} this run)")

    manifest = os.path.join(args.out, "manifest.csv")
    with open(manifest, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["category", "url", "saved_path", "status"])
        for r in rows:
            w.writerow([r["category"], r["url"], r.get("saved", ""), r["status"]])
    print(f"[*] Manifest written to {manifest}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n[!] Interrupted. Re-run to resume (finished files are skipped).")
        sys.exit(130)
