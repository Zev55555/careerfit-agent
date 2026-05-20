export type ModelTier = "fast" | "deep";

export const DEFAULT_FAST_MODEL = "gpt-5.4-mini";
export const DEFAULT_DEEP_MODEL = "gpt-5.4";

export function getModelTier(): ModelTier {
  const tier = process.env.AI_MODEL_TIER?.trim().toLowerCase();

  return tier === "deep" ? "deep" : "fast";
}

export function getActiveModel() {
  if (getModelTier() === "deep") {
    return process.env.OPENAI_MODEL_DEEP?.trim() || DEFAULT_DEEP_MODEL;
  }

  return process.env.OPENAI_MODEL_FAST?.trim() || DEFAULT_FAST_MODEL;
}

export function getModelTierLabel(tier: ModelTier = getModelTier()) {
  return tier === "deep" ? "高质量模式" : "快速模式";
}

export function getModelStatusLabel() {
  return `${getModelTierLabel()} / ${getActiveModel()}`;
}
