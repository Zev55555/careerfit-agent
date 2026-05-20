import { NextResponse } from "next/server";
import { getOpenAiModel, isOpenAiConfigured } from "@/lib/openai-config";
import {
  getModelStatusLabel,
  getModelTier,
  getModelTierLabel,
} from "@/lib/model-config";

export function GET() {
  const tier = getModelTier();

  return NextResponse.json({
    configured: isOpenAiConfigured(),
    model: getOpenAiModel(),
    tier,
    tierLabel: getModelTierLabel(tier),
    modelStatusLabel: getModelStatusLabel(),
  });
}
