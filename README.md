# Universal Animated Ad Pipeline

A two-stage, multi-style system for producing direct-response animated video ads (Meta Ads + TikTok) that are client-ready and platform-compliant. It mirrors the rigor of a UGC ad pipeline but is built for animation, with a selectable Style Engine.

## The two stages

1. **`ANIMATED_SCRIPT_GENERATOR.md`** (stage 1: strategy + script)
   Finds the angle, mines voice-of-customer language, locks the animation style, builds a 9-hook slate for testing, and writes one stable body script with delivery, gesture, lighting, camera, and scene-type notes. Holds gates on every strategic decision. Outputs a locked handoff.

2. **`ANIMATED_STORYBOARD_MASTER_PROMPT.md`** (stage 2: production)
   Takes the locked script + style and builds production-ready image prompts (keyframes) and video prompts (animation) for every scene. Enforces character/environment locks, the image-based Product Reference Lock, a per-style authenticity layer, continuity, and a kill list.

Run them in order, in separate sessions: generate and lock the script first, then paste the locked output into a fresh session with the Master Prompt loaded.

## Style Engine (8 styles, extensible)

Grouped into families so the producer picks by goal, not taste:

- **3D / CGI**: S1 Pixar-Style 3D CGI
- **2D**: S4 2D Cel / Traditional, S5 2D Anime, S7 Motion-Graphic Vector, S8 Skeletal / Rigged Puppet (bone-rig)
- **Stop-motion / tactile**: S2 Claymation, S3 Stop-Motion Puppet / Armature, S6 Cutout / Paper Stop-Motion

Each style block defines its Fingerprint, Materials, Lighting model, Camera language, Motion cadence, what-it-is-NOT, and a closing Render Tag, so the output reads as a crafted film in that medium, not a generic AI render. Custom styles (pixel art, felt, rotoscope, etc.) can be added using the same block structure.

Note on "skeleton": **S3** is a physical metal armature inside a real stop-motion puppet (stepped, jittery, weighty). **S8** is a digital bone rig deforming a 2D puppet (smooth, pivot-based, no jitter). Same word, opposite look, kept as separate styles.

## Key design principles carried from the UGC system

- **Product Reference Lock**: the product's label and graphics come from an uploaded reference image, never text-described (text generators garble labels). On-pack text is flagged for post-compositing.
- **Hard gates and locks**: character, environment, and style are copied verbatim into every scene. Drift is an automatic fail.
- **Runtime math**: spoken runtime estimated at 2.7 words/sec so the 8-second scene cap is actually enforceable.
- **Compliance**: AI-content disclosure is mandatory, no fabricated personal results, experiential and defensible claims only.
- **Per-style authenticity layer**: engineers each medium's craft tells (clay thumbprints, stop-motion jitter, 2D line boil, rig pivots) to escape the generic default render.

## Format defaults

- Aspect ratio 9:16 vertical (1080x1920 Reels/Stories, 1080x1350 Feed)
- 8-second scene cap
- Subtitles on, applied in post
- Plain text output, no em dashes, no bold
