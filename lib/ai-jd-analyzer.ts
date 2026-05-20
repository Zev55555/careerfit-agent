import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getOpenAiApiKey,
  getOpenAiModel,
  isOpenAiConfigured,
} from "@/lib/openai-config";
import {
  type CustomRoleInput,
  normalizeCustomRoleInput,
} from "@/lib/custom-role";
import type { JDAnalysisResult } from "@/lib/role-classifier";
import type { ApiRole } from "@/lib/role-classifier";
import type { ResumeData } from "@/lib/resume-schema";
import { validateJDAnalysisResult } from "@/lib/jd-analysis-schema";

type AnalyzeJDWithAIInput = {
  jdText: string;
  selectedRole?: ApiRole;
  customRoleInput?: Partial<CustomRoleInput>;
  currentResume?: ResumeData;
};

const roleEnum = [
  "AI_PRODUCT_MANAGER",
  "AI_AGENT_APPLICATION",
  "LLM_APPLICATION_PRODUCT",
  "AUTO_DETECT_ROLE",
  "CUSTOM_ROLE",
  "OTHER",
] as const;

const projectRecommendationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["projectName", "reason"],
  properties: {
    projectName: { type: "string" },
    reason: { type: "string" },
  },
} as const;

const jdAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "primaryRole",
    "secondaryRoles",
    "confidence",
    "roleLabel",
    "summary",
    "jdHighlights",
    "requiredAbilities",
    "preferredAbilities",
    "recommendedProjects",
    "weakenedProjects",
    "riskWarnings",
    "screeningProfile",
    "abilityMap",
    "evidenceMatrix",
    "resumeThesis",
    "coverageCheck",
    "detectedRole",
    "strategyRole",
    "roleMismatch",
  ],
  properties: {
    primaryRole: { type: "string", enum: roleEnum },
    secondaryRoles: { type: "array", items: { type: "string", enum: roleEnum } },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    roleLabel: { type: "string" },
    summary: { type: "string" },
    jdHighlights: { type: "array", items: { type: "string" } },
    requiredAbilities: { type: "array", items: { type: "string" } },
    preferredAbilities: { type: "array", items: { type: "string" } },
    recommendedProjects: {
      type: "array",
      items: projectRecommendationSchema,
    },
    weakenedProjects: {
      type: "array",
      items: projectRecommendationSchema,
    },
    riskWarnings: { type: "array", items: { type: "string" } },
    screeningProfile: {
      type: "object",
      additionalProperties: false,
      required: [
        "whoTheyWant",
        "mustProve",
        "niceToHave",
        "avoidPositioningAs",
        "hiddenRequirements",
      ],
      properties: {
        whoTheyWant: { type: "string" },
        mustProve: { type: "array", items: { type: "string" } },
        niceToHave: { type: "array", items: { type: "string" } },
        avoidPositioningAs: { type: "array", items: { type: "string" } },
        hiddenRequirements: { type: "array", items: { type: "string" } },
      },
    },
    abilityMap: {
      type: "object",
      additionalProperties: false,
      required: [
        "hardSkills",
        "productSkills",
        "businessSkills",
        "aiSkills",
        "collaborationSkills",
        "evaluationSkills",
        "riskAreas",
      ],
      properties: {
        hardSkills: { type: "array", items: { type: "string" } },
        productSkills: { type: "array", items: { type: "string" } },
        businessSkills: { type: "array", items: { type: "string" } },
        aiSkills: { type: "array", items: { type: "string" } },
        collaborationSkills: { type: "array", items: { type: "string" } },
        evaluationSkills: { type: "array", items: { type: "string" } },
        riskAreas: { type: "array", items: { type: "string" } },
      },
    },
    evidenceMatrix: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "jdRequirement",
          "matchedProjects",
          "matchLevel",
          "evidence",
          "rewriteFocus",
          "riskNote",
        ],
        properties: {
          jdRequirement: { type: "string" },
          matchedProjects: { type: "array", items: { type: "string" } },
          matchLevel: {
            type: "string",
            enum: ["strong", "medium", "weak", "missing"],
          },
          evidence: { type: "string" },
          rewriteFocus: { type: "string" },
          riskNote: { type: "string" },
        },
      },
    },
    resumeThesis: {
      type: "object",
      additionalProperties: false,
      required: [
        "oneSentence",
        "positioning",
        "openingFocus",
        "projectPriority",
        "skillPriority",
      ],
      properties: {
        oneSentence: { type: "string" },
        positioning: { type: "string" },
        openingFocus: { type: "array", items: { type: "string" } },
        projectPriority: { type: "array", items: { type: "string" } },
        skillPriority: { type: "array", items: { type: "string" } },
      },
    },
    coverageCheck: {
      type: "object",
      additionalProperties: false,
      required: [
        "overallScore",
        "coveredRequirements",
        "partiallyCoveredRequirements",
        "missingRequirements",
        "overPackagingRisks",
        "suggestedManualReview",
      ],
      properties: {
        overallScore: { type: "number", minimum: 0, maximum: 100 },
        coveredRequirements: { type: "array", items: { type: "string" } },
        partiallyCoveredRequirements: {
          type: "array",
          items: { type: "string" },
        },
        missingRequirements: { type: "array", items: { type: "string" } },
        overPackagingRisks: { type: "array", items: { type: "string" } },
        suggestedManualReview: { type: "array", items: { type: "string" } },
      },
    },
    detectedRole: {
      type: "object",
      additionalProperties: false,
      required: ["label", "category", "confidence", "reason"],
      properties: {
        label: { type: "string" },
        category: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        reason: { type: "string" },
      },
    },
    strategyRole: {
      type: "object",
      additionalProperties: false,
      required: ["selectedRole", "label", "isUserForced"],
      properties: {
        selectedRole: { type: "string" },
        label: { type: "string" },
        isUserForced: { type: "boolean" },
      },
    },
    roleMismatch: {
      type: "object",
      additionalProperties: false,
      required: ["hasMismatch", "severity", "message", "suggestedAction"],
      properties: {
        hasMismatch: { type: "boolean" },
        severity: {
          type: "string",
          enum: ["none", "low", "medium", "high"],
        },
        message: { type: "string" },
        suggestedAction: { type: "string" },
      },
    },
  },
} as const;

export async function analyzeJDWithAI({
  jdText,
  selectedRole,
  customRoleInput,
  currentResume,
}: AnalyzeJDWithAIInput): Promise<JDAnalysisResult> {
  if (!isOpenAiConfigured()) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const apiKey = getOpenAiApiKey();
  const prompt = await readAnalyzerPrompt();
  const projectNames = currentResume?.projects.map((project) => project.name) ?? [];
  const normalizedCustomRoleInput = normalizeCustomRoleInput(customRoleInput);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      input: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              jdText,
              selectedRole,
              customRoleInput: normalizedCustomRoleInput,
              customRoleMode: selectedRole === "CUSTOM_ROLE",
              currentResumeProjectNames: projectNames,
              currentResumeProjects:
                currentResume?.projects.map((project) => ({
                  name: project.name,
                  context: project.context,
                  bullets: project.bullets.map((bullet) => bullet.text),
                  emphasis: project.emphasis,
                })) ?? [],
            },
            null,
            2,
          ),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "jd_analysis_result",
          strict: true,
          schema: jdAnalysisSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI JD analysis failed: ${detail.slice(0, 500)}`);
  }

  const payload = (await response.json()) as { output_text?: string };
  const outputText = payload.output_text ?? extractOutputText(payload);

  if (!outputText) {
    throw new Error("OpenAI JD analysis returned no text output.");
  }

  return filterProjectsByResume(
    stabilizePrimaryRole(validateJDAnalysisResult(JSON.parse(outputText)), jdText),
    projectNames,
  );
}

async function readAnalyzerPrompt() {
  const promptPath = path.join(process.cwd(), "prompts", "jd_ai_analyzer.md");
  return readFile(promptPath, "utf8");
}

function filterProjectsByResume(
  analysis: JDAnalysisResult,
  projectNames: string[],
): JDAnalysisResult {
  if (projectNames.length === 0) {
    return analysis;
  }

  const allowed = new Set(projectNames);
  const filterProjectNames = (items: string[]) =>
    items.filter((item) => allowed.has(item));
  const filterRecommendations = (items: JDAnalysisResult["recommendedProjects"]) =>
    items.filter((item) => allowed.has(item.projectName ?? item.name));

  return {
    ...analysis,
    recommendedProjects: filterRecommendations(analysis.recommendedProjects),
    weakenedProjects: filterRecommendations(analysis.weakenedProjects),
    evidenceMatrix: analysis.evidenceMatrix.map((item) => ({
      ...item,
      matchedProjects: filterProjectNames(item.matchedProjects),
    })),
    resumeThesis: {
      ...analysis.resumeThesis,
      projectPriority: filterProjectNames(analysis.resumeThesis.projectPriority),
    },
  };
}

function stabilizePrimaryRole(
  analysis: JDAnalysisResult,
  jdText: string,
): JDAnalysisResult {
  if (
    analysis.primaryRole === "CUSTOM_ROLE" ||
    analysis.primaryRole !== "OTHER" ||
    !/AI\s*产品|产品实习|产品规划|需求调研|产品方案|PRD|用户反馈|产品迭代|办公提效|企业协同/i.test(
      jdText,
    )
  ) {
    return analysis;
  }

  return {
    ...analysis,
    primaryRole: "AI_PRODUCT_MANAGER",
    secondaryRoles: Array.from(
      new Set<ApiRole>(["OTHER", ...analysis.secondaryRoles]),
    ).filter((role) => role !== "AI_PRODUCT_MANAGER"),
    roleLabel: "AI 产品经理",
    summary:
      analysis.summary || "该 JD 明确包含 AI 产品、需求调研和产品规划要求，优先归入 AI 产品经理方向。",
    resumeThesis: {
      ...analysis.resumeThesis,
      positioning:
        analysis.resumeThesis.positioning || "AI 产品经理方向候选人",
    },
  };
}

function extractOutputText(payload: unknown) {
  const response = payload as {
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };

  return response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim();
}
