# Nathaniel — AI Video Specialist Portfolio

A modern, responsive, single-page portfolio for an **AI video specialist** who creates
UGC ads, VSLs, AI influencers and 3D Pixar-style video for **DTC & e-commerce brands**.
Built with plain **HTML, CSS and JavaScript** — no build step, no dependencies.

## ✨ Features

- **Cinematic dark theme** with animated gradient glows and grid background
- **Hero** with a sales-focused value proposition, stats and an interactive showreel card
- **Services** — UGC Ads, VSLs, AI Influencers, 3D Pixar-style ads, AI scriptwriting, voice & editing
- **Filterable portfolio** (UGC / VSL / AI Influencer / 3D Pixar)
- **AI toolkit** showcase (Claude, ChatGPT, Nano Banana, GPT Image, Google Flow·Veo, Kling, Omni, CapCut Pro, ElevenLabs) + animated skill bars
- **Process**, **About**, **Why work with me** sections
- **Contact form** with client-side validation (email, Discord, WhatsApp)
- **Showreel modal** ready for a YouTube/Vimeo embed
- Fully **responsive** with a mobile menu, reduced-motion support and semantic markup

## 🚀 Run locally

Open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 🎨 Make it yours

| What | Where |
|------|-------|
| Name, headline, copy | `index.html` |
| Brand colors | `styles.css` → `:root` (`--violet`, `--cyan`, `--pink`, `--grad`) |
| Portfolio projects | `script.js` → the `projects` array |
| Showreel video | `index.html` → `#reelModal` → replace with an `<iframe>` / `<video>` |
| Stats, services, tools | `index.html` |
| Contact details & socials | `index.html` → `#contact` |
| Your photo (About) | `index.html` → `.avatar__inner` (swap the "N" for an `<img>`) |

### Hooking up the contact form
The form currently validates and shows a success message on the client only.
To receive real submissions, use [Formspree](https://formspree.io) or [Getform](https://getform.io):
set the `<form>` `action` + `method="POST"` and remove the `e.preventDefault()` in `script.js`.

## ☁️ Deploy (GitHub Pages)

1. Merge to `main`
2. Repo → **Settings** → **Pages** → Source: **Deploy from a branch** → Branch: `main` / root → **Save**
3. Live at `https://aifrncnath-jpg.github.io/UGC/`

---
Crafted with AI + taste.
