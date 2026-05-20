export type AtsKeywordImportance = "high" | "medium" | "low";
export type AtsSupportLevel = "strong" | "medium" | "weak" | "missing";
export type AtsSuggestedPlacement =
  | "skills"
  | "project_bullet"
  | "project_intro"
  | "omit";

export type AtsKeywordEvidence = {
  keyword: string;
  importance: AtsKeywordImportance;
  sourceInJD: string;
  evidenceInResume: string;
  supportLevel: AtsSupportLevel;
  safeToUse: boolean;
  suggestedPlacement: AtsSuggestedPlacement;
};

export type AtsReviewResult = {
  checked: boolean;
  score: number;
  summary: string;
  keywordEvidenceMap: AtsKeywordEvidence[];
  coveredKeywords: string[];
  partiallyCoveredKeywords: string[];
  missingImportantKeywords: string[];
  riskyKeywordInsertions: string[];
  suggestions: string[];
};

const validImportance: AtsKeywordImportance[] = ["high", "medium", "low"];
const validSupportLevels: AtsSupportLevel[] = [
  "strong",
  "medium",
  "weak",
  "missing",
];
const validPlacements: AtsSuggestedPlacement[] = [
  "skills",
  "project_bullet",
  "project_intro",
  "omit",
];

export function normalizeAtsReviewResult(
  value: Partial<AtsReviewResult> | undefined,
): AtsReviewResult {
  const keywordEvidenceMap = Array.isArray(value?.keywordEvidenceMap)
    ? value.keywordEvidenceMap
        .map(normalizeKeywordEvidence)
        .filter((item): item is AtsKeywordEvidence => Boolean(item))
    : [];
  const score =
    typeof value?.score === "number"
      ? clampScore(value.score)
      : calculateScore(keywordEvidenceMap);

  return {
    checked: value?.checked ?? true,
    score,
    summary:
      typeof value?.summary === "string" && value.summary.trim()
        ? value.summary.trim()
        : buildSummary(score, keywordEvidenceMap),
    keywordEvidenceMap,
    coveredKeywords: normalizeStringArray(value?.coveredKeywords).length
      ? normalizeStringArray(value?.coveredKeywords)
      : keywordEvidenceMap
          .filter((item) => item.supportLevel === "strong")
          .map((item) => item.keyword),
    partiallyCoveredKeywords: normalizeStringArray(value?.partiallyCoveredKeywords).length
      ? normalizeStringArray(value?.partiallyCoveredKeywords)
      : keywordEvidenceMap
          .filter((item) => item.supportLevel === "medium" || item.supportLevel === "weak")
          .map((item) => item.keyword),
    missingImportantKeywords: normalizeStringArray(value?.missingImportantKeywords).length
      ? normalizeStringArray(value?.missingImportantKeywords)
      : keywordEvidenceMap
          .filter(
            (item) =>
              item.supportLevel === "missing" && item.importance !== "low",
          )
          .map((item) => item.keyword),
    riskyKeywordInsertions: normalizeStringArray(value?.riskyKeywordInsertions),
    suggestions: normalizeStringArray(value?.suggestions),
  };
}

export function createFallbackAtsReview(
  reason = "ATS 关键词覆盖分析失败，已保留当前简历。",
): AtsReviewResult {
  return {
    checked: false,
    score: 0,
    summary: reason,
    keywordEvidenceMap: [],
    coveredKeywords: [],
    partiallyCoveredKeywords: [],
    missingImportantKeywords: [],
    riskyKeywordInsertions: [],
    suggestions: [reason],
  };
}

function normalizeKeywordEvidence(value: unknown): AtsKeywordEvidence | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Partial<AtsKeywordEvidence>;
  const keyword = normalizeString(input.keyword, "");

  if (!keyword) {
    return null;
  }

  const supportLevel = validSupportLevels.includes(input.supportLevel as AtsSupportLevel)
    ? (input.supportLevel as AtsSupportLevel)
    : "missing";
  const importance = validImportance.includes(input.importance as AtsKeywordImportance)
    ? (input.importance as AtsKeywordImportance)
    : "medium";

  return {
    keyword,
    importance,
    sourceInJD: normalizeString(input.sourceInJD, keyword),
    evidenceInResume: normalizeString(input.evidenceInResume, ""),
    supportLevel,
    safeToUse:
      supportLevel === "missing" ? false : Boolean(input.safeToUse ?? true),
    suggestedPlacement: validPlacements.includes(
      input.suggestedPlacement as AtsSuggestedPlacement,
    )
      ? (input.suggestedPlacement as AtsSuggestedPlacement)
      : supportLevel === "missing"
        ? "omit"
        : "project_bullet",
  };
}

function calculateScore(items: AtsKeywordEvidence[]) {
  if (items.length === 0) {
    return 0;
  }

  const total = items.reduce((sum, item) => sum + weightFor(item.importance), 0);
  const covered = items.reduce(
    (sum, item) =>
      sum + weightFor(item.importance) * supportMultiplier(item.supportLevel),
    0,
  );

  return clampScore((covered / Math.max(total, 1)) * 100);
}

function buildSummary(score: number, items: AtsKeywordEvidence[]) {
  const missingHigh = items.filter(
    (item) => item.importance === "high" && item.supportLevel === "missing",
  ).length;

  if (score >= 85) {
    return "核心 ATS 关键词自然覆盖较好，且大多有简历证据支撑。";
  }

  if (score >= 70) {
    return missingHigh > 0
      ? "ATS 覆盖基本够，但仍有少量高优先级关键词缺少明确证据。"
      : "ATS 覆盖基本够，建议继续保持关键词与项目证据绑定。";
  }

  if (score >= 50) {
    return "ATS 关键词覆盖不足，部分核心要求只被间接覆盖或缺少证据。";
  }

  return "ATS 风险较高，多个核心关键词缺少可解释的项目证据。";
}

function weightFor(importance: AtsKeywordImportance) {
  if (importance === "high") {
    return 5;
  }

  if (importance === "medium") {
    return 3;
  }

  return 1.5;
}

function supportMultiplier(level: AtsSupportLevel) {
  if (level === "strong") {
    return 1;
  }

  if (level === "medium") {
    return 0.65;
  }

  if (level === "weak") {
    return 0.3;
  }

  return 0;
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
