# 🎧 SFXFolder Downloader — Beginner's Guide

This little tool downloads the **free sound effects** from
[sfxfolder.com](https://sfxfolder.com) onto your computer, sorted into folders,
so you can use them for video editing.

**No coding knowledge needed.** Just follow the steps below in order. 🙂

> ℹ️ The sounds on SFXFolder are free for personal and commercial use. Please
> still be considerate: this tool downloads slowly on purpose so it doesn't
> overload their website. Only grab what you'll actually use.

---

## 📋 What you need (one-time setup)

You only have to do **Part 1** and **Part 2** once. After that, you just repeat
**Part 3** whenever you want to download sounds.

---

## Part 1 — Install Python (the thing that runs the tool)

### 🪟 If you have Windows

1. Open this link: **https://www.python.org/downloads/**
2. Click the big yellow button **"Download Python"**.
3. Open the file you just downloaded.
4. ⚠️ **VERY IMPORTANT:** On the first screen, tick the box at the bottom that
   says **"Add python.exe to PATH"**. Then click **"Install Now"**.
5. Wait for it to finish, then click **Close**.

### 🍎 If you have a Mac

1. Open this link: **https://www.python.org/downloads/**
2. Click the big yellow button **"Download Python"**.
3. Open the downloaded file and click through **Continue → Continue → Agree →
   Install**. Enter your password if asked.
4. When it says the install succeeded, click **Close**.

---

## Part 2 — Download the tool from GitHub

1. Go to the tool's page:
   **https://github.com/aifrncnath-jpg/UGC**
2. Click the green **`<> Code`** button (near the top right).
3. In the little menu, click **"Download ZIP"**.
4. A ZIP file lands in your **Downloads** folder. **Unzip it** (double-click it
   on Mac; on Windows right-click → **"Extract All"**).
5. Inside, open the folder called **`sfx-downloader`**. You should see two
   files: `sfxfolder_downloader.py` and this `README.md`. 👍

Remember where this folder is — you'll point the terminal to it next.

---

## Part 3 — Run the tool

### Step 1: Open the terminal (the black text window)

- 🪟 **Windows:** Click the Start menu, type **`cmd`**, and press Enter. A black
  window opens — that's the **Command Prompt**.
- 🍎 **Mac:** Press **`Cmd + Space`**, type **`Terminal`**, and press Enter.

### Step 2: Go into the tool's folder

Type the word `cd` followed by a space, then **drag the `sfx-downloader`
folder** from your file explorer directly into the terminal window and press
**Enter**. (Dragging it fills in the folder location for you automatically.)

Example of what it looks like after dragging:

```
cd /Users/you/Downloads/UGC-main/sfx-downloader
```

Press **Enter**.

### Step 3: Type a command and press Enter

Here are the ones you'll use most. Copy a line, paste it into the terminal,
press **Enter**, and wait.

**A) See what themes/tags are available first:**
```
python sfxfolder_downloader.py --list-tags
```

**B) Download ALL free sound effects:**
```
python sfxfolder_downloader.py
```

**C) Download only one theme (like a "folder") into its own folder:**
```
python sfxfolder_downloader.py --match minecraft --subfolder
```
Replace `minecraft` with whatever you want, e.g. `transition`, `whoosh`,
`meme`, `suspense`.

> 💡 On some Macs, if `python` gives an error, type **`python3`** instead of
> `python` (e.g. `python3 sfxfolder_downloader.py`).

### Step 4: Find your downloaded sounds

When it finishes, a new folder called **`downloads`** appears inside the
`sfx-downloader` folder. Your sound effects (`.mp3` files) are inside, sorted
into folders. Drag them into your video editor and enjoy! 🎬

---

## 🧰 Handy extra options

Add any of these to the end of a command:

| Add this to the command | What it does |
|-------------------------|--------------|
| `--list-tags`           | Just shows the available themes, downloads nothing |
| `--match minecraft`     | Only sounds related to "minecraft" (change the word) |
| `--subfolder`           | Puts a themed group into its own tidy folder |
| `--limit 5`             | Only the first 5 (good for a quick test) |
| `--dry-run`             | Shows what *would* download, without downloading |
| `--categories bgm`      | Download background music instead of sound effects |

**Example — test with just 5 files first:**
```
python sfxfolder_downloader.py --limit 5
```

---

## ❓ Common problems

- **"python is not recognized" / "command not found"**
  → On Windows, you probably missed the **"Add python.exe to PATH"** tick box in
  Part 1. Reinstall Python and make sure to tick it. On Mac, try `python3`
  instead of `python`.

- **Nothing happens / it looks frozen**
  → It's working! The tool waits ~1 second between each sound on purpose to be
  polite to the website. Big downloads take a few minutes. Let it run.

- **I want to stop it**
  → Click the terminal window and press **`Ctrl + C`**. You can re-run the same
  command later — it skips files you already downloaded and continues.

- **I ran it again and it says "SKIP / already exists"**
  → That's normal and good — it means you already have those files, so it
  doesn't re-download them.

---

## 📄 What's the `manifest.csv` file?

Inside the `downloads` folder there's a spreadsheet-style file called
`manifest.csv`. You can open it in Excel or Google Sheets to see a list of every
sound, its name, tags, and where it was saved. It's just a helpful record — you
can ignore it if you don't need it.
