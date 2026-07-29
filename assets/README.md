# Assets — how to add your work

## ⭐ The easy way: just drop files in a folder

Put your ad videos (or images) into the matching category folder:

```
assets/work/
├── ugc/           ← UGC ads
├── vsl/           ← Video Sales Letters
├── influencer/    ← AI influencer videos
├── 3d/            ← 3D Pixar-style ads
└── podcast/       ← Podcast-style videos
```

Name numbered files like `ugc-1.mp4`, `ugc-2.mp4`, `vsl-1.mp4`, `3d-1.mp4`,
`podcast-1.mp4` and they show up as clean titles: **"UGC Ad 1", "VSL 1",
"3D Pixar 1", "Podcast Style 1"** — in order.

That's it. On the next deploy, the site scans these folders and shows every
file automatically as a card in the Work section — **no code editing.**

- **Supported video:** `.mp4`, `.webm`, `.mov`, `.m4v`
- **Supported images:** `.jpg`, `.png`, `.webp`, `.gif`
- The card **title comes from the filename**, so name files nicely:
  `eloix-tallow-balm.mp4` → shows as **"Eloix Tallow Balm"**
- Use lowercase, dashes instead of spaces.
- Videos **auto-play on hover** (muted) right in the card.

> After adding files, run `node build.js` locally (or just let Netlify deploy —
> it runs it for you) to refresh `work.json`.

### ⚠️ Keep videos small
Compress ad clips before adding them (aim for a few MB each). For long/full
videos, it's better to host on YouTube/TikTok and link instead — ask and I'll
switch a card to a link.

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
