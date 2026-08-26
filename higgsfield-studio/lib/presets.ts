/**
 * Style presets tuned for the kind of work this studio is built for:
 * UGC-style ads, VSL b-roll, DTC/ecom product shots, and health/supplement
 * creatives in vertical 9:16.
 *
 * Each preset is appended to your prompt, so you write the SUBJECT and the
 * preset carries the LOOK. Keeps character consistency across a batch.
 */

export interface StylePreset {
  id: string;
  name: string;
  group: string;
  /** Appended after your subject text. */
  text: string;
  /** Suggested negative prompt for this look. */
  negative?: string;
  hint?: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "pixar-3d",
    name: "Disney / Pixar 3D feature",
    group: "Animated",
    hint: "Default hero look. Glossy skin and depth of field are load-bearing here, never negative them.",
    text: "Polished 3D animated feature film frame, major-studio western CG animation look. Very large expressive eyes with glossy detailed irises and bright catchlights, long defined eyelashes. Smooth flawless skin with warm subsurface scattering and glossy specular highlights. Warm key light with cool complementary fill plus a clean rim light, ray-traced global illumination, vibrant saturated colour, gentle cinematic depth of field, crisp render, high detail.",
    negative:
      "anime, chibi, 2D cartoon, plastic toy surface, dull flat matte skin, dead eyes, lowres, deformed hands, extra fingers, watermark, text artifacts",
  },
  {
    id: "pixar-3d-adult",
    name: "Disney / Pixar 3D — mature adult",
    group: "Animated",
    hint: "Use when the character must read as a grown adult. This style biases faces young, so age is stated explicitly.",
    text: "Polished 3D animated feature film frame, major-studio western CG animation look. Mature adult facial structure, clearly an adult in their thirties to forties, defined jawline and adult proportions, subtle expression lines. Very large expressive eyes with glossy detailed irises and bright catchlights, long defined eyelashes. Smooth skin with warm subsurface scattering and glossy specular highlights. Warm key light with cool complementary fill plus rim light, ray-traced global illumination, vibrant saturated colour, gentle cinematic depth of field.",
    negative:
      "anime, chibi, 2D cartoon, plastic toy surface, dull flat matte skin, dead eyes, child face, teenager, baby proportions, lowres, deformed hands, watermark",
  },
  {
    id: "claymation",
    name: "Handmade stop-motion claymation",
    group: "Animated",
    hint: "Grounded practical look. Deep focus on purpose, no bokeh.",
    text: "Cinematic handmade stop-motion claymation frame. Physical plasticine puppet with visible fingerprints and sculpting tool marks, slight asymmetry, natural sculpted lips and eyelids, human-like mature proportions rather than cartoon caricature. Minimalist set built from the same handmade clay materials, practical set lighting, macro miniature scale, deep focus with full-scene clarity, subjects separated by composition, colour, and spacing.",
    negative:
      "background blur, bokeh, shallow depth of field, glossy plastic, smooth CG surface, 2D cartoon, anime, lowres, watermark",
  },
  {
    id: "ugc-selfie",
    name: "UGC selfie / phone camera",
    group: "Ads",
    hint: "The scroll-stopper. Looks like a real person filmed it themselves.",
    text: "Authentic user-generated content still, shot on a modern smartphone front camera at arm's length. Real unretouched skin texture with visible pores, natural indoor window light, slightly imperfect framing, casual home background with lived-in clutter, candid honest expression, mild handheld feel, no studio polish, vertical composition.",
    negative:
      "studio lighting, professional model, airbrushed skin, stock photo look, watermark, text overlay, oversaturated",
  },
  {
    id: "dtc-product",
    name: "DTC ecom product hero",
    group: "Ads",
    text: "Clean commercial product photograph, single hero product centred and tack sharp, soft large-source studio lighting with a gentle gradient falloff, subtle contact shadow, seamless minimal backdrop, accurate label legibility, premium ecommerce catalogue finish, high resolution.",
    negative:
      "cluttered background, duplicate product, distorted label, gibberish text, harsh reflections, watermark",
  },
  {
    id: "supplement-flatlay",
    name: "Health / supplement flat lay",
    group: "Ads",
    text: "Top-down flat lay on a warm neutral surface, supplement bottle as the focal point surrounded by fresh natural ingredients, soft diffused daylight, clean wellness brand palette of cream, sage, and amber, balanced negative space for caption text, crisp editorial finish.",
    negative: "messy composition, medical clinical coldness, gibberish text, watermark",
  },
  {
    id: "cinematic-broll",
    name: "Cinematic b-roll frame",
    group: "Video prep",
    hint: "Good starting frame for image-to-video. Motion is described so the video model has something to move.",
    text: "Cinematic film still, anamorphic framing, motivated practical lighting with strong depth layers in the foreground, midground, and background, shallow but purposeful focus, filmic colour grade with rich shadows, slight grain, composed to support a slow forward push-in camera move.",
    negative: "flat lighting, static empty composition, watermark, lowres",
  },
  {
    id: "talking-head",
    name: "Talking head / avatar base",
    group: "Video prep",
    hint: "Head-on and evenly lit, so a HeyGen-style avatar or lipsync pass has an easy time.",
    text: "Chest-up portrait facing the camera straight on, neutral relaxed closed mouth, eyes level with the lens, even soft key light on the face with no harsh shadow across the mouth, uncluttered background with clear separation, sharp facial detail, natural skin tone, room left above the head.",
    negative:
      "extreme angle, profile view, hands near face, open mouth, hair covering the mouth, motion blur, watermark",
  },
];

export const ASPECT_RATIO_FALLBACKS = [
  "9:16",
  "16:9",
  "1:1",
  "4:5",
  "3:4",
  "4:3",
  "2:3",
  "3:2",
  "21:9",
];

export function presetById(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find((p) => p.id === id);
}

export function composePrompt(subject: string, presetText?: string): string {
  const parts = [subject.trim(), presetText?.trim()].filter(Boolean);
  return parts.join(" ");
}
