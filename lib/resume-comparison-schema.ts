export type ComparisonDimension =
  | "roleFit"
  | "atsCoverage"
  | "hardSkills"
  | "projectEvidence"
  | "productEvidence"
  | "technicalDetails"
  | "truthSafety"
  | "aiTraceRisk"
  | "pageEfficiency";

export type ResumeComparisonDimensionScore = {
  dimension: ComparisonDimension;
  masterScore: number;
  tailoredScore: number;
  delta: number;
  reason: string;
};

export type LostEvidence = {
  type: "skill" | "project" | "bullet" | "tool" | "metric" | "link";
  value: string;
  importance: "high" | "medium" | "low";
  reason: string;
  suggestedRecovery: string;
};

export type ResumeComparisonReview = {
  checked: boolean;
  masterScore: number;
  tailoredScore: number;
  delta: number;
  winner: "master" | "tailored" | "tie" | "hybrid_recommended";
  summary: string;
  dimensionScores: ResumeComparisonDimensionScore[];
  lostEvidence: LostEvidence[];
  weakenedDimensions: string[];
  recoveryActions: string[];
  shouldGenerateHybrid: boolean;
};

const validDimensions: ComparisonDimension[] = [
  "roleFit",
  "atsCoverage",
  "hardSkills",
  "projectEvidence",
  "productEvidence",
  "technicalDetails",
  "truthSafety",
  "aiTraceRisk",
  "pageEfficiency",
];

const validWinners: ResumeComparisonReview["winner"][] = [
  "master",
  "tailored",
  "tie",
  "hybrid_recommended",
];

const validEvidenceTypes: LostEvidence["type"][] = [
  "skill",
  "project",
  "bullet",
  "tool",
  "metric",
  "link",
];

const validImportance: LostEvidence["importance"][] = ["high", "medium", "low"];

export function normalizeResumeComparisonReview(
  value: Partial<ResumeComparisonReview> | undefined,
): ResumeComparisonReview {
  const dimensionScores = Array.isArray(value?.dimensionScores)
    ? value.dimensionScores
        .map(normalizeDimensionScore)
        .filter((item): item is ResumeComparisonDimensionScore => Boolean(item))
    : [];
  const lostEvidence = Array.isArray(value?.lostEvidence)
    ? value.lostEvidence
        .map(normalizeLostEvidence)
        .filter((item): item is LostEvidence => Boolean(item))
    : [];
  const masterScore = clampScore(value?.masterScore ?? averageScore(dimensionScores, "masterScore"));
  const tailoredScore = clampScore(
    value?.tailoredScore ?? averageScore(dimensionScores, "tailoredScore"),
  );
  const delta =
    typeof value?.delta === "number"
      ? Math.round(value.delta)
      : tailoredScore - masterScore;
  const hasHighLostEvidence = lostEvidence.some((item) => item.importance === "high");
  const winner = validWinners.includes(value?.winner as ResumeComparisonReview["winner"])
    ? (value?.winner as ResumeComparisonReview["winner"])
    : decideWinner(masterScore, tailoredScore, hasHighLostEvidence);
  const shouldGenerateHybrid =
    typeof value?.shouldGenerateHybrid === "boolean"
      ? value.shouldGenerateHybrid
      : winner === "hybrid_recommended" || hasHighLostEvidence;

  return {
    checked: value?.checked ?? true,
    masterScore,
    tailoredScore,
    delta,
    winner,
    summary:
      typeof value?.summary === "string" && value.summary.trim()
        ? value.summary.trim()
        : buildSummary(winner, masterScore, tailoredScore, lostEvidence),
    dimensionScores,
    lostEvidence,
    weakenedDimensions: normalizeStringArray(value?.weakenedDimensions),
    recoveryActions: normalizeStringArray(value?.recoveryActions),
    shouldGenerateHybrid,
  };
}

export function createFallbackComparisonReview(
  reason = "改前改后对比评分失败，已保留当前定制结果。",
): ResumeComparisonReview {
  return {
    checked: false,
    masterScore: 0,
    tailoredScore: 0,
    delta: 0,
    winner: "tie",
    summary: reason,
    dimensionScores: [],
    lostEvidence: [],
    weakenedDimensions: [],
    recoveryActions: [reason],
    shouldGenerateHybrid: false,
  };
}

function normalizeDimensionScore(
  value: unknown,
): ResumeComparisonDimensionScore | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Partial<ResumeComparisonDimensionScore>;
  const dimension = validDimensions.includes(input.dimension as ComparisonDimension)
    ? (input.dimension as ComparisonDimension)
    : null;

  if (!dimension) {
    return null;
  }

  const masterScore = clampScore(input.masterScore ?? 0);
  const tailoredScore = clampScore(input.tailoredScore ?? 0);

  return {
    dimension,
    masterScore,
    tailoredScore,
    delta:
      typeof input.delta === "number"
        ? Math.round(input.delta)
        : tailoredScore - masterScore,
    reason: normalizeString(input.reason, ""),
  };
}

function normalizeLostEvidence(value: unknown): LostEvidence | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Partial<LostEvidence>;
  const evidenceType = validEvidenceTypes.includes(input.type as LostEvidence["type"])
    ? (input.type as LostEvidence["type"])
    : "bullet";
  const importance = validImportance.includes(input.importance as LostEvidence["importance"])
    ? (input.importance as LostEvidence["importance"])
    : "medium";
  const evidenceValue = normalizeString(input.value, "");

  if (!evidenceValue) {
    return null;
  }

  return {
    type: evidenceType,
    value: evidenceValue,
    importance,
    reason: normalizeString(input.reason, ""),
    suggestedRecovery: normalizeString(input.suggestedRecovery, ""),
  };
}

function decideWinner(
  masterScore: number,
  tailoredScore: number,
  hasHighLostEvidence: boolean,
): ResumeComparisonReview["winner"] {
  if (tailoredScore >= masterScore + 5 && !hasHighLostEvidence) {
    return "tailored";
  }

  if (tailoredScore >= masterScore && hasHighLostEvidence) {
    return "hybrid_recommended";
  }

  if (Math.abs(tailoredScore - masterScore) <= 4) {
    return "hybrid_recommended";
  }

  if (tailoredScore < masterScore) {
    return "hybrid_recommended";
  }

  return "tie";
}

function buildSummary(
  winner: ResumeComparisonReview["winner"],
  masterScore: number,
  tailoredScore: number,
  lostEvidence: LostEvidence[],
) {
  if (winner === "tailored") {
    return `改前改后对比通过，定制版评分 ${tailoredScore}，高于 Master ${masterScore}，且未发现高优先级证据丢失。`;
  }

  if (winner === "hybrid_recommended") {
    const highLost = lostEvidence.filter((item) => item.importance === "high").length;
    return highLost > 0
      ? `定制版评分 ${tailoredScore}，Master 评分 ${masterScore}；发现 ${highLost} 个高优先级 Master 强证据被弱化，建议后续生成混合修复版。`
      : `定制版评分 ${tailoredScore}，与 Master ${masterScore} 差距不明显，建议后续生成混合修复版。`;
  }

  if (winner === "master") {
    return `Master 评分 ${masterScore} 高于定制版 ${tailoredScore}，当前定制存在负优化风险。`;
  }

  return `Master 与定制版评分接近，建议人工复核是否需要混合修复。`;
}

function averageScore(
  items: ResumeComparisonDimensionScore[],
  key: "masterScore" | "tailoredScore",
) {
  if (items.length === 0) {
    return 0;
  }

  return items.reduce((sum, item) => sum + item[key], 0) / items.length;
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    ),
  );
}
