# 🔔 OnlineJobs.ph New-Job Watcher — Beginner's Guide

Watches [OnlineJobs.ph](https://www.onlinejobs.ph) for **new job posts** matching
your keyword (like **"ai video editor"**) and alerts you when fresh ones show up
— so you can be one of the first to apply. 🚀

**No coding knowledge needed** — follow the steps in order. 🙂

> ℹ️ It reads the site's **public** job-search page (no login). It remembers what
> it has already seen, so it only alerts you about *new* posts. Please keep the
> check interval reasonable (default is every 10 minutes) — that's gentle on the
> site, and it's plenty fast for catching new jobs. Review OnlineJobs.ph's Terms
> of Service too.

---

## Part 1 — Install Python (one time)

### 🪟 Windows
1. Go to **https://www.python.org/downloads/**, click **"Download Python"**.
2. Open the file, tick ⚠️ **"Add python.exe to PATH"**, then **"Install Now"**.

### 🍎 Mac
1. Go to **https://www.python.org/downloads/**, click **"Download Python"**.
2. Open the file and click through the installer.

---

## Part 2 — Get the tool (one time)
1. Go to **https://github.com/aifrncnath-jpg/UGC** → green **`<> Code`** →
   **"Download ZIP"** → unzip it.
2. Open the **`job-watcher`** folder. You'll see `onlinejobs_watcher.py`.

---

## Part 3 — Run it

### Step 1 — Open the terminal
- 🪟 **Windows:** Start menu → type **`cmd`** → Enter.
- 🍎 **Mac:** **`Cmd + Space`** → type **`Terminal`** → Enter.

### Step 2 — Go into the folder
Type `cd ` (with a space), then **drag the `job-watcher` folder** into the
terminal and press **Enter**.

### Step 3 — Start watching

**Keep it running and check every 10 minutes** (leave this window open):
```
python onlinejobs_watcher.py --keyword "video editor" --must-include ai
```
- `--keyword` is what you search for on the site.
- `--must-include ai` means only show posts with the word **ai** in the title.
  (Leave it off to get *all* video editor posts.)

The **first run** just quietly records the jobs currently posted (your
"baseline"). After that, it tells you whenever a **new** post appears. 🎯

> 💡 On some Macs, use **`python3`** instead of `python`.

**Check just once and stop** (handy for scheduling — see below):
```
python onlinejobs_watcher.py --keyword "video editor" --must-include ai --once
```

---

## 📱 Get real-time alerts on your phone (Discord)

This is the best way to be notified the moment a new job appears — Discord pings
your phone automatically.

**Step 1 — Create a webhook (one time):**
1. Open Discord (you need a server you own — make a free private one if needed:
   **+ → Create My Own**).
2. Go to **Server Settings → Integrations → Webhooks → New Webhook**.
3. (Optional) pick which channel it posts to, then click **Copy Webhook URL**.

**Step 2 — Test that it works:**
```
python onlinejobs_watcher.py --discord "PASTE_WEBHOOK_URL_HERE" --test-alert
```
You should get a **TEST** message in Discord within a second. ✅
(If nothing arrives, re-copy the webhook URL — that's almost always the issue.)

**Step 3 — Start watching with Discord alerts:**
```
python onlinejobs_watcher.py --keyword "video editor" --must-include ai --discord "PASTE_WEBHOOK_URL_HERE"
```
Now every new post gets sent to Discord (and your phone) automatically.

### Want faster notifications?
By default it checks every 10 minutes. For quicker alerts, lower the interval
(minimum 60 seconds). Every 5 minutes is a good, polite balance:
```
python onlinejobs_watcher.py --keyword "video editor" --must-include ai --discord "URL" --interval 300
```

> There's also `--desktop` for a computer pop-up, and Telegram support
> (`--telegram-token` + `--telegram-chat`).

---

## ⏰ Make it run automatically in the background

Instead of leaving a terminal open, run the `--once` version on a schedule:

- **🪟 Windows (Task Scheduler):** Create a Basic Task → trigger "Daily / repeat
  every 10 minutes" → action "Start a program" → program `python`, arguments:
  `"C:\path\to\job-watcher\onlinejobs_watcher.py" --keyword "video editor" --must-include ai --once --state "C:\path\to\job-watcher\seen_jobs.json"`
- **🍎 Mac/Linux (cron):** run `crontab -e` and add:
  `*/10 * * * * cd /path/to/job-watcher && python3 onlinejobs_watcher.py --keyword "video editor" --must-include ai --once`

---

## 🧰 Options

| Add this | What it does |
|----------|--------------|
| `--keyword "video editor"` | What to search for (required-ish; default "video editor") |
| `--must-include ai`        | Only posts whose **title** contains this word (whole word) |
| `--once`                   | Check one time and exit (for scheduling) |
| `--interval 600`           | Seconds between checks when looping (default 600 = 10 min; min 60) |
| `--discord "URL"`          | Send alerts to a Discord webhook |
| `--test-alert`             | Send one sample alert to your channel(s) to confirm setup, then exit |
| `--desktop`                | Show a pop-up on your computer |
| `--notify-existing`        | On the FIRST run, alert on all current matches (default: stay quiet) |
| `--state seen_jobs.json`   | Where it remembers seen jobs (keep the same path each run) |

---

## ❓ Common problems
- **"python is not recognized"** → Windows: reinstall and tick "Add python.exe
  to PATH". Mac: use `python3`.
- **No alerts ever** → The first run only records a baseline. Alerts start on the
  *next* new post. To test, add `--notify-existing` once.
- **Getting the same jobs repeatedly** → Make sure you use the **same `--state`
  file path** each time so it remembers what it already showed you.
- **Stop it** → Click the terminal and press **`Ctrl + C`**.

---

## How it works (short version)
Each check, it loads the public search page for your keyword (newest jobs first),
reads each post's ID + title + "Posted on" time, compares against the IDs it has
already seen (saved in `seen_jobs.json`), and alerts you about anything new.
