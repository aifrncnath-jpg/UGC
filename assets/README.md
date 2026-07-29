# Assets — how to add your work

## ⭐ Just drop files in a folder (no build, no code)

Put your ad videos (or images) into the matching category folder:

```
assets/work/
├── ugc/           ← UGC ads
├── vsl/           ← Video Sales Letters
├── influencer/    ← AI influencer videos
├── 3d/            ← 3D Pixar-style ads
└── podcast/       ← Podcast-style videos
```

**Name them by number** and they appear in order with clean titles:

| File you drop in `assets/work/ugc/` | Shows on site as |
|-------------------------------------|------------------|
| `ugc-1.mp4` | UGC Ad 1 |
| `ugc-2.mp4` | UGC Ad 2 |
| `podcast-1.mp4` (in `podcast/`) | Podcast Style 1 |
| `3d-1.mp4` (in `3d/`) | 3D Pixar 1 |

The page detects them automatically when it loads — **no build step, no code editing.**

- **Video:** `.mp4`, `.webm`, `.mov`, `.m4v` (mp4 is safest)
- **Images:** `.jpg`, `.png`, `.webp`, `.gif`
- Also accepts `ugc1.mp4` or just `1.mp4` inside the folder.
- Videos **auto-play on hover** (muted) right in the card.
- Start at `-1` and go up (`-1`, `-2`, `-3`…). A gap of 3 missing numbers stops the scan.

### ⚠️ Viewing locally
Detecting local files is most reliable through a tiny local server rather than
double-clicking the HTML. From the project folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
(Double-clicking `index.html` works in most browsers too, but a local server is bulletproof.)

### ⚠️ Keep videos small
Compress ad clips (aim for a few MB each). For long/full videos, host on
YouTube/TikTok and link the card instead — ask and I'll switch one to a link.

---

## Hero video/image (the vertical ad frame)

In `index.html`, find `<div class="ad-frame__media">` and replace the inner
placeholder with EITHER:

```html
<img class="ad-frame__media" src="assets/images/hero-ad.jpg" alt="ELOIX UGC ad" />
```
or a looping video:
```html
<video class="ad-frame__media" src="assets/videos/hero-ad.mp4" autoplay muted loop playsinline></video>
```

## Your photo (About section)

Add `assets/images/nathaniel.jpg`, then in `index.html` replace
`<div class="avatar__inner">N</div>` with:
```html
<img class="avatar__inner" src="assets/images/nathaniel.jpg" alt="Nathaniel" />
```

## Folders
```
assets/
├── work/       # ⭐ drop ad videos/images here (per category) — auto-shown
├── images/     # hero image, your photo, misc thumbnails
└── videos/     # hero loop clip, misc
```
