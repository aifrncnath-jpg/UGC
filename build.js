#!/usr/bin/env node
/* =========================================================
   Gallery manifest builder.
   Scans assets/work/<category>/ and lists EVERY file into
   work.json. This is the reliable source on Netlify (runs on
   each deploy) — no filename guessing, shows all your files.

   Local:   node build.js
   Netlify: set as the build command (see netlify.toml)
   ========================================================= */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "assets", "work");

const CATEGORIES = {
  ugc:        { tag: "UGC Ad",        c1: "#3a1c71", c2: "#0c0c16" },
  vsl:        { tag: "VSL",           c1: "#0f4c81", c2: "#0c0c16" },
  influencer: { tag: "AI Influencer", c1: "#642B73", c2: "#0c0c16" },
  "3d":       { tag: "3D Pixar",      c1: "#f7971e", c2: "#0c0c16" },
  podcast:    { tag: "Podcast Style", c1: "#0e7c66", c2: "#0c0c16" }
};

const VIDEO_EXT = [".mp4", ".mov", ".webm", ".m4v"];
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

// Sort so file-2 comes before file-10 (natural order)
function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// Title = category label + number (from filename if present, else running index)
function titleFor(file, tag, fallbackIndex) {
  const base = file.replace(/\.[^.]+$/, "");
  const m = base.match(/(\d+)\s*$/);
  const num = m ? parseInt(m[1], 10) : fallbackIndex;
  return tag + " " + num;
}

const items = [];

for (const cat of Object.keys(CATEGORIES)) {
  const dir = path.join(ROOT, cat);
  if (!fs.existsSync(dir)) continue;

  const files = fs
    .readdirSync(dir)
    .filter((f) => !f.startsWith(".") && f.toLowerCase() !== "readme.md")
    .sort(naturalSort);

  let index = 0;
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const isVideo = VIDEO_EXT.includes(ext);
    const isImage = IMAGE_EXT.includes(ext);
    if (!isVideo && !isImage) continue;

    index++;
    const meta = CATEGORIES[cat];
    const rel = "assets/work/" + cat + "/" + file;
    items.push({
      title: titleFor(file, meta.tag, index),
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

console.log("Generated work.json with " + items.length + " item(s).");
