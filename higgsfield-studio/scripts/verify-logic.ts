/**
 * Offline verification of the schema-adaptive layer.
 *
 * Feeds simulated `generate_image` schemas through the real analyze / resolve /
 * buildArgs path and asserts the interesting behaviour. No network, no auth.
 *
 * The "awkward schema shapes" section exists because a real run against
 * Higgsfield failed with "no field that looks like a prompt" — the walker only
 * read top-level `properties`, so $ref, anyOf composition and wrapper objects
 * all came back empty. Those are now covered here.
 *
 * Run: npm run verify
 */
import assert from "node:assert/strict";
import { analyzeImageTool, describeFields } from "../lib/tools";
import type { McpTool } from "../lib/mcp";
import { resolveModels, sortRatios, findModelSpec } from "../lib/models";
import { buildArgs, InvalidComboError, MAX_COUNT } from "../lib/generate";
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
      batch_size: { type: "integer", default: 1, maximum: 4 },
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
    info.batchField,
  ];
  assert.ok(!handled.includes("folder_id"));
});
check("maps Nano Banana Pro to the nano_banana_2 slug", () => {
  assert.equal(findModelSpec("nano_banana_2")?.label, "Nano Banana Pro");
});

console.log("\nAwkward schema shapes (the regression that broke a live run)");

check("resolves $ref into $defs", () => {
  const t: McpTool = {
    name: "generate_image",
    inputSchema: {
      $ref: "#/$defs/Input",
      $defs: {
        Input: {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: { type: "string" },
            model: { type: "string", enum: ["nano_banana_2"] },
          },
        },
      },
    },
  };
  const i = analyzeImageTool(t);
  assert.equal(i.promptField, "prompt");
  assert.equal(i.modelField, "model");
});

check("resolves a $ref on an individual property", () => {
  const t: McpTool = {
    name: "generate_image",
    inputSchema: {
      type: "object",
      definitions: {
        Ratio: { type: "string", enum: ["1:1", "9:16", "16:9"] },
      },
      properties: {
        prompt: { type: "string" },
        aspect_ratio: { $ref: "#/definitions/Ratio" },
      },
    },
  };
  const i = analyzeImageTool(t);
  assert.deepEqual(i.aspectRatioValues, ["1:1", "9:16", "16:9"]);
});

check("merges properties out of allOf", () => {
  const t: McpTool = {
    name: "generate_image",
    inputSchema: {
      allOf: [
        { type: "object", properties: { prompt: { type: "string" } } },
        {
          type: "object",
          properties: { model: { type: "string", enum: ["gpt_image_2"] } },
        },
      ],
    },
  };
  const i = analyzeImageTool(t);
  assert.equal(i.promptField, "prompt");
  assert.deepEqual(i.modelValues, ["gpt_image_2"]);
});

check("unions properties across a top-level anyOf", () => {
  const t: McpTool = {
    name: "generate_image",
    inputSchema: {
      anyOf: [
        {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: { type: "string" },
            resolution: { type: "string", enum: ["1k", "2k"] },
          },
        },
        {
          type: "object",
          properties: { quality: { type: "string", enum: ["low", "high"] } },
        },
      ],
    },
  };
  const i = analyzeImageTool(t);
  assert.equal(i.promptField, "prompt");
  assert.deepEqual(i.resolutionValues, ["1k", "2k"]);
  assert.deepEqual(i.qualityValues, ["low", "high"]);
});

check("descends into a single wrapper object and nests args back", () => {
  const t: McpTool = {
    name: "generate_image",
    inputSchema: {
      type: "object",
      required: ["params"],
      properties: {
        params: {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: { type: "string" },
            model: { type: "string", enum: ["nano_banana_2"] },
            aspect_ratio: { type: "string", enum: ["9:16", "1:1"] },
          },
        },
      },
    },
  };
  const i = analyzeImageTool(t);
  assert.equal(i.wrapperKey, "params");
  assert.equal(i.promptField, "prompt");

  const { args } = buildArgs(i, {
    prompt: "hello",
    model: "nano_banana_2",
    aspectRatio: "9:16",
  });
  // The wrapper has to be restored, or the server sees no arguments at all.
  assert.deepEqual(args, {
    params: { prompt: "hello", model: "nano_banana_2", aspect_ratio: "9:16" },
  });
});

check("does not mistake a normal 3-field schema for a wrapper", () => {
  const { wrapperKey } = describeFields(tool);
  assert.equal(wrapperKey, undefined);
});

check("finds an unconventionally named prompt field", () => {
  for (const name of ["text_prompt", "input_text", "caption", "description"]) {
    const t: McpTool = {
      name: "generate_image",
      inputSchema: {
        type: "object",
        required: [name],
        properties: { [name]: { type: "string" } },
      },
    };
    assert.equal(analyzeImageTool(t).promptField, name, `failed on ${name}`);
  }
});

check("falls back to the first required free-text field", () => {
  const t: McpTool = {
    name: "generate_image",
    inputSchema: {
      type: "object",
      required: ["scene_brief"],
      properties: {
        model: { type: "string", enum: ["nano_banana_2"] },
        scene_brief: { type: "string" },
        folder_id: { type: "string" },
      },
    },
  };
  assert.equal(analyzeImageTool(t).promptField, "scene_brief");
});

check("never picks negative_prompt or enhance_prompt as the prompt", () => {
  const t: McpTool = {
    name: "generate_image",
    inputSchema: {
      type: "object",
      properties: {
        negative_prompt: { type: "string" },
        style_prompt: { type: "string" },
        prompt: { type: "string" },
      },
    },
  };
  assert.equal(analyzeImageTool(t).promptField, "prompt");
});

check("reports the fields it saw when no prompt can be found", () => {
  const t: McpTool = {
    name: "generate_image",
    inputSchema: {
      type: "object",
      properties: { model: { type: "string", enum: ["a"] } },
    },
  };
  const i = analyzeImageTool(t);
  assert.throws(
    () => buildArgs(i, { prompt: "x" }),
    (err: unknown) =>
      err instanceof Error &&
      /Fields found: model/.test(err.message) &&
      /Inspector/.test(err.message)
  );
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
check("the four headline ratios are on both lead models", () => {
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
check("both lead models offer 1k / 2k / 4k", () => {
  assert.deepEqual(byId("nano_banana_2").resolutions, ["1k", "2k", "4k"]);
  assert.deepEqual(byId("gpt_image_2").resolutions, ["1k", "2k", "4k"]);
});
check("GPT Image 2 exposes quality, Nano Banana Pro does not", () => {
  assert.deepEqual(byId("gpt_image_2").qualities, ["low", "medium", "high"]);
  assert.deepEqual(byId("nano_banana_2").qualities, []);
});
check("Soul V2 offers 1.5k / 2k quality instead of resolution", () => {
  assert.deepEqual(byId("text2image_soul_v2").resolutions, []);
});
check("an uncatalogued model still works, falling back to the schema", () => {
  const m = byId("some_brand_new_model");
  assert.equal(m.known, false);
  assert.equal(m.aspectRatios.length, 10);
  assert.equal(m.label, "Some Brand New Model");
});

console.log("\nArgument building");
check("maps the form onto the server's own field names", () => {
  const { args } = buildArgs(info, {
    prompt: "a mom in a kitchen",
    model: "nano_banana_2",
    aspectRatio: "9:16",
    resolution: "4k",
  });
  assert.equal(args.prompt, "a mom in a kitchen");
  assert.equal(args.model, "nano_banana_2");
  assert.equal(args.aspect_ratio, "9:16");
  assert.equal(args.resolution, "4k");
});
check("sends the prompt verbatim, with nothing appended", () => {
  const text = "exactly what I typed";
  const { args } = buildArgs(info, {
    prompt: text,
    model: "nano_banana_2",
    aspectRatio: "1:1",
  });
  assert.equal(args.prompt, text);
});
check("writes the batch field, clamped to the schema maximum", () => {
  const { args } = buildArgs(info, { prompt: "x", model: "nano_banana_2" }, 3);
  assert.equal(args.batch_size, 3);
});
check("passes an Advanced field through, drops unknown keys", () => {
  const { args } = buildArgs(info, {
    prompt: "x",
    model: "nano_banana_2",
    aspectRatio: "1:1",
    advanced: { folder_id: "abc123", not_a_real_field: "nope" },
  });
  assert.equal(args.folder_id, "abc123");
  assert.ok(!("not_a_real_field" in args));
});
check("rejects 4:5 on GPT Image 2 before any credits are spent", () => {
  assert.throws(
    () => buildArgs(info, { prompt: "x", model: "gpt_image_2", aspectRatio: "4:5" }),
    (err: unknown) =>
      err instanceof InvalidComboError && /GPT Image 2/.test(err.message)
  );
});
check("accepts 4:5 on Nano Banana Pro", () => {
  const { args } = buildArgs(info, {
    prompt: "x",
    model: "nano_banana_2",
    aspectRatio: "4:5",
  });
  assert.equal(args.aspect_ratio, "4:5");
});
check("rejects a quality value the chosen model does not support", () => {
  assert.throws(
    () => buildArgs(info, { prompt: "x", model: "nano_banana_2", quality: "high" }),
    InvalidComboError
  );
});
check("the image count ceiling is 3", () => {
  assert.equal(MAX_COUNT, 3);
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
check("pulls several images out of structuredContent", () => {
  const p = parseToolResult({
    structuredContent: {
      status: "completed",
      results: [
        { url: "https://cdn.higgsfield.ai/x/1.jpg" },
        { url: "https://cdn.higgsfield.ai/x/2.jpg" },
      ],
    },
  });
  assert.equal(p.images.length, 2);
  assert.equal(p.status, "done");
});
check("parses a JSON document handed back as a string", () => {
  const p = parseToolResult({
    content: [
      { type: "text", text: JSON.stringify({ job_id: "job_789", status: "processing" }) },
    ],
  });
  assert.equal(p.jobId, "job_789");
  assert.equal(isPending(p), true);
});
check("keeps a base64 image block", () => {
  const p = parseToolResult({
    content: [{ type: "image", data: "A".repeat(400), mimeType: "image/webp" }],
  });
  assert.equal(p.base64Images.length, 1);
  assert.equal(p.base64Images[0].mimeType, "image/webp");
  assert.equal(isPending(p), false);
});

console.log(
  `\n${process.exitCode ? "FAILED" : "All passed"} — ${passed} assertions\n`
);
