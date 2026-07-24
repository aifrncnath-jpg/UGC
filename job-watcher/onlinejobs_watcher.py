#!/usr/bin/env python3
"""
onlinejobs_watcher.py
=====================

Watches OnlineJobs.ph for NEW job posts matching your keyword (e.g.
"ai video editor" or "video editor") and alerts you when new ones appear.

It reads the site's PUBLIC job-search page (no login needed), remembers which
posts it has already seen (in a small state file), and only notifies you about
genuinely new posts. Newest jobs are listed first, so checking regularly catches
everything.

ALERTS (all optional, pick any):
  * Console  - always prints new jobs.
  * Desktop  - a system pop-up notification (best effort, no extra installs).
  * Discord  - paste a Discord webhook URL to get pinged (great on phone).
  * Telegram - use a bot token + chat id.

BE POLITE:
  The site's robots.txt requests a 5-second crawl delay and doesn't block the
  job-search page. This tool makes ONE request per check and defaults to
  checking every 10 minutes - a tiny, respectful load. Please don't lower the
  interval aggressively, and review the site's Terms of Service.

USAGE:
  # check once and exit (good for Windows Task Scheduler / cron)
  python3 onlinejobs_watcher.py --keyword "ai video editor" --once

  # keep running, checking every 10 minutes
  python3 onlinejobs_watcher.py --keyword "video editor"

  # only match posts that ALSO contain "ai" in the title
  python3 onlinejobs_watcher.py --keyword "video editor" --must-include ai

  # send alerts to Discord
  python3 onlinejobs_watcher.py --keyword "video editor" --discord "https://discord.com/api/webhooks/XXX/YYY"

No third-party packages required (Python standard library only).
"""

from __future__ import annotations

import argparse
import html as htmllib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

BASE = "https://www.onlinejobs.ph"
SEARCH = BASE + "/jobseekers/jobsearch"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"

# ----------------------------------------------------------------------------
# The list of things to watch for. The tool searches the site for EACH of these
# and alerts you about any new post that matches ANY of them.
# Feel free to add or remove lines (keep the quotes and the comma).
# ----------------------------------------------------------------------------
DEFAULT_KEYWORDS = [
    "ai video editor",
    "ai video",
    "ai video generation",
    "ai video creation",
    "ai video specialist",
    "video editor",
    "video specialist",
    "video producer",
    "video content creator",
    "short form video",
    "faceless video",
    "ugc",
    "ugc video editor",
    "vsl",
    "video sales letter",
    "motion graphics",
]

# A post is only pushed to you if its TITLE contains one of these AI signals.
# (Whole-word match, so "ai" matches "AI" / "AI-powered" but not "Dubai"/"email".)
# This includes AI-video TOOL names, because naming a tool signals "AI" even when
# the post never writes the word "AI" (e.g. "Video Editor (Veo 3)").
DEFAULT_AI_TERMS = [
    "ai", "a.i", "artificial intelligence", "genai", "generative ai", "gen ai", "generative",
    # AI video / content tool names:
    "sora", "runway", "veo", "kling", "pika", "luma", "heygen", "hey gen",
    "synthesia", "descript", "opusclip", "opus clip", "hedra", "argil", "kaiber",
    "viggle", "krea", "midjourney", "eleven labs", "elevenlabs", "higgsfield",
]

# In FAST mode, a post must ALSO look video-related. Generous list of formats,
# roles and tasks so we don't miss AI-video jobs. (Tool names live in the AI list
# above, so a title still needs a real video word here to qualify.)
VIDEO_TERMS = [
    "video", "editor", "editing", "ugc", "vsl", "reel", "reels", "shorts",
    "short-form", "short form", "long-form", "motion graphics", "motion",
    "animation", "animator", "videographer", "capcut", "premiere", "after effects",
    "davinci", "resolve", "faceless", "b-roll", "broll", "youtube", "tiktok",
    "content creator", "creative editor", "video ad", "ad creative", "creatives",
    "footage", "avatar", "explainer", "promo", "commercial", "vfx", "clips",
    "lipsync", "lip sync", "voiceover", "voice over", "talking head", "spokesperson",
]


# --------------------------------------------------------------------------- #
# HTTP
# --------------------------------------------------------------------------- #
def http_get(url: str, timeout: int = 30, retries: int = 3) -> str:
    last = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8", "ignore")
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            last = e
            if attempt < retries:
                time.sleep(3 * attempt)
    raise RuntimeError(f"request failed: {url} ({last})")


def http_post_json(url: str, payload: dict) -> None:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json", "User-Agent": USER_AGENT}
    )
    try:
        urllib.request.urlopen(req, timeout=20).read()
    except Exception as e:  # noqa: BLE001
        print(f"    [!] notification POST failed: {e}")


# --------------------------------------------------------------------------- #
# Parsing job cards
# --------------------------------------------------------------------------- #
JOB_ANCHOR = re.compile(r'href="(/jobseekers/job/[a-z0-9\-]+?-(\d+))"', re.I)
H4 = re.compile(r"<h4[^>]*>(.*?)</h4>", re.I | re.S)
DATA_TEMP = re.compile(r'data-temp="([^"]+)"')
BADGE = re.compile(r'<span[^>]*class="badge[^"]*"[^>]*>(.*?)</span>', re.I | re.S)


def strip_tags(s: str) -> str:
    return htmllib.unescape(re.sub(r"<[^>]+>", " ", s)).strip()


def parse_jobs(html: str) -> list[dict]:
    """Extract job cards from a search-results page, in page order (newest first)."""
    jobs, seen_ids = [], set()
    positions = [(m.start(), m.group(1), m.group(2)) for m in JOB_ANCHOR.finditer(html)]
    for idx, (start, path, jid) in enumerate(positions):
        if jid in seen_ids:
            continue
        seen_ids.add(jid)
        end = positions[idx + 1][0] if idx + 1 < len(positions) else min(start + 1500, len(html))
        block = html[start:end]
        title_m = H4.search(block)
        title_raw = title_m.group(1) if title_m else path.rsplit("/", 1)[-1]
        badge_m = BADGE.search(title_raw)
        jtype = strip_tags(badge_m.group(1)) if badge_m else ""
        title = strip_tags(re.sub(BADGE, "", title_raw)) if badge_m else strip_tags(title_raw)
        date_m = DATA_TEMP.search(block)
        posted = date_m.group(1) if date_m else ""
        jobs.append({
            "id": jid,
            "title": title or f"Job {jid}",
            "type": jtype,
            "posted": posted,
            "url": BASE + path,
        })
    return jobs


# --------------------------------------------------------------------------- #
# State
# --------------------------------------------------------------------------- #
def load_state(path: str) -> dict:
    if os.path.exists(path):
        try:
            return json.load(open(path, encoding="utf-8"))
        except Exception:  # noqa: BLE001
            pass
    return {"seen_ids": []}


def save_state(path: str, state: dict) -> None:
    json.dump(state, open(path, "w", encoding="utf-8"), indent=2)


# --------------------------------------------------------------------------- #
# Notifications
# --------------------------------------------------------------------------- #
def notify_desktop(title: str, message: str) -> None:
    """Best-effort cross-platform desktop notification (no extra installs)."""
    try:
        if sys.platform.startswith("darwin"):
            script = "display notification " + json.dumps(message) + " with title " + json.dumps(title)
            os.system("osascript -e " + json.dumps(script) + " >/dev/null 2>&1")
        elif sys.platform.startswith("win"):
            # Simple, dependency-free: a message box via PowerShell.
            text = json.dumps(title + ": " + message)
            cmd = ("powershell -NoProfile -Command \""
                   "Add-Type -AssemblyName System.Windows.Forms; "
                   "[System.Windows.Forms.MessageBox]::Show(" + text + ") | Out-Null\" >nul 2>&1")
            os.system(cmd)
        else:
            os.system("notify-send " + json.dumps(title) + " " + json.dumps(message) + " >/dev/null 2>&1")
    except Exception:  # noqa: BLE001
        pass


def send_alerts(new_jobs: list[dict], args) -> None:
    lines = [f"• {j['title']}  [{j['type']}]  — {j['posted']}\n  {j['url']}" for j in new_jobs]
    body = "\n".join(lines)
    header = f"{len(new_jobs)} new AI video job post(s) on OnlineJobs.ph"

    if args.desktop:
        notify_desktop("New AI video job", f"{len(new_jobs)} new post(s) on OnlineJobs.ph")
    if args.discord:
        # Discord messages cap ~2000 chars; chunk if needed.
        text = f"**{header}**\n{body}"
        for chunk in [text[i:i + 1900] for i in range(0, len(text), 1900)]:
            http_post_json(args.discord, {"content": chunk})
    if args.telegram_token and args.telegram_chat:
        url = f"https://api.telegram.org/bot{args.telegram_token}/sendMessage"
        http_post_json(url, {"chat_id": args.telegram_chat, "text": f"{header}\n\n{body}",
                             "disable_web_page_preview": True})


# --------------------------------------------------------------------------- #
# One check
# --------------------------------------------------------------------------- #
def title_has_any(title: str, terms: list[str]) -> bool:
    """Whole-word match so 'ai' matches 'AI'/'AI-powered' but not 'Dubai'/'email'."""
    t = title.lower()
    return any(re.search(r"\b" + re.escape(term.lower()) + r"\b", t) for term in terms)


def gather_jobs(args) -> list[dict]:
    """FAST mode = one request to the newest-jobs feed. DEEP mode = many searches."""
    if args.mode == "deep":
        merged: dict[str, dict] = {}
        for i, kw in enumerate(args.keywords):
            url = f"{SEARCH}?{urllib.parse.urlencode({'jobkeyword': kw})}"
            try:
                jobs = parse_jobs(http_get(url))
            except Exception as e:  # noqa: BLE001
                print(f"    [!] search '{kw}' failed: {e}")
                jobs = []
            for j in jobs:
                merged.setdefault(j["id"], j)
            if i < len(args.keywords) - 1 and args.req_delay:
                time.sleep(args.req_delay)  # respect the site's crawl-delay
        return list(merged.values())
    # FAST mode: the newest-jobs feed (all categories, newest first) in ONE request.
    return parse_jobs(http_get(SEARCH))


def check_once(args, state: dict) -> list[dict]:
    jobs = gather_jobs(args)

    # AI requirement (unless --allow-non-ai): the title must mention AI.
    if args.require:
        jobs = [j for j in jobs if title_has_any(j["title"], args.require)]
    # In FAST mode we also require a video signal (DEEP mode already searched
    # video keywords, so its results are already video-focused).
    if args.mode == "fast" and not args.no_video_filter:
        jobs = [j for j in jobs if title_has_any(j["title"], VIDEO_TERMS)]
    # Optional user-specified extra requirement.
    if args.must_include:
        jobs = [j for j in jobs if title_has_any(j["title"], args.must_include)]

    seen = set(state.get("seen_ids", []))
    new_jobs = [j for j in jobs if j["id"] not in seen]

    # Remember everything currently visible so we don't re-alert.
    state["seen_ids"] = sorted(set(seen) | {j["id"] for j in jobs}, key=lambda x: -int(x))[:5000]
    return new_jobs


def main() -> int:
    ap = argparse.ArgumentParser(description="Watch OnlineJobs.ph for new AI video-related job posts.")
    ap.add_argument("--mode", choices=["fast", "deep"], default="fast",
                    help="fast = watch the newest-jobs feed in 1 request, ~15s checks (recommended). "
                         "deep = search each keyword (also finds AI mentioned only in the description, but slower).")
    ap.add_argument("--keywords", nargs="+", default=None,
                    help="[deep mode] Search terms (default: the built-in AI/video list).")
    ap.add_argument("--keyword", default=None, help="[deep mode] Shortcut for a single search term.")
    ap.add_argument("--must-include", nargs="+", default=None,
                    help="Extra word(s) the title must also contain (in addition to the AI requirement).")
    ap.add_argument("--allow-non-ai", action="store_true",
                    help="Turn OFF the AI-only filter (by default, only posts whose title mentions AI are pushed).")
    ap.add_argument("--no-video-filter", action="store_true",
                    help="[fast mode] Don't require a video-related word in the title.")
    ap.add_argument("--interval", type=int, default=15, help="Seconds between checks (default: 15). Minimum 10.")
    ap.add_argument("--req-delay", type=int, default=5, help="[deep mode] Seconds between searches (default/min: 5).")
    ap.add_argument("--once", action="store_true", help="Check once and exit (use with Task Scheduler / cron).")
    ap.add_argument("--state", default="./seen_jobs.json", help="State file path (default: ./seen_jobs.json).")
    ap.add_argument("--notify-existing", action="store_true", help="On the very first run, alert on all current matches (default: just record them).")
    ap.add_argument("--desktop", action="store_true", help="Show a desktop pop-up on new posts.")
    ap.add_argument("--discord", help="Discord webhook URL for alerts.")
    ap.add_argument("--telegram-token", help="Telegram bot token.")
    ap.add_argument("--telegram-chat", help="Telegram chat id.")
    ap.add_argument("--test-alert", action="store_true",
                    help="Send a sample alert to your configured channels (Discord/desktop/Telegram) and exit. "
                         "Use this to confirm notifications work.")
    args = ap.parse_args()

    # Resolve the keyword list.
    if args.keywords:
        pass
    elif args.keyword:
        args.keywords = [args.keyword]
    else:
        args.keywords = list(DEFAULT_KEYWORDS)

    # The AI requirement: a post's TITLE must mention AI, unless explicitly disabled.
    args.require = [] if args.allow_non_ai else list(DEFAULT_AI_TERMS)

    if args.req_delay < 5:
        args.req_delay = 5  # respect the site's 5s crawl-delay

    # Show log lines immediately (not buffered), even when output is redirected to a file.
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except Exception:  # noqa: BLE001
        pass

    if args.test_alert:
        sample = [{
            "id": "0", "title": "TEST — AI Video Editor (this is a test alert)",
            "type": "Full Time", "posted": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "url": "https://www.onlinejobs.ph/jobseekers/jobsearch",
        }]
        if not (args.discord or args.desktop or (args.telegram_token and args.telegram_chat)):
            print("[!] No alert channel set. Add --discord \"URL\" (and/or --desktop) to test.")
            return 1
        print("[*] Sending a test alert to your configured channel(s)...")
        send_alerts(sample, args)
        print("[*] Sent. Check Discord / your desktop / Telegram. If you didn't get it, "
              "double-check the webhook URL.")
        return 0

    if args.interval < 10:
        # The site's robots.txt asks for a 5s crawl-delay; 10s keeps us well within that.
        print("[!] Minimum interval is 10s (to stay within the site's crawl-delay). Using 10.")
        args.interval = 10

    state = load_state(args.state)
    first_run = not state.get("seen_ids")

    def one_pass():
        try:
            new_jobs = check_once(args, state)
        except Exception as e:  # noqa: BLE001
            print(f"[{datetime.now():%H:%M:%S}] check failed: {e}")
            return
        save_state(args.state, state)
        stamp = f"[{datetime.now():%Y-%m-%d %H:%M:%S}]"
        if first_run and not args.notify_existing:
            print(f"{stamp} Baseline recorded: tracking {len(state['seen_ids'])} current matching post(s). "
                  f"You'll be alerted about NEW ones from now on.")
            return
        if new_jobs:
            print(f"{stamp} {len(new_jobs)} NEW AI video post(s):")
            for j in new_jobs:
                print(f"    • {j['title']}  [{j['type']}]  — {j['posted']}")
                print(f"      {j['url']}")
            send_alerts(new_jobs, args)
        else:
            print(f"{stamp} No new posts.")

    ai_note = "AI-only" if args.require else "AI filter OFF"
    if args.mode == "fast":
        vf = "" if args.no_video_filter else " + video"
        print(f"[*] Watching the newest-jobs feed [{ai_note}{vf}] — FAST mode.")
    else:
        print(f"[*] Watching {len(args.keywords)} search term(s) [{ai_note}] — DEEP mode.")
    one_pass()

    if args.once:
        return 0

    if args.mode == "fast":
        cycle = args.interval
    else:
        cycle = (len(args.keywords) - 1) * args.req_delay + len(args.keywords) + args.interval
    m, s = divmod(cycle, 60)
    pretty = (f"~{m} min {s}s" if m else f"~{s}s")
    print(f"[*] Running continuously — new posts detected within about {pretty}. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(args.interval)
            first_run = False  # after the first loop it's no longer the baseline run
            one_pass()
    except KeyboardInterrupt:
        print("\n[*] Stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
