/**
 * Offline verification of the schema-adaptive layer.
 *
 * The primary fixture is now the REAL `generate_image` schema from the live
 * Higgsfield MCP server, captured via the Inspector tab. Everything before this
 * was tested against a guess, and each of those guesses turned out to be wrong in
 * a way that broke the app:
 *
 *   - arguments are nested under a `params` wrapper that is `anyOf: [object, string]`
 *   - `count` is a native parameter with maximum 4, so no fan-out is needed
 *   - `aspect_ratio` has NO enum, it is a plain string
 *   - `resolution` and `quality` are not declared at all, but
 *     `additionalProperties` is open so they can still be passed through
 *   - references are `medias: [{ value, role }]` where value is a media UUID.
 *     The schema says outright: "Do not pass https:// URLs here."
 *   - omitting `use_unlim` makes the server return a question and submit NOTHING
 *
 * Run: npm run verify
 */
import assert from "node:assert/strict";
import { analyzeImageTool, describeFields } from "../lib/tools";
import type { McpTool } from "../lib/mcp";
import { resolveModels, sortRatios, findModelSpec } from "../lib/models";
import { buildArgs, InvalidComboError, MAX_COUNT, preferPng } from "../lib/generate";
import { parseToolResult, isPending, unlimChoice } from "../lib/extract";
import { ImageDedupe } from "../lib/assets";
import { extractMediaId } from "../lib/media";

let passed = 0;
const failures: string[] = [];

function record(name: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  failures.push(name);
  console.error(`  FAIL  ${name}`);
  console.error(`        ${message.split("\n").slice(0, 6).join("\n        ")}`);
  process.exitCode = 1;
}

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    record(name, err);
  }
}

async function checkAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    record(name, err);
  }
}

/* ------------------------------------------------------------------ */
/* The real schema, exactly as the server returns it.                  */
/* ------------------------------------------------------------------ */

const REAL_TOOL: McpTool = {
  name: "generate_image",
  inputSchema: {
    type: "object",
    properties: {
      params: {
        anyOf: [
          {
            type: "object",
            properties: {
              model: {
                type: "string",
                description: "Model ID from the model catalog (required).",
              },
              prompt: {
                description: "Text description of what to generate.",
                type: "string",
              },
              count: {
                default: 1,
                description:
                  "Number of variants (1-4) generated from this same prompt.",
                type: "integer",
                minimum: 1,
                maximum: 4,
              },
              aspect_ratio: { type: "string" },
              medias: {
                description: "Reference media inputs.",
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    value: {
                      type: "string",
                      description:
                        "UUID from media_upload/media_import_url or job_id from a prior generation. Do not pass https:// URLs here.",
                    },
                    role: {
                      type: "string",
                      description: "Role — varies by model.",
                    },
                  },
                  required: ["value", "role"],
                },
              },
              get_cost: {
                description: "If true, return the cost in credits.",
                type: "boolean",
              },
              use_unlim: {
                description:
                  "Which balance pays. OMIT IT to let the server decide.",
                type: "boolean",
              },
            },
            required: ["model"],
            additionalProperties: {},
          },
          { type: "string" },
        ],
      },
    },
    required: ["params"],
    $schema: "https://json-schema.org/draft/2020-12/schema",
  },
};

async function main() {
  console.log("\nReal Higgsfield schema — structure");
  const info = analyzeImageTool(REAL_TOOL);

  check("descends into the `params` wrapper", () => {
    assert.equal(info.wrapperKey, "params");
  });
  check("finds prompt and model inside the anyOf object branch", () => {
    assert.equal(info.promptField, "prompt");
    assert.equal(info.modelField, "model");
  });
  check("finds aspect_ratio even though it has no enum", () => {
    assert.equal(info.aspectRatioField, "aspect_ratio");
    assert.deepEqual(info.aspectRatioValues, []);
  });
  check("recognises `count` as the batch field, max 4", () => {
    assert.equal(info.batchField, "count");
    assert.equal(info.fields.find((f) => f.name === "count")?.schema.maximum, 4);
  });
  check("MAX_COUNT matches the schema maximum of 4", () => {
    assert.equal(MAX_COUNT, 4);
  });
  check("finds use_unlim and get_cost", () => {
    assert.equal(info.unlimField, "use_unlim");
    assert.equal(info.costField, "get_cost");
  });
  check("sees that additionalProperties is open", () => {
    // This is what lets undeclared resolution/quality through — and also why a
    // wrong field is accepted and silently ignored rather than rejected.
    assert.equal(info.allowsExtraProperties, true);
  });
  check("declares NO resolution or quality field", () => {
    assert.equal(info.resolutionField, undefined);
    assert.equal(info.qualityField, undefined);
  });

  console.log("\nReferences: medias objects, not URLs");
  check("detects medias as an array of objects with value + role", () => {
    assert.equal(info.referenceImageField, "medias");
    assert.equal(info.referenceIsArray, true);
    assert.equal(info.referenceIsObjectArray, true);
    assert.equal(info.referenceValueKey, "value");
    assert.equal(info.referenceRoleKey, "role");
    assert.equal(info.referenceRoleRequired, true);
  });

  await checkAsync("a media UUID is passed through as an object", async () => {
    const uuid = "0f8fad5b-d9cb-469f-a165-70867728950e";
    const { args } = await buildArgs(info, {
      prompt: "x",
      model: "nano_banana_2",
      referenceImages: [uuid],
    });
    const params = args.params as Record<string, unknown>;
    assert.deepEqual(params.medias, [{ value: uuid, role: "image" }]);
  });

  await checkAsync("an https URL is NEVER placed in medias[].value", async () => {
    // The regression that made references appear to upload but do nothing. There
    // is no media import tool in this offline run, so the reference must be
    // dropped with a warning rather than sent as a raw URL.
    const { args, warnings } = await buildArgs(info, {
      prompt: "x",
      model: "nano_banana_2",
      referenceImages: ["https://example.com/ref.png"],
    });
    const params = args.params as Record<string, unknown>;
    const serialised = JSON.stringify(params.medias ?? []);
    assert.ok(
      !/https?:\/\//.test(serialised),
      `a URL leaked into medias: ${serialised}`
    );
    assert.ok(warnings.length > 0, "expected a warning about the reference");
  });

  await checkAsync("a localhost reference is refused with a reason", async () => {
    const { args, warnings } = await buildArgs(info, {
      prompt: "x",
      model: "nano_banana_2",
      referenceImages: ["http://localhost:3000/api/asset/up-1.png"],
    });
    const params = args.params as Record<string, unknown>;
    assert.ok(!params.medias || (params.medias as unknown[]).length === 0);
    assert.ok(warnings.some((w) => /local address|localhost/i.test(w)));
  });

  check("extractMediaId pulls a UUID out of a nested response", () => {
    const id = extractMediaId({
      content: [
        {
          type: "text",
          text: '{"media":{"id":"0f8fad5b-d9cb-469f-a165-70867728950e"}}',
        },
      ],
    });
    assert.equal(id, "0f8fad5b-d9cb-469f-a165-70867728950e");
  });

  console.log("\nBalance choice (use_unlim)");
  await checkAsync("always sends an explicit use_unlim", async () => {
    // Omitting it makes the server ask a question and submit nothing, which is
    // indistinguishable from a job that started and stalled.
    const { args } = await buildArgs(info, { prompt: "x", model: "nano_banana_2" });
    const params = args.params as Record<string, unknown>;
    assert.equal(params.use_unlim, false);
  });
  await checkAsync("unlimited mode caps count to 1 and says so", async () => {
    const { args, warnings } = await buildArgs(
      info,
      { prompt: "x", model: "nano_banana_2", useUnlim: true },
      4
    );
    const params = args.params as Record<string, unknown>;
    assert.equal(params.count, 1);
    assert.equal(params.use_unlim, true);
    assert.ok(warnings.some((w) => /single image|capped/i.test(w)));
  });
  check("recognises an unlim_choice reply as a finished question", () => {
    const raw = {
      content: [
        { type: "text", text: "unlim_choice: use your free allowance or credits?" },
      ],
    };
    assert.ok(unlimChoice(raw));
    assert.equal(unlimChoice({ content: [{ type: "text", text: "ok" }] }), undefined);
  });

  console.log("\nArguments land inside `params`");
  await checkAsync("everything is nested under params", async () => {
    const { args } = await buildArgs(
      info,
      {
        prompt: "a mom in a kitchen",
        model: "nano_banana_2",
        aspectRatio: "9:16",
        resolution: "4k",
      },
      2
    );
    assert.deepEqual(Object.keys(args), ["params"]);
    const params = args.params as Record<string, unknown>;
    assert.equal(params.prompt, "a mom in a kitchen");
    assert.equal(params.model, "nano_banana_2");
    assert.equal(params.aspect_ratio, "9:16");
    assert.equal(params.count, 2);
  });
  await checkAsync(
    "undeclared resolution passes through, since extras are allowed",
    async () => {
      const { args } = await buildArgs(info, {
        prompt: "x",
        model: "nano_banana_2",
        resolution: "2k",
      });
      const params = args.params as Record<string, unknown>;
      assert.equal(params.resolution, "2k");
    }
  );
  await checkAsync("the prompt is sent verbatim", async () => {
    const text = "exactly what I typed, nothing appended";
    const { args } = await buildArgs(info, { prompt: text, model: "nano_banana_2" });
    assert.equal((args.params as Record<string, unknown>).prompt, text);
  });
  await checkAsync("count is clamped to the schema maximum", async () => {
    const { args } = await buildArgs(info, { prompt: "x", model: "nano_banana_2" }, 9);
    assert.equal((args.params as Record<string, unknown>).count, 4);
  });

  console.log("\nPer-model narrowing");
  const models = resolveModels(
    ["nano_banana_2", "nano_banana_flash", "gpt_image_2", "text2image_soul_v2"],
    sortRatios(info.aspectRatioValues),
    info.resolutionValues,
    info.qualityValues,
    info.referenceMaxItems
  );
  const byId = (id: string) => models.find((m) => m.id === id)!;

  check("ratios come from the catalog when the schema has no enum", () => {
    // aspect_ratio is a bare string here, so without the catalog there would be
    // no picker at all.
    const r = byId("nano_banana_2").aspectRatios;
    assert.ok(r.length > 0);
    for (const want of ["9:16", "16:9", "4:3", "1:1"]) {
      assert.ok(r.includes(want), `missing ${want}`);
    }
    assert.equal(r[0], "9:16");
  });
  check("resolutions survive the schema declaring none", () => {
    assert.deepEqual(byId("nano_banana_2").resolutions, ["1k", "2k", "4k"]);
  });
  check("nano_banana_2 and nano_banana_flash stay distinct", () => {
    assert.equal(byId("nano_banana_2").label, "Nano Banana Pro");
    assert.equal(byId("nano_banana_flash").label, "Nano Banana 2");
    assert.match(byId("nano_banana_2").architecture ?? "", /Gemini 3 Pro/);
    assert.match(byId("nano_banana_flash").architecture ?? "", /Flash/);
  });
  check("nano_banana_pro is not aliased onto nano_banana_2", () => {
    assert.equal(findModelSpec("nano_banana_pro")?.id, "nano_banana_pro");
    assert.equal(findModelSpec("nano_banana_2")?.id, "nano_banana_2");
  });
  check("GPT Image 2 keeps its narrower ratio list", () => {
    const r = byId("gpt_image_2").aspectRatios;
    for (const gone of ["4:5", "5:4", "21:9"]) {
      assert.ok(!r.includes(gone), `${gone} should be filtered out`);
    }
  });
  await checkAsync("an illegal ratio is refused before any tool call", async () => {
    await assert.rejects(
      () => buildArgs(info, { prompt: "x", model: "gpt_image_2", aspectRatio: "4:5" }),
      InvalidComboError
    );
  });

  console.log("\nAwkward schema shapes");
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
    assert.equal(analyzeImageTool(t).promptField, "prompt");
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
  check("does not mistake a normal schema for a wrapper", () => {
    const t: McpTool = {
      name: "generate_image",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          model: { type: "string" },
          aspect_ratio: { type: "string" },
        },
      },
    };
    assert.equal(describeFields(t).wrapperKey, undefined);
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
  check("never picks negative_prompt or style_prompt as the prompt", () => {
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
  await checkAsync("reports the fields it saw when no prompt exists", async () => {
    const t: McpTool = {
      name: "generate_image",
      inputSchema: { type: "object", properties: { model: { type: "string", enum: ["a"] } } },
    };
    await assert.rejects(
      () => buildArgs(analyzeImageTool(t), { prompt: "x" }),
      (err: unknown) =>
        err instanceof Error &&
        /Fields found: model/.test(err.message) &&
        /Inspector/.test(err.message)
    );
  });

  console.log("\nResult parsing");
  check("keeps an asset URL on a completely unfamiliar host", () => {
    // A hardcoded CDN allowlist used to discard these, so a finished generation
    // showed nothing here and polled forever.
    const p = parseToolResult({
      structuredContent: {
        job_id: "job_1",
        status: "completed",
        output: { url: "https://totally-unknown-host.example/9f8e7d" },
      },
    });
    assert.ok(p.images.includes("https://totally-unknown-host.example/9f8e7d"));
  });
  check("ranks an explicit image extension first", () => {
    const p = parseToolResult({
      structuredContent: {
        meta: { permalink: "https://weird.example/xyz" },
        output: { image_url: "https://weird.example/final.png" },
      },
    });
    assert.equal(p.images[0], "https://weird.example/final.png");
  });
  check("ignores docs, pricing and non-asset links", () => {
    const p = parseToolResult({
      content: [
        {
          type: "text",
          text: "See https://higgsfield.ai/pricing and https://docs.example/help.",
        },
      ],
    });
    assert.equal(p.images.length, 0, JSON.stringify(p.images));
  });
  check("ignores video and json links", () => {
    const p = parseToolResult({
      structuredContent: {
        video: "https://cdn.example/clip.mp4",
        manifest: "https://cdn.example/data.json",
        image: "https://cdn.example/frame.png",
      },
    });
    assert.deepEqual(p.images, ["https://cdn.example/frame.png"]);
  });
  check("a completed status with an asset is not pending", () => {
    const p = parseToolResult({
      structuredContent: { job_id: "j", status: "completed", url: "https://x.example/a.png" },
    });
    assert.equal(isPending(p), false);
  });
  check("parses a JSON document handed back as a string", () => {
    const p = parseToolResult({
      content: [{ type: "text", text: JSON.stringify({ job_id: "job_789", status: "processing" }) }],
    });
    assert.equal(p.jobId, "job_789");
    assert.equal(isPending(p), true);
  });

  console.log("\nPNG only — take the generated original, not re-encodings");

  check("a PNG and a WebP of one picture yields only the PNG", () => {
    // The exact reported symptom: two files, one image. PNG is the original, so
    // it is the one kept.
    const picked = preferPng(
      [
        "https://cdn.example/gen/abc.png",
        "https://cdn.example/opt/xyz.webp",
      ],
      []
    );
    assert.deepEqual(picked.urls, ["https://cdn.example/gen/abc.png"]);
    assert.equal(picked.droppedNonPng, 1);
  });

  check("two PNG variants both survive", () => {
    const picked = preferPng(
      [
        "https://cdn.example/gen/one.png",
        "https://cdn.example/gen/two.png",
        "https://cdn.example/opt/one.webp",
        "https://cdn.example/opt/two.webp",
      ],
      []
    );
    assert.deepEqual(picked.urls, [
      "https://cdn.example/gen/one.png",
      "https://cdn.example/gen/two.png",
    ]);
    assert.equal(picked.droppedNonPng, 2);
  });

  check("a WebP-only response still works", () => {
    // Refusing everything but PNG would mean showing nothing for a model that
    // only returns WebP, which is worse than the wrong extension.
    const urls = ["https://cdn.example/gen/only.webp"];
    const picked = preferPng(urls, []);
    assert.deepEqual(picked.urls, urls);
    assert.equal(picked.droppedNonPng, 0);
  });

  check("a PNG url beats a non-PNG base64 block", () => {
    const picked = preferPng(
      ["https://cdn.example/gen/abc.png"],
      [{ mimeType: "image/webp", data: "A".repeat(400) }]
    );
    assert.equal(picked.urls.length, 1);
    assert.equal(picked.base64.length, 0);
  });

  check("PNG base64 blocks are kept when there is no PNG url", () => {
    const picked = preferPng(
      ["https://cdn.example/gen/abc.webp"],
      [{ mimeType: "image/png", data: "A".repeat(400) }]
    );
    assert.equal(picked.base64.length, 1);
    assert.equal(picked.urls.length, 0);
  });

  console.log("\nTwo variants must stay two (count: 2)");

  check("the same asset in two formats collapses to one", () => {
    // The reported symptom: "1 image with 2 different file extensions".
    // Byte-level dedupe cannot catch this, since a WebP and a PNG of one picture
    // have different bytes.
    const p = parseToolResult({
      structuredContent: {
        results: [
          { url: "https://cdn.example/gen/abc123.png" },
          { url: "https://cdn.example/gen/abc123.webp" },
        ],
      },
    });
    assert.equal(p.images.length, 1, JSON.stringify(p.images));
    assert.ok(p.images[0].endsWith(".png"), "should keep the higher-ranked form");
  });

  check("two genuinely different variants both survive", () => {
    // The other half of the same bug: collapsing too eagerly would lose a real
    // variant, which is worse than showing a duplicate.
    const p = parseToolResult({
      structuredContent: {
        results: [
          { url: "https://cdn.example/gen/abc123.png" },
          { url: "https://cdn.example/gen/def456.png" },
        ],
      },
    });
    assert.equal(p.images.length, 2, JSON.stringify(p.images));
  });

  check("variants distinguished only by a query param stay distinct", () => {
    const p = parseToolResult({
      structuredContent: {
        results: [
          { url: "https://cdn.example/gen/img?variant=1" },
          { url: "https://cdn.example/gen/img?variant=2" },
        ],
      },
    });
    assert.equal(p.images.length, 2, JSON.stringify(p.images));
  });

  check("a thumbnail never outranks a full-size sibling", () => {
    const p = parseToolResult({
      structuredContent: {
        results: [
          { thumbnail: "https://cdn.example/gen/one_thumb.png" },
          { url: "https://cdn.example/gen/two.png" },
        ],
      },
    });
    // Both are images, but the full-size asset must come first.
    assert.equal(p.images[0], "https://cdn.example/gen/two.png");
  });

  check("a thumbnail of an asset collapses into that asset", () => {
    const p = parseToolResult({
      structuredContent: {
        image: "https://cdn.example/gen/abc.png",
        thumb: "https://cdn.example/gen/abc_thumb.png",
      },
    });
    assert.equal(p.images.length, 1, JSON.stringify(p.images));
    assert.equal(p.images[0], "https://cdn.example/gen/abc.png");
  });

  check("images returned as MCP embedded resources are found", () => {
    // `blob` was not a recognised base64 key, so resource-delivered images were
    // invisible to this app entirely.
    const p = parseToolResult({
      content: [
        {
          type: "resource",
          resource: {
            uri: "higgsfield://gen/1",
            mimeType: "image/webp",
            blob: "A".repeat(4000),
          },
        },
        {
          type: "resource",
          resource: {
            uri: "higgsfield://gen/2",
            mimeType: "image/webp",
            blob: "B".repeat(4000),
          },
        },
      ],
    });
    assert.equal(p.base64Images.length, 2, "both resource blobs should be found");
    assert.equal(p.base64Images[0].mimeType, "image/webp");
  });

  check("a resource_link uri is treated as an image candidate", () => {
    const p = parseToolResult({
      content: [
        {
          type: "resource_link",
          uri: "https://cdn.example/gen/linked.png",
          mimeType: "image/png",
        },
      ],
    });
    assert.deepEqual(p.images, ["https://cdn.example/gen/linked.png"]);
  });

  console.log("\nDuplicate results (one image must never look like two)");
  check("an MCP image block is captured once, not once per path", () => {
    const p = parseToolResult({
      content: [{ type: "image", data: "A".repeat(4000), mimeType: "image/webp" }],
    });
    assert.equal(p.base64Images.length, 1);
    assert.equal(p.base64Images[0].mimeType, "image/webp");
  });
  check("two genuinely different base64 images are both kept", () => {
    const p = parseToolResult({
      content: [
        { type: "image", data: "A".repeat(4000), mimeType: "image/png" },
        { type: "image", data: "B".repeat(4000), mimeType: "image/png" },
      ],
    });
    assert.equal(p.base64Images.length, 2);
  });
  check("a long non-image string under a vague key is not an image", () => {
    const p = parseToolResult({
      structuredContent: { database_cursor: "D".repeat(4000) },
    });
    assert.equal(p.base64Images.length, 0);
  });
  check("ImageDedupe keeps distinct bytes and rejects repeats", () => {
    const d = new ImageDedupe();
    assert.equal(d.accept(Buffer.from("image-one")), true);
    assert.equal(d.accept(Buffer.from("image-two")), true);
    assert.equal(d.accept(Buffer.from("image-one")), false);
    assert.equal(d.count, 2);
    assert.equal(d.skipped, 1);
  });

  console.log(
    `\n${failures.length ? `FAILED (${failures.length}): ${failures.join(", ")}` : "All passed"} — ${passed} assertions\n`
  );
}

void main();
