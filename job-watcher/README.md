# 🔔 OnlineJobs.ph AI-Video Job Watcher — Beginner's Guide

Watches [OnlineJobs.ph](https://www.onlinejobs.ph) for **new AI video-related job
posts** (AI video editor, AI video creation, UGC, VSL, and more) and pings your
**Discord** the moment a matching post appears — so you can be first to apply. 🚀

**No coding knowledge needed** — follow the steps in order. 🙂

> ✅ **AI-only:** it only alerts you about posts whose title mentions **AI**.
> Non-AI posts are ignored, so you won't get spammed with generic video-editor
> jobs.
>
> ℹ️ It reads the site's **public** job pages (no login), remembers what it has
> already seen (so only *new* posts alert you), and checks politely (within the
> site's requested crawl delay). Review OnlineJobs.ph's Terms of Service too.

---

## What it watches (and how fast)

By default it runs in **FAST mode**: it watches the site's live **newest-jobs
feed** and alerts you the moment a post appears whose title mentions **AI** *and*
something **video-related** (video, editor, UGC, VSL, reels, motion, capcut, veo,
runway, etc.). Because it's a single check, it runs **every ~15 seconds** — so
you find out almost immediately and can apply first. 🏃

- A generic "Video Editor" post is skipped; "**AI** Video Editor",
  "AI Video Generation", or "AI Video Creation" gets pushed to you.
- It also recognizes **AI tool names** as an AI signal — so a post like
  "Video Editor (Veo 3)" or "Editor — Runway / Kling / HeyGen" is caught even
  when it never writes the word "AI". (Tools known: Sora, Runway, Veo, Kling,
  Pika, Luma, HeyGen, Synthesia, Descript, Midjourney, ElevenLabs, and more.)
- **FAST mode** filters by the job **title**. If you also want to catch posts
  where AI is mentioned only in the *description*, run **DEEP mode**
  (`--mode deep`) — it searches ~16 keywords, so it's thorough but slower
  (~1.5 min per cycle).

---

## Part 1 — Install Python (one time)

### 🪟 Windows
1. Go to **https://www.python.org/downloads/**, click **"Download Python"**.
2. Open the file, tick ⚠️ **"Add python.exe to PATH"**, then **"Install Now"**.

### 🍎 Mac
1. Go to **https://www.python.org/downloads/**, click **"Download Python"**, open it, and click through the installer.

---

## Part 2 — Get the tool (one time)
1. Go to **https://github.com/aifrncnath-jpg/UGC** → green **`<> Code`** → **"Download ZIP"** → unzip.
2. Open the **`job-watcher`** folder. You'll see `onlinejobs_watcher.py`.

---

## Part 3 — Set up Discord alerts (recommended)

**1. Create a webhook (one time):**
- Open Discord → a server you own (make a free private one: **+ → Create My Own**).
- **Server Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL**.

**2. Open the terminal** and go into the folder:
- 🪟 Windows: Start → `cmd`. 🍎 Mac: `Cmd+Space` → `Terminal`.
- Type `cd ` (with a space), drag the `job-watcher` folder in, press **Enter**.

**3. Test that Discord works:**
```
python onlinejobs_watcher.py --discord "PASTE_WEBHOOK_URL_HERE" --test-alert
```
You should get a **TEST** message in Discord within a second. ✅

**4. Start watching (this is the main command):**
```
python onlinejobs_watcher.py --discord "PASTE_WEBHOOK_URL_HERE"
```
That's it! It uses the built-in AI/video keyword list automatically. The first
run quietly records current posts; after that, every **new AI post** is pushed
to your Discord. 🎯

> 💡 On some Macs, use **`python3`** instead of `python`.

---

## How fast are the alerts?
**FAST mode (default):** one quick check of the newest feed every **~15 seconds**,
so new AI video posts reach your Discord almost immediately. It stays gentle on
the site (one lightweight request per check, well within the site's crawl delay).

**DEEP mode** (`--mode deep`) is more thorough — it searches these ~21 keywords
on the site (which also matches the job *description*), then keeps the AI ones:

`ai video editor`, `ai video`, `ai video generation`, `ai video creation`,
`ai video specialist`, `ai editor`, `ai content creator`, `generative video`,
`video editor`, `video specialist`, `video producer`, `video content creator`,
`creative video editor`, `short form video`, `faceless video`, `video ad`,
`motion graphics`, `ugc`, `ugc video editor`, `vsl`, `video sales letter`.

It's thorough but slower (~2 min per cycle). Edit the list at the top of
`onlinejobs_watcher.py` (`DEFAULT_KEYWORDS`) anytime.

---

## 🧰 Options (all optional)

| Add this | What it does |
|----------|--------------|
| `--discord "URL"`     | Send alerts to your Discord webhook |
| `--test-alert`        | Send one sample alert to confirm setup, then exit |
| `--mode deep`         | Thorough keyword search (also catches AI in the description; slower) |
| `--allow-non-ai`      | Turn OFF the AI-only filter (get all video jobs, not just AI) |
| `--no-video-filter`   | (fast mode) don't require a video word in the title |
| `--must-include word` | Require an extra word in the title too (on top of AI) |
| `--keywords "a" "b"`  | (deep mode) use your own search terms |
| `--desktop`           | Also show a pop-up on your computer |
| `--interval 15`       | Seconds between checks (default 15, minimum 10) |
| `--once`              | Check once and exit (for scheduling) |
| `--state seen.json`   | Where it remembers seen jobs (keep the same path each run) |

**Examples:**
```
# default: fast AI-video watch with Discord (checks every ~15s)
python onlinejobs_watcher.py --discord "URL"

# even quicker checks (every 10s)
python onlinejobs_watcher.py --discord "URL" --interval 10

# thorough deep mode (also finds AI mentioned only in the description)
python onlinejobs_watcher.py --discord "URL" --mode deep

# get ALL video jobs (turn off the AI-only filter)
python onlinejobs_watcher.py --discord "URL" --allow-non-ai
```

---

## ⏰ Run it automatically in the background
Use the `--once` version on a schedule (keep the same `--state` file!):
- **🪟 Windows (Task Scheduler):** Basic Task → repeat every few minutes → Start a
  program → `python`, arguments:
  `"C:\path\to\job-watcher\onlinejobs_watcher.py" --discord "URL" --once --state "C:\path\to\job-watcher\seen_jobs.json"`
- **🍎 Mac/Linux (cron):** `crontab -e` then:
  `*/2 * * * * cd /path/to/job-watcher && python3 onlinejobs_watcher.py --discord "URL" --once`

---

## ❓ Common problems
- **"python is not recognized"** → Windows: reinstall and tick "Add python.exe to PATH". Mac: use `python3`.
- **No alerts** → First run only records a baseline; alerts start on the next new AI post. Test with `--test-alert`.
- **Same jobs repeating** → Use the **same `--state` file path** each time.
- **Want non-AI jobs too** → add `--allow-non-ai`.
- **Stop it** → click the terminal, press **`Ctrl + C`**.

---

## How it works (short version)
In FAST mode, every ~15s it grabs the newest-jobs feed, keeps only posts whose
title mentions **AI** and something video-related, and compares their IDs against
the ones it has already shown you (saved in `seen_jobs.json`). Anything new gets
pushed to Discord. (DEEP mode does the same but searches many keywords instead.)
