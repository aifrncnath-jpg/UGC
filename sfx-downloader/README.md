# 🎧 SFXFolder Downloader — Beginner's Guide

This tool downloads the **free sound effects** from
[sfxfolder.com](https://sfxfolder.com) onto your computer, automatically sorted
into **theme folders** (WHOOSH, RISER, IMPACTS, BOOM, MEMES, and ~55 more) — so
you can use them for video editing without clicking through ads.

**No coding knowledge needed.** Just follow the steps below in order. 🙂

> ℹ️ **Please read this first.** The sounds are free for personal and commercial
> use. This tool reads the site's own listing feed to find them (the same feed
> the website uses when you scroll). Their `robots.txt` asks bots not to use
> that `/api/` path, so the tool touches it only briefly and gently. Please be
> considerate: keep the pacing slow (the defaults are), only grab what you'll
> use, and check their [Terms of Service](https://sfxfolder.com/terms). The full
> library is about **1 GB**, so downloading everything takes a while.

---

## Part 1 — Install Python (one time)

### 🪟 Windows
1. Go to **https://www.python.org/downloads/**
2. Click the yellow **"Download Python"** button and open the file.
3. ⚠️ **IMPORTANT:** On the first screen, tick **"Add python.exe to PATH"**, then
   click **"Install Now"**. When it finishes, click **Close**.

### 🍎 Mac
1. Go to **https://www.python.org/downloads/**
2. Click **"Download Python"**, open the file, and click through
   **Continue → Continue → Agree → Install** (enter your password if asked).

---

## Part 2 — Download the tool (one time)

1. Go to **https://github.com/aifrncnath-jpg/UGC**
2. Click the green **`<> Code`** button → **"Download ZIP"**.
3. Unzip the downloaded file (double-click on Mac; right-click → **Extract All**
   on Windows).
4. Open the folder called **`sfx-downloader`** inside it. You'll see
   `sfxfolder_downloader.py`. 👍

---

## Part 3 — Run it

### Step 1 — Open the terminal
- 🪟 **Windows:** Start menu → type **`cmd`** → Enter.
- 🍎 **Mac:** press **`Cmd + Space`** → type **`Terminal`** → Enter.

### Step 2 — Go into the tool's folder
Type `cd` and a space, then **drag the `sfx-downloader` folder** into the
terminal window and press **Enter**. Example:
```
cd /Users/you/Downloads/UGC-main/sfx-downloader
```

### Step 3 — Type a command and press Enter

**A) First, see all the theme folders (and their sizes):**
```
python sfxfolder_downloader.py --list-folders
```

**B) Download ONE theme folder (recommended — pick what you need):**
```
python sfxfolder_downloader.py --folder WHOOSH
```
Change `WHOOSH` to any folder name from the list, e.g. `RISER`, `IMPACTS`,
`BOOM`, `SWOOSH_SWISH`, `CAMERA_SHUTTER`, `SFX_MEMES`.

**C) Download EVERYTHING (the whole ~1 GB library, sorted into folders):**
```
python sfxfolder_downloader.py
```

**D) Everything EXCEPT the huge ambience files (much smaller, faster):**
```
python sfxfolder_downloader.py --exclude AMBIENCE ENVIROMENT
```

> 💡 On some Macs, if `python` gives an error, use **`python3`** instead.

### Step 4 — Find your sounds
A new **`downloads`** folder appears inside `sfx-downloader`, containing a
`sound-effects` folder with a subfolder per theme, full of ready-to-use audio.
Drag them into your video editor. 🎬

---

## 🧰 All the options

Add any of these to the end of the command:

| Add this | What it does |
|----------|--------------|
| `--list-folders`        | Show all theme folders + counts/sizes, download nothing |
| `--folder WHOOSH RISER` | Only these folders (you can list several) |
| `--exclude SFX_MEMES`   | Skip these folders |
| `--match minecraft`     | Fuzzy search across names/tags (e.g. `minecraft`, `laser`) |
| `--tag meme`            | Only items with an exact tag |
| `--limit 10`            | Only the first 10 (great for a quick test) |
| `--dry-run`             | Show what *would* download, without downloading |
| `--no-group`            | Put everything in one folder (no theme subfolders) |

**Safe first test — grab just 5 files:**
```
python sfxfolder_downloader.py --limit 5
```

---

## ❓ Common problems

- **"python is not recognized" / "command not found"** → On Windows you missed
  the **"Add python.exe to PATH"** tick box; reinstall and tick it. On Mac, try
  `python3`.
- **Looks frozen / slow** → It's working. The tool pauses between downloads on
  purpose to be gentle on the website. Big folders take a few minutes; the whole
  library (~1 GB) takes a while. Let it run.
- **Stop it** → Click the terminal and press **`Ctrl + C`**. Re-running later
  continues where it left off (it skips files you already have).
- **"SKIP / already exists"** → Normal and good — you already have those files.

---

## 📄 The `manifest.csv` file
Inside `downloads` there's a spreadsheet file listing every sound, its folder,
tags, size, and where it was saved. Open it in Excel/Google Sheets, or ignore
it — it's just a record.
