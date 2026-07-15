# UGC Ad Prompt System v2

A two-stage AI pipeline for producing direct-response UGC video ads for Meta Ads (Facebook + Instagram) and TikTok.

## Continuous handoff chain

Each stage ends by emitting one structured block that the next stage ingests in a single paste, so the workflow never breaks:

```
Stage 1  Script Generator   --emits-->  LOCKED PACKAGE
Stage 2  Storyboard Prompt   --ingests LOCKED PACKAGE, emits-->  STORYBOARD PACKAGE (+ asset manifest)
   (generate real assets: keyframes, clips, VO, b-roll; fill the manifest)
Stage 3  Editing Prompt      --ingests STORYBOARD PACKAGE-->  EDIT MAP (timecoded cut plan)
   (a human or editing tool executes the Edit Map -> final video)
```

Note: the Editing Prompt plans from the package text and maps cuts to real filenames in the manifest. It does not watch the rendered clips, it builds the blueprint an editor or editing tool follows.

## Pipeline

1. **Script Generator v2** collects the brand brief, derives the audience, generates hooks, and writes the locked script (dialogue, tone, delivery, gestures). It outputs a single structured `LOCKED PACKAGE` block.
2. **Storyboard Master Prompt v2** ingests that package in one paste and builds the full storyboard: keyframe prompts, video prompts, and b-roll cutaways, tuned for natural UGC realism and character consistency.
3. **Editing Prompt (Stage 3)** takes the generated clips, b-roll, and voiceover and assembles the final retention-optimized ad: pacing, cuts, transitions, effects/keyframes, captions, SFX, BGM, and color correction.

## Files

| File | Description |
|------|-------------|
| `prompts/UGC_Script_Generator_v2.pdf` | Stage 1 system prompt (brief + script) |
| `prompts/UGC_Storyboard_Master_Prompt_v2.pdf` | Stage 2 system prompt (storyboard + b-roll) |
| `prompts/editingprompt.pdf` | Stage 3 system prompt (final edit + retention) |
| `src/generate_script_gen_v2.py` | Script that renders the Stage 1 PDF |
| `src/generate_master_prompt_v2.py` | Script that renders the Stage 2 PDF |
| `src/generate_editing_prompt.py` | Script that renders the Stage 3 PDF |

## What v2 improves over v1

- **Aligned handoff:** Stage 1 emits a structured `LOCKED PACKAGE` (9 avatar fields + 6 setting fields) that Stage 2 ingests in one paste. No more stalls on missing fields.
- **Shared runtime formula:** `seconds = words / 2.5`, used by both stages, so no false discrepancy flags.
- **Character consistency:** Scene 1 keyframe becomes the identity anchor; every later keyframe uses it as a reference image plus a locked seed. Text alone does not hold a face.
- **Natural UGC realism (anti-AI look):** deep focus (no bokeh / no shallow depth of field), natural window light only (no studio / ring / cinematic lighting), visible skin texture, and deliberate imperfections (mild sensor noise, imperfect white balance, slight handheld shake). Includes an AVOID list for negative prompts.
- **B-roll module:** how many b-rolls per arc, exactly where to insert them, cutaway timing, a per-b-roll output format, and exact stock-footage search phrases plus source priority (brand library, then stock, then AI generate).
- **QA pre-flight** on both stages, batch modes, versioning, softened front-facing lock, and video-artifact guardrails.

## Rebuilding the PDFs

```bash
pip install reportlab
python3 src/generate_script_gen_v2.py
python3 src/generate_master_prompt_v2.py
```
