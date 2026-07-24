# Caption Studio 🎬

An AI-powered, **100% in-browser** video caption generator. Upload a video, auto-generate
word-perfect captions, then style them with pro fonts and CapCut-style animations for
**UGC**, **VSLs** and **Ads** — then export subtitles or a caption-baked video.

> Your video never leaves your machine. Transcription runs locally in your browser using
> [🤗 Transformers.js](https://github.com/huggingface/transformers.js) (Whisper), so there
> are no API keys and no per-video costs.

## Features

- **AI transcription** with word-level timestamps (Whisper: tiny / base / small), 10+ languages
- **Live animated preview** overlaid on the video, synced frame-accurately
- **Curated fonts** grouped by use-case (UGC / VSL / Ads)
- **Templates** — one-click looks: _UGC Bold Pop_, _Green Box Karaoke_, _Impact Anton_,
  _Clean VSL_, _Lower Third_, _Friendly Ad_, _Bold Ad_, _Minimal Mono_
- **Full styling**: text/highlight colors, outline, drop shadow, background box, size,
  letter spacing, uppercase, vertical position, words-per-line
- **Active-word emphasis**: color, scale, box (karaoke), underline
- **Entrance animations**: pop, fade, slide-up, bounce, shake — per word or per line
- **Editable transcript** — click to seek, fix any wording inline
- **Export**: burned-in video (`.webm`), subtitles (`.srt` / `.vtt`), plain text (`.txt`)

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (default http://localhost:5173).

### Usage

1. **Drop a video** (MP4, MOV, WebM) onto the upload area.
2. Pick a model (Balanced is a good default) and language, then **Generate captions**.
   - The first run downloads the Whisper model to your browser cache (one-time).
3. Choose a **Template**, or fine-tune everything in the **Style** tab.
4. Fix any wording in the **Captions** tab.
5. **Export** — burn captions into a video, or download `.srt` / `.vtt` / `.txt`.

## Notes & requirements

- Best performance on a browser with **WebGPU** (recent Chrome/Edge). It automatically
  **falls back to WASM** if WebGPU isn't available (slower, but works).
- Burned-in export uses the browser's `MediaRecorder` and outputs **WebM**. For MP4 you can
  transcode the result, or use the `.srt` file with your editor.
- The source video must contain an **audio track** to transcribe.

## Tech stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4
- Zustand (state)
- @huggingface/transformers (in-browser Whisper)
- Canvas + MediaRecorder (caption burn-in)

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
