# ANIMATION AD TOOLKIT

Script in. Storyboard, prompts and a tracker out.

Any animation style. Any script. You pick the look.

---

# THE WORKFLOW

```
1  SCRIPT      ->  STORYBOARD          you approve the plan
2  STORYBOARD  ->  ALL PROMPTS         generated for you
3  REFERENCE IMAGES                    generate, you approve. LOCKS the look
4  SHOT STILLS                         generate, you approve
5  VIDEO CLIPS                         generate, you approve
6  ASSEMBLY                            cut, caption, sound, export
```

Full detail in `WORKFLOW.md`, one gate per stage.

---

# HOW TO RUN IT

## 1. Put your script in a text file

```
## HOOK
your hook copy

## SCENE 2
your scene copy
```

Section markers are optional. Plain paragraphs work too.

## 2. Fill in `project.py`

Three things:

```python
STYLE = "pixar"        # pixar | claymation | paper2d | cel2d | felt | puppet

CHARACTERS = { "HERO": {"desc": "...", "wardrobe": {...}} }

LOCATIONS  = { "bathroom": {"cold": "...", "warm": "..."} }
```

## 3. Build

```bash
python3 build_project.py my-script.txt
```

You get five files:

```
1-STORYBOARD.md         every shot: framing, camera, lens, angle, action
2-REFERENCE-PROMPTS.md  character sheets and set plates. generate these FIRST
3-STILL-PROMPTS.md      one prompt per shot
4-VIDEO-PROMPTS.md      one motion prompt per shot
5-TRACKER.md            checklist
```

Every prompt is one copy-paste. Ratio on top, negative prompt already inside.

## 4. Solve the abstract lines

The build prints a list of lines it cannot film literally:

```
30 ABSTRACT LINES NEED A VISUAL IDEA

SCENE 8
   - it threw my body into absolute chaos
   - I became terrified of the aftermath
```

Decide what each one looks like, add it to `DEVICES` in `project.py`, build again.

**This is the actual creative work.** Anyone can shoot a woman pouring juice. Deciding what
*"absolute chaos"* looks like is the job.

Five ways to solve one:

| Method | Example |
|---|---|
| Give it a character | An abstract threat becomes a creature with a face and an arc |
| Give it a gauge | An invisible measurement becomes a dial that moves |
| Give it a living object | Health becomes a plant that wilts and revives in the background |
| Break physics | Emotional distance becomes a bed that stretches impossibly long |
| Show the failure | Do not say the remedy failed. Show it failing |

## 5. Rewrite the action lines

They come from your script copy, which is dialogue rather than stage direction. One pass:
replace each with **what the camera sees**, not what the voice says.

Then generate, in stage order.

---

# WHAT IS DECIDED FOR YOU

- Shot count, derived from the script. A line listing three things gets three shots.
  A four-word line gets one
- Framing per shot: wide, medium, close-up, macro insert
- Camera move per shot, motivated, and no two adjacent shots repeat one
- Lens and camera angle, following three arcs that run under the whole film
- Full prompt assembly in the right order, identity first
- Ratios: 16:9 for reference sheets, your delivery ratio for everything on screen
- Negative prompts, inline, with the known traps already avoided
- Reference sheet prompts and set plate prompts, pulled from your config
- A tracker with a row per shot

# WHAT YOU DECIDE

- The style
- The characters and locations
- What every abstract line looks like
- The action lines

---

# THE FILES

```
README.md               this file
WORKFLOW.md             the six stages, gates, failure table, decision rules
STYLE-PACKS.md          the six looks explained, and how to write your own
project.py              your config. the only file you edit
build_project.py        the build
styles.py               the six packs as data
analyze_script.py       optional. inspect a script before committing to it
ANALYZE-PROMPT.md       optional. same inspection with no Python
example-script.txt      input format example
```

---

# THE SIX STYLES

| Pack | Best for | Consistency | Motion |
|---|---|---|---|
| `pixar` | Broadest appeal, safest with clients | medium | easiest |
| `claymation` | Warmth, handmade honesty, comedy | medium | good |
| `paper2d` | Cheapest to keep consistent | **easiest** | hard |
| `cel2d` | Storytelling clarity, nostalgic | easy | **hardest** |
| `felt` | Older demographic, trust, cosy | easy | good |
| `puppet` | Premium, cinematic, slightly dark | **hardest** | good |

Change one word in `project.py` and every prompt rebuilds in the new style.

Each pack carries a **bias fix**, because every style gets something wrong by default:

```
pixar        faces read too young
claymation   goes too smooth and glossy
paper2d      flattens into vector art with no material
cel2d        drifts to anime
felt         renders as a smooth plush toy with no fibre
puppet       looks like a smooth CG doll
```

The fix lives inside the character block, so it repeats on every single shot.

---

# THREE PROMPT TRAPS ALREADY HANDLED

**Never put a load-bearing attribute in the negative prompt.** On a glossy CG pack, `glossy
skin` and `bokeh` must never be negatives. Each pack is cross-checked.

**Never put age words near clothing words.** Listing "child, teenager" in the same string as
"nude, topless" gets the generation refused, because classifiers scan the whole prompt and do
not distinguish negatives from positives. Age and clothing are handled positively instead.

**Text beats negative prompts.** `text` in the negative loses regularly. Every sheet prompt
carries a positive instruction instead.

---

# CONTINUING ON ANOTHER PLATFORM

Upload `WORKFLOW.md` and `STYLE-PACKS.md`, then:

> I am producing an animated ad. WORKFLOW.md is my production method, STYLE-PACKS.md has my
> style options. Read both, then act as my senior creative director. Here is my script.
> Start at Stage 1 and give me the storyboard.

No prior conversation needed.
