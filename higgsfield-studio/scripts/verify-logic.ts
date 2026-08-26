/**
 * Offline verification of the schema-adaptive layer.
 *
 * Feeds a simulated `generate_image` schema — shaped the way Higgsfield's is,
 * with ONE aspect_ratio enum shared across every model — through the real
 * analyze / resolve / buildArgs path, and asserts the per-model narrowing and
 * argument mapping behave correctly. No network and no auth needed.
 *
 * Run: npx tsx scripts/verify-logic.ts
 */
import assert from "node:assert/strict";
import { analyzeImageTool } from "../lib/tools";
import type { McpTool } from "../lib/mcp";
import { resolveModels, sortRatios, findModelSpec } from "../lib/models";
import { buildArgs, InvalidComboError } from "../lib/generate";
import { parseToolResult, isPending } from "../lib/extract";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}

// A plausible Higgsfield generate_image schema: the aspect_ratio enum is the
// UNION across all models, which is exactly the trap we're guarding against.
const tool: McpTool = {
  name: "generate_image",
  description: "Generate an image with any Higgsfield image model.",
  inputSchema: {
    type: "object",
    required: ["prompt", "model"],
    properties: {
      prompt: { type: "string", description: "What to generate" },
      model: {
        type: "string",
        enum: [
          "nano_banana_2",
          "gpt_image_2",
          "text2image_soul_v2",
          "seedream_v4_5",
          "flux_2",
          "some_brand_new_model",
        ],
      },
      aspect_ratio: {
        anyOf: [
          {
            type: "string",
            enum: [
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
            ],
          },
          { type: "null" },
        ],
        default: "1:1",
      },
      resolution: { type: "string", enum: ["1k", "2k", "4k"], default: "2k" },
      quality: { type: "string", enum: ["low", "medium", "high", "basic"] },
      image_urls: { type: "array", items: { type: "string" }, maxItems: 14 },
      batch_size: { type: "integer", default: 1 },
      seed: { anyOf: [{ type: "integer" }, { type: "null" }] },
      folder_id: { type: "string" },
    },
  },
};

console.log("\nSchema introspection");
const info = analyzeImageTool(tool);

check("finds the prompt field", () => {
  assert.equal(info.promptField, "prompt");
});
check("finds the model field and its 6 values", () => {
  assert.equal(info.modelField, "model");
  assert.equal(info.modelValues.length, 6);
});
check("finds aspect_ratio through the anyOf/null wrapper", () => {
  assert.equal(info.aspectRatioField, "aspect_ratio");
  assert.equal(info.aspectRatioValues.length, 10);
});
check("keeps resolution and quality as separate dials", () => {
  assert.equal(info.resolutionField, "resolution");
  assert.equal(info.qualityField, "quality");
});
check("reads maxItems off the reference-image array", () => {
  assert.equal(info.referenceImageField, "image_urls");
  assert.equal(info.referenceIsArray, true);
  assert.equal(info.referenceMaxItems, 14);
});
check("finds the batch field", () => {
  assert.equal(info.batchField, "batch_size");
});
check("leaves folder_id for the Advanced panel", () => {
  const handled = [
    info.promptField,
    info.modelField,
    info.aspectRatioField,
    info.resolutionField,
    info.qualityField,
    info.seedField,
    info.batchField,
    info.referenceImageField,
  ];
  assert.ok(!handled.includes("folder_id"));
});
check("maps Nano Banana Pro to the nano_banana_2 slug", () => {
  assert.equal(findModelSpec("nano_banana_2")?.label, "Nano Banana Pro");
});

console.log("\nPer-model narrowing");
const models = resolveModels(
  info.modelValues,
  sortRatios(info.aspectRatioValues),
  info.resolutionValues,
  info.qualityValues,
  info.referenceMaxItems
);
const byId = (id: string) => models.find((m) => m.id === id)!;

check("Nano Banana Pro and GPT Image 2 are both surfaced as tier 1", () => {
  assert.equal(byId("nano_banana_2").tier, 1);
  assert.equal(byId("gpt_image_2").tier, 1);
});
check("Nano Banana Pro keeps 4:5, 5:4 and 21:9", () => {
  const r = byId("nano_banana_2").aspectRatios;
  for (const want of ["4:5", "5:4", "21:9", "9:16", "16:9", "1:1", "4:3"]) {
    assert.ok(r.includes(want), `expected ${want}`);
  }
});
check("GPT Image 2 drops 4:5, 5:4 and 21:9", () => {
  const r = byId("gpt_image_2").aspectRatios;
  for (const gone of ["4:5", "5:4", "21:9"]) {
    assert.ok(!r.includes(gone), `${gone} should be filtered out`);
  }
  for (const want of ["9:16", "16:9", "1:1", "4:3", "3:4", "3:2", "2:3"]) {
    assert.ok(r.includes(want), `expected ${want}`);
  }
});
check("the four ratios asked for are on both headline models", () => {
  for (const id of ["nano_banana_2", "gpt_image_2"]) {
    const r = byId(id).aspectRatios;
    for (const want of ["9:16", "16:9", "4:3", "1:1"]) {
      assert.ok(r.includes(want), `${id} missing ${want}`);
    }
  }
});
check("9:16 sorts first so vertical is the default reach", () => {
  assert.equal(byId("nano_banana_2").aspectRatios[0], "9:16");
});
check("GPT Image 2 exposes quality, Nano Banana Pro does not", () => {
  assert.deepEqual(byId("gpt_image_2").qualities, ["low", "medium", "high"]);
  assert.deepEqual(byId("nano_banana_2").qualities, []);
});
check("Soul V2 narrows to one reference image", () => {
  assert.equal(byId("text2image_soul_v2").maxReferences, 1);
});
check("an uncatalogued model still works, falling back to the schema", () => {
  const m = byId("some_brand_new_model");
  assert.equal(m.known, false);
  assert.equal(m.aspectRatios.length, 10);
  assert.equal(m.label, "Some Brand New Model");
});

console.log("\nArgument building");
check("maps the form onto the server's own field names", () => {
  const { args, prompt } = buildArgs(info, {
    subject: "a mom in a kitchen",
    presetId: "pixar-3d",
    model: "nano_banana_2",
    aspectRatio: "9:16",
    resolution: "4k",
  });
  assert.equal(args.model, "nano_banana_2");
  assert.equal(args.aspect_ratio, "9:16");
  assert.equal(args.resolution, "4k");
  assert.ok(String(args.prompt).startsWith("a mom in a kitchen"));
  assert.ok(String(prompt).includes("3D animated feature"), "preset appended");
});
check("coerces numeric strings to real numbers", () => {
  const { args } = buildArgs(info, {
    subject: "x",
    model: "nano_banana_2",
    aspectRatio: "1:1",
    seed: "12345",
    batch: "3",
  });
  assert.equal(args.seed, 12345);
  assert.equal(args.batch_size, 3);
});
check("passes an Advanced field through, drops unknown keys", () => {
  const { args } = buildArgs(info, {
    subject: "x",
    model: "nano_banana_2",
    aspectRatio: "1:1",
    advanced: { folder_id: "abc123", not_a_real_field: "nope" },
  });
  assert.equal(args.folder_id, "abc123");
  assert.ok(!("not_a_real_field" in args));
});
check("rejects 4:5 on GPT Image 2 before any credits are spent", () => {
  assert.throws(
    () =>
      buildArgs(info, {
        subject: "x",
        model: "gpt_image_2",
        aspectRatio: "4:5",
      }),
    (err: unknown) =>
      err instanceof InvalidComboError && /GPT Image 2/.test(err.message)
  );
});
check("accepts 4:5 on Nano Banana Pro", () => {
  const { args } = buildArgs(info, {
    subject: "x",
    model: "nano_banana_2",
    aspectRatio: "4:5",
  });
  assert.equal(args.aspect_ratio, "4:5");
});
check("rejects too many reference images for Soul V2", () => {
  assert.throws(
    () =>
      buildArgs(info, {
        subject: "x",
        model: "text2image_soul_v2",
        aspectRatio: "9:16",
        referenceImages: ["https://a.com/1.png", "https://b.com/2.png"],
      }),
    InvalidComboError
  );
});
check("warns instead of failing when a negative prompt has nowhere to go", () => {
  const { warnings, args } = buildArgs(info, {
    subject: "x",
    model: "nano_banana_2",
    aspectRatio: "1:1",
    negativePrompt: "watermark",
  });
  assert.ok(warnings.some((w) => /negative-prompt/.test(w)));
  assert.ok(!Object.keys(args).some((k) => /negative/.test(k)));
});

console.log("\nResult parsing");
check("pulls an image URL out of a plain text block", () => {
  const p = parseToolResult({
    content: [
      {
        type: "text",
        text: "Done! https://cdn.higgsfield.ai/generations/abc123.png",
      },
    ],
  });
  assert.deepEqual(p.images, [
    "https://cdn.higgsfield.ai/generations/abc123.png",
  ]);
  assert.equal(isPending(p), false);
});
check("pulls images out of structuredContent", () => {
  const p = parseToolResult({
    structuredContent: {
      status: "completed",
      results: [{ url: "https://cdn.higgsfield.ai/x/1.jpg" }],
    },
  });
  assert.equal(p.images.length, 1);
  assert.equal(p.status, "done");
});
check("parses a JSON document handed back as a string", () => {
  const p = parseToolResult({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          job_id: "job_789",
          status: "processing",
        }),
      },
    ],
  });
  assert.equal(p.jobId, "job_789");
  assert.equal(isPending(p), true);
});
check("keeps a base64 image block", () => {
  const p = parseToolResult({
    content: [
      { type: "image", data: "A".repeat(400), mimeType: "image/webp" },
    ],
  });
  assert.equal(p.base64Images.length, 1);
  assert.equal(p.base64Images[0].mimeType, "image/webp");
  assert.equal(isPending(p), false);
});

console.log(
  `\n${process.exitCode ? "FAILED" : "All passed"} — ${passed} assertions\n`
);
