import { listTools, type JsonSchema, type McpTool } from "./mcp";

/**
 * Adaptive schema introspection.
 *
 * We do NOT hardcode Higgsfield's `generate_image` argument names. The server
 * ships its own JSON Schema over MCP, so at runtime we read that schema and work
 * out which field is the prompt, which is the model, which is the aspect ratio,
 * and what the legal model values are. If Higgsfield renames a field or adds a
 * model, this app picks it up without a code change.
 */

export interface FieldInfo {
  name: string;
  schema: JsonSchema;
  required: boolean;
  kind: "string" | "number" | "integer" | "boolean" | "enum" | "array" | "object";
  enumValues?: string[];
  description?: string;
  default?: unknown;
}

export interface ImageToolInfo {
  tool: McpTool;
  fields: FieldInfo[];
  promptField?: string;
  negativePromptField?: string;
  modelField?: string;
  modelValues: string[];
  aspectRatioField?: string;
  aspectRatioValues: string[];
  resolutionField?: string;
  resolutionValues: string[];
  qualityField?: string;
  qualityValues: string[];
  seedField?: string;
  batchField?: string;
  referenceImageField?: string;
  referenceIsArray: boolean;
  referenceMaxItems?: number;
  /** Best guess at the Nano Banana Pro model value, if the server enumerates it. */
  nanoBananaProValue?: string;
  nanoBananaValues: string[];
}

function flattenSchema(schema?: JsonSchema): JsonSchema {
  if (!schema) return {};
  // Unwrap the common `anyOf: [T, null]` optional pattern.
  const branches = schema.anyOf ?? schema.oneOf;
  if (branches?.length) {
    const real = branches.find(
      (b) => b.type !== "null" && (b.type || b.enum || b.properties || b.items)
    );
    if (real) return { ...real, description: schema.description ?? real.description, default: schema.default ?? real.default };
  }
  if (schema.allOf?.length) {
    return schema.allOf.reduce<JsonSchema>((acc, b) => ({ ...acc, ...b }), {
      description: schema.description,
      default: schema.default,
    });
  }
  return schema;
}

function stringEnum(schema: JsonSchema): string[] | undefined {
  const flat = flattenSchema(schema);
  if (Array.isArray(flat.enum)) {
    const vals = flat.enum.filter((v): v is string => typeof v === "string");
    if (vals.length) return vals;
  }
  // enum can hide one level down inside array items
  const items = Array.isArray(flat.items) ? flat.items[0] : flat.items;
  if (items && Array.isArray(items.enum)) {
    const vals = items.enum.filter((v): v is string => typeof v === "string");
    if (vals.length) return vals;
  }
  return undefined;
}

function kindOf(schema: JsonSchema, enumValues?: string[]): FieldInfo["kind"] {
  if (enumValues?.length) return "enum";
  const flat = flattenSchema(schema);
  const t = Array.isArray(flat.type)
    ? flat.type.find((x) => x !== "null")
    : flat.type;
  switch (t) {
    case "number":
      return "number";
    case "integer":
      return "integer";
    case "boolean":
      return "boolean";
    case "array":
      return "array";
    case "object":
      return "object";
    default:
      return "string";
  }
}

export function describeFields(tool: McpTool): FieldInfo[] {
  const schema = tool.inputSchema ?? {};
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  return Object.entries(props).map(([name, raw]) => {
    const flat = flattenSchema(raw);
    const enumValues = stringEnum(raw);
    return {
      name,
      schema: flat,
      required: required.has(name),
      kind: kindOf(raw, enumValues),
      enumValues,
      description: flat.description,
      default: flat.default,
    };
  });
}

/** Score-based field matcher: prefers exact names, tolerates synonyms. */
function pickField(
  fields: FieldInfo[],
  exact: string[],
  contains: string[],
  predicate?: (f: FieldInfo) => boolean
): string | undefined {
  const pool = predicate ? fields.filter(predicate) : fields;
  for (const want of exact) {
    const hit = pool.find((f) => f.name.toLowerCase() === want);
    if (hit) return hit.name;
  }
  for (const want of contains) {
    const hit = pool.find((f) => f.name.toLowerCase().includes(want));
    if (hit) return hit.name;
  }
  return undefined;
}

export function analyzeImageTool(tool: McpTool): ImageToolInfo {
  const fields = describeFields(tool);
  const byName = (n?: string) => fields.find((f) => f.name === n);

  const promptField = pickField(
    fields,
    ["prompt", "text", "description"],
    ["prompt"],
    (f) => f.kind === "string" && !f.name.toLowerCase().includes("negative")
  );

  const negativePromptField = pickField(
    fields,
    ["negative_prompt", "negativeprompt"],
    ["negative"]
  );

  const modelField = pickField(
    fields,
    ["model", "model_id", "modelid", "model_name"],
    ["model"]
  );

  const aspectRatioField = pickField(
    fields,
    ["aspect_ratio", "aspectratio", "ratio"],
    ["aspect", "ratio"]
  );

  // Resolution and quality are separate dials on Higgsfield: Nano Banana Pro
  // takes resolution (1k/2k/4k), GPT Image 2 takes both, Soul takes quality.
  const resolutionField = pickField(
    fields,
    ["resolution", "output_resolution", "size"],
    ["resolution"],
    (f) => f.name !== aspectRatioField
  );

  const qualityField = pickField(
    fields,
    ["quality", "output_quality", "resolution_tier"],
    ["quality"],
    (f) => f.name !== resolutionField
  );

  const seedField = pickField(fields, ["seed"], ["seed"]);

  const batchField = pickField(
    fields,
    ["batch_size", "num_images", "n", "count", "quantity", "batchsize"],
    ["batch", "num_image", "count"]
  );

  const referenceImageField = pickField(
    fields,
    [
      "image_urls",
      "reference_images",
      "input_images",
      "images",
      "image_url",
      "reference_image",
      "image",
    ],
    ["image_url", "reference", "input_image", "image"],
    (f) => f.name !== promptField
  );

  const refField = byName(referenceImageField);
  const referenceIsArray = refField?.kind === "array";
  const rawMaxItems = refField?.schema?.maxItems;
  const referenceMaxItems =
    typeof rawMaxItems === "number"
      ? rawMaxItems
      : referenceIsArray
        ? undefined
        : refField
          ? 1
          : 0;

  const modelValues = byName(modelField)?.enumValues ?? [];
  const nanoBananaValues = modelValues.filter((v) =>
    /nano[\s_-]?banana/i.test(v)
  );
  const nanoBananaProValue =
    nanoBananaValues.find((v) => /pro/i.test(v)) ?? nanoBananaValues[0];

  return {
    tool,
    fields,
    promptField,
    negativePromptField,
    modelField,
    modelValues,
    aspectRatioField,
    aspectRatioValues: byName(aspectRatioField)?.enumValues ?? [],
    resolutionField,
    resolutionValues: byName(resolutionField)?.enumValues ?? [],
    qualityField,
    qualityValues: byName(qualityField)?.enumValues ?? [],
    seedField,
    batchField,
    referenceImageField,
    referenceIsArray,
    referenceMaxItems,
    nanoBananaProValue,
    nanoBananaValues,
  };
}

function scoreImageTool(t: McpTool): number {
  const n = t.name.toLowerCase();
  const d = (t.description ?? "").toLowerCase();
  let score = 0;
  if (n === "generate_image") score += 100;
  if (n.includes("image")) score += 40;
  if (n.includes("generate") || n.includes("create") || n.includes("text2image"))
    score += 20;
  if (n.includes("video")) score -= 80;
  if (n.includes("status") || n.includes("list") || n.includes("get")) score -= 50;
  if (d.includes("text-to-image") || d.includes("text to image")) score += 15;
  return score;
}

export async function getImageTool(force = false): Promise<{
  info: ImageToolInfo;
  allTools: McpTool[];
  statusToolName?: string;
}> {
  const { tools } = await listTools(force);
  const ranked = [...tools].sort((a, b) => scoreImageTool(b) - scoreImageTool(a));
  const best = ranked[0];
  if (!best || scoreImageTool(best) <= 0) {
    throw new Error(
      `Could not find an image-generation tool on the MCP server. Tools seen: ${tools
        .map((t) => t.name)
        .join(", ") || "(none)"}`
    );
  }
  const statusToolName = tools.find((t) =>
    /status|poll|result|fetch_generation/i.test(t.name)
  )?.name;

  return { info: analyzeImageTool(best), allTools: tools, statusToolName };
}

/**
 * Coerce a form value into whatever the schema wants. Browsers hand us strings
 * for everything, and MCP servers validate strictly.
 */
export function coerceValue(field: FieldInfo, value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return undefined;
  switch (field.kind) {
    case "number":
      return typeof value === "number" ? value : Number(value);
    case "integer":
      return typeof value === "number"
        ? Math.trunc(value)
        : Math.trunc(Number(value));
    case "boolean":
      if (typeof value === "boolean") return value;
      return value === "true" || value === "1" || value === "on";
    case "array": {
      if (Array.isArray(value)) return value;
      const parts = String(value)
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length ? parts : undefined;
    }
    case "object":
      if (typeof value === "object") return value;
      try {
        return JSON.parse(String(value));
      } catch {
        return undefined;
      }
    default:
      return String(value);
  }
}
