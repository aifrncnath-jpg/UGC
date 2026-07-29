# Alex Rivera — AI Video Specialist Portfolio

A modern, responsive, single-page portfolio for an **AI video editor / specialist**.
Built with plain **HTML, CSS and JavaScript** — no build step, no dependencies.
Loads instantly and deploys to any static host.

## ✨ Features

- **Cinematic dark theme** with animated gradient glows and grid background
- **Hero** with value proposition, stats and an interactive showreel card
- **Services** grid — what you offer
- **Filterable portfolio** (Ads, Music Videos, Short-Form, Generative/VFX)
- **AI toolkit** showcase + animated skill bars
- **Process**, **About**, **Testimonials** sections
- **Contact form** with client-side validation
- **Showreel modal** ready for a YouTube/Vimeo embed
- Fully **responsive** with a mobile menu, plus reduced-motion support and semantic markup

## 🚀 Run locally

Just open `index.html` in a browser, or serve it:

```bash
# Python
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 🎨 Make it yours

| What | Where |
|------|-------|
| Name, headline, copy | `index.html` (search for text) |
| Brand colors | `styles.css` → `:root` (`--violet`, `--cyan`, `--pink`, `--grad`) |
| Portfolio projects | `script.js` → the `projects` array |
| Showreel video | `index.html` → `#reelModal` (`.modal__placeholder`) → replace with an `<iframe>` / `<video>` |
| Stats, services, tools | `index.html` |
| Contact email & socials | `index.html` → `#contact` |

### Hooking up the contact form
The form currently validates and shows a success message on the client only.
To receive real submissions, point it at a service like
[Formspree](https://formspree.io) or [Getform](https://getform.io):
set the `<form>` `action` + `method="POST"` and remove the `e.preventDefault()`
in `script.js`.

## ☁️ Deploy

- **GitHub Pages**: push to a repo → Settings → Pages → deploy from branch.
- **Netlify / Vercel / Cloudflare Pages**: drag-and-drop the folder or connect the repo.

---
Crafted with AI + taste.
