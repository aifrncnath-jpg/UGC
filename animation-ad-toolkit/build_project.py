#!/usr/bin/env python3
"""
BUILD PROJECT — script + project.py  ->  storyboard, prompts, references, tracker

USAGE
  python3 build_project.py my-script.txt

OUTPUTS, in the order you use them
  1-STORYBOARD.md         every shot: ID, framing, camera, lens, angle, action
  2-REFERENCE-PROMPTS.md  character sheets and set plates. GENERATE THESE FIRST
  3-STILL-PROMPTS.md      one prompt per shot
  4-VIDEO-PROMPTS.md      one motion prompt per shot
  5-TRACKER.md            checklist

Run it once with empty DEVICES to get the device list, fill them in, run it again.
"""

import argparse
import os
import re
import sys
from collections import Counter

from analyze_script import (segment, tag_job, split_beats, classify, has,
                            INFERRED_LOCATIONS, CHARACTER_WORDS, PROP_WORDS)
from styles import PACKS, SHEET_LOOK_SUFFIX, VIDEO_TAGS, VIDEO_NEG, PERF
import project as cfg

# ---------------------------------------------------------------- camera arcs
#
# Camera height tracks status: act 1 looks DOWN, the turn is EYE LEVEL, the
# payoff looks UP. Lens tracks intimacy: long and compressed early, wide and
# close late. Framing tracks entrapment: boxed in early, open space late.

JOB_CAM = {
 "hook":           ("50mm",      "eye-level camera", None),
 "problem":        ("85mm",      "high camera angle looking down at the subject",
                    "framed inside a doorway, boxed in by the architecture"),
 "failed_fixes":   ("85mm",      "slightly high camera angle",
                    "framed by hard lines in the set, cabinet edges or tile grid"),
 "stakes":         ("35mm",      "high camera angle",
                    "framed by hard shadow lines falling across the room"),
 "rift":           ("24mm",      "high camera angle",
                    "vast empty negative space dominating the frame"),
 "turn":           ("50mm",      "eye-level camera", "open and safe framing, no obstructions"),
 "mechanism":      ("24mm wide", "low camera angle looking up into the space",
                    "immersive vast scale"),
 "proof":          ("50mm",      "eye-level camera", None),
 "transformation": ("35mm",      "eye-level camera rising toward a slightly low angle",
                    "open unobstructed space around the subject"),
 "payoff":         ("35mm",      "slightly low heroic camera angle",
                    "open unobstructed space, nothing boxing them in"),
 "cta":            ("35mm",      "slightly low heroic camera angle looking up at the subject",
                    "clean uncluttered background with generous empty space in the bottom third "
                    "of frame for graphics"),
 "body":           ("50mm",      "eye-level camera", None),
}

# Coverage roles.
ROLES = {
 1: ["action"],
 2: ["action", "reaction"],
 3: ["establish", "action", "reaction"],
 4: ["establish", "action", "reaction", "insert"],
}

PACING_SHIFT = {"sparse": -1, "normal": 0, "fast": 1}


def count_list_items(beat):
    """A beat that lists things needs one shot per thing.
    'the odor, the dryness, and that constant discomfort' = 3 shots."""
    body = re.sub(r"^[^,]*?\b(is|was|are|were|had|has)\b", "", beat)
    parts = re.split(r",\s*|\s+and\s+", body)
    parts = [p.strip() for p in parts if len(re.findall(r"\b[\w'-]+\b", p)) >= 2]
    return len(parts) if len(parts) >= 2 else 0


def shots_for_beat(beat, kind, job, pacing):
    """How many shots this specific beat earns. Derived, never assumed.

    Signals, in order of weight:
      a list of things            one shot per thing
      length of the beat          more words means more visual ideas
      DEVICE                      needs setup AND payoff, so never 1
      ADDRESS                     a person talking. 1 shot
      cta                         holds, not cuts. capped
    """
    w = len(re.findall(r"\b[\w'-]+\b", beat))
    items = count_list_items(beat)
    reason = []

    if items >= 2:
        n = min(items, 4)
        reason.append(f"lists {items} things")
    elif w <= 8:
        n = 1
        reason.append(f"short beat, {w}w")
    elif w <= 18:
        n = 2
        reason.append(f"medium beat, {w}w")
    else:
        n = 3
        reason.append(f"long beat, {w}w")

    if kind == "DEVICE":
        n += 1
        reason.append("device needs setup and payoff")
    if kind == "ADDRESS":
        n = 1
        reason = [f"direct address, {w}w"]
    if job == "cta":
        n = min(n, 2)
        reason.append("cta holds rather than cuts")

    n = max(1, min(4, n + PACING_SHIFT.get(pacing, 0)))
    return n, ", ".join(reason)

MOVES = {
 "establish": ["slow steady dolly push inward, gentle and continuous",
               "slow dolly pull backward, the space opening up around the subject",
               "smooth sideways tracking move past the subject with layered parallax",
               "camera rises slowly and steadily from a low starting height"],
 "action":    ["loose organic handheld movement with subtle natural micro-shake",
               "smooth continuous arc orbiting around the subject with strong parallax",
               "continuous forward travel deeper into the environment",
               "slow steady dolly push inward, tightening the frame"],
 "reaction":  ["almost imperceptible slow creeping push inward, the frame quietly breathing",
               "very slow creeping drift toward the subject, almost unnoticeable",
               "locked static camera, the performance carries the shot"],
 "insert":    ["locked macro, only tiny movements inside the frame",
               "very slow macro drift across the object"],
}

FRAMING = {
 "establish": "wide establishing shot of the location",
 "action":    "medium shot",
 "reaction":  "close-up on the face",
 "insert":    "macro insert",
}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "", s.lower())[:14]


SPEAKER_RE = re.compile(r"^\s*([A-Z][A-Z '\-]{1,20})\s*:\s*")


def speaker_of(text):
    """A 'NAME: line' script names its own cast. Returns (name, cleaned_line)."""
    m = SPEAKER_RE.match(text)
    if m:
        return m.group(1).strip(), SPEAKER_RE.sub("", text, count=1).strip()
    return None, text


def find_cast(text, chars, lead):
    """Whoever is named in the line. Falls back to the lead."""
    found = []
    spk, _ = speaker_of(text)
    if spk and spk in chars:
        found.append(spk)
    for name, d in chars.items():
        if name in found:
            continue
        keys = [name] + list(d.get("aka", []))
        if any(re.search(r"\b" + re.escape(k) + r"\b", text, re.I) for k in keys):
            found.append(name)
    if found:
        return found
    if lead and lead not in found:
        # first person copy means the lead is present unless the line is clearly not about them
        if re.search(r"\b(i|my|me|i'?m|i'?ve|i'?d)\b", text, re.I) or not found:
            found.insert(0, lead)
    return found


def find_location(text, locations, previous):
    """Which set this line happens in. Carries the previous location forward when
    the line gives no clue, because scenes do not teleport."""
    for loc, d in locations.items():
        cues = list(d.get("cues", [])) + [loc, loc.rstrip("s")]
        if any(re.search(r"\b" + re.escape(c) + r"\b", text, re.I) for c in cues if c):
            return loc, "named"
    return (previous, "carried") if previous else (next(iter(locations), None), "default")


NIGHT_CUES = ["night", "midnight", "bed", "asleep", "sleeping", "woke", "wake", "pyjama",
              "pajama", "dark", "lamp off"]


def pick_wardrobe(text, char_cfg, section, overrides):
    """Section override wins. Otherwise infer night wear. Otherwise default."""
    if section in overrides:
        w = overrides[section]
        if w in char_cfg.get("wardrobe", {}):
            return w
    if "sleep" in char_cfg.get("wardrobe", {}) and any(
            re.search(r"\b" + c + r"\b", text, re.I) for c in NIGHT_CUES):
        return "sleep"
    return "default"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--out", default=".")
    args = ap.parse_args()

    if cfg.STYLE not in PACKS:
        sys.exit(f"STYLE '{cfg.STYLE}' not found. Options: {', '.join(PACKS)}")
    pack = PACKS[cfg.STYLE]
    NEG = pack["neg"]
    global PACING
    PACING = getattr(cfg, "PACING", "normal")
    if PACING not in PACING_SHIFT:
        sys.exit(f"PACING must be one of: {', '.join(PACING_SHIFT)}")

    secs, how = tag_job(segment(args.script)[0]), segment(args.script)[1]
    all_text = " ".join(s["body"] for s in secs).lower()

    # ---------------- beats
    for s in secs:
        s["beats"] = [{"text": b, "kind": classify(b)[0], "why": classify(b)[1]}
                      for b in split_beats(s["body"])]

    # ---------------- device matching
    unsolved = []
    for s in secs:
        for b in s["beats"]:
            b["device"] = None
            if b["kind"] == "DEVICE":
                for frag, sol in cfg.DEVICES.items():
                    if frag.lower() in b["text"].lower():
                        b["device"] = sol
                        break
                if not b["device"]:
                    unsolved.append((s["name"], b["text"], b["why"]))

    # ---------------- expand to shots
    names = list(cfg.CHARACTERS)
    lead = names[0] if names else None
    ward_over = getattr(cfg, "WARDROBE_BY_SECTION", {})
    loc_over = getattr(cfg, "LOCATION_BY_SECTION", {})
    motif_locs = getattr(cfg, "MOTIF_LOCATIONS", None)
    shots = []
    move_i = 0
    prev_loc = None
    for s in secs:
        lens, angle, frame = JOB_CAM.get(s["job"], JOB_CAM["body"])
        for bi, b in enumerate(s["beats"], 1):
            cast = find_cast(b["text"], cfg.CHARACTERS, lead)
            if s["name"] in loc_over:
                loc, loc_how = loc_over[s["name"]], "override"
            else:
                # a solved device usually states its own location, so check it first
                probe = (b["device"] or "") + " " + b["text"]
                loc, loc_how = find_location(probe, cfg.LOCATIONS, prev_loc)
            prev_loc = loc
            n, why = shots_for_beat(b["text"], b["kind"], s["job"], PACING)
            b["shots"] = n
            b["why_shots"] = why
            for ri, role in enumerate(ROLES[n], 1):
                move_i += 1
                pool = MOVES[role]
                move = pool[move_i % len(pool)]
                is_cta = s["job"] == "cta" and role == "reaction"
                if is_cta:
                    move = ("absolutely locked static camera, zero camera movement, "
                            "tripod-locked frame")
                shots.append({
                    "id": f"{slug(s['name'])}.{bi}{chr(96+ri)}",
                    "section": s["name"], "job": s["job"],
                    "beat": b["text"], "kind": b["kind"], "device": b["device"],
                    "role": role, "framing": FRAMING[role],
                    "lens": lens, "angle": angle, "frame": frame, "move": move,
                    "cast": cast,
                    "loc": loc, "loc_how": loc_how,
                    "wardrobe": {c: pick_wardrobe(b["text"], cfg.CHARACTERS[c],
                                                  s["name"], ward_over) for c in cast},
                    "beat_shots": n, "why_shots": why,
                    "grade": "warm" if s["job"] in ("transformation", "payoff", "cta") else "cold",
                })

    # ---------------- assemble a prompt
    def cam_spec(sh):
        bits = [f"shot on a virtual {sh['lens']} lens", sh["angle"], sh["framing"]]
        if sh["frame"]:
            bits.append(sh["frame"])
        return ", ".join(bits)

    def action_line(sh):
        if sh["device"]:
            return sh["device"].rstrip(".")
        _, beat = speaker_of(sh["beat"])
        beat = beat.rstrip(" .!?,;")
        sh = {**sh, "beat": beat}
        who = " and ".join(sh["cast"]) if sh["cast"] else "the subject"
        if sh["role"] == "reaction":
            return f"close on {who}'s face, reacting to: {sh['beat']}"
        if sh["role"] == "insert":
            return f"macro insert of the key object in this moment: {sh['beat']}"
        if sh["role"] == "establish":
            return f"wide establishing view of the location for this moment: {sh['beat']}"
        return f"{who} in the moment of: {sh['beat']}"

    def build_still(sh):
        env_only = not sh["cast"]
        parts = []
        for c in sh["cast"]:
            parts.append(f"{c}: {cfg.CHARACTERS[c]['desc']}. {pack['bias']}.")
            wd = cfg.CHARACTERS[c]["wardrobe"].get(sh["wardrobe"].get(c, "default"))
            if wd:
                parts.append(f"{c} WARDROBE: {wd}.")
        parts.append(action_line(sh) + ".")

        # the set. without this every shot is a character floating in a style block
        if sh["loc"] and sh["loc"] in cfg.LOCATIONS:
            grades = cfg.LOCATIONS[sh["loc"]]
            g = sh["grade"] if sh["grade"] in grades else next(iter(grades))
            desc = grades.get(g)
            if desc:
                parts.append(f"SET, {sh['loc']} ({g}): {desc}.")

        # BUG 3 fix: motif only where it makes sense
        if cfg.MOTIF and sh["cast"] and (motif_locs is None or sh["loc"] in motif_locs):
            parts.append(f"In the background, {cfg.MOTIF}.")
        parts.append(cam_spec(sh) + ".")
        look = pack["env"] if env_only else pack["look"]
        variant = pack["cu"] if sh["role"] in ("reaction", "insert") else pack["wide"]
        parts.append(f"{look}, {variant}, vertical {cfg.RATIO} composition.")
        if cfg.GLOBAL_EXTRA:
            parts.append(cfg.GLOBAL_EXTRA)
        return " ".join(parts)

    def build_video(sh):
        return f"{sh['move']}. Subject: {action_line(sh)}. {PERF}. {VIDEO_TAGS}."

    os.makedirs(args.out, exist_ok=True)
    W = lambda f, t: open(os.path.join(args.out, f), "w").write(t)

    # ================================================ 01 REFERENCES
    r = ["# 2 — REFERENCE PROMPTS", "",
         f"Style pack: **{pack['name']}**", "",
         "Generate these FIRST and approve them before any shot. Everything downstream",
         "inherits whatever you approve here.", "", "---", "",
         "# CHARACTER SHEETS", "", "**RATIO: 16:9** — sheets need width, they never go on screen", ""]
    for c, d in cfg.CHARACTERS.items():
        r += [f"## {c} — turnaround", "", "**RATIO: 16:9**", "", "```",
              f"{c}: {d['desc']}. {pack['bias']}. "
              f"{c} WARDROBE: {d['wardrobe'].get('default','')}. "
              "Three full-length views of the same character side by side in one image, front view, "
              "three-quarter view and side profile view, identical character in all three, standing "
              "upright at full height in a neutral relaxed pose, entire body from head to feet "
              f"visible in every view. {pack['look']}{SHEET_LOOK_SUFFIX}.",
              "", f"Negative prompt: {NEG}", "```", "",
              f"Save as `REF_{c}.png`", "", "---", ""]
    r += ["# SET PLATES", "", f"**RATIO: {cfg.RATIO}** — empty rooms, no people", "",
          "A plate is not a pretty photo of a corner. It is a **stageable room**: whole space,",
          "straight on, key furniture facing camera, clear floor space. If you cannot picture the",
          "shot happening in it, the plate has failed.", "",
          "Generate cold and warm back to back in the same session, attaching the cold plate to",
          "make the warm one. Relight, do not rebuild.", ""]
    for loc, grades in cfg.LOCATIONS.items():
        for g, desc in grades.items():
            att = "no reference" if g == "cold" else f"**attach the {loc} cold plate**"
            r += [f"## {loc.upper()} — {g.upper()}", "",
                  f"**RATIO: {cfg.RATIO}**  ·  {att}  ·  save as `SET_{slug(loc)}_{g}.png`", "",
                  "```", f"{desc}. {pack['env']}, vertical {cfg.RATIO} composition. "
                  "Completely empty with no characters, no creatures and no figures in frame. "
                  "The image contains absolutely no text, letters, words, numbers, signs or labels.",
                  "", f"Negative prompt: {NEG}", "```", "", "---", ""]
    W("2-REFERENCE-PROMPTS.md", "\n".join(r))

    # ================================================ 02 STORYBOARD
    b = ["# 1 — STORYBOARD", "",
         f"**{len(shots)} shots.**  Style: **{pack['name']}**.  Pacing: **{PACING}**.", "",
         "Shot count came from your script. A line that lists three things got three shots.",
         "A four-word line got one. Nothing was assumed.", "",
         "## YOUR ONE JOB HERE", "",
         "The ACTION column is your script copy, which is dialogue rather than stage direction.",
         "**Rewrite each ACTION into what the camera SEES, not what the voice says.**", "",
         "Rows marked **DEVICE** are abstract lines that cannot be filmed literally. Those need",
         "a visual idea, not just a rewrite. The build printed the full list in the console.", "",
         "Everything else — IDs, framing, camera moves, lenses, angles — is decided.", "",
         "---", ""]
    cur = None
    for sh in shots:
        if sh["section"] != cur:
            cur = sh["section"]
            b += ["", f"## {cur}  ·  job: {sh['job']}", "",
                  f"*{sh['lens']} · {sh['angle']}*", "",
                  "| ID | Framing | Location | Cast | Wardrobe | Camera move | Kind | Action (rewrite this) |",
                  "|---|---|---|---|---|---|---|---|"]
        act = sh["device"] or sh["beat"]
        act = act if len(act) < 90 else act[:87] + "..."
        kind = "**DEVICE**" if sh["kind"] == "DEVICE" else sh["kind"]
        solved = " solved" if sh["device"] else ""
        cast = "+".join(sh["cast"]) or "—"
        ward = "/".join(sorted(set(sh["wardrobe"].values()))) or "—"
        b += [f"| `{sh['id']}` | {sh['framing']} | {sh['loc'] or '—'} ({sh['grade']}, {sh['loc_how']}) | {cast} "
              f"| {ward} | {sh['move'][:30]}... | {kind}{solved} | {act} |"]
    W("1-STORYBOARD.md", "\n".join(b))

    # ================================================ 3 STILL PROMPTS
    p = ["# 3 — STILL PROMPTS", "",
         f"**{len(shots)} shots.** Style: **{pack['name']}**. Ratio **{cfg.RATIO}**.", "",
         "Each block is one copy-paste. Negative prompt is already inside it.", "",
         "**Attach your approved `REF_*` images on every shot.**", "",
         "Work through this **batched by location**, not in this order. All bathroom shots in one",
         "session, all kitchen shots in one session. Better continuity, fewer rerolls.", "",
         "---", ""]
    cur = None
    for sh in shots:
        if sh["section"] != cur:
            cur = sh["section"]
            p += [f"# {cur}", ""]
        p += [f"### `{sh['id']}` — {sh['framing']}"
              + ("  ⭐ **DEVICE**" if sh["kind"] == "DEVICE" else ""), "",
              f"**RATIO: {cfg.RATIO}**", "", f"*{cam_spec(sh)}*", "",
              "```", build_still(sh), "", f"Negative prompt: {NEG}", "```", ""]
    W("3-STILL-PROMPTS.md", "\n".join(p))

    # ================================================ 4 VIDEO PROMPTS
    v = ["# 4 — VIDEO PROMPTS", "",
         f"**{len(shots)} clips.** Ratio **{cfg.RATIO}**.", "",
         "**Image-to-video only. Feed the approved still.** Text-to-video gives a different face",
         "on every clip and there is no recovering from it.", "",
         "Generate 2 to 4 seconds only. Short clips are your best defence against artifacts.", "",
         "---", ""]
    cur = None
    for sh in shots:
        if sh["section"] != cur:
            cur = sh["section"]
            v += [f"# {cur}", ""]
        v += [f"### `{sh['id']}` — feed `{sh['id']}.png`", "",
              "```", build_video(sh), "", f"Negative prompt: {VIDEO_NEG}", "```", ""]
    W("4-VIDEO-PROMPTS.md", "\n".join(v))

    # ================================================ 04 STATUS
    st = ["# 5 — TRACKER", "", f"Style: **{pack['name']}**  ·  Ratio: **{cfg.RATIO}**", "",
          "## STAGE 1 — REFERENCES  (do these first)", "",
          "| | Asset | Ratio | Save as |", "|---|---|---|---|"]
    for c in cfg.CHARACTERS:
        st.append(f"| [ ] | {c} turnaround | 16:9 | `REF_{c}.png` |")
    for loc, grades in cfg.LOCATIONS.items():
        for g in grades:
            st.append(f"| [ ] | {loc} {g} plate | {cfg.RATIO} | `SET_{slug(loc)}_{g}.png` |")
    st += ["", f"## STAGE 2 — STILLS  ({len(shots)} shots)", "",
           "| | ID | Section | Done | Approved |", "|---|---|---|---|---|"]
    for sh in shots:
        st.append(f"| [ ] | `{sh['id']}` | {sh['section']} | | |")
    W("5-TRACKER.md", "\n".join(st))

    # ================================================ console
    kinds = Counter(sh["kind"] for sh in shots)
    print("=" * 78)
    print(f"  BUILT — style: {pack['name']}")
    print("=" * 78)
    print(f"  script lines     {sum(len(s['beats']) for s in secs)}")
    dist = Counter(sh["beat_shots"] for sh in shots)
    beats_by_n = Counter()
    for sec in secs:
        for bb in sec["beats"]:
            beats_by_n[bb["shots"]] += 1
    print(f"  shots            {len(shots)}   derived from the script, pacing '{PACING}'")
    print(f"  shots per line   " + "  ".join(
        f"{c} lines -> {n}" for n, c in sorted(beats_by_n.items())))
    print(f"  device shots     {kinds['DEVICE']}")
    cast_use = Counter()
    for sh in shots:
        for c in sh["cast"]:
            cast_use[c] += 1
    print(f"  characters       {len(cfg.CHARACTERS)} sheets   "
          + "  ".join(f"{c} in {n}" for c, n in cast_use.most_common()))
    unused_c = [c for c in cfg.CHARACTERS if c not in cast_use]
    if unused_c:
        print(f"                   WARNING: {', '.join(unused_c)} appear in NO shots")
    loc_use = Counter(sh["loc"] for sh in shots)
    print(f"  locations        " + "  ".join(f"{l}:{n}" for l, n in loc_use.most_common()))
    unused_l = [l for l in cfg.LOCATIONS if l not in loc_use]
    if unused_l:
        print(f"                   WARNING: {', '.join(unused_l)} used in NO shots")
    guessed = {}
    for sh in shots:
        if sh["loc_how"] in ("carried", "default"):
            guessed.setdefault(sh["section"], set()).add(sh["loc"])
    if guessed:
        print()
        print("  REVIEW THESE LOCATIONS — guessed, not stated in the line")
        for sec, ls in guessed.items():
            print(f"    {sec:<12} guessed {', '.join(sorted(ls))}")
        print("    Set LOCATION_BY_SECTION in project.py for any that are wrong.")
    ward_use = Counter(w for sh in shots for w in sh["wardrobe"].values())
    print(f"  wardrobe         " + "  ".join(f"{w}:{n}" for w, n in ward_use.most_common()))
    print(f"  set plates       {sum(len(g) for g in cfg.LOCATIONS.values())}")
    print()
    print("  WROTE")
    for f in ["1-STORYBOARD.md", "2-REFERENCE-PROMPTS.md", "3-STILL-PROMPTS.md",
              "4-VIDEO-PROMPTS.md", "5-TRACKER.md"]:
        print(f"    {f}")

    if unsolved:
        print()
        print("=" * 78)
        print(f"  {len(unsolved)} ABSTRACT LINES NEED A VISUAL IDEA")
        print("=" * 78)
        print("  These cannot be filmed literally. Decide what each one looks like, add it to")
        print("  DEVICES in project.py, then run this again.")
        print()
        seen = set()
        for sec, txt, why in unsolved:
            if sec not in seen:
                print(f"  {sec}")
                seen.add(sec)
            t = txt if len(txt) <= 84 else txt[:81] + "..."
            print(f"     - {t}")
            print(f"       abstract: {', '.join(why)}")
        print()
        print("  Five ways to solve one:")
        print("    give it a character | give it a gauge | give it a living object")
        print("    break physics | show the failure instead of stating it")
    else:
        print()
        print("  Every abstract line has a visual. Nothing outstanding.")

    # speakers named in the script but missing from CHARACTERS
    spoken = set()
    for sec in secs:
        for bb in sec["beats"]:
            sp, _ = speaker_of(bb["text"])
            if sp:
                spoken.add(sp)
    missing_spk = sorted(spoken - set(cfg.CHARACTERS))
    if missing_spk:
        print()
        print("=" * 78)
        print("  STOP — SPEAKERS IN THE SCRIPT ARE NOT IN YOUR CONFIG")
        print("=" * 78)
        print(f"  The script has dialogue from: {', '.join(missing_spk)}")
        print(f"  Your CHARACTERS are: {', '.join(cfg.CHARACTERS) or 'none'}")
        print("  Every one of their lines was cast as the lead instead. Add them to")
        print("  CHARACTERS in project.py and build again.")

    # missing inventory
    found_chars = has(all_text, CHARACTER_WORDS)
    if len(found_chars) + 1 > len(cfg.CHARACTERS):
        print()
        print(f"  NOTE: script mentions {', '.join(found_chars)} — you have "
              f"{len(cfg.CHARACTERS)} character(s) defined. Add the missing ones to CHARACTERS.")
    inferred = [l for l, cues in INFERRED_LOCATIONS.items() if has(all_text, cues)]
    missing_locs = [l for l in inferred if l not in cfg.LOCATIONS]
    if missing_locs:
        print()
        print("=" * 78)
        print("  LOCATIONS THE SCRIPT NEEDS BUT YOUR CONFIG DOES NOT HAVE")
        print("=" * 78)
        print(f"  {', '.join(missing_locs)}")
        print("  Those shots were forced into a location you did define, which is almost")
        print("  certainly wrong. Add them to LOCATIONS in project.py.")
    print()


if __name__ == "__main__":
    main()
