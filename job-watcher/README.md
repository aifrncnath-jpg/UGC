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

## What it watches

By default it searches these terms and alerts on any **new + AI** result:

`ai video editor`, `ai video`, `ai video generation`, `ai video creation`,
`ai video specialist`, `video editor`, `video specialist`, `video producer`,
`video content creator`, `short form video`, `faceless video`, `ugc`,
`ugc video editor`, `vsl`, `video sales letter`, `motion graphics`.

Because of the AI-only filter, a generic "Video Editor" post is skipped, but
"**AI** Video Editor" or "Video Editor — **AI**-Native" gets pushed to you.

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
It continuously cycles through all the search terms and pings you within about a
**minute or two** of a new AI post going live — while staying gentle on the site
(it waits ~5 seconds between each search, as the site requests).

---

## 🧰 Options (all optional)

| Add this | What it does |
|----------|--------------|
| `--discord "URL"`     | Send alerts to your Discord webhook |
| `--test-alert`        | Send one sample alert to confirm setup, then exit |
| `--allow-non-ai`      | Turn OFF the AI-only filter (get all video jobs, not just AI) |
| `--keywords "a" "b"`  | Use your own search terms instead of the built-in list |
| `--must-include word` | Require an extra word in the title too (on top of AI) |
| `--desktop`           | Also show a pop-up on your computer |
| `--interval 30`       | Seconds between full sweeps (default 10, minimum 10) |
| `--once`              | Check once and exit (for scheduling) |
| `--state seen.json`   | Where it remembers seen jobs (keep the same path each run) |

**Examples:**
```
# default AI-only watch with Discord
python onlinejobs_watcher.py --discord "URL"

# your own custom terms
python onlinejobs_watcher.py --discord "URL" --keywords "ai video editor" "vsl" "ai avatar"

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
Each sweep it searches every keyword, merges the results, keeps only posts whose
title mentions **AI**, and compares their IDs against the ones it has already
shown you (saved in `seen_jobs.json`). Anything new gets pushed to Discord.
