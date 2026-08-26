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
  /** Set when the server nests all arguments under one wrapper property. */
  wrapperKey?: string;
  /** Best guess at the Nano Banana Pro model value, if the server enumerates it. */
  nanoBananaProValue?: string;
  nanoBananaValues: string[];
}

/**
 * Resolve a local JSON Pointer like `#/$defs/GenerateImageInput`.
 *
 * Real MCP servers commonly emit `$ref` because their schemas are generated from
 * typed models (Pydantic, zod-to-json-schema, and friends all do this). A walker
 * that ignores `$ref` sees an empty object and finds no fields at all.
 */
function lookupRef(ref: string, root: JsonSchema): JsonSchema | undefined {
  if (!ref.startsWith("#/")) return undefined;
  let cur: unknown = root;
  for (const rawPart of ref.slice(2).split("/")) {
    const key = rawPart.replace(/~1/g, "/").replace(/~0/g, "~");
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur && typeof cur === "object" ? (cur as JsonSchema) : undefined;
}

function deref(schema: JsonSchema, root: JsonSchema, depth = 0): JsonSchema {
  if (depth > 10 || typeof schema.$ref !== "string") return schema;
  const target = lookupRef(schema.$ref, root);
  if (!target) return schema;
  const { $ref: _ignored, ...rest } = schema;
  // Sibling keys override the referenced target, per JSON Schema 2020-12.
  return { ...deref(target, root, depth + 1), ...rest };
}

function flattenSchema(schema?: JsonSchema, root?: JsonSchema): JsonSchema {
  if (!schema) return {};
  const base = root ? deref(schema, root) : schema;

  // Unwrap the common `anyOf: [T, null]` optional pattern.
  const branches = base.anyOf ?? base.oneOf;
  if (branches?.length) {
    const resolved = branches.map((b) => (root ? deref(b, root) : b));
    const real = resolved.find(
      (b) => b.type !== "null" && (b.type || b.enum || b.properties || b.items)
    );
    if (real) {
      return {
        ...real,
        description: base.description ?? real.description,
        default: base.default ?? real.default,
      };
    }
  }
  if (base.allOf?.length) {
    return base.allOf
      .map((b) => (root ? deref(b, root) : b))
      .reduce<JsonSchema>((acc, b) => ({ ...acc, ...b }), {
        description: base.description,
        default: base.default,
      });
  }
  return base;
}

/**
 * Gather every declared property, wherever it's hiding.
 *
 * A tool schema may put its fields directly under `properties`, or compose them
 * with `allOf`, or branch on `anyOf`/`oneOf` — which is a natural shape here,
 * since Higgsfield's models take different required arguments. Reading only the
 * top-level `properties` finds nothing in the composed cases.
 */
function collectProperties(
  schema: JsonSchema,
  root: JsonSchema,
  depth = 0
): { props: Record<string, JsonSchema>; required: Set<string> } {
  const props: Record<string, JsonSchema> = {};
  const required = new Set<string>();
  if (depth > 6) return { props, required };

  const node = deref(schema, root);

  for (const [name, value] of Object.entries(node.properties ?? {})) {
    props[name] = value;
  }
  for (const name of node.required ?? []) required.add(name);

  // allOf is a straight merge: every branch applies.
  for (const branch of node.allOf ?? []) {
    const sub = collectProperties(branch, root, depth + 1);
    Object.assign(props, sub.props);
    for (const name of sub.required) required.add(name);
  }

  // anyOf/oneOf are alternatives, so take the union of fields but do NOT treat
  // a field required in only one branch as globally required — that would make
  // us invent values for arguments the chosen model never wanted.
  const branches = [...(node.anyOf ?? []), ...(node.oneOf ?? [])].filter(
    (b) => deref(b, root).type !== "null"
  );
  for (const branch of branches) {
    const sub = collectProperties(branch, root, depth + 1);
    for (const [name, value] of Object.entries(sub.props)) {
      if (!(name in props)) props[name] = value;
    }
  }

  return { props, required };
}

/** Property names that are conventionally a wrapper around the real arguments. */
const WRAPPER_KEYS = ["params", "parameters", "input", "arguments", "args", "body", "request", "payload", "options", "config"];

function stringEnum(schema: JsonSchema, root?: JsonSchema): string[] | undefined {
  const flat = flattenSchema(schema, root);
  if (Array.isArray(flat.enum)) {
    const vals = flat.enum.filter((v): v is string => typeof v === "string");
    if (vals.length) return vals;
  }
  // enum can hide one level down inside array items
  const rawItems = Array.isArray(flat.items) ? flat.items[0] : flat.items;
  const items = rawItems && root ? deref(rawItems, root) : rawItems;
  if (items && Array.isArray(items.enum)) {
    const vals = items.enum.filter((v): v is string => typeof v === "string");
    if (vals.length) return vals;
  }
  return undefined;
}

function kindOf(
  schema: JsonSchema,
  enumValues?: string[],
  root?: JsonSchema
): FieldInfo["kind"] {
  if (enumValues?.length) return "enum";
  const flat = flattenSchema(schema, root);
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

export function describeFields(tool: McpTool): {
  fields: FieldInfo[];
  /** Set when the real arguments live nested under a single wrapper property. */
  wrapperKey?: string;
} {
  const root = tool.inputSchema ?? {};
  let { props, required } = collectProperties(root, root);
  let wrapperKey: string | undefined;

  // Some servers nest everything under one object argument. Detect that and
  // descend, remembering the key so we can nest the arguments back on the way
  // out. Guarded tightly: exactly one property, an object, with its own fields.
  const names = Object.keys(props);
  if (names.length === 1) {
    const only = names[0];
    const inner = collectProperties(props[only], root);
    const innerIsObject =
      flattenSchema(props[only], root).type === "object" ||
      Object.keys(inner.props).length > 0;
    if (
      innerIsObject &&
      Object.keys(inner.props).length > 1 &&
      (WRAPPER_KEYS.includes(only.toLowerCase()) ||
        Object.keys(inner.props).length >= 3)
    ) {
      wrapperKey = only;
      props = inner.props;
      required = inner.required;
    }
  }

  const fields = Object.entries(props).map(([name, raw]) => {
    const flat = flattenSchema(raw, root);
    const enumValues = stringEnum(raw, root);
    return {
      name,
      schema: flat,
      required: required.has(name),
      kind: kindOf(raw, enumValues, root),
      enumValues,
      description: flat.description,
      default: flat.default,
    };
  });

  return { fields, wrapperKey };
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

/** Names that contain "prompt" but are definitely not THE prompt. */
const NOT_THE_PROMPT =
  /negative|style|system|multi|enhance|magic|auto|upsampl|rewrit|translat|language/i;

export function analyzeImageTool(tool: McpTool): ImageToolInfo {
  const { fields, wrapperKey } = describeFields(tool);
  const byName = (n?: string) => fields.find((f) => f.name === n);

  const promptCandidate = (f: FieldInfo) =>
    (f.kind === "string" || f.kind === "enum") && !NOT_THE_PROMPT.test(f.name);

  let promptField = pickField(
    fields,
    [
      "prompt",
      "text",
      "description",
      "text_prompt",
      "prompt_text",
      "input_text",
      "query",
      "caption",
      "instruction",
      "content",
      "message",
    ],
    ["prompt", "describ", "caption", "instruct"],
    promptCandidate
  );

  /**
   * Last resort: take the first required free-text field that clearly isn't a
   * knob. Without this, an unexpected prompt field name makes the whole app
   * unusable even though the schema is perfectly workable — which is exactly the
   * failure this fallback was added to fix.
   */
  if (!promptField) {
    const KNOB =
      /model|ratio|resolution|quality|seed|batch|count|size|url|uri|id$|_id|folder|format|version|variant|mode|style|type|token|key/i;
    promptField =
      fields.find(
        (f) =>
          f.required &&
          f.kind === "string" &&
          !f.enumValues?.length &&
          !KNOB.test(f.name)
      )?.name ??
      fields.find(
        (f) => f.kind === "string" && !f.enumValues?.length && !KNOB.test(f.name)
      )?.name;
  }

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
    [
      "resolution",
      "output_resolution",
      "image_resolution",
      "size",
      "image_size",
      "output_size",
      "res",
    ],
    ["resolution", "size"],
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
    wrapperKey,
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
