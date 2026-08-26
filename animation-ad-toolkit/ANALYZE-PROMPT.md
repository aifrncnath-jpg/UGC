# PHASE 0 WITHOUT PYTHON

Same analysis, no install. Paste the block below into any AI, then paste your script under it.

---

# COPY EVERYTHING INSIDE THE BOX

```
Act as a senior animation ad producer. Analyse the script below. Return ONLY the sections
described here, as tables and lists. Do not rewrite the script. Do not add commentary or
suggestions yet.

STEP 1 — SEGMENT
Split the script into sections. Use "## " headings if they exist, otherwise use paragraph
breaks, otherwise group sentences into roughly 10 beats.

STEP 2 — TAG EACH SECTION WITH ONE NARRATIVE JOB
  hook            stop the scroll
  problem         agitate, make it recognisable
  failed_fixes    what they already tried
  stakes          what it costs them emotionally
  rift            damage to a relationship or a life
  turn            someone explains the real cause
  mechanism       why the product works
  proof           reviews, virality, authority
  transformation  time-marked results ladder
  payoff          life after
  cta             offer, urgency, action
The first section is almost always hook. The last is cta if it asks for action, otherwise
payoff. Any section you cannot tag is a section not earning its place. Say so.

STEP 3 — SPLIT EVERY SECTION INTO VISUAL BEATS
One beat = one distinct visual idea. Usually one sentence, but split long sentences that
carry several ideas, and merge fragments too short to be their own shot.

STEP 4 — CLASSIFY EVERY BEAT AS ONE OF THREE
  SHOW      concrete and filmable. a physical action, object or place
            example: "she poured a glass of juice"
  DEVICE    abstract. cannot be filmed literally. needs a visual metaphor
            example: "it's about balance" / "I felt broken" / "my confidence came back"
  ADDRESS   spoken to camera, second person, or a call to action
            example: "if you want this, link below"
Rule of thumb: if the line names a feeling, a concept, a measurement, an internal state or a
change with no physical action attached, it is DEVICE.

STEP 5 — PRODUCTION INVENTORY
Pull out of the script:
  CHARACTERS besides the narrator. Count character sheets needed as narrator + these
  LOCATIONS. These are usually NOT named in dialogue, so infer them from the action.
    "washing more often" means a bathroom. "chugging juice" means a kitchen.
    "over-the-counter" means a pharmacy. "confided in a friend" means a cafe.
    For each location, say which words in the script implied it
  PROPS mentioned or implied
  Note which locations appear in BOTH a sad scene and a happy scene. Those need two plates,
  a cold grade and a warm grade

STEP 6 — OUTPUT TABLE
  | SECTION | JOB | BEATS | SHOW | DEVICE | ADDRESS |
  Plus a TOTAL row.

STEP 7 — THE DEVICE LIST
List every DEVICE beat, grouped by section, quoting the line. For each one say which words
make it abstract. Do not solve them yet. This is the list of decisions I have to make.

STEP 8 — SHOT ESTIMATE
  shot floor = total beats
  realistic range = beats x 1.8 to beats x 2.4
Explain that one beat becomes 2 to 3 shots because you cover it, and that DEVICE beats need
more shots than SHOW beats because a metaphor needs setup and payoff.

STEP 9 — FLAGS
Report any of these that apply:
  a section with only one beat, which will feel static
  a section carrying 9 or more beats, which needs splitting into sub-sequences
  more DEVICE beats than SHOW beats, meaning the script is idea-heavy and the visual devices
    ARE the ad
  ADDRESS beats over 30% of the total, meaning I must decide early whether the voice is
    narration over visuals or a character performing to camera
  no second character found, meaning emotion must be carried by environment and objects
  more than 8 locations, meaning too many set plates, consider merging

SCRIPT:
```

Then paste your script.

---

# INPUT FORMAT

Any of these work.

**With markers**
```
## HOOK
your hook copy

## SCENE 2
your scene copy
```

**Without markers** — just paragraphs separated by blank lines.

**One block** — paste the whole thing, it gets grouped into beats.

---

# THEN THE NEXT STEP

Once you have the DEVICE list, that is your creative brief. Paste `WORKFLOW.md` and say:

> Here is my script and the Phase 0 analysis. Run Phase 1: solve every DEVICE beat using the
> five methods in the playbook. Pin each solution to its exact line.

Then pick a pack from `STYLE-PACKS.md` and say:

> Use the [PACK NAME] pack. Run phases 3 and 4: build the design bible and the storyboard.
> One row per shot with ID, camera move, lens, angle, cast, wardrobe, action.

---

# PYTHON VS PASTE-IN

```
one-off project      paste-in. no setup
many projects        install Python, run analyze_script.py
want exact counts    Python. an AI miscounts beats on a long script
```

The paste-in version will usually get beat counts slightly different from the script, and may
miss a location or two. Fine for planning. If you want it exact and repeatable, use Python.

**Windows** — python.org/downloads, tick "Add Python to PATH", then:
```
python analyze_script.py my-script.txt
```

**Mac** — already installed:
```
python3 analyze_script.py my-script.txt
```

**No install** — paste `analyze_script.py` into replit.com or programiz.com online compiler,
add your script as `script.txt`, and change the last line to:
```python
sys.argv = ["x", "script.txt"]
main()
```
