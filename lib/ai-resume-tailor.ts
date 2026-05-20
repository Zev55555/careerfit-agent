import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getOpenAiApiKey,
  getOpenAiModel,
  isOpenAiConfigured,
} from "@/lib/openai-config";
import {
  type CustomRoleInput,
  getCustomRoleLabel,
  normalizeCustomRoleInput,
} from "@/lib/custom-role";
import type { AtsGuidance } from "@/lib/ats-keyword-review";
import type { ApiRole, JDAnalysisResult } from "@/lib/role-classifier";
import type { ResumeData, TailorChangeLog } from "@/lib/resume-schema";
import { validateTailorResult } from "@/lib/tailor-result-schema";

type TailorableApiRole = Exclude<ApiRole, "OTHER">;
type PresetTailorableApiRole = Exclude<
  TailorableApiRole,
  "CUSTOM_ROLE" | "AUTO_DETECT_ROLE"
>;

export type TailorResumeWithAIInput = {
  resume: ResumeData;
  jdText: string;
  selectedRole: TailorableApiRole;
  customRoleInput?: Partial<CustomRoleInput>;
  analysisResult: JDAnalysisResult;
  atsGuidance?: AtsGuidance;
};

export type TailorResumeWithAIResult = {
  tailoredResume: ResumeData;
  changeLog: TailorChangeLog;
};

const roleStrategyFiles: Record<PresetTailorableApiRole, string> = {
  AI_PRODUCT_MANAGER: "ai_product_manager_strategy.md",
  AI_AGENT_APPLICATION: "ai_agent_application_strategy.md",
  LLM_APPLICATION_PRODUCT: "llm_application_strategy.md",
};

const tailorResultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["tailoredResume", "changeLog"],
  properties: {
    tailoredResume: {
      type: "object",
      additionalProperties: false,
      required: ["meta", "profile", "skills", "projects", "education", "notes"],
      properties: {
        meta: {
          type: "object",
          additionalProperties: false,
          required: ["version", "templateLocked", "lastUpdated", "source"],
          properties: {
            version: { type: "string" },
            templateLocked: { type: "boolean" },
            lastUpdated: { type: "string" },
            source: { type: "string", enum: ["sample", "pdf-upload", "tailored"] },
          },
        },
        profile: {
          type: "object",
          additionalProperties: false,
          required: ["name", "email", "phone", "links"],
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            links: { type: "array", items: { type: "string" } },
          },
        },
        skills: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "items"],
            properties: {
              label: { type: "string" },
              items: { type: "array", items: { type: "string" } },
            },
          },
        },
        projects: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "name", "links", "context", "bullets", "emphasis"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              links: {
                type: "object",
                additionalProperties: false,
                required: ["website", "github"],
                properties: {
                  website: { type: "string" },
                  github: { type: "string" },
                },
              },
              context: { type: "string" },
              bullets: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "text", "tags", "riskLevel"],
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                    tags: { type: "array", items: { type: "string" } },
                    riskLevel: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                    },
                  },
                },
              },
              emphasis: {
                type: "array",
                items: {
                  type: "string",
                  enum: [
                    "ai_product_manager",
                    "ai_agent_application",
                    "llm_application",
                  ],
                },
              },
            },
          },
        },
        education: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "school",
              "schoolBadge",
              "major",
              "timeframe",
              "gpa",
              "courses",
              "details",
            ],
            properties: {
              school: { type: "string" },
              schoolBadge: { type: "string" },
              major: { type: "string" },
              timeframe: { type: "string" },
              gpa: { type: "string" },
              courses: { type: "array", items: { type: "string" } },
              details: { type: "array", items: { type: "string" } },
            },
          },
        },
        notes: { type: "array", items: { type: "string" } },
      },
    },
    changeLog: {
      type: "object",
      additionalProperties: false,
      required: [
        "strengthenedProjects",
        "weakenedProjects",
        "skillChanges",
        "summaryChanges",
        "riskWarnings",
        "truthCheck",
      ],
      properties: {
        strengthenedProjects: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["projectName", "reason", "changes"],
            properties: {
              projectName: { type: "string" },
              reason: { type: "string" },
              changes: { type: "array", items: { type: "string" } },
            },
          },
        },
        weakenedProjects: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["projectName", "reason", "changes"],
            properties: {
              projectName: { type: "string" },
              reason: { type: "string" },
              changes: { type: "array", items: { type: "string" } },
            },
          },
        },
        skillChanges: { type: "array", items: { type: "string" } },
        summaryChanges: { type: "array", items: { type: "string" } },
        riskWarnings: { type: "array", items: { type: "string" } },
        truthCheck: {
          type: "object",
          additionalProperties: false,
          required: ["passed", "warnings"],
          properties: {
            passed: { type: "boolean" },
            warnings: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
} as const;

export async function tailorResumeWithAI(
  input: TailorResumeWithAIInput,
): Promise<TailorResumeWithAIResult> {
  if (!isOpenAiConfigured()) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const apiKey = getOpenAiApiKey();
  const customRoleInput = normalizeCustomRoleInput(input.customRoleInput);
  const [prompt, roleStrategy] = await Promise.all([
    readTailorPrompt(),
    readRoleStrategy(input.selectedRole, customRoleInput),
  ]);
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
              selectedRole: input.selectedRole,
              customRoleInput,
              customRoleLabel:
                input.selectedRole === "CUSTOM_ROLE"
                  ? getCustomRoleLabel(customRoleInput)
                  : "",
              jdText: input.jdText,
              analysisResult: input.analysisResult,
              jobStrategy: buildJobStrategy(input.analysisResult),
              bulletRewriteGuide: buildBulletRewriteGuide(input.analysisResult),
              atsGuidance: input.atsGuidance,
              roleStrategy,
              resume: compactResumeForPrompt(input.resume),
            },
            null,
            2,
          ),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "tailored_resume_result",
          strict: true,
          schema: tailorResultSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI resume tailoring failed: ${detail.slice(0, 500)}`);
  }

  const payload = (await response.json()) as { output_text?: string };
  const outputText = payload.output_text ?? extractOutputText(payload);

  if (!outputText) {
    throw new Error("OpenAI resume tailoring returned no text output.");
  }

  return applyStrategyPostProcessing(
    validateTailorResult(JSON.parse(outputText), input.resume),
    input.analysisResult,
  );
}

async function readTailorPrompt() {
  return readFile(path.join(process.cwd(), "prompts", "resume_ai_tailor.md"), "utf8");
}

async function readRoleStrategy(
  role: TailorableApiRole,
  customRoleInput: CustomRoleInput,
) {
  if (role === "CUSTOM_ROLE" || role === "AUTO_DETECT_ROLE") {
    return [
      role === "AUTO_DETECT_ROLE" ? "Auto-detect role mode:" : "Custom role mode:",
      `Role label: ${role === "AUTO_DETECT_ROLE" ? "Use detectedRole from analysisResult" : getCustomRoleLabel(customRoleInput)}`,
      `Focus areas: ${customRoleInput.focusAreas || "not provided"}`,
      `Strengths to highlight: ${customRoleInput.strengthsToHighlight || "not provided"}`,
      `Avoid areas: ${customRoleInput.avoidAreas || "not provided"}`,
      `User notes: ${customRoleInput.rawText || "not provided"}`,
      "Use the JD, detectedRole, strategyRole, roleMismatch, and analysisResult as the primary strategy. Do not force the resume into the three preset AI roles.",
    ].join("\n");
  }

  return readFile(
    path.join(process.cwd(), "strategy", roleStrategyFiles[role]),
    "utf8",
  );
}

function compactResumeForPrompt(resume: ResumeData): ResumeData {
  const compactResume = { ...resume };
  delete compactResume.rawText;
  return compactResume;
}

function buildJobStrategy(analysisResult: JDAnalysisResult) {
  return {
    screeningProfile: analysisResult.screeningProfile,
    abilityMap: analysisResult.abilityMap,
    evidenceMatrix: analysisResult.evidenceMatrix,
    resumeThesis: analysisResult.resumeThesis,
    coverageCheck: analysisResult.coverageCheck,
  };
}

function buildBulletRewriteGuide(analysisResult: JDAnalysisResult) {
  const strongRequirements = analysisResult.evidenceMatrix
    .filter((item) => item.matchLevel === "strong")
    .slice(0, 4)
    .map((item) => ({
      jdRequirement: item.jdRequirement,
      matchedProjects: item.matchedProjects,
      rewriteFocus: item.rewriteFocus,
    }));
  const mediumRequirements = analysisResult.evidenceMatrix
    .filter((item) => item.matchLevel === "medium")
    .slice(0, 4)
    .map((item) => ({
      jdRequirement: item.jdRequirement,
      matchedProjects: item.matchedProjects,
      rewriteFocus: item.rewriteFocus,
    }));
  const weakOrMissingRequirements = analysisResult.evidenceMatrix
    .filter((item) => item.matchLevel === "weak" || item.matchLevel === "missing")
    .map((item) => ({
      jdRequirement: item.jdRequirement,
      matchLevel: item.matchLevel,
      riskNote: item.riskNote,
    }));

  return {
    formula:
      "岗位能力词：在什么业务场景下，为解决什么问题，设计了什么流程 / 方案，如何验证或评估。",
    firstScreenRules: [
      "技能区前两行必须回应 JD 最核心筛选点。",
      "第一个项目的前两条 bullet 必须直接回应 strong evidenceMatrix 要求。",
      "weak / missing 要求不能硬写进简历，只能进入风险提醒。",
    ],
    strongRequirements,
    mediumRequirements,
    weakOrMissingRequirements,
  };
}

function applyStrategyPostProcessing(
  result: TailorResumeWithAIResult,
  analysisResult: JDAnalysisResult,
): TailorResumeWithAIResult {
  const projectPriority = analysisResult.resumeThesis.projectPriority;
  const skillPriority = analysisResult.resumeThesis.skillPriority;
  const overPackagingRisks = analysisResult.coverageCheck.overPackagingRisks;
  const thesis = analysisResult.resumeThesis.oneSentence;

  return {
    tailoredResume: {
      ...result.tailoredResume,
      projects: orderProjectsByStrategy(
        result.tailoredResume.projects,
        projectPriority,
      ),
    },
    changeLog: {
      ...result.changeLog,
      skillChanges: Array.from(
        new Set([
          ...result.changeLog.skillChanges,
          ...(skillPriority.length
            ? [`技能优先级参考：${skillPriority.slice(0, 6).join("、")}`]
            : []),
        ]),
      ),
      summaryChanges: Array.from(
        new Set([
          ...result.changeLog.summaryChanges,
          ...(thesis ? [`本次简历主线：${thesis}`] : []),
        ]),
      ),
      riskWarnings: Array.from(
        new Set([...result.changeLog.riskWarnings, ...overPackagingRisks]),
      ),
      truthCheck: {
        ...result.changeLog.truthCheck,
        warnings: Array.from(
          new Set([
            ...result.changeLog.truthCheck.warnings,
            ...overPackagingRisks,
          ]),
        ),
      },
    },
  };
}

function orderProjectsByStrategy(
  projects: ResumeData["projects"],
  projectPriority: string[],
) {
  if (projectPriority.length === 0) {
    return projects;
  }

  return [...projects].sort((a, b) => {
    const aIndex = getProjectPriorityIndex(a.name, projectPriority);
    const bIndex = getProjectPriorityIndex(b.name, projectPriority);
    return aIndex - bIndex;
  });
}

function getProjectPriorityIndex(projectName: string, projectPriority: string[]) {
  const normalizedProject = normalizeProjectName(projectName);
  const index = projectPriority.findIndex((priorityName) => {
    const normalizedPriority = normalizeProjectName(priorityName);
    return (
      normalizedProject.includes(normalizedPriority) ||
      normalizedPriority.includes(normalizedProject)
    );
  });

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function normalizeProjectName(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
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
