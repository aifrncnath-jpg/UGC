#!/usr/bin/env python3
"""
sfxfolder_downloader.py
=======================

A polite, dependency-free downloader for the FREE assets published on
https://sfxfolder.com (sound effects, background music, fonts, LUTs).

How it works (intended, respectful use only):
  1. Reads the site's public sitemap.xml to enumerate the item pages the
     site itself publishes for indexing.
  2. For each item page, extracts the direct file URL from the page's
     Schema.org JSON-LD block (the AudioObject/VideoObject "contentUrl").
     These files live in a public storage bucket and are the exact files
     the site streams to its own player.
  3. Downloads each file into a per-category folder, skipping anything
     already downloaded (resumable) and writing a manifest.csv.

It deliberately does NOT touch the site's backend API / database, and it
rate-limits itself so it behaves like a considerate visitor.

NOTE ON LICENSING / ETIQUETTE:
  SFXFolder states its assets are free for personal and commercial use with
  no attribution required. Please still read their Terms of Service, keep the
  request rate gentle (the defaults here are conservative), and only download
  what you'll actually use. The site is ad-funded; be a good citizen.

Usage:
  python3 sfxfolder_downloader.py                      # sound-effects only
  python3 sfxfolder_downloader.py --categories sound-effects bgm
  python3 sfxfolder_downloader.py --out ./sfx --delay 1.5 --limit 10
  python3 sfxfolder_downloader.py --dry-run            # list, don't download

No third-party packages required (uses only the Python standard library).
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
from html import unescape

BASE = "https://sfxfolder.com"
SITEMAP_URL = f"{BASE}/sitemap.xml"
USER_AGENT = (
    "Mozilla/5.0 (compatible; sfxfolder-downloader/1.0; "
    "+personal archive of free assets)"
)

# Categories that map to downloadable resource pages on the site.
KNOWN_CATEGORIES = ["sound-effects", "bgm", "font", "lut"]

# Matches a direct public file URL inside the JSON-LD contentUrl field.
CONTENT_URL_RE = re.compile(
    r'"contentUrl"\s*:\s*"(?P<url>https://[^"]+?/storage/v1/object/public/resources/[^"]+?)"'
)
# Fallback: any public resources file URL on the page (used only if JSON-LD
# is missing; we then prefer the one whose filename best matches the slug).
ANY_FILE_RE = re.compile(
    r'https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/resources/'
    r'[A-Za-z0-9/_%.\-]+?\.(?:mp3|wav|ogg|m4a|flac|aac|zip|ttf|otf|woff2?|cube|png|jpg|jpeg)',
    re.IGNORECASE,
)
# JSON-LD "name" of the primary object, for nicer filenames.
NAME_RE = re.compile(r'"name"\s*:\s*"(?P<name>[^"]{1,120})"')
# JSON-LD "keywords" holds the item's tags, e.g. "sfx, meme, minecraft".
KEYWORDS_RE = re.compile(r'"keywords"\s*:\s*"(?P<kw>[^"]*)"')
# <meta name="keywords"> carries the slug words + tags as a broader signal.
META_KEYWORDS_RE = re.compile(r'name="keywords"\s+content="(?P<kw>[^"]*)"')


# --------------------------------------------------------------------------- #
# HTTP helpers
# --------------------------------------------------------------------------- #
def http_get(url: str, timeout: int = 40, retries: int = 3, backoff: float = 2.0) -> bytes:
    """GET a URL with retries and exponential backoff. Returns raw bytes."""
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            last_err = e
            if attempt < retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"GET failed after {retries} attempts: {url} ({last_err})")


def http_get_text(url: str, **kw) -> str:
    return http_get(url, **kw).decode("utf-8", "ignore")


# --------------------------------------------------------------------------- #
# Enumeration
# --------------------------------------------------------------------------- #
def category_of(url: str) -> str:
    return url.split("sfxfolder.com/", 1)[-1].split("/", 1)[0]


def is_item_page(url: str) -> bool:
    # Item pages look like /<category>/<slug>; category landing pages don't
    # have the trailing slug segment.
    parts = url.rstrip("/").split("sfxfolder.com/", 1)[-1].split("/")
    return len(parts) >= 2 and parts[0] in KNOWN_CATEGORIES and parts[1] != ""


def get_item_pages(categories: list[str]) -> list[str]:
    """Parse sitemap.xml and return item page URLs for the wanted categories."""
    xml = http_get_text(SITEMAP_URL)
    locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)
    items = []
    seen = set()
    for u in locs:
        u = unescape(u).strip()
        if not u.startswith(f"{BASE}/"):
            continue
        if not is_item_page(u):
            continue
        if category_of(u) not in categories:
            continue
        if u not in seen:
            seen.add(u)
            items.append(u)
    return items


# --------------------------------------------------------------------------- #
# File-URL extraction from an item page
# --------------------------------------------------------------------------- #
def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "untitled"


def pick_own_file(html: str, slug: str) -> str | None:
    """
    Return the direct file URL that belongs to THIS item page.

    Preference order:
      1. The JSON-LD contentUrl (canonical, what the site's player uses).
      2. If several JSON-LD contentUrls exist, the one whose filename best
         resembles the page slug.
      3. Fallback: among all public file URLs on the page, the best slug match.
    """
    jsonld_urls = CONTENT_URL_RE.findall(html)
    if jsonld_urls:
        if len(jsonld_urls) == 1:
            return jsonld_urls[0]
        return best_slug_match(jsonld_urls, slug) or jsonld_urls[0]

    all_urls = list(dict.fromkeys(ANY_FILE_RE.findall(html)))
    if not all_urls:
        return None
    return best_slug_match(all_urls, slug) or all_urls[0]


def best_slug_match(urls: list[str], slug: str) -> str | None:
    """Choose the URL whose filename shares the most tokens with the slug."""
    slug_tokens = set(t for t in slug.split("-") if len(t) > 2)
    best, best_score = None, -1
    for u in urls:
        fname = u.rsplit("/", 1)[-1].lower()
        score = sum(1 for t in slug_tokens if t in fname)
        if score > best_score:
            best, best_score = u, score
    return best if best_score > 0 else None


def extract_title(html: str, file_url: str | None = None) -> str | None:
    """Prefer the name of the AudioObject/primary asset over the site name.

    The JSON-LD contains several "name" fields (Organization, CollectionPage,
    the asset itself). We pick the "name" that sits closest to the file's
    contentUrl, which is the asset's own name.
    """
    if file_url:
        idx = html.find(file_url)
        if idx != -1:
            window = html[max(0, idx - 600): idx + 200]
            names = NAME_RE.findall(window)
            for n in names:
                cleaned = unescape(n).strip()
                if cleaned and cleaned.lower() != "sfxfolder":
                    return cleaned
    # Fallback: og:title / <title>, stripped of the site suffix.
    m = re.search(r'<title>([^<]+)</title>', html)
    if m:
        return unescape(m.group(1)).split("|")[0].split("—")[0].strip() or None
    return None


# Generic slug words that add no thematic value when matching.
_STOPWORDS = {"free", "sound", "effects", "effect", "download", "sfx",
              "for", "video", "editing", "and", "the"}


def extract_tags(html: str) -> list[str]:
    """Collect the item's thematic tags from the JSON-LD keywords field."""
    tags = set()
    m = KEYWORDS_RE.search(html)
    if m:
        for t in m.group("kw").split(","):
            t = t.strip().lower()
            if t:
                tags.add(t)
    return sorted(tags)


def match_terms(item: dict, terms: list[str], strict_tag: bool) -> bool:
    """Return True if the item matches any of the search terms.

    strict_tag=True  -> match only against the item's tags.
    strict_tag=False -> also match against slug words and title (fuzzy).
    """
    if not terms:
        return True
    tags = set(item.get("tags") or [])
    haystack = set(tags)
    if not strict_tag:
        slug_words = set(w for w in (item.get("slug") or "").split("-")
                         if w and w not in _STOPWORDS)
        title_words = set(re.findall(r"[a-z0-9]+", (item.get("title") or "").lower()))
        haystack |= slug_words | (title_words - _STOPWORDS)
    for term in terms:
        term = term.strip().lower()
        if strict_tag:
            if term in tags:
                return True
        else:
            # substring match against any token in the haystack, or the joined slug
            if any(term in h for h in haystack) or term in (item.get("slug") or ""):
                return True
    return False


# --------------------------------------------------------------------------- #
# Downloading
# --------------------------------------------------------------------------- #
def safe_filename(slug: str, file_url: str) -> str:
    """Build a clean, unique filename: <slug><original-extension>."""
    ext = os.path.splitext(file_url.split("?", 1)[0])[1].lower() or ".bin"
    base = slugify(slug)
    return f"{base}{ext}"


def download_file(file_url: str, dest_path: str, delay: float) -> tuple[str, str]:
    """Download one file to dest_path. Returns (status, detail)."""
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        return ("skip", "already exists")
    tmp = dest_path + ".part"
    try:
        data = http_get(file_url)
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, dest_path)
        if delay:
            time.sleep(delay)
        return ("ok", f"{len(data)} bytes")
    except Exception as e:  # noqa: BLE001
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass
        return ("error", str(e))


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def resolve_item(page_url: str, delay: float) -> dict:
    """Fetch an item page and resolve its download info."""
    slug = page_url.rstrip("/").rsplit("/", 1)[-1]
    category = category_of(page_url)
    try:
        html = http_get_text(page_url)
    except Exception as e:  # noqa: BLE001
        return {"page": page_url, "slug": slug, "category": category,
                "file_url": None, "title": None, "error": str(e)}
    if delay:
        time.sleep(delay)
    file_url = pick_own_file(html, slug)
    title = extract_title(html, file_url)
    tags = extract_tags(html)
    return {"page": page_url, "slug": slug, "category": category,
            "file_url": file_url, "title": title, "tags": tags, "error": None}


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Download free assets from sfxfolder.com into per-category folders."
    )
    ap.add_argument("--categories", nargs="+", default=["sound-effects"],
                    choices=KNOWN_CATEGORIES,
                    help="Which categories to download (default: sound-effects).")
    ap.add_argument("--out", default="./downloads",
                    help="Output directory (default: ./downloads).")
    ap.add_argument("--delay", type=float, default=1.0,
                    help="Seconds to pause between requests (default: 1.0). Be polite.")
    ap.add_argument("--workers", type=int, default=2,
                    help="Concurrent workers (default: 2). Keep this low.")
    ap.add_argument("--limit", type=int, default=0,
                    help="Only process the first N items (0 = all). Great for testing.")
    ap.add_argument("--dry-run", action="store_true",
                    help="Resolve and list files but do not download.")
    ap.add_argument("--tag", nargs="+", default=None, metavar="TAG",
                    help="Only download items whose tags include any of these "
                         "(strict tag match, e.g. --tag meme minecraft).")
    ap.add_argument("--match", nargs="+", default=None, metavar="TERM",
                    help="Only download items whose tag/slug/title contains any "
                         "of these terms (fuzzy, e.g. --match transition whoosh).")
    ap.add_argument("--subfolder", action="store_true",
                    help="When filtering, save into downloads/<category>/<filter>/ "
                         "so each themed group gets its own folder.")
    ap.add_argument("--list-tags", action="store_true",
                    help="Scan items and print the available tags with counts, "
                         "then exit (no downloading).")
    args = ap.parse_args()

    print(f"[*] Fetching sitemap and enumerating categories: {', '.join(args.categories)}")
    pages = get_item_pages(args.categories)
    if args.limit:
        pages = pages[: args.limit]
    print(f"[*] Found {len(pages)} item page(s) to process.")
    if not pages:
        print("[!] Nothing to do.")
        return 0

    os.makedirs(args.out, exist_ok=True)
    manifest_path = os.path.join(args.out, "manifest.csv")

    # --- Phase 1: resolve file URLs from item pages -----------------------
    print("[*] Phase 1/2: resolving direct file URLs from item pages...")
    resolved = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(resolve_item, p, args.delay): p for p in pages}
        for i, fut in enumerate(as_completed(futs), 1):
            info = fut.result()
            resolved.append(info)
            state = "OK " if info["file_url"] else "MISS"
            print(f"    [{i}/{len(pages)}] {state} {info['slug']}")

    ok = [r for r in resolved if r["file_url"]]
    miss = [r for r in resolved if not r["file_url"]]
    print(f"[*] Resolved {len(ok)} file(s); {len(miss)} unresolved.")

    # --- Optional: just list the available tags and exit ------------------
    if args.list_tags:
        from collections import Counter
        tc = Counter()
        for r in resolved:
            for t in (r.get("tags") or []):
                tc[t] += 1
        print(f"\n[*] Tags available across {len(resolved)} items "
              f"(use with --tag; use --match for slug/title words too):\n")
        for t, c in tc.most_common():
            print(f"    {c:4}  {t}")
        return 0

    # --- Optional: filter to a themed group -------------------------------
    terms = args.tag or args.match
    strict = args.tag is not None
    label = None
    if terms:
        label = slugify("-".join(terms))
        before = len(ok)
        ok = [r for r in ok if match_terms(r, terms, strict)]
        mode = "tag" if strict else "match"
        print(f"[*] Filter ({mode}={terms}): {len(ok)} of {before} items match.")
        if not ok:
            print("[!] No items matched. Try --list-tags to see options, "
                  "or use --match for fuzzy slug/title matching.")
            return 0

    # --- Phase 2: download ------------------------------------------------
    # When filtering with --subfolder, group the results under the filter name.
    sub = label if (label and args.subfolder) else None

    def rel_dir(category: str) -> str:
        return os.path.join(category, sub) if sub else category

    rows = []
    if args.dry_run:
        print("[*] Dry run - not downloading. Files that WOULD be fetched:")
        for r in ok:
            fname = safe_filename(r["slug"], r["file_url"])
            rel = os.path.join(rel_dir(r["category"]), fname)
            print(f"    {rel}  <-  {r['file_url']}")
            rows.append({**r, "saved_path": rel, "status": "dry-run"})
    else:
        print("[*] Phase 2/2: downloading files...")
        counts = {"ok": 0, "skip": 0, "error": 0}

        def worker(r: dict) -> dict:
            cat_dir = os.path.join(args.out, rel_dir(r["category"]))
            os.makedirs(cat_dir, exist_ok=True)
            fname = safe_filename(r["slug"], r["file_url"])
            dest = os.path.join(cat_dir, fname)
            status, detail = download_file(r["file_url"], dest, args.delay)
            return {**r, "saved_path": os.path.relpath(dest, args.out),
                    "status": status, "detail": detail}

        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futs = {ex.submit(worker, r): r for r in ok}
            for i, fut in enumerate(as_completed(futs), 1):
                res = fut.result()
                rows.append(res)
                counts[res["status"]] = counts.get(res["status"], 0) + 1
                print(f"    [{i}/{len(ok)}] {res['status'].upper():5} "
                      f"{res['saved_path']}  ({res.get('detail','')})")
        print(f"[*] Done. downloaded={counts.get('ok',0)} "
              f"skipped={counts.get('skip',0)} errors={counts.get('error',0)}")

    # include misses in manifest for transparency
    for r in miss:
        rows.append({**r, "saved_path": "", "status": "unresolved"})

    # --- Write manifest ---------------------------------------------------
    with open(manifest_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["category", "slug", "title", "tags", "page", "file_url", "saved_path", "status"])
        for r in rows:
            w.writerow([r.get("category", ""), r.get("slug", ""), r.get("title", "") or "",
                        ", ".join(r.get("tags") or []),
                        r.get("page", ""), r.get("file_url", "") or "",
                        r.get("saved_path", ""), r.get("status", "")])
    print(f"[*] Manifest written to {manifest_path}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n[!] Interrupted. Re-run to resume (already-downloaded files are skipped).")
        sys.exit(130)
