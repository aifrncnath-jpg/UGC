#!/usr/bin/env python3
"""
SCRIPT ANALYSER — script in, visual plan out.

Style-agnostic. Works for 3D Pixar, claymation, paper 2D, cel, puppet, anything.
No timing. No duration. No BPM. Nothing to configure.

USAGE
  python3 analyze_script.py script.txt

INPUT
  Any plain text file. Marked sections if you have them, otherwise paragraphs,
  otherwise one blob. All three work.

    ## SCENE 2
    copy...

WHAT IT GIVES YOU
  1  every section tagged with its narrative job
  2  every line split into VISUAL BEATS. one beat = one shot
  3  each beat classified:
        SHOW      concrete, film it literally
        DEVICE    abstract, needs a visual metaphor. THIS IS THE CREATIVE WORK
        ADDRESS   spoken to camera
  4  a production inventory pulled out of the script:
        characters, locations, props
  5  shot count per section, derived from visual beats not from seconds
  6  flags: what needs a device, what is under-visualised, what is repetitive
"""

import argparse
import re
import sys
from collections import Counter

# ---------------------------------------------------------------- narrative jobs

KEYWORDS = [
    ("cta", ["click", "link below", "link in bio", "order now", "shop now", "cart",
             "checkout", "flat sale", "discount", "coupon", "in stock", "sold out",
             "limited time", "act now", "get yours", "today only", "leave a link",
             "while supplies last"]),
    ("transformation", ["after 2 days", "after two days", "day one", "week 1", "week one",
                        "week 2", "week two", "after a month", "after a week", "30 days",
                        "here is exactly how", "here's exactly how", "my body changed",
                        "game changer", "deserve the hype", "results"]),
    ("failed_fixes", ["i tried", "tried everything", "nothing worked", "didn't work",
                      "did not work", "when that failed", "wasted", "home remedies",
                      "remedies", "moved on to", "the only way i knew how", "resorted to",
                      "hoping it would", "gave up on", "one after another"]),
    ("mechanism", ["works by", "formulated", "ingredient", "the science", "how it works",
                   "root cause", "comes down to", "isn't even about", "it's about balance",
                   "natural baseline", "what was actually going wrong"]),
    ("turn", ["that's when", "thats when", "but then i", "until i", "a close friend",
              "my friend", "she told me", "he told me", "showed me", "finally explained",
              "explained what", "discovered", "found out", "confided", "recommended"]),
    ("proof", ["reviews", "five-star", "5-star", "star reviews", "thousands of",
               "hundreds of videos", "going viral", "completely viral", "testimonial",
               "clinically", "studies", "research", "proven", "trusted by"]),
    ("stakes", ["terrified", "afraid", "scared", "embarrassed", "ashamed", "humiliated",
                "blaming", "hated myself", "so stressed", "avoided", "cancelled",
                "nearly lost", "cost me", "gave up"]),
    ("rift", ["relationship", "marriage", "my partner", "my husband", "my wife",
              "pulling us apart", "physical disconnect", "drifted", "stopped acting",
              "wedge"]),
    ("payoff", ["but today", "now i", "these days", "finally feel", "got my life back",
                "back to normal", "like it used to", "spark back", "lovebirds"]),
    ("problem", ["for months", "for years", "every single day", "struggled",
                 "second-guessing", "kept thinking", "something was wrong",
                 "no matter what", "kept getting worse"]),
]

# ---------------------------------------------------------------- beat classification

# Physical, filmable action or object. If a line has these, you can just show it.
CONCRETE = [
    "walk", "walking", "sit", "sitting", "stand", "standing", "lie", "lying", "run",
    "reach", "reaching", "hold", "holding", "pick", "picking", "open", "opening", "close",
    "closing", "pour", "pouring", "drink", "drinking", "eat", "eating", "wash", "washing",
    "scrub", "shower", "bath", "dress", "dressing", "wake", "waking", "sleep", "sleeping",
    "look", "looking", "stare", "staring", "smile", "smiling", "laugh", "laughing", "cry",
    "crying", "kiss", "kissing", "hug", "hugging", "touch", "touching", "push", "pull",
    "throw", "carry", "hand", "hands", "show", "showed", "showing", "point", "pointing",
    "scroll", "scrolling", "tap", "type", "read", "reading", "buy", "bought", "bring",
    "brought", "give", "gave", "take", "took", "put", "wear", "wearing", "leave", "left",
    "enter", "sat", "stood", "turned", "grabbed", "leaned", "mirror", "bottle", "phone",
    "laptop", "juice", "soap", "towel", "bed", "sofa", "couch", "table", "door", "window",
]

# Abstract concepts. These need a visual DEVICE, not literal depiction.
ABSTRACT = [
    "balance", "levels", "ph", "bacteria", "health", "confidence", "confident", "anxiety",
    "stress", "stressed", "feeling", "feelings", "felt", "thinking", "thought", "believe",
    "hope", "hoping", "fear", "afraid", "terrified", "ashamed", "embarrassed", "self-conscious",
    "relief", "comfort", "hydration", "moisture", "odor", "odour", "dryness", "irritation",
    "discomfort", "inside my body", "inside your body", "immune", "metabolism", "hormones",
    "energy", "focus", "inflammation", "gut", "microbiome", "restore", "support", "improve",
    "reason", "cause", "problem", "issue", "confidence", "spark", "connection", "disconnect",
    "intimacy", "chaos", "worse", "better", "second-guessing", "wrong with me",
]

ADDRESS = [
    "you", "your", "you're", "youre", "let me tell", "i'm gonna", "im gonna", "trust me",
    "listen", "here is exactly", "here's exactly", "if you", "so if you", "i'll leave",
    "click", "link", "believe me", "y'all", "yall",
]

# ---------------------------------------------------------------- inventory

CHARACTER_WORDS = ["boyfriend", "girlfriend", "husband", "wife", "partner", "friend", "bestie",
                   "mom", "mother", "dad", "father", "sister", "brother", "daughter", "son",
                   "doctor", "gynecologist", "dermatologist", "nurse", "coworker", "neighbour",
                   "neighbor", "roommate", "trainer", "stranger", "boss"]

# Locations are usually NOT named in dialogue. They are implied by the action.
# "washing more often" means a bathroom even though the word never appears.
INFERRED_LOCATIONS = {
    "bathroom":    ["wash", "washing", "shower", "showered", "scrub", "soap", "mirror",
                    "towel", "bath", "sink", "toilet", "getting ready", "brush"],
    "bedroom":     ["bed", "bedroom", "sleep", "asleep", "woke", "wake", "waking", "pillow",
                    "sheets", "lying next to", "night", "pajamas", "undress"],
    "kitchen":     ["kitchen", "fridge", "refrigerator", "juice", "drink", "drinking",
                    "chugging", "coffee", "breakfast", "dishes", "counter", "glass",
                    "poured", "pour", "cooking", "dinner"],
    "living room": ["couch", "sofa", "living room", "tv", "television", "cuddl", "lounge"],
    "cafe":        ["cafe", "coffee shop", "latte", "confided", "met up", "catching up"],
    "pharmacy":    ["pharmacy", "drugstore", "aisle", "over-the-counter", "shelf",
                    "suppositories", "chemist"],
    "street":      ["street", "walking", "outside", "shopping", "errands", "sidewalk",
                    "commute", "drive", "car"],
    "office":      ["office", "work", "meeting", "desk", "boss", "coworker"],
    "gym":         ["gym", "workout", "training", "treadmill", "yoga", "leggings"],
    "dining":      ["dinner table", "dining", "at dinner", "eating together"],
}

LOCATION_WORDS = ["bathroom", "bedroom", "kitchen", "living room", "hallway", "shower",
                  "cafe", "coffee shop", "restaurant", "pharmacy", "store", "shop",
                  "supermarket", "street", "car", "office", "gym", "park", "beach",
                  "garden", "yard", "hotel", "clinic", "hospital", "closet", "mirror",
                  "dinner table", "sofa", "couch", "bed", "fridge", "refrigerator"]

PROP_WORDS = ["gummies", "gummy", "capsule", "pill", "bottle", "jar", "tub", "sachet",
              "cream", "serum", "powder", "juice", "soap", "towel", "phone", "laptop",
              "tablet", "mirror", "leggings", "underwear", "suppositories", "applicator",
              "box", "package", "receipt", "coffee", "mug", "glass", "cart", "plant",
              "flowers", "book", "keys", "bag"]


def wordcount(t):
    return len(re.findall(r"\b[\w'-]+\b", t))


def has(text, words):
    return [w for w in words if re.search(r"\b" + re.escape(w) + r"\b", text)]


# ---------------------------------------------------------------- segmenting

def segment(path):
    raw = open(path, encoding="utf-8").read()

    if re.search(r"^##\s+", raw, flags=re.M):
        out = []
        for chunk in re.split(r"^##\s+", raw, flags=re.M):
            if not chunk.strip():
                continue
            lines = chunk.strip().split("\n")
            name, body = lines[0].strip(), " ".join(lines[1:]).strip()
            if wordcount(body):
                out.append({"name": name, "body": body})
        if out:
            return out, "section markers"

    paras = [p.strip() for p in re.split(r"\n\s*\n", raw) if wordcount(p.strip()) >= 5]
    if len(paras) >= 3:
        return [{"name": f"BEAT {i+1}", "body": p} for i, p in enumerate(paras)], "paragraph breaks"

    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", raw) if s.strip()]
    if not sents:
        sys.exit("Could not read any text from that file.")
    size = max(1, len(sents) // 10)
    groups, buf = [], []
    for s in sents:
        buf.append(s)
        if len(buf) >= size:
            groups.append(" ".join(buf)); buf = []
    if buf:
        groups.append(" ".join(buf))
    return [{"name": f"BEAT {i+1}", "body": g} for i, g in enumerate(groups)], "sentence grouping"


def tag_job(secs):
    n = len(secs)
    for i, s in enumerate(secs):
        t = (s["name"] + " " + s["body"]).lower()
        job = None
        if i == 0:
            job = "hook"
        elif i == n - 1:
            job = "cta" if has(t, KEYWORDS[0][1]) else "payoff"
        if not job:
            for cand, keys in KEYWORDS:
                if has(t, keys):
                    job = cand; break
        if not job:
            job = "problem" if i < n * 0.4 else "body"
        s["job"] = job
    return secs


# ---------------------------------------------------------------- visual beats

def split_beats(body):
    """One visual beat per idea. Split on sentences, then on strong internal breaks."""
    parts = re.split(r"(?<=[.!?])\s+", body)
    beats = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        # long sentences with list commas or semicolons carry multiple visual ideas
        if wordcount(p) > 22:
            subs = re.split(r",\s+(?=and\s|then\s|but\s|so\s)|;\s*", p)
            subs = [x.strip() for x in subs if wordcount(x.strip()) >= 3]
            beats.extend(subs if len(subs) > 1 else [p])
        else:
            beats.append(p)
    # merge fragments that are too short to be their own shot
    merged = []
    for b in beats:
        if merged and wordcount(b) < 4:
            merged[-1] = merged[-1] + " " + b
        else:
            merged.append(b)
    return merged


def classify(beat):
    t = beat.lower()
    c, a, d = has(t, CONCRETE), has(t, ABSTRACT), has(t, ADDRESS)
    if len(d) >= 2 and not c:
        return "ADDRESS", d[:3]
    if c and len(c) >= len(a):
        return "SHOW", c[:3]
    if a:
        return "DEVICE", a[:3]
    if d:
        return "ADDRESS", d[:3]
    return "SHOW", []


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--full", action="store_true", help="print every beat, not just DEVICE beats")
    args = ap.parse_args()

    secs, how = segment(args.script)
    secs = tag_job(secs)

    total_beats = 0
    kinds = Counter()
    all_text = " ".join(s["body"] for s in secs).lower()

    for s in secs:
        s["beats"] = [{"text": b, "kind": classify(b)[0], "why": classify(b)[1]}
                      for b in split_beats(s["body"])]
        total_beats += len(s["beats"])
        for b in s["beats"]:
            kinds[b["kind"]] += 1

    print("=" * 84)
    print(f"  {args.script}")
    print("=" * 84)
    print(f"  segmented by      {how}")
    print(f"  sections          {len(secs)}")
    print(f"  visual beats      {total_beats}   <- distinct visual ideas in the copy")
    print(f"  shot estimate     {round(total_beats*1.8)} to {round(total_beats*2.4)}"
          f"   <- beats x coverage. see note below")
    print(f"  breakdown         SHOW {kinds['SHOW']}  |  DEVICE {kinds['DEVICE']}"
          f"  |  ADDRESS {kinds['ADDRESS']}")

    # ---------------- inventory
    print()
    print("-" * 84)
    print("  PRODUCTION INVENTORY — pulled from the script")
    print("-" * 84)
    chars = has(all_text, CHARACTER_WORDS)
    props = has(all_text, PROP_WORDS)

    # locations: named directly OR inferred from the action
    locs = {}
    for loc, cues in INFERRED_LOCATIONS.items():
        hits = has(all_text, cues)
        if hits:
            locs[loc] = hits
    for loc in has(all_text, LOCATION_WORDS):
        locs.setdefault(loc, ["named directly"])

    print(f"  characters besides the narrator   {', '.join(chars) if chars else 'none found'}")
    print(f"    -> character sheets needed      {len(chars) + 1}  (narrator + {len(chars)})")
    print(f"  props                             {', '.join(props) if props else 'none found'}")
    print()
    print(f"  locations implied by the action   {len(locs)}")
    for loc, cues in sorted(locs.items(), key=lambda x: -len(x[1])):
        print(f"    {loc:<14} from: {', '.join(cues[:4])}")
    print(f"    -> set plates needed            {len(locs)}"
          f"  (x2 if any location appears in both a sad and a happy scene)")

    # ---------------- sections
    print()
    print("-" * 84)
    print(f"  {'SECTION':<15}{'JOB':<16}{'SHOTS':>6}{'SHOW':>6}{'DEVICE':>8}{'ADDRESS':>9}")
    print("-" * 84)
    for s in secs:
        k = Counter(b["kind"] for b in s["beats"])
        print(f"  {s['name'][:14]:<15}{s['job']:<16}{len(s['beats']):>6}"
              f"{k['SHOW']:>6}{k['DEVICE']:>8}{k['ADDRESS']:>9}")
    print("-" * 84)
    print(f"  {'TOTAL':<31}{total_beats:>6}{kinds['SHOW']:>6}"
          f"{kinds['DEVICE']:>8}{kinds['ADDRESS']:>9}")

    # ---------------- the creative work
    print()
    print("=" * 84)
    print("  BEATS NEEDING A VISUAL DEVICE — this is where the creative work is")
    print("=" * 84)
    print("  These lines are abstract. You cannot film them literally. Each one needs a")
    print("  metaphor, a character, an object, or an exaggeration that carries the idea.")
    print()
    for s in secs:
        dev = [b for b in s["beats"] if b["kind"] == "DEVICE"]
        if not dev:
            continue
        print(f"  {s['name']}  ({s['job']})")
        for b in dev:
            txt = b["text"] if len(b["text"]) <= 92 else b["text"][:89] + "..."
            print(f"     - {txt}")
            print(f"       abstract: {', '.join(b['why'])}")
        print()

    if args.full:
        print("=" * 84)
        print("  ALL BEATS")
        print("=" * 84)
        for s in secs:
            print(f"\n  {s['name']}  ({s['job']})")
            for i, b in enumerate(s["beats"], 1):
                txt = b["text"] if len(b["text"]) <= 78 else b["text"][:75] + "..."
                print(f"    {i:>2}. [{b['kind']:<7}] {txt}")

    # ---------------- flags
    print("=" * 84)
    print("  FLAGS")
    print("=" * 84)
    warn = []
    thin = [s["name"] for s in secs if len(s["beats"]) <= 1 and s["job"] != "cta"]
    if thin:
        warn.append(f"only one visual beat in {', '.join(thin)} — will feel static, "
                    "invent extra shots or merge the section")
    heavy = [s["name"] for s in secs if len(s["beats"]) >= 9]
    if heavy:
        warn.append(f"{', '.join(heavy)} carries a lot of beats — split into sub-sequences "
                    "so you can pace it")
    if kinds["DEVICE"] > kinds["SHOW"]:
        warn.append("more abstract beats than concrete ones. this script is idea-heavy, "
                    "so your visual devices ARE the ad. budget design time accordingly")
    if kinds["ADDRESS"] > total_beats * 0.3:
        warn.append("heavy direct address. decide early whether the voice is NARRATION "
                    "over visuals or a character PERFORMING to camera. narration means "
                    "almost no lip sync work")
    if not chars:
        warn.append("no second character found. single-character film, so carry emotion "
                    "with environment and objects")
    if len(locs) > 8:
        warn.append(f"{len(locs)} locations found. that is a lot of set plates. "
                    "consider merging some")
    for w in warn or ["none"]:
        print(f"    - {w}")

    print()
    print("=" * 84)
    print("  NEXT STEP")
    print("=" * 84)
    print("  1. Pick your STYLE PACK from STYLE-PACKS.md")
    print("     3D Pixar | claymation | paper 2D cutout | 2D cel | felt | puppet")
    print("  2. Solve every DEVICE beat above. That is the creative decision.")
    print("  3. Build the design bible: character blocks for each character found,")
    print("     one set plate per location found.")
    print("  4. Write the shotlist: one row per visual beat, with camera and lens.")
    print("  5. Generate reference sheets, approve, then stills, then video.")
    print()
    print("  Full method in WORKFLOW.md")
    print()
    print("=" * 84)
    print("  BEATS vs SHOTS")
    print("=" * 84)
    print("  A BEAT is one idea in the copy. A SHOT is one image on screen.")
    print("  One beat almost always becomes two or three shots, because you cover it:")
    print()
    print("    beat:  'she tried washing more often'")
    print("    shots: 1. steps out of the shower, hopeful")
    print("           2. close on her face as the hope drops")
    print("           3. macro insert, hand pressing the soap pump")
    print()
    print("  Typical coverage multipliers:")
    print("    x1.5   sparse, montage-led, lots of held shots")
    print("    x2.0   normal for a story ad")
    print("    x2.5   fast-cut, high-energy, comedy beats")
    print()
    print("  DEVICE beats usually need MORE shots than SHOW beats, because a metaphor")
    print("  needs setup and payoff. Budget 2 to 3 shots for each one.")
    print()


if __name__ == "__main__":
    main()
