#!/usr/bin/env node
/* =========================================================
   Auto-gallery builder
   Scans assets/work/<category>/ for videos & images and
   generates work.json — so dropping a file in a folder
   makes it appear on the site automatically (no code edits).

   Runs locally: `node build.js`
   Runs on Netlify: set as the build command (see netlify.toml)
   ========================================================= */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "assets", "work");

// Category folder -> how it shows on the site
const CATEGORIES = {
  ugc:        { tag: "UGC Ad",        c1: "#3a1c71", c2: "#0c0c16" },
  vsl:        { tag: "VSL",           c1: "#0f4c81", c2: "#0c0c16" },
  influencer: { tag: "AI Influencer", c1: "#642B73", c2: "#0c0c16" },
  "3d":       { tag: "3D Pixar",      c1: "#f7971e", c2: "#0c0c16" }
};

const VIDEO_EXT = [".mp4", ".webm", ".mov", ".m4v"];
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

// "eloix-tallow-balm.mp4" -> "Eloix Tallow Balm"
function prettify(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const items = [];

for (const cat of Object.keys(CATEGORIES)) {
  const dir = path.join(ROOT, cat);
  if (!fs.existsSync(dir)) continue;

  const files = fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith(".") && f.toLowerCase() !== "readme.md")
    .sort();

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const isVideo = VIDEO_EXT.includes(ext);
    const isImage = IMAGE_EXT.includes(ext);
    if (!isVideo && !isImage) continue;

    const rel = `assets/work/${cat}/${file}`;
    const meta = CATEGORIES[cat];
    items.push({
      title: prettify(file),
      cat,
      tag: meta.tag,
      c1: meta.c1,
      c2: meta.c2,
      meta: meta.tag,
      video: isVideo ? rel : undefined,
      img: isImage ? rel : undefined
    });
  }
}

fs.writeFileSync(
  path.join(__dirname, "work.json"),
  JSON.stringify(items, null, 2) + "\n"
);

console.log(`✅ Generated work.json with ${items.length} item(s).`);
if (items.length === 0) {
  console.log("   (No media found in assets/work/*. The site will show demo cards until you add files.)");
}
