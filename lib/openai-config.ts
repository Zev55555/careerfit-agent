import { getActiveModel } from "@/lib/model-config";

const placeholderValues = new Set(["", "your_api_key_here"]);

export function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

export function isOpenAiConfigured() {
  const apiKey = getOpenAiApiKey();
  return !placeholderValues.has(apiKey);
}

export function getOpenAiModel() {
  return getActiveModel();
}
