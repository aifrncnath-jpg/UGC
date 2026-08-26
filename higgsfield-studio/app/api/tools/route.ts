import { NextResponse } from "next/server";
import { getImageTool } from "@/lib/tools";
import { NotConnectedError } from "@/lib/mcp";
import { MAX_COUNT } from "@/lib/generate";
import { defaultModelId, resolveModels, sortRatios } from "@/lib/models";

export const dynamic = "force-dynamic";

/**
 * Describes the live MCP tool surface to the browser: which tool we'll call, and
 * per model, which aspect ratios and resolutions are actually legal. The UI
 * builds its whole form from this, so a Higgsfield schema change needs no code
 * change here.
 */
export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    const { info, allTools, statusToolName } = await getImageTool(force);

    const handled = new Set(
      [
        info.promptField,
        info.modelField,
        info.aspectRatioField,
        info.resolutionField,
        info.qualityField,
        info.batchField,
      ].filter(Boolean) as string[]
    );

    const models = resolveModels(
      info.modelValues,
      sortRatios(info.aspectRatioValues),
      info.resolutionValues,
      info.qualityValues,
      info.referenceMaxItems
    ).map((m) => ({ ...m, aspectRatios: sortRatios(m.aspectRatios) }));

    return NextResponse.json({
      ok: true,
      toolName: info.tool.name,
      toolDescription: info.tool.description ?? null,
      statusToolName: statusToolName ?? null,
      allTools: allTools.map((t) => ({
        name: t.name,
        description: t.description ?? null,
      })),
      mapping: {
        prompt: info.promptField ?? null,
        model: info.modelField ?? null,
        aspectRatio: info.aspectRatioField ?? null,
        resolution: info.resolutionField ?? null,
        quality: info.qualityField ?? null,
        batch: info.batchField ?? null,
      },
      models,
      defaultModel: defaultModelId(models),
      /** True when the server enumerated models; false means we guessed. */
      modelsFromSchema: info.modelValues.length > 0,
      schemaAspectRatios: sortRatios(info.aspectRatioValues),
      maxCount: MAX_COUNT,
      hasNativeBatch: Boolean(info.batchField),
      advancedFields: info.fields
        .filter((f) => !handled.has(f.name))
        .map((f) => ({
          name: f.name,
          kind: f.kind,
          required: f.required,
          description: f.description ?? null,
          enumValues: f.enumValues ?? null,
          default: f.default ?? null,
        })),
      rawInputSchema: info.tool.inputSchema ?? null,
    });
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json(
        { ok: false, notConnected: true, error: err.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
