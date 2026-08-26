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
    model: string | null;
    aspectRatio: string | null;
    resolution: string | null;
    quality: string | null;
    batch: string | null;
  };
  models: ResolvedModel[];
  defaultModel: string;
  modelsFromSchema: boolean;
  schemaAspectRatios: string[];
  maxCount: number;
  /** True when the tool has its own batch parameter. */
  hasNativeBatch: boolean;
  advancedFields: AdvancedField[];
  rawInputSchema: unknown;
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
}

export function imageSrc(item: GalleryItemView): string[] {
  return item.localImages.length ? item.localImages : item.images;
}

export interface FormState {
  prompt: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  quality: string;
  count: number;
  advanced: Record<string, string>;
}

export const EMPTY_FORM: FormState = {
  prompt: "",
  model: "",
  aspectRatio: "9:16",
  resolution: "",
  quality: "",
  count: 1,
  advanced: {},
};

export function findModel(
  tools: ToolsInfo,
  id: string
): ResolvedModel | undefined {
  return tools.models.find((m) => m.id === id);
}

export type { ResolvedModel };
