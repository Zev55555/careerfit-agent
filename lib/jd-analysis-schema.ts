import type {
  AbilityMap,
  ApiRole,
  CoverageCheck,
  EvidenceMatchLevel,
  EvidenceMatrixItem,
  JDAnalysisResult,
  ProjectRecommendation,
  ResumeThesis,
  ScreeningProfile,
} from "@/lib/role-classifier";
import { apiRoleLabels } from "@/lib/role-classifier";

const validRoles: ApiRole[] = [
  "AI_PRODUCT_MANAGER",
  "AI_AGENT_APPLICATION",
  "LLM_APPLICATION_PRODUCT",
  "AUTO_DETECT_ROLE",
  "CUSTOM_ROLE",
  "OTHER",
];

const validMatchLevels: EvidenceMatchLevel[] = [
  "strong",
  "medium",
  "weak",
  "missing",
];

export function validateJDAnalysisResult(data: unknown): JDAnalysisResult {
  if (!data || typeof data !== "object") {
    throw new Error("JD analysis result is not an object.");
  }

  const input = data as Partial<JDAnalysisResult>;
  const primaryRole = normalizeRole(input.primaryRole);
  const secondaryRoles = normalizeRoleArray(input.secondaryRoles).filter(
    (role) => role !== primaryRole,
  );
  const confidence = normalizeConfidence(input.confidence);
  const roleLabel =
    typeof input.roleLabel === "string" && input.roleLabel.trim()
      ? input.roleLabel.trim()
      : apiRoleLabels[primaryRole];
  const requiredAbilities = normalizeStringArray(input.requiredAbilities).slice(0, 8);
  const preferredAbilities = normalizeStringArray(input.preferredAbilities).slice(0, 8);
  const riskWarnings = normalizeStringArray(input.riskWarnings);
  const recommendedProjects = normalizeProjectList(input.recommendedProjects);
  const weakenedProjects = normalizeProjectList(input.weakenedProjects);

  const base: JDAnalysisResult = {
    primaryRole,
    secondaryRoles: Array.from(new Set(secondaryRoles)),
    confidence,
    roleLabel,
    summary: normalizeString(input.summary, "已完成 JD 分析。"),
    jdHighlights: normalizeStringArray(input.jdHighlights).slice(0, 8),
    requiredAbilities,
    preferredAbilities,
    recommendedProjects,
    weakenedProjects,
    riskWarnings,
    screeningProfile: normalizeScreeningProfile(input.screeningProfile, {
      primaryRole,
      requiredAbilities,
      preferredAbilities,
      riskWarnings,
    }),
    abilityMap: normalizeAbilityMap(input.abilityMap, {
      requiredAbilities,
      preferredAbilities,
      riskWarnings,
    }),
    evidenceMatrix: normalizeEvidenceMatrix(input.evidenceMatrix, {
      requiredAbilities,
      recommendedProjects,
    }),
    resumeThesis: normalizeResumeThesis(input.resumeThesis, {
      primaryRole,
      roleLabel,
      requiredAbilities,
      preferredAbilities,
      recommendedProjects,
    }),
    coverageCheck: normalizeCoverageCheck(input.coverageCheck, {
      confidence,
      requiredAbilities,
      riskWarnings,
    }),
    detectedRole: normalizeDetectedRole(input.detectedRole, {
      roleLabel,
      confidence,
      summary: normalizeString(input.summary, ""),
    }),
    strategyRole: normalizeStrategyRole(input.strategyRole, {
      primaryRole,
      roleLabel,
    }),
    roleMismatch: normalizeRoleMismatch(input.roleMismatch),
  };

  return base;
}

function normalizeRole(value: unknown): ApiRole {
  if (typeof value === "string" && validRoles.includes(value as ApiRole)) {
    return value as ApiRole;
  }

  throw new Error("Invalid primaryRole.");
}

function normalizeRoleArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is ApiRole =>
      typeof item === "string" && validRoles.includes(item as ApiRole),
  );
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0.5;
  }

  return Number(Math.min(1, Math.max(0, value)).toFixed(2));
}

function normalizeScore(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 50;
  }

  return Math.round(Math.min(100, Math.max(0, value)));
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeProjectList(value: unknown): ProjectRecommendation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: Array<ProjectRecommendation | null> = value.map((item) => {
    if (!item || typeof item !== "object") {
      return null;
    }

    const project = item as {
      name?: unknown;
      projectName?: unknown;
      reason?: unknown;
    };
    const name =
      typeof project.projectName === "string" && project.projectName.trim()
        ? project.projectName.trim()
        : typeof project.name === "string" && project.name.trim()
          ? project.name.trim()
          : "";
    const reason =
      typeof project.reason === "string" && project.reason.trim()
        ? project.reason.trim()
        : "";

    if (!name) {
      return null;
    }

    return {
      name,
      projectName: name,
      reason,
    };
  });

  return items.filter((item): item is ProjectRecommendation => Boolean(item));
}

function normalizeScreeningProfile(
  value: unknown,
  fallback: {
    primaryRole: ApiRole;
    requiredAbilities: string[];
    preferredAbilities: string[];
    riskWarnings: string[];
  },
): ScreeningProfile {
  const input =
    value && typeof value === "object" ? (value as Partial<ScreeningProfile>) : {};

  return {
    whoTheyWant: normalizeString(
      input.whoTheyWant,
      fallback.primaryRole === "AI_PRODUCT_MANAGER"
        ? "懂 AI 产品、能把业务需求拆解为产品方案和 AI 工作流的候选人。"
        : "能把岗位要求转化为可信项目证据的候选人。",
    ),
    mustProve: normalizeStringArray(input.mustProve).length
      ? normalizeStringArray(input.mustProve)
      : fallback.requiredAbilities,
    niceToHave: normalizeStringArray(input.niceToHave).length
      ? normalizeStringArray(input.niceToHave)
      : fallback.preferredAbilities,
    avoidPositioningAs: normalizeStringArray(input.avoidPositioningAs).length
      ? normalizeStringArray(input.avoidPositioningAs)
      : ["算法工程师", "纯数据分析师", "只会做 Demo 的工具开发者"],
    hiddenRequirements: normalizeStringArray(input.hiddenRequirements).length
      ? normalizeStringArray(input.hiddenRequirements)
      : ["需要体现产品意识，而不仅是技术兴趣。", "需要证明 AI 能力能进入真实业务场景。"],
  };
}

function normalizeAbilityMap(
  value: unknown,
  fallback: {
    requiredAbilities: string[];
    preferredAbilities: string[];
    riskWarnings: string[];
  },
): AbilityMap {
  const input = value && typeof value === "object" ? (value as Partial<AbilityMap>) : {};
  const allAbilities = [...fallback.requiredAbilities, ...fallback.preferredAbilities];

  return {
    hardSkills: normalizeStringArray(input.hardSkills).length
      ? normalizeStringArray(input.hardSkills)
      : allAbilities.filter((item) => /SQL|Python|数据|指标|Prompt|LLM|Agent|RAG/i.test(item)),
    productSkills: normalizeStringArray(input.productSkills).length
      ? normalizeStringArray(input.productSkills)
      : allAbilities.filter((item) => /产品|需求|用户|方案|PRD|原型/.test(item)),
    businessSkills: normalizeStringArray(input.businessSkills).length
      ? normalizeStringArray(input.businessSkills)
      : allAbilities.filter((item) => /业务|场景|流程|指标/.test(item)),
    aiSkills: normalizeStringArray(input.aiSkills).length
      ? normalizeStringArray(input.aiSkills)
      : allAbilities.filter((item) => /AI|LLM|Agent|Prompt|模型|大模型/i.test(item)),
    collaborationSkills: normalizeStringArray(input.collaborationSkills),
    evaluationSkills: normalizeStringArray(input.evaluationSkills).length
      ? normalizeStringArray(input.evaluationSkills)
      : allAbilities.filter((item) => /评估|验证|效果|质量|Badcase|指标/.test(item)),
    riskAreas: normalizeStringArray(input.riskAreas).length
      ? normalizeStringArray(input.riskAreas)
      : fallback.riskWarnings,
  };
}

function normalizeEvidenceMatrix(
  value: unknown,
  fallback: {
    requiredAbilities: string[];
    recommendedProjects: ProjectRecommendation[];
  },
): EvidenceMatrixItem[] {
  if (!Array.isArray(value)) {
    return fallback.requiredAbilities.slice(0, 5).map((ability, index) => ({
      jdRequirement: ability,
      matchedProjects: fallback.recommendedProjects
        .map((project) => project.projectName ?? project.name)
        .slice(0, index === 0 ? 2 : 1),
      matchLevel: index <= 1 ? "strong" : "medium",
      evidence: "基于规则 fallback，可从推荐项目中提取相关证据。",
      rewriteFocus: `围绕“${ability}”补充业务场景、AI 介入环节和验证方式。`,
      riskNote: index <= 1 ? "" : "建议人工确认该要求的证据强度。",
    }));
  }

  const normalized: Array<EvidenceMatrixItem | null> = value.map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const input = item as Partial<EvidenceMatrixItem>;
      const jdRequirement = normalizeString(input.jdRequirement, "");

      if (!jdRequirement) {
        return null;
      }

      const matchLevel = validMatchLevels.includes(input.matchLevel as EvidenceMatchLevel)
        ? (input.matchLevel as EvidenceMatchLevel)
        : "weak";

      return {
        jdRequirement,
        matchedProjects: normalizeStringArray(input.matchedProjects),
        matchLevel,
        evidence: normalizeString(input.evidence, ""),
        rewriteFocus: normalizeString(input.rewriteFocus, ""),
        riskNote: normalizeString(
          input.riskNote,
          matchLevel === "weak" || matchLevel === "missing"
            ? "证据较弱，不能硬包装。"
            : "",
        ),
      };
    });

  return normalized.filter((item): item is EvidenceMatrixItem => Boolean(item));
}

function normalizeResumeThesis(
  value: unknown,
  fallback: {
    primaryRole: ApiRole;
    roleLabel: string;
    requiredAbilities: string[];
    preferredAbilities: string[];
    recommendedProjects: ProjectRecommendation[];
  },
): ResumeThesis {
  const input = value && typeof value === "object" ? (value as Partial<ResumeThesis>) : {};
  const projectPriority = normalizeStringArray(input.projectPriority).length
    ? normalizeStringArray(input.projectPriority)
    : fallback.recommendedProjects.map((project) => project.projectName ?? project.name);

  return {
    oneSentence: normalizeString(
      input.oneSentence,
      `突出候选人作为${fallback.roleLabel}方向候选人，能将 JD 要求转化为可信项目证据。`,
    ),
    positioning: normalizeString(input.positioning, `${fallback.roleLabel}方向候选人`),
    openingFocus: normalizeStringArray(input.openingFocus).length
      ? normalizeStringArray(input.openingFocus)
      : fallback.requiredAbilities.slice(0, 3),
    projectPriority,
    skillPriority: normalizeStringArray(input.skillPriority).length
      ? normalizeStringArray(input.skillPriority)
      : [...fallback.requiredAbilities, ...fallback.preferredAbilities].slice(0, 5),
  };
}

function normalizeCoverageCheck(
  value: unknown,
  fallback: {
    confidence: number;
    requiredAbilities: string[];
    riskWarnings: string[];
  },
): CoverageCheck {
  const input = value && typeof value === "object" ? (value as Partial<CoverageCheck>) : {};

  return {
    overallScore: normalizeScore(
      typeof input.overallScore === "number"
        ? input.overallScore
        : Math.round(fallback.confidence * 100),
    ),
    coveredRequirements: normalizeStringArray(input.coveredRequirements).length
      ? normalizeStringArray(input.coveredRequirements)
      : fallback.requiredAbilities.slice(0, 3),
    partiallyCoveredRequirements: normalizeStringArray(input.partiallyCoveredRequirements),
    missingRequirements: normalizeStringArray(input.missingRequirements),
    overPackagingRisks: normalizeStringArray(input.overPackagingRisks).length
      ? normalizeStringArray(input.overPackagingRisks)
      : fallback.riskWarnings,
    suggestedManualReview: normalizeStringArray(input.suggestedManualReview).length
      ? normalizeStringArray(input.suggestedManualReview)
      : ["人工确认弱匹配要求是否有足够证据支撑。"],
  };
}

function normalizeDetectedRole(
  value: unknown,
  fallback: { roleLabel: string; confidence: number; summary: string },
): JDAnalysisResult["detectedRole"] {
  const input =
    value && typeof value === "object"
      ? (value as Partial<JDAnalysisResult["detectedRole"]>)
      : {};

  return {
    label: normalizeString(input.label, fallback.roleLabel),
    category: normalizeString(input.category, fallback.roleLabel),
    confidence: normalizeConfidence(input.confidence ?? fallback.confidence),
    reason: normalizeString(input.reason, fallback.summary || "基于 JD 内容进行岗位判断。"),
  };
}

function normalizeStrategyRole(
  value: unknown,
  fallback: { primaryRole: ApiRole; roleLabel: string },
): JDAnalysisResult["strategyRole"] {
  const input =
    value && typeof value === "object"
      ? (value as Partial<JDAnalysisResult["strategyRole"]>)
      : {};
  const selectedRole =
    typeof input.selectedRole === "string" && input.selectedRole.trim()
      ? input.selectedRole.trim()
      : fallback.primaryRole;

  return {
    selectedRole,
    label: normalizeString(input.label, fallback.roleLabel),
    isUserForced:
      typeof input.isUserForced === "boolean"
        ? input.isUserForced
        : selectedRole !== "AUTO_DETECT_ROLE",
  };
}

function normalizeRoleMismatch(value: unknown): JDAnalysisResult["roleMismatch"] {
  const input =
    value && typeof value === "object"
      ? (value as Partial<NonNullable<JDAnalysisResult["roleMismatch"]>>)
      : {};
  const severity =
    input.severity === "low" ||
    input.severity === "medium" ||
    input.severity === "high" ||
    input.severity === "none"
      ? input.severity
      : "none";
  const hasMismatch =
    typeof input.hasMismatch === "boolean"
      ? input.hasMismatch
      : severity !== "none";

  return {
    hasMismatch,
    severity: hasMismatch ? severity === "none" ? "medium" : severity : "none",
    message: normalizeString(input.message, ""),
    suggestedAction: normalizeString(input.suggestedAction, ""),
  };
}
