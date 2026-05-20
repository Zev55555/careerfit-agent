import { NextResponse } from "next/server";
import { analyzeJDWithAI } from "@/lib/ai-jd-analyzer";
import {
  hasCustomRoleIntent,
  normalizeCustomRoleInput,
} from "@/lib/custom-role";
import { isOpenAiConfigured } from "@/lib/openai-config";
import { classifyJd, type ApiRole } from "@/lib/role-classifier";
import type { ResumeData } from "@/lib/resume-schema";

type AnalyzeJDRequest = {
  jdText?: unknown;
  selectedRole?: unknown;
  customRoleInput?: unknown;
  currentResume?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeJDRequest;
    const jdText = typeof body.jdText === "string" ? body.jdText.trim() : "";
    const selectedRole = parseSelectedRole(body.selectedRole);
    const customRoleInput = normalizeCustomRoleInput(
      typeof body.customRoleInput === "object" && body.customRoleInput
        ? body.customRoleInput
        : undefined,
    );
    const currentResume = body.currentResume as ResumeData | undefined;

    if (!jdText) {
      return NextResponse.json(
        { error: "JD 不能为空，请先粘贴岗位描述。" },
        { status: 400 },
      );
    }

    if (selectedRole === "CUSTOM_ROLE" && !hasCustomRoleIntent(customRoleInput)) {
      return NextResponse.json(
        { error: "请填写自定义岗位名称或修改偏好。" },
        { status: 400 },
      );
    }

    if (isOpenAiConfigured()) {
      try {
        const analysis = await analyzeJDWithAI({
          jdText,
          selectedRole,
          customRoleInput,
          currentResume,
        });

        return NextResponse.json({
          ...analysis,
          analyzer: "ai",
        });
      } catch (error) {
        return NextResponse.json({
          ...classifyJd(jdText, { selectedRole, customRoleInput }),
          analyzer: "rule",
          fallbackReason:
            error instanceof Error
              ? `AI 分析失败，已回退规则分析：${error.message}`
              : "AI 分析失败，已回退规则分析。",
        });
      }
    }

    return NextResponse.json({
      ...classifyJd(jdText, { selectedRole, customRoleInput }),
      analyzer: "rule",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "JD 分析失败，请检查输入。";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function parseSelectedRole(value: unknown): ApiRole | undefined {
  const validRoles: ApiRole[] = [
    "AI_PRODUCT_MANAGER",
    "AI_AGENT_APPLICATION",
    "LLM_APPLICATION_PRODUCT",
    "AUTO_DETECT_ROLE",
    "CUSTOM_ROLE",
    "OTHER",
  ];

  return typeof value === "string" && validRoles.includes(value as ApiRole)
    ? (value as ApiRole)
    : undefined;
}
