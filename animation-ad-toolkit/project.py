#!/usr/bin/env python3
"""
PROJECT CONFIG — fill this in, then run build_project.py

This is the ONE file you edit per project. Everything else is generated.

  1. pick STYLE
  2. describe your CHARACTERS
  3. describe your LOCATIONS
  4. solve your DEVICES  (run analyze_script.py first to get the list)

Leave DEVICES empty on the first pass. Run the build, read the DEVICE list it
prints, then come back and fill them in.
"""

# ---------------------------------------------------------------- 1. STYLE

# pixar | claymation | paper2d | cel2d | felt | puppet
STYLE = "pixar"

# Shot count is DERIVED from each beat, not declared. This only nudges it.
#   sparse = one fewer shot per beat, more held shots, montage feel
#   normal = leave the derivation alone
#   fast   = one more shot per beat, high-energy cutting
PACING = "normal"

# delivery ratio for everything that goes on screen
RATIO = "9:16"


# ---------------------------------------------------------------- 2. CHARACTERS

# The key is the name you will use in shot descriptions, in CAPS.
# "desc" is pasted byte-identical into every prompt featuring them.
# Give each character ONE distinctive detail. It matters more than everything else.
# "wardrobe" can hold several named states. "default" is used unless a shot says otherwise.

CHARACTERS = {
 "HERO": {
   "desc": ("a grown woman aged 32, warm brown skin with a dewy finish, long oval face with high "
            "sculpted cheekbones and a clearly visible jawline, large expressive dark brown eyes "
            "with glossy detailed irises and bright catchlights, long defined eyelashes, thin high "
            "arched eyebrows, slender nose, full lips, a small beauty mark below her left eye, "
            "shoulder-length dense natural curls in warm medium brown, calm confident mature adult "
            "bearing, 5 foot 6"),
   "wardrobe": {
     "default": "washed grey ribbed tank top, faded olive-green leggings, bare feet",
     "warm":    "mustard-yellow oversized cardigan, white ribbed tank top, olive-green leggings",
     "sleep":   "white ribbed tank top and soft cotton shorts",
   },
 },
 # "PARTNER": {"desc": "...", "wardrobe": {"default": "..."}},
}


# ---------------------------------------------------------------- 3. LOCATIONS

# One entry per set. Add a "warm" variant for any location that appears in both a
# sad scene and a happy scene.

LOCATIONS = {
 "bathroom": {
   "cold": ("a complete empty bathroom interior in one wide straight-on view showing the whole "
            "room, a pedestal sink centred against the back wall with a large round mirror "
            "directly above it facing the camera square on, a walk-in shower behind a glass panel "
            "on the left, a closed toilet on the right, an open doorway at the right edge, clear "
            "empty floor space in front of the sink, desaturated grey-green wall tiles, a single "
            "round ceiling fixture casting harsh cool light straight downward, cold clinical and "
            "unflattering"),
   "warm": ("the exact same bathroom interior with identical layout and identical camera position, "
            "now filled with warm golden morning sunlight, soft warm bounce light across the "
            "tiles, bright and inviting, saturated warm palette"),
 },
 # "kitchen": {"cold": "...", "warm": "..."},
}


# ---------------------------------------------------------------- 4. DEVICES

# The abstract lines from analyze_script.py, and what each one LOOKS like.
# Key = a distinctive fragment of the line. Value = the visual you decided on.
#
# Five ways to solve one:
#   give it a character | give it a gauge | give it a living object
#   break physics | show the failure instead of stating it

DEVICES = {
 # "it's about balance": (
 #     "a glowing translucent console floating above the world with three large circular gauges "
 #     "side by side, all three needles dropped low into a dark red zone and all three unlit"),
 # "pulling us apart": (
 #     "overhead shot of the couple lying at the far opposite ends of a bed that has stretched "
 #     "impossibly long between them, surreal exaggerated scale"),
}


# ---------------------------------------------------------------- 5. OPTIONAL

# Anything you want appended to every single shot prompt. Usually leave empty.
GLOBAL_EXTRA = ""

# Recurring background object that changes state across the film. Leave "" to skip.
MOTIF = ""
# e.g. MOTIF = "a small potted plant on the windowsill, drooping and yellow in early scenes and
#               thriving and green in later ones"
