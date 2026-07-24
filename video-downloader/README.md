# 🎬 Portfolio Video Downloader — Beginner's Guide

Downloads the videos from
[xandrix-llaguno.netlify.app](https://xandrix-llaguno.netlify.app/) onto your
computer, sorted into folders by category (**3D Animations, UGC, VSL,
Commercial, News Cast**).

**No coding knowledge needed** — follow the steps in order. 🙂

> ⚠️ **Please use responsibly.** These are portfolio / client videos, not
> free-to-reuse stock. They're publicly viewable and downloadable, but keep
> them for personal reference or with the owner's permission — don't republish
> them as your own.
>
> ℹ️ There are **60 videos** and they're **large** (some 100+ MB each), so the
> full set is several GB and takes a while to download.

---

## Part 1 — Install Python (one time)

### 🪟 Windows
1. Go to **https://www.python.org/downloads/**
2. Click **"Download Python"**, open the file.
3. ⚠️ Tick **"Add python.exe to PATH"**, then **"Install Now"**.

### 🍎 Mac
1. Go to **https://www.python.org/downloads/**
2. Click **"Download Python"**, open it, and click through the installer.

---

## Part 2 — Get the tool (one time)
1. Go to **https://github.com/aifrncnath-jpg/UGC**
2. Green **`<> Code`** button → **"Download ZIP"** → unzip it.
3. Open the **`video-downloader`** folder inside. You'll see `video_downloader.py`.

---

## Part 3 — Run it

### Step 1 — Open the terminal
- 🪟 **Windows:** Start menu → type **`cmd`** → Enter.
- 🍎 **Mac:** **`Cmd + Space`** → type **`Terminal`** → Enter.

### Step 2 — Go into the tool's folder
Type `cd ` (with a space), then **drag the `video-downloader` folder** into the
terminal and press **Enter**.

### Step 3 — Run a command

**See the videos and categories first:**
```
python video_downloader.py --list
```

**Download everything (all 60, sorted into folders):**
```
python video_downloader.py
```

**Download only certain categories:**
```
python video_downloader.py --category UGC VSL
```

**Quick test — just the first 2 videos:**
```
python video_downloader.py --limit 2
```

> 💡 On some Macs, use **`python3`** instead of `python`.

### Step 4 — Find your videos
A **`video-downloads`** folder appears with a subfolder per category, each full
of `.mp4` files.

---

## 🧰 Options

| Add this | What it does |
|----------|--------------|
| `--list`               | Show videos + categories, download nothing |
| `--category UGC VSL`   | Only these categories |
| `--limit 2`            | Only the first 2 (quick test) |
| `--dry-run`            | Show what *would* download |
| `--out myfolder`       | Save somewhere other than `video-downloads` |

---

## ❓ Common problems
- **"python is not recognized" / "command not found"** → Windows: reinstall and
  tick "Add python.exe to PATH". Mac: use `python3`.
- **Slow / looks frozen** → Normal. The files are big (100+ MB each). Let it run.
- **Stop it** → Click the terminal, press **`Ctrl + C`**. Re-running continues
  where it left off (finished files are skipped).
- **"SKIP / already exists"** → Good — you already have that video.

---

## 📄 `manifest.csv`
Inside `video-downloads` there's a list of every video, its category, and where
it was saved. Open in Excel/Google Sheets or ignore it.
