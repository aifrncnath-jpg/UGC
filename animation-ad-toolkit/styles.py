#!/usr/bin/env python3
"""The six style packs as data. Used by build_project.py."""

PACKS = {

"pixar": {
 "name": "3D Pixar / Disney CG",
 "look": ("Disney Pixar style 3D animated feature film frame, polished major-studio CG "
          "animation, appealing stylized character design with rounded soft shape language, very "
          "large expressive eyes with detailed glossy irises, bright multiple catchlights and a "
          "soft wet lower lid, long individually defined eyelashes, thin high arched expressive "
          "eyebrows, small delicate rounded nose, smooth flawless skin with warm subsurface "
          "scattering and soft specular highlights, warm key light with cool complementary fill "
          "and a bright rim light separating the character from the background, ray-traced global "
          "illumination with soft bounce light, vibrant saturated colour palette, clean readable "
          "silhouette, subtle squash-and-stretch appeal, path-traced render, extremely high "
          "detail, feature-animation quality"),
 "env":  ("Disney Pixar style 3D animated feature film environment frame, polished major-studio "
          "CG animation, appealing stylized set design with rounded soft shape language, warm key "
          "light with cool complementary fill and bright rim light, ray-traced global illumination "
          "with soft bounce light, vibrant saturated colour palette, fully built and readable "
          "environment, deep focus, path-traced render, extremely high detail, "
          "feature-animation quality"),
 "cu":   ("tight close-up framing, face filling the frame, gentle cinematic depth of field with "
          "soft background falloff"),
 "wide": ("fully built and readable environment, deep focus, characters clearly separated from "
          "the set by composition colour and light"),
 "neg":  ("photorealistic, live action, real human photograph, uncanny valley, dull flat matte "
          "skin, plastic toy surface, wet plastic skin, dead lifeless eyes, small squinting eyes, "
          "anime, manga, chibi, 2D cartoon, cel shaded, clay, stop motion, extra fingers, "
          "deformed hands, malformed face, asymmetrical eyes, text, lettering, watermark, logo, "
          "blown-out highlights, muddy desaturated colour, flat lighting, low detail, immature "
          "facial proportions, oversized head relative to the body, short stubby build, round "
          "puffy cheeks, undefined jawline, doll-like figure, toy figurine"),
 "bias": ("realistic adult human body proportions of seven and a half head-heights tall, head "
          "small relative to the body, long adult legs, definitely a fully grown adult and "
          "absolutely not a child or a teenager, and in close framing the face still reads as an "
          "adult with a long narrow face, sculpted hollow under the cheekbones, a firm defined "
          "jawline and slim cheeks rather than soft full ones, fully clothed at all times"),
 "sheet_extra": "",
},

"claymation": {
 "name": "Claymation / stop motion",
 "look": ("handmade stop-motion claymation frame, physical plasticine puppet sculpted by hand, "
          "visible fingerprints and thumb impressions across the surface, sculpting tool marks "
          "and seam lines, slightly uneven asymmetrical features, soft matte clay sheen catching "
          "practical light, tiny dust and lint specks on the surface, real miniature set built "
          "from cardboard fabric and painted foam, practical tungsten set lighting with warm "
          "falloff, macro miniature depth, subtle frame-to-frame imperfection, tactile and "
          "imperfect and obviously handmade, cinematic stop-motion feature quality"),
 "env":  ("handmade stop-motion miniature set built from cardboard painted foam and fabric, "
          "visible craft materials and glue seams, hand-painted surfaces with brush marks, "
          "practical tungsten lighting with warm falloff, macro miniature scale, tactile and "
          "obviously handmade, cinematic stop-motion feature quality"),
 "cu":   ("macro close-up on the clay face, shallow miniature depth of field, individual "
          "fingerprints clearly visible in the clay surface"),
 "wide": ("full miniature set visible, practical lights in frame, deep focus so the whole "
          "handmade set reads clearly"),
 "neg":  ("smooth glossy CG, polished 3D render, plastic perfection, digital sheen, "
          "photorealistic human skin, symmetrical flawless features, machine-perfect symmetry, "
          "injection moulded, anime, 2D cartoon, cel shaded, vector art, clean vector edges, "
          "text, lettering, watermark, logo, flat lighting, low detail, sterile studio background"),
 "bias": ("heavy visible fingerprints pressed into the clay, pinched clay edges, a faint seam "
          "where the head meets the body, one eye very slightly larger than the other, small "
          "nicks and imperfections in the surface, grounded adult proportions"),
 "sheet_extra": "",
},

"paper2d": {
 "name": "Paper 2D cutout",
 "look": ("paper cutout stop-motion animation frame, characters and set built from layered "
          "coloured construction paper and card, visible torn and scissor-cut edges showing the "
          "white paper core, paper fibre texture and grain, each layer casting a distinct soft "
          "drop shadow onto the layer behind it, slight fold creases and dog-eared corners, flat "
          "colour with visible paper tooth, hand-assembled collage feel, practical soft overhead "
          "lighting raking across the paper so the layers separate, charming and tactile and "
          "obviously made of paper"),
 "env":  ("layered coloured construction paper diorama set, torn and cut paper edges, visible "
          "paper grain and fibre, four or five depth layers each casting a soft drop shadow, "
          "practical raking overhead light, hand-assembled collage feel, obviously made of paper"),
 "cu":   ("macro on the paper character, individual paper fibres and torn edge fuzz clearly "
          "visible, shallow tabletop depth"),
 "wide": ("full layered paper diorama, four or five depth layers separated by soft drop shadow, "
          "deep focus"),
 "neg":  ("3D render, CG, volumetric shading, glossy surfaces, photorealistic, smooth gradients, "
          "digital vector art, flat vector graphic with no shadows, clean anti-aliased edges, "
          "anime, cel shaded, painted illustration, text, lettering, watermark, logo, flat "
          "lighting with no shadow separation, low detail"),
 "bias": ("each paper layer casting a distinct soft drop shadow onto the layer behind it, "
          "visible paper fibre and tooth in every surface, torn edges showing the white paper "
          "core, grounded adult proportions"),
 "sheet_extra": "",
},

"cel2d": {
 "name": "2D cel animation",
 "look": ("traditional 2D hand-drawn cel animation frame, clean confident ink line work with "
          "varying line weight, flat colour fills with a limited deliberate palette, simple "
          "two-tone cel shading with hard-edged shadow shapes, hand-painted gouache background "
          "with soft brush texture, slight line wobble, western hand-drawn animation tradition, "
          "expressive readable character posing, strong clear silhouette, cinematic composition, "
          "feature animation quality"),
 "env":  ("hand-painted 2D animation background, gouache on board, soft visible brush texture, "
          "limited deliberate palette, cinematic staging, western animation tradition, "
          "no line-art characters, no people"),
 "cu":   ("tight framing on the character, clean ink line clearly visible, flat colour fill, "
          "hard-edged cel shadow shapes"),
 "wide": ("hand-painted gouache background with visible brush texture, characters in clean cel "
          "line over it, clear readable staging"),
 "neg":  ("3D render, CG, photorealistic, volumetric lighting, soft airbrushed gradients, anime, "
          "manga, big sparkly eyes, speed lines, screentone, chibi, clay, stop motion, paper "
          "cutout, sketchy unfinished lines, muddy colour, text, lettering, watermark, logo, "
          "low detail, cluttered background"),
 "bias": ("western hand-drawn animation tradition, naturalistic adult facial proportions, no "
          "anime styling, no oversized sparkling eyes, no speed lines, no manga screentone"),
 "sheet_extra": "",
},

"felt": {
 "name": "Needle felt / wool",
 "look": ("needle-felted wool stop-motion frame, character hand-felted from soft merino wool, "
          "visible individual wool fibres and a fuzzy halo of loose fibres catching the light, "
          "slightly lumpy hand-shaped forms, tiny glass bead eyes with a single specular dot, "
          "felt seams and stitch lines, soft matte fibrous surface with no sheen, miniature set "
          "built from felt fabric and wood, warm practical lighting raking across the fibres, "
          "macro tabletop scale, cosy tactile and obviously handmade from wool"),
 "env":  ("needle-felted miniature set built from wool felt and wood, visible fibre texture and "
          "stitch lines, soft matte fibrous surfaces, warm practical raking light, macro tabletop "
          "scale, cosy and obviously handmade"),
 "cu":   ("macro on the felted face, individual wool fibres and the fuzzy edge halo clearly "
          "visible, glass bead eye catchlight, shallow miniature depth"),
 "wide": ("full felt miniature set, warm raking light, deep focus so the fibre texture reads "
          "across the whole frame"),
 "neg":  ("3D render, CG, glossy plastic, smooth hard surfaces, smooth plush fabric, machine-made "
          "toy, velvet, injection moulded, photorealistic skin, sharp precise edges, anime, "
          "2D cartoon, cel shaded, clay, paper, text, lettering, watermark, logo, flat lighting, "
          "cold sterile colour, low detail"),
 "bias": ("individual wool fibres clearly visible on every surface, fuzzy halo of loose fibres "
          "catching the rim light, hand-shaped irregular volumes, grounded adult proportions"),
 "sheet_extra": "",
},

"puppet": {
 "name": "Miniature puppet / diorama",
 "look": ("stop-motion puppet animation frame, articulated puppet with a silicone-skinned head on "
          "a wire armature, visible fabric costume with real woven texture and tiny stitching, "
          "replacement-face seam faintly visible at the brow line, hand-built miniature set with "
          "real materials, wood metal and painted plaster with visible brush marks, practical "
          "film lighting with hard key and deep shadow, anamorphic miniature depth of field, dust "
          "motes in the light beams, slightly gothic storybook feel, tactile physical and "
          "cinematic, feature stop-motion quality"),
 "env":  ("hand-built stop-motion miniature set, wood metal and painted plaster, visible brush "
          "marks and material seams, hard practical key light with deep shadow, dust motes in the "
          "light beams, anamorphic miniature depth, slightly gothic storybook feel, no people"),
 "cu":   ("macro on the puppet face, silicone skin texture and the faint brow seam visible, hard "
          "key light, shallow anamorphic miniature depth"),
 "wide": ("full miniature set with practical lights in frame, dust in the beams, deep focus"),
 "neg":  ("CG render, digital 3D, glossy plastic, photorealistic human, smooth clean surfaces, "
          "anime, 2D cartoon, cel shaded, paper cutout, flat lighting, text, lettering, "
          "watermark, logo, cheap toy look, low detail"),
 "bias": ("real woven fabric texture with visible thread, faint replacement-face seam at the "
          "brow, tiny imperfections and dust on the surface, grounded adult proportions"),
 "sheet_extra": "",
},
}

SHEET_LOOK_SUFFIX = (", character design sheet, even neutral studio lighting, plain flat empty "
                     "light grey background. The entire image is ONLY the design sheet against a "
                     "completely flat plain empty background. No environment, no scenery, no "
                     "landscape, no buildings, no props, no furniture, no background "
                     "illustration, no extra panels and no borders. The image contains "
                     "absolutely no text, letters, words, numbers, titles or labels of any kind")

VIDEO_TAGS = ("smooth cinematic 24fps motion, consistent character identity throughout, stable "
              "facial features, no face morphing, no warping, no flickering, consistent lighting")

VIDEO_NEG = ("face morphing, identity drift, warping features, flickering, jitter, stuttering "
             "motion, melting hands, extra limbs, sudden style change, camera spinning wildly, "
             "text appearing, watermark")

PERF = ("subtle natural performance, gentle breathing, slow blinks, micro-expressions shifting "
        "across the face, hair and fabric settling with soft secondary motion")
