import type { StylePreset } from "./presets";
import type { ResolvedModel } from "./models";

export interface AuthStatus {
  connected: boolean;
  redirectUri: string;
  serverUrl: string;
  scope?: string;
  hasRefreshToken?: boolean;
  expiresAt?: number;
  expired?: boolean;
  clientId?: string;
}

export interface AdvancedField {
  name: string;
  kind: "string" | "number" | "integer" | "boolean" | "enum" | "array" | "object";
  required: boolean;
  description: string | null;
  enumValues: string[] | null;
  default: unknown;
}

export interface ToolsInfo {
  ok: true;
  toolName: string;
  toolDescription: string | null;
  statusToolName: string | null;
  allTools: { name: string; description: string | null }[];
  mapping: {
    prompt: string | null;
    negativePrompt: string | null;
    model: string | null;
    aspectRatio: string | null;
    resolution: string | null;
    quality: string | null;
    seed: string | null;
    batch: string | null;
    referenceImages: string | null;
    referenceIsArray: boolean;
  };
  models: ResolvedModel[];
  defaultModel: string;
  modelsFromSchema: boolean;
  schemaAspectRatios: string[];
  advancedFields: AdvancedField[];
  rawInputSchema: unknown;
  presets: StylePreset[];
}

export interface GalleryItemView {
  id: string;
  createdAt: number;
  prompt: string;
  model: string;
  params: Record<string, unknown>;
  images: string[];
  localImages: string[];
  status: "pending" | "done" | "error";
  jobId?: string;
  error?: string;
  warnings?: string[];
  rawText?: string;
}

export function imageSrc(item: GalleryItemView): string[] {
  return item.localImages.length ? item.localImages : item.images;
}

export interface FormState {
  subject: string;
  presetId: string;
  extraPrompt: string;
  negativePrompt: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  quality: string;
  seed: string;
  batch: string;
  referenceImages: string[];
  advanced: Record<string, string>;
}

export const EMPTY_FORM: FormState = {
  subject: "",
  presetId: "pixar-3d",
  extraPrompt: "",
  negativePrompt: "",
  model: "",
  aspectRatio: "9:16",
  resolution: "",
  quality: "",
  seed: "",
  batch: "",
  referenceImages: [],
  advanced: {},
};

export function findModel(
  tools: ToolsInfo,
  id: string
): ResolvedModel | undefined {
  return tools.models.find((m) => m.id === id);
}

export type { ResolvedModel };
