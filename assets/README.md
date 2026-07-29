# Assets

Put your media here.

```
assets/
├── videos/     # short looping clips (MP4/WebM) — keep small (< ~5 MB each)
├── images/     # thumbnails, screenshots, your photo (JPG/PNG/WebP)
```

## 1) Hero video/image (the vertical ad frame)

Open `index.html`, find `<div class="ad-frame__media">` and replace the inner
placeholder with EITHER an image or a looping video:

**Image:**
```html
<img class="ad-frame__media" src="assets/images/hero-ad.jpg" alt="ELOIX UGC ad" />
```

**Looping video (recommended for motion):**
```html
<video class="ad-frame__media" src="assets/videos/hero-ad.mp4"
       autoplay muted loop playsinline></video>
```

## 2) Work grid — thumbnails + links

Open `script.js` and edit the `projects` array. Each project supports:

| field | what it does |
|-------|--------------|
| `img`  | thumbnail shown on the card → `"assets/images/eloix-balm.jpg"` |
| `link` | makes the card clickable to the real video (YouTube/TikTok/Drive) |

Example:
```js
{ title: "ELOIX Tallow Balm — UGC Ad", cat: "ugc", tag: "UGC Ad",
  meta: "Native UGC · Meta / TikTok",
  img: "assets/images/eloix-balm.jpg",
  link: "https://youtube.com/watch?v=XXXX" }
```

## 3) Your photo (About section)

Add e.g. `assets/images/nathaniel.jpg`, then in `index.html` replace the
`<div class="avatar__inner">N</div>` content with:
```html
<img class="avatar__inner" src="assets/images/nathaniel.jpg" alt="Nathaniel" />
```

## Tips
- Compress videos before committing (e.g. HandBrake, or `ffmpeg`). Keep the hero clip short + muted.
- Vertical clips (9:16) fit the hero frame perfectly.
- Filenames: lowercase, no spaces (use dashes), e.g. `eloix-berberine-vsl.jpg`.
