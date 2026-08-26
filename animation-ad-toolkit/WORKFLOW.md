# ANIMATED AD WORKFLOW

Six stages. One gate each. Works on any script, any animation style.

```
1  SCRIPT      ->  STORYBOARD          you approve the plan
2  STORYBOARD  ->  ALL PROMPTS         generated, nothing to write by hand
3  REFERENCE IMAGES                    generate, you approve. LOCKS the look
4  SHOT STILLS                         generate, you approve
5  VIDEO PROMPTS + CLIPS               generate, you approve
6  ASSEMBLY                            cut, caption, sound, export
```

**Do not pass a gate to save time.** Everything downstream inherits whatever you approve.

---

# STAGE 1 — SCRIPT TO STORYBOARD

## What you do

Put your script in a text file. Mark sections if you want, or just paste paragraphs.

```
## HOOK
your hook copy

## SCENE 2
your scene copy
```

Fill in `project.py`: your style, your characters, your locations.

```bash
python3 build_project.py my-script.txt
```

## What you get

`1-STORYBOARD.md` — every shot, with:

```
ID          use this as the filename forever
FRAMING     wide / medium / close-up / macro insert
CAMERA      the move, and it is motivated
LENS        focal length
ANGLE       camera height
ACTION      what happens
```

Shot count comes from the script itself. A line that lists three things gets three shots.
A four-word line gets one. You are not told how many shots your ad has, the script is.

## Two things you decide

**1. The abstract lines.** The build prints a list of lines that cannot be filmed literally —
*"it's about balance"*, *"I felt broken"*, *"my confidence came back"*. Each one needs a visual
idea. Put them in `DEVICES` in `project.py` and run the build again.

Five ways to solve one:

| Method | Example |
|---|---|
| Give it a character | An abstract threat becomes a creature with a face and an arc |
| Give it a gauge | An invisible measurement becomes a dial that moves |
| Give it a living object | Health becomes a plant that wilts and revives in the background |
| Break physics | Emotional distance becomes a bed that stretches impossibly long |
| Show the failure | Do not say the remedy failed. Show it failing |

**2. The action lines.** They come from your script copy, and script copy is dialogue, not
stage direction. One pass to rewrite each into **what the camera sees**, not what the voice
says.

## GATE 1
- Every abstract line has a visual decided
- Every action line rewritten into something filmable
- You would be happy to shoot this list

---

# STAGE 2 — ALL PROMPTS

## What you do

Nothing. Re-run the build after Stage 1 approval.

## What you get

```
2-REFERENCE-PROMPTS.md   character sheets and set plates
3-STILL-PROMPTS.md       one prompt per shot
4-VIDEO-PROMPTS.md       one motion prompt per shot
5-TRACKER.md             checklist
```

Every prompt is **one copy-paste**. Ratio on top, negative prompt already inside the block.
Nothing to assemble, nothing to look up.

## GATE 2
- Prompt count matches your storyboard
- Style pack is the one you wanted

---

# STAGE 3 — REFERENCE IMAGES

**This is the stage that decides whether the project works.**

## Order

```
1  character turnarounds      16:9
2  set plates, cold grade     your delivery ratio
3  set plates, warm grade     attach the cold plate
```

## Ratios

```
reference sheets      16:9 or 1:1     they need width for multiple views
everything on screen  your delivery ratio, usually 9:16
```

A turnaround forced into 9:16 gives one crowded figure instead of three views. Reference sheets
never appear in the finished film.

## The gate that matters — the three-times test

Generate each character **three separate times** from the same prompt. Put them side by side.

> Can you tell it is the same person without being told?

- **Yes** → save as `REF_[NAME].png`. Attach on every shot from here on
- **No** → add a distinctive detail to the character block and retry

One distinctive detail matters more than every other descriptor combined. A gap in the front
teeth, a beauty mark, a scar through an eyebrow, ombre braids. Generic features drift because
the model has a million ways to render "brown eyes."

## Set plates

**A plate is not a pretty photo of a corner. It is a stageable room.** Whole space, straight on,
key furniture facing camera, clear floor space. Check it against your storyboard: if a shot
needs someone sitting on a specific chair, that chair must be in the plate.

Generate cold and warm **back to back in the same session**, attaching the cold plate to make
the warm one. Relight, do not rebuild. Come back tomorrow and you get a different room.

Relight prompt, short on purpose:

```
Keep this exact image. Do not move, resize, redesign or replace anything in the room. Keep the
identical camera position and identical fixtures. Change ONLY the lighting and colour: [the
change]. Same room, same camera. No people, no text.
```

Long descriptions defeat reference images. If you re-describe the room, the model builds a new
one that vaguely resembles yours.

## GATE 3
- Every character passes the three-times test
- Every character reads the right age
- Every plate is stageable against your storyboard
- Cold and warm plates are architecturally identical

---

# STAGE 4 — SHOT STILLS

## Rules

**Attach your approved references on every shot.** Character refs for people, plate refs for
rooms. Never attach a character sheet that has an invented environment in it, or that
environment leaks into every shot.

**Batch by location, not in storyboard order.** All bathroom shots in one session, all kitchen
shots in one session. Same set plus same lighting plus same session equals far better continuity
and fewer rerolls. You will jump around the storyboard and that is correct.

**Matched pairs go pair to pair.** If two shots are the same framing with opposite meaning
(before and after, apart and together), generate the first, approve it, then generate the second
**from the first**, changing only what should change. One hop, one chance to drift.

## GATE 4
- Every still matches its storyboard row
- Faces consistent across the whole set
- Matched pairs verified side by side

---

# STAGE 5 — VIDEO

## Rules

**Image-to-video, never text-to-video.** Feed the approved still. Text-to-video gives a
different face on every clip and there is no recovering from that.

**Generate only the length you will use, usually 2 to 4 seconds.** Short clips are your best
defence against artifacts. There is not enough runtime for a face to melt.

**Route by move type.**

```
push-ins, pull-backs, orbits, tracks     tools with real camera controls
face performance, held shots             tools with the best facial motion
crowds, fluids, complex motion           tools with the best coherence
```

## Lip sync

Decide early: is the voice **narration over visuals**, or a character **performing to camera**?

Narration means almost no lip sync work. Check your storyboard and count how many shots are
actually direct address. It is usually a handful. Put your best tool and all your patience into
exactly those, and treat everything else as reaction, gesture and b-roll.

## GATE 5
- Every clip on-model, no morphing or drift
- No clip longer than it needs to be
- Matched pair clips still match

---

# STAGE 6 — ASSEMBLY

- **Open in motion.** Frame one already has movement. No fade in, no static establishing shot,
  no logo
- **Captions burned in**, kept between 20% and 78% of frame height to clear platform UI. Two to
  five words per card. Build one preset and reuse it
- **SFX on every physical beat.** Doors, taps, footsteps, bottles. In animation, SFX is what
  sells physical weight
- **Hold the CTA.** Locked frame, zero movement, four seconds or more. If you cut during your
  CTA you lose clicks
- **Vary the cutting.** Constant speed reads as no speed. Pick one moment to hold long at the
  emotional low, one moment to slow down at the turn, and stop moving entirely on the CTA

## Naming

```
[client]_[concept]_v[N]_[hook]_[length].mp4
```

One body, swap hooks, tag the length. Cut short versions from the same footage.

## GATE 6
- Watched end to end three times from the client's perspective
- Checked against the client's safe zone template
- You would approve it yourself

---

# THE FAILURE TABLE

Prompt failures are almost always the prompt, not the model.

| Symptom | Real cause | Fix |
|---|---|---|
| Phantom person in an empty room | Style block contains face descriptors | Use the environment style variant, which has no anatomy language |
| Invented scene in a design sheet | Prompt said "plain background" but never "no environment" | Explicit structural guard |
| Text or a title appears | `text` in the negative is not enough | Positive instruction: "contains absolutely no text, letters, words or labels" |
| Generation refused | Age words next to clothing words in one string | Remove both from negatives. Handle age and clothing positively |
| Adult reads as a teenager | No head-to-body ratio stated, child-face descriptors used | State 7.5 head-heights, sculpted cheekbones, defined jawline |
| Character looks plastic | Gloss without subsurface scattering | Add warm subsurface scattering, soft diffuse light |
| Dead doll eyes | No catchlights or moisture | Bright multiple catchlights, wet lower lid, detailed iris |
| Flat pasted-on look | No rim light, no bounce | Rim light separating subject, ray-traced global illumination |
| Face changes shot to shot | Character block paraphrased | Byte-identical block plus a reference image |
| Warm plate does not match cold | Prompt re-described the room, so text beat the image | Short edit instruction naming only the change |
| Set drifts in a hero shot | Background described in four words | Full description AND the reference image |
| Matched pair does not read as a match | Lens or angle differed between halves | Same lens, same angle, byte-identical spec |
| Ad feels longer than it is | Constant cut speed | Vary it. Hold at the low, slow at the turn, stop at the CTA |

---

# THE DECISION RULES

1. **Style cohesion across the cast beats individual shot quality.** A gorgeous photoreal
   character next to a stylized one is two different films
2. **Where a matched pair conflicts with an arc, the pair wins.** A match cut only reads if both
   halves share a lens and an angle
3. **Adopt what the model reliably produces.** If it gives the same off-spec result three times,
   that IS consistency. Change the spec instead of fighting a fourth time
4. **Two failures on one feature means the feature is the problem, not the wording.** Change the
   design
5. **If you cannot forbid it structurally, the model will fill it.** Empty space in a prompt is
   an invitation
6. **One clear metaphor beats three clever ones.** Three competing explanations of the same idea
   is worse than one stated twice
7. **Comedy relieves cringe.** In any embarrassing category, a laugh buys permission to keep
   talking
8. **Hold the emotional floor.** An ad with no stillness has no dynamics, and no dynamics means
   no attention

---

# APPENDIX — THE THREE INVISIBLE ARCS

The build applies these automatically. The audience never notices them and feels all three.

**Camera height tracks status.** Early scenes look DOWN on the subject. The turn is EYE LEVEL.
The payoff looks UP. By the CTA the camera is beneath their eyeline. They physically rise
through the film.

**Lens tracks intimacy.** Early is long and compressed, watching from across the room like a
stranger. Wide where emptiness or scale is the point. The turn is 50mm, honest. The end is wide
AND close, so you are with them rather than watching them.

**Framing tracks entrapment.** Early, the subject is boxed inside something in every shot:
doorways, tile grids, cabinet lines, shelf lines, shadow bars. By the payoff the frames are
gone. Removing them is what makes the ending feel like release.

---

# APPENDIX — IF YOU HAVE A FIXED-LENGTH TRACK

Only relevant when the audio already exists and cannot change.

```
seconds_per_word = track_seconds / total_script_words
section_duration = section_words * seconds_per_word
```

Cumulative-sum for boundaries, drop them as markers, play the track once, nudge each marker to
the real audio landmark. Do not rebuild the plan, just slide the markers.

```bash
python3 analyze_script.py script.txt --duration 5:27
```
