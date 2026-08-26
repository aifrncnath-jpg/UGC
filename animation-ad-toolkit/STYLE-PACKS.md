# STYLE PACKS

Six ready packs. Pick one, drop it into the workflow, everything else stays the same.

Each pack has four parts:

```
1  LOOK          the positive attributes. what makes it read as this style
2  NEGATIVE      the opposite. never put a LOOK attribute in here
3  BIAS FIX      what this style gets wrong by default, countered in every prompt
4  VARIANTS      close-up, wide, environment
```

**The ENVIRONMENT variant is mandatory in every pack.** A style block that describes eyes and
skin will put a person into an empty room, whatever the style you are working in.

---

# HOW TO USE A PACK

```
[LOOK]  +  [CHARACTER BLOCK incl. BIAS FIX]  +  [WARDROBE]  +  [ACTION]  +  [CAMERA]

Negative prompt: [NEGATIVE]
```

Identity first, style last. Models weight earlier tokens more heavily, and across a long
shotlist face consistency beats style purity.

---

# PACK 1 — 3D PIXAR / DISNEY CG

## LOOK
```
Disney Pixar style 3D animated feature film frame, polished major-studio CG animation,
appealing stylized character design with rounded soft shape language, very large expressive
eyes with detailed glossy irises, bright multiple catchlights and a soft wet lower lid, long
individually defined eyelashes, thin high arched expressive eyebrows, small delicate rounded
nose, smooth flawless skin with warm subsurface scattering and soft specular highlights, warm
key light with cool complementary fill and a bright rim light separating the character from
the background, ray-traced global illumination with soft bounce light, vibrant saturated
colour palette, clean readable silhouette, subtle squash-and-stretch appeal, path-traced
render, extremely high detail, feature-animation quality
```

Filtered-name fallback, swap the first clause only:
`Polished 3D animated feature film frame, major-studio western CG animation look,`

## NEGATIVE
```
photorealistic, live action, real human photograph, uncanny valley, dull flat matte skin,
plastic toy surface, wet plastic skin, dead lifeless eyes, small squinting eyes, anime, manga,
chibi, 2D cartoon, cel shaded, clay, stop motion, extra fingers, deformed hands, malformed
face, asymmetrical eyes, text, lettering, watermark, logo, blown-out highlights, muddy
desaturated colour, flat lighting, low detail
```

**Never put `glossy skin` or `bokeh` in the negative on this pack.** Both are load-bearing.

## BIAS FIX — faces read too young
Add to every character block:
```
realistic adult human body proportions of seven and a half head-heights tall, head small
relative to the body, long adult legs, definitely a fully grown adult and absolutely not a
child or a teenager, and in close framing the face still reads as an adult with a long narrow
face, sculpted hollow under the cheekbones, a firm defined jawline and slim cheeks rather than
soft full ones
```
Negative additions: `immature facial proportions, oversized head relative to the body, short
stubby build, round puffy cheeks, undefined jawline, doll-like figure`

## VARIANTS
```
CLOSE-UP     + tight close-up framing, face filling the frame, gentle cinematic depth of
               field with soft background falloff
WIDE         + fully built and readable environment, deep focus, characters clearly separated
               from the set by composition colour and light
ENVIRONMENT    Disney Pixar style 3D animated feature film environment frame, polished
               major-studio CG animation, appealing stylized set design with rounded soft
               shape language, warm key light with cool complementary fill and bright rim
               light, ray-traced global illumination, vibrant saturated colour, fully built
               readable environment, deep focus, path-traced render, extremely high detail
```

## What actually makes it
Complementary three-point light. Bounce light. Wet eyes with catchlights. Asymmetric
expressions. Subsurface scattering, not gloss alone.

---

# PACK 2 — CLAYMATION / STOP MOTION

## LOOK
```
handmade stop-motion claymation frame, physical plasticine puppet sculpted by hand, visible
fingerprints and thumb impressions across the surface, sculpting tool marks and seam lines,
slightly uneven asymmetrical features, soft matte clay sheen catching practical light, tiny
dust and lint specks on the surface, real miniature set built from cardboard fabric and
painted foam, practical tungsten set lighting with warm falloff, macro miniature depth,
shallow tabletop scale, subtle frame-to-frame imperfection, tactile and imperfect and
obviously handmade, cinematic stop-motion feature quality
```

## NEGATIVE
```
smooth glossy CG, polished 3D render, plastic perfection, digital sheen, photorealistic human
skin, symmetrical flawless features, anime, 2D cartoon, cel shaded, vector art, clean vector
edges, text, lettering, watermark, logo, flat lighting, low detail, sterile studio background
```

**Do NOT put `matte`, `imperfect`, `asymmetrical` or `fingerprints` in the negative.** Those
are the whole point.

## BIAS FIX — goes too smooth and glossy
Models default to clean CG. Push hard on material imperfection in every prompt:
```
heavy visible fingerprints, pinched clay edges, a faint seam where the head meets the body,
one eye very slightly larger than the other, small nicks in the surface
```
Negative additions: `flawless surface, glossy plastic, machine-perfect symmetry, injection
moulded`

## VARIANTS
```
CLOSE-UP     + macro close-up on the clay face, shallow miniature depth of field, individual
               fingerprints clearly visible in the surface
WIDE         + full miniature set visible, practical lights in frame, deep focus so the whole
               handmade set reads
ENVIRONMENT    handmade stop-motion miniature set built from cardboard painted foam and
               fabric, visible craft materials and glue seams, practical tungsten lighting
               with warm falloff, tactile and obviously handmade, no characters
```

## Note
Claymation is the one pack where **shallow depth of field is correct** on close-ups, because
real miniature photography has it. On wides keep deep focus so the handmade set reads.

---

# PACK 3 — PAPER 2D CUTOUT

## LOOK
```
paper cutout stop-motion animation frame, characters and set built from layered coloured
construction paper and card, visible torn and scissor-cut edges, paper fibre texture and
grain, layers casting soft real drop shadows onto the layers behind them, slight fold creases
and dog-eared corners, flat colour with visible paper tooth, hand-assembled collage feel,
practical soft overhead lighting raking across the paper so the layers separate, shallow
tabletop depth, charming and tactile and obviously made of paper
```

## NEGATIVE
```
3D render, CG, volumetric shading, glossy surfaces, photorealistic, smooth gradients, digital
vector art, clean anti-aliased edges, anime, cel shaded, painted illustration, text,
lettering, watermark, logo, flat lighting with no shadow separation, low detail
```

## BIAS FIX — flattens into vector art with no material
Paper needs **physical shadow and texture** or it looks like a flat graphic:
```
each paper layer casting a distinct soft drop shadow onto the layer behind it, visible paper
fibre and tooth in every surface, torn edges showing white paper core
```
Negative additions: `flat vector graphic, no shadows, digital illustration, smooth clean
edges`

## VARIANTS
```
CLOSE-UP     + macro on the paper character, individual paper fibres and torn edge fuzz
               clearly visible, shallow tabletop depth
WIDE         + full layered paper diorama, four or five depth layers separated by shadow,
               deep focus
ENVIRONMENT    layered coloured construction paper diorama set, torn and cut paper edges,
               visible paper grain, each layer casting a soft drop shadow, practical raking
               overhead light, no characters
```

## Note
Paper is the cheapest style to keep consistent, because a character is a **fixed set of
shapes** rather than a sculpted form. Great choice if character drift has been hurting you.

---

# PACK 4 — 2D CEL ANIMATION

## LOOK
```
traditional 2D hand-drawn cel animation frame, clean confident ink line work with varying
line weight, flat colour fills with a limited deliberate palette, simple two-tone cel shading
with hard-edged shadow shapes, hand-painted background in gouache with soft brush texture,
slight line wobble from frame to frame, western animation tradition, expressive readable
character posing, strong clear silhouette, cinematic composition, feature animation quality
```

## NEGATIVE
```
3D render, CG, photorealistic, volumetric lighting, soft airbrushed gradients, anime, manga,
big sparkly eyes, chibi, clay, stop motion, paper cutout, sketchy unfinished lines, muddy
colour, text, lettering, watermark, logo, low detail, cluttered background
```

## BIAS FIX — drifts to anime
Almost every model treats "2D animation" as anime. Counter explicitly:
```
western hand-drawn animation tradition, naturalistic facial proportions, no anime styling, no
oversized sparkling eyes, no speed lines, no manga screentone
```

## VARIANTS
```
CLOSE-UP     + tight framing on the character, clean ink line clearly visible, flat colour
               fill, hard-edged cel shadow
WIDE         + hand-painted gouache background with visible brush texture, characters in
               clean cel line over it, clear staging
ENVIRONMENT    hand-painted 2D animation background, gouache on board, soft brush texture,
               limited deliberate palette, cinematic staging, no line-art characters,
               no people
```

## Note
2D is the most forgiving pack for **character consistency**, because you are matching a small
set of line shapes and flat colours rather than a 3D form under changing light. It is the
least forgiving for **motion**, since image-to-video tools tend to add 3D volume. Keep clips
short and prefer simple moves.

---

# PACK 5 — NEEDLE FELT / WOOL

## LOOK
```
needle-felted wool stop-motion frame, characters hand-felted from soft merino wool, visible
individual wool fibres and fuzzy halo edges catching the light, slightly lumpy hand-shaped
forms, tiny glass bead eyes with a single specular dot, felt seams and stitch lines, soft
matte fibrous surface with no sheen, miniature set built from felt fabric and wood, warm
practical lighting raking across the fibres, macro tabletop scale, cosy tactile and obviously
handmade from wool
```

## NEGATIVE
```
3D render, CG, glossy plastic, smooth hard surfaces, photorealistic skin, sharp precise
edges, anime, 2D cartoon, cel shaded, clay, paper, text, lettering, watermark, logo, flat
lighting, cold sterile colour, low detail
```

## BIAS FIX — renders as smooth plush toy with no fibre
```
individual wool fibres clearly visible on every surface, fuzzy halo of loose fibres catching
the rim light, hand-shaped irregular volumes
```
Negative additions: `smooth plush fabric, machine-made toy, velvet, injection moulded`

## VARIANTS
```
CLOSE-UP     + macro on the felted face, individual wool fibres and the fuzzy edge halo
               clearly visible, glass bead eye catchlight, shallow miniature depth
WIDE         + full felt miniature set, warm raking light, deep focus so the fibre texture
               reads across the whole frame
ENVIRONMENT    needle-felted miniature set built from wool felt and wood, visible fibre
               texture and stitch lines, warm practical raking light, cosy handmade, no
               characters
```

## Note
Strongest pack for **warmth and trust**, which makes it a good fit for older-demographic
health and home products. Weakest for anything that needs to look premium or clinical.

---

# PACK 6 — MINIATURE PUPPET / DIORAMA

## LOOK
```
stop-motion puppet animation frame, articulated puppet with a silicone-skinned head on a wire
armature, visible fabric costume with real woven texture and tiny stitching, replacement-face
seam faintly visible at the brow line, hand-built miniature set with real materials, wood
metal and painted plaster, practical film lighting with hard key and deep shadow, anamorphic
miniature depth of field, dust motes in the light beams, slightly gothic storybook feel,
tactile physical and cinematic, feature stop-motion quality
```

## NEGATIVE
```
CG render, digital 3D, glossy plastic, photorealistic human, smooth clean surfaces, anime, 2D
cartoon, cel shaded, paper cutout, flat lighting, text, lettering, watermark, logo, cheap toy
look, low detail
```

## BIAS FIX — looks like a smooth CG doll
```
real woven fabric texture with visible thread, faint replacement-face seam at the brow, tiny
imperfections and dust on the surface, hand-painted set with visible brush marks
```

## VARIANTS
```
CLOSE-UP     + macro on the puppet face, silicone skin texture and the faint brow seam
               visible, hard key light, shallow anamorphic miniature depth
WIDE         + full miniature set with practical lights, dust in the beams, deep focus
ENVIRONMENT    hand-built stop-motion miniature set, wood metal and painted plaster, visible
               brush marks and material seams, hard practical key light with deep shadow,
               dust motes in the beams, no characters
```

## Note
Highest perceived production value of the six, and the most demanding. Hard light and deep
shadow are the signature, which means your colour script has to be planned carefully or
scenes go muddy.

---

# CHOOSING A PACK

| If you want | Use |
|---|---|
| Broadest appeal, most familiar, safest for a client | **3D Pixar** |
| Warmth, charm, handmade honesty | **Claymation** or **Needle felt** |
| Cheapest to keep consistent, strong graphic identity | **Paper 2D** |
| Storytelling clarity, expressive posing, nostalgic | **2D cel** |
| Premium, cinematic, slightly dark | **Puppet diorama** |
| Older demographic, health and home, trust | **Needle felt** |
| Comedy that needs exaggeration | **Claymation** or **3D Pixar** |

## Which pack fights you least on consistency

```
easiest   Paper 2D        a character is a fixed set of shapes
          2D cel          flat colour and line, no volume to drift
          Needle felt     simple forms, forgiving surface
          Claymation      forgiving, but fights you toward smoothness
          3D Pixar        many variables, but strong reference support
hardest   Puppet diorama  hard light plus fine texture punishes every inconsistency
```

## Which pack fights you least on motion

```
easiest   3D Pixar        image-to-video tools are trained heavily on CG motion
          Puppet          physical motion reads naturally
          Claymation      good, but watch for smoothing
          Needle felt     good
          Paper 2D        tools try to add 3D volume to flat layers
hardest   2D cel          tools consistently add volume and break the flat look
```

---

# WRITING YOUR OWN PACK

Answer four questions and you have one.

**1. What are the load-bearing features?** The 5 to 8 attributes that, if missing, make it
read as the wrong style. These go in the **positive** prompt.

**2. What is the opposite?** Those go in the negative. Then **cross-check that nothing from
question 1 has landed in the negative.** That is the commonest self-inflicted wound in this
whole process.

**3. What does this style get wrong by default?** Every style has a bias. Write the
counter-instruction into the character block so it repeats on every single shot.

**4. What are the three variants?** Close-up, wide, and environment. The environment variant
must have all face and anatomy language stripped out.

## Pack checklist
- 5 to 8 load-bearing positive attributes
- Negative prompt with zero load-bearing attributes in it
- A bias counter-instruction living inside the character block
- Three variants written, including environment
- A fallback phrasing if any trademarked name in the pack gets filtered
