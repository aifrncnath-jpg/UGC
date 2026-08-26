/**
 * Catalog of Higgsfield's image models.
 *
 * Why this exists: the MCP server exposes ONE `generate_image` tool for every
 * model, so its `aspect_ratio` enum is the union of what all models accept. Pick
 * GPT Image 2 with a 4:5 ratio from that union and the call fails, because GPT
 * Image 2 only does 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3.
 *
 * So we keep per-model constraints here and intersect them with whatever the
 * live schema declares. The schema stays authoritative — this only ever narrows
 * the options, never invents ones the server didn't offer.
 *
 * Source: Higgsfield's own CLI model reference
 * https://github.com/higgsfield-ai/cli/blob/main/MODELS.md
 */

export interface ModelSpec {
  /** The value sent to the server, matching Higgsfield's job type slug. */
  id: string;
  label: string;
  /** Shown on the picker card. */
  blurb: string;
  /** Ranked up in the picker; the two the user asked for are tier 1. */
  tier: 1 | 2 | 3;
  aspectRatios: string[];
  /** Values for a `resolution` field, if the model has one. */
  resolutions?: string[];
  defaultResolution?: string;
  /** Values for a `quality` field, if the model has one. */
  qualities?: string[];
  defaultQuality?: string;
  /** Max reference images, 0 when unsupported. */
  maxReferences: number;
  /** Extra name spellings to match against the live schema enum. */
  aliases?: string[];
}

const COMMON_10 = [
  "1:1",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
];
const COMMON_5 = ["1:1", "4:3", "3:4", "16:9", "9:16"];

export const IMAGE_MODELS: ModelSpec[] = [
  {
    id: "nano_banana_2",
    label: "Nano Banana Pro",
    blurb:
      "Google's Gemini 3 Pro Image. Best text and typography in frame, native 2K up to 4K. The default for ad creatives with readable copy.",
    tier: 1,
    aspectRatios: COMMON_10,
    resolutions: ["1k", "2k", "4k"],
    defaultResolution: "2k",
    maxReferences: 14,
    aliases: ["nano-banana-pro", "nano_banana_pro", "nanobananapro", "nano_banana_2"],
  },
  {
    id: "gpt_image_2",
    label: "GPT Image 2",
    blurb:
      "OpenAI's image model. Strong prompt adherence and clean composition, with an explicit quality dial.",
    tier: 1,
    aspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"],
    resolutions: ["1k", "2k", "4k"],
    defaultResolution: "2k",
    qualities: ["low", "medium", "high"],
    defaultQuality: "high",
    maxReferences: 8,
    aliases: ["gpt-image-2", "gptimage2", "gpt_image_two"],
  },
  {
    id: "nano_banana_flash",
    label: "Nano Banana 2",
    blurb: "Faster, cheaper Nano Banana. Good for hook variations and volume.",
    tier: 2,
    aspectRatios: COMMON_10,
    resolutions: ["1k", "2k", "4k"],
    defaultResolution: "1k",
    maxReferences: 8,
    aliases: ["nano-banana-2", "nano_banana_2_flash"],
  },
  {
    id: "nano_banana_2_lite",
    label: "Nano Banana 2 Lite",
    blurb: "Cheapest Nano Banana. 1K only, fine for rough concepting.",
    tier: 3,
    aspectRatios: ["auto", ...COMMON_10],
    resolutions: ["1k"],
    defaultResolution: "1k",
    maxReferences: 14,
    aliases: ["nano-banana-2-lite"],
  },
  {
    id: "nano_banana",
    label: "Nano Banana",
    blurb: "The original. Kept for matching older shots.",
    tier: 3,
    aspectRatios: COMMON_10,
    maxReferences: 8,
    aliases: ["nano-banana"],
  },
  {
    id: "text2image_soul_v2",
    label: "Higgsfield Soul V2",
    blurb:
      "Hyper-realistic people and fashion. The one to use for photoreal UGC faces.",
    tier: 1,
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
    qualities: ["1.5k", "2k"],
    defaultQuality: "2k",
    maxReferences: 1,
    aliases: ["soul_v2", "soul-v2", "soul_2_0", "soul", "text2image_soul"],
  },
  {
    id: "seedream_v4_5",
    label: "Seedream 4.5",
    blurb: "Strong at restyling and infographic-style layouts.",
    tier: 2,
    aspectRatios: ["1:1", "4:3", "16:9", "3:2", "21:9", "3:4", "9:16", "2:3"],
    qualities: ["basic", "high"],
    defaultQuality: "basic",
    maxReferences: 14,
    aliases: ["seedream_4_5", "seedream-4.5", "seedream45"],
  },
  {
    id: "seedream_v5_lite",
    label: "Seedream V5 Lite",
    blurb: "Newer Seedream, lighter and quicker.",
    tier: 2,
    aspectRatios: COMMON_5,
    qualities: ["basic", "high"],
    defaultQuality: "basic",
    maxReferences: 8,
    aliases: ["seedream_5_lite", "seedream-v5-lite"],
  },
  {
    id: "flux_2",
    label: "FLUX.2",
    blurb: "Precise colour and layout control. Good for brand-locked graphics.",
    tier: 2,
    aspectRatios: COMMON_5,
    resolutions: ["1k", "2k"],
    defaultResolution: "1k",
    maxReferences: 8,
    aliases: ["flux2", "flux-2", "flux_2_0"],
  },
  {
    id: "flux_kontext",
    label: "Flux Kontext",
    blurb: "Editing-focused Flux. Change one thing, keep the rest.",
    tier: 3,
    aspectRatios: COMMON_5,
    maxReferences: 4,
    aliases: ["flux-kontext"],
  },
  {
    id: "kling_omni_image",
    label: "Kling O1 Image",
    blurb: "Kling's image model, up to 2K.",
    tier: 3,
    aspectRatios: ["1:1", "auto", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"],
    resolutions: ["1k", "2k"],
    defaultResolution: "1k",
    maxReferences: 10,
    aliases: ["kling_o1_image", "kling-o1-image"],
  },
  {
    id: "grok_image",
    label: "Grok Image",
    blurb: "xAI's image model.",
    tier: 3,
    aspectRatios: [
      "1:1",
      "auto",
      "1:2",
      "2:1",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
    ],
    resolutions: ["1k", "2k"],
    defaultResolution: "1k",
    maxReferences: 8,
    aliases: ["grok-image"],
  },
  {
    id: "recraft_v4_1",
    label: "Recraft V4.1",
    blurb: "Vector and logo work. Can output true vector output types.",
    tier: 3,
    aspectRatios: ["1:1", "3:4", "4:3", "4:5", "5:4", "3:2", "2:3", "16:9", "9:16"],
    resolutions: ["1k", "2k"],
    defaultResolution: "1k",
    maxReferences: 0,
    aliases: ["recraft", "recraft_4_1"],
  },
  {
    id: "marketing_studio_image",
    label: "Marketing Studio Image",
    blurb: "Higgsfield's ad-oriented image pipeline. Up to 4K.",
    tier: 2,
    aspectRatios: ["auto", ...COMMON_10],
    resolutions: ["1k", "2k", "4k"],
    defaultResolution: "1k",
    maxReferences: 14,
    aliases: ["marketing_studio"],
  },
  {
    id: "cinematic_studio_2_5",
    label: "Cinematic Studio 2.5",
    blurb: "Filmic stills with a batch option. Up to 4K.",
    tier: 3,
    aspectRatios: COMMON_10,
    resolutions: ["1k", "2k", "4k"],
    defaultResolution: "1k",
    maxReferences: 14,
    aliases: ["cinematic_studio"],
  },
  {
    id: "openai_hazel",
    label: "OpenAI Hazel",
    blurb: "Limited ratios: square and 3:2 / 2:3 only.",
    tier: 3,
    aspectRatios: ["1:1", "3:2", "2:3", "auto"],
    qualities: ["low", "medium", "high"],
    defaultQuality: "medium",
    maxReferences: 16,
    aliases: ["hazel"],
  },
  {
    id: "z_image",
    label: "Z Image",
    blurb: "Lightweight text-to-image, no reference support.",
    tier: 3,
    aspectRatios: COMMON_5,
    maxReferences: 0,
    aliases: ["z-image"],
  },
  {
    id: "image_auto",
    label: "Image Auto",
    blurb: "Lets Higgsfield route your prompt to whichever model fits.",
    tier: 3,
    aspectRatios: COMMON_5,
    maxReferences: 14,
    aliases: ["auto"],
  },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Match a live schema enum value against the catalog. */
export function findModelSpec(value: string): ModelSpec | undefined {
  const n = normalize(value);
  return IMAGE_MODELS.find(
    (m) =>
      normalize(m.id) === n ||
      normalize(m.label) === n ||
      (m.aliases ?? []).some((a) => normalize(a) === n)
  );
}

/**
 * Merges the live schema's model list with the catalog.
 *
 * Anything the server offers gets an entry. Known models get their friendly
 * label and per-model constraints; unknown ones fall back to the schema's own
 * options so a brand-new Higgsfield model still works on day one.
 */
export interface ResolvedModel {
  id: string;
  label: string;
  blurb: string;
  tier: 1 | 2 | 3;
  aspectRatios: string[];
  resolutions: string[];
  defaultResolution?: string;
  qualities: string[];
  defaultQuality?: string;
  maxReferences: number;
  /** False when we had no catalog entry and fell back to schema-wide options. */
  known: boolean;
}

function prettifyId(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bGpt\b/g, "GPT")
    .replace(/\bAi\b/g, "AI");
}

/**
 * Narrows a schema enum down to what one model accepts.
 *
 * The three-way distinction matters. `resolution` and `quality` are optional on
 * a ModelSpec, and an absent value means "this model has no such dial" — not
 * "we don't know". Getting that wrong would show a quality dropdown for Nano
 * Banana Pro, which has no quality parameter, and the call would fail.
 *
 *   unknown model         → trust the schema, we have nothing better
 *   known, no entry       → [] so the control is hidden
 *   known, has an entry   → intersect with the schema
 */
function narrow(
  schemaValues: string[],
  catalogValues: string[] | undefined,
  known: boolean
): string[] {
  if (!known) return schemaValues;
  if (!catalogValues?.length) return [];
  if (!schemaValues.length) return catalogValues;

  const allowed = new Set(catalogValues.map(normalize));
  const hits = schemaValues.filter((v) => allowed.has(normalize(v)));
  // An empty intersection means the schema speaks a different vocabulary than we
  // expect, so defer to the schema — it's the authority on what's legal.
  return hits.length ? hits : schemaValues;
}

export function resolveModels(
  schemaModelValues: string[],
  schemaAspectRatios: string[],
  schemaResolutions: string[],
  schemaQualities: string[],
  schemaMaxReferences: number | undefined
): ResolvedModel[] {
  const source = schemaModelValues.length
    ? schemaModelValues
    : IMAGE_MODELS.filter((m) => m.tier <= 2).map((m) => m.id);

  const resolved = source.map<ResolvedModel>((value) => {
    const spec = findModelSpec(value);
    const known = Boolean(spec);
    return {
      id: value,
      label: spec?.label ?? prettifyId(value),
      blurb: spec?.blurb ?? "Offered by the server; no catalog entry yet.",
      tier: spec?.tier ?? 3,
      aspectRatios: narrow(schemaAspectRatios, spec?.aspectRatios, known),
      resolutions: narrow(schemaResolutions, spec?.resolutions, known),
      defaultResolution: spec?.defaultResolution,
      qualities: narrow(schemaQualities, spec?.qualities, known),
      defaultQuality: spec?.defaultQuality,
      maxReferences: spec?.maxReferences ?? schemaMaxReferences ?? 8,
      known,
    };
  });

  return resolved.sort(
    (a, b) => a.tier - b.tier || a.label.localeCompare(b.label)
  );
}

/** The model we land on when the app first loads. */
export function defaultModelId(models: ResolvedModel[]): string {
  const nano = models.find((m) => findModelSpec(m.id)?.id === "nano_banana_2");
  return nano?.id ?? models[0]?.id ?? "nano_banana_2";
}

/** Ratios we always want offered, in the order they should appear. */
export const RATIO_ORDER = [
  "9:16",
  "16:9",
  "1:1",
  "4:5",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "5:4",
  "21:9",
  "2:1",
  "1:2",
  "9:21",
  "auto",
];

export function sortRatios(ratios: string[]): string[] {
  return [...ratios].sort((a, b) => {
    const ai = RATIO_ORDER.indexOf(a);
    const bi = RATIO_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
  });
}

const RATIO_LABELS: Record<string, string> = {
  "9:16": "Vertical · Reels, TikTok, Stories",
  "16:9": "Widescreen · YouTube, landing pages",
  "1:1": "Square · feed posts",
  "4:5": "Portrait · Instagram feed",
  "4:3": "Classic landscape",
  "3:4": "Classic portrait",
  "3:2": "Photo landscape",
  "2:3": "Photo portrait",
  "5:4": "Wide portrait",
  "21:9": "Cinemascope",
  "2:1": "Ultra wide",
  "1:2": "Ultra tall",
  "9:21": "Ultra tall",
  auto: "Match the reference image",
};

export function ratioLabel(ratio: string): string | undefined {
  return RATIO_LABELS[ratio];
}
