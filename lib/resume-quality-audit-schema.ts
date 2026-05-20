export type ResumeQualityIssueCategory =
  | "JD_COPY"
  | "TECH_LIST_COPY"
  | "OVERCLAIM"
  | "SENIORITY_MISMATCH"
  | "UNSUPPORTED_SKILL"
  | "AI_TRACE"
  | "TRUTH_RISK"
  | "WORDING";

export type ResumeQualityIssueSeverity = "high" | "medium" | "low";

export type ResumeQualityIssue = {
  id: string;
  severity: ResumeQualityIssueSeverity;
  category: ResumeQualityIssueCategory;
  location: string;
  originalText: string;
  problem: string;
  suggestedFix: string;
  shouldAutoFix: boolean;
};

export type ResumeQualityAuditResult = {
  checked: boolean;
  pass: boolean;
  qualityScore: number;
  summary: string;
  issues: ResumeQualityIssue[];
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  remainingRisks: string[];
};

export type ResumeQualityReview = {
  checked: boolean;
  repaired: boolean;
  scoreBefore: number;
  scoreAfter: number;
  finalScore?: number;
  issueCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  summary: string;
  fixedIssues: string[];
  remainingRisks: string[];
};

const validCategories: ResumeQualityIssueCategory[] = [
  "JD_COPY",
  "TECH_LIST_COPY",
  "OVERCLAIM",
  "SENIORITY_MISMATCH",
  "UNSUPPORTED_SKILL",
  "AI_TRACE",
  "TRUTH_RISK",
  "WORDING",
];

const validSeverities: ResumeQualityIssueSeverity[] = ["high", "medium", "low"];

export function normalizeResumeQualityAuditResult(
  value: Partial<ResumeQualityAuditResult> | undefined,
): ResumeQualityAuditResult {
  const issues = Array.isArray(value?.issues)
    ? value.issues
        .map(normalizeIssue)
        .filter((issue): issue is ResumeQualityIssue => Boolean(issue))
    : [];
  const highRiskCount = issues.filter((issue) => issue.severity === "high").length;
  const mediumRiskCount = issues.filter(
    (issue) => issue.severity === "medium",
  ).length;
  const lowRiskCount = issues.filter((issue) => issue.severity === "low").length;
  const pass = issues.length === 0 || highRiskCount === 0;
  const qualityScore =
    typeof value?.qualityScore === "number"
      ? clampScore(value.qualityScore)
      : calculateQualityScore(highRiskCount, mediumRiskCount, lowRiskCount);

  return {
    checked: value?.checked ?? true,
    pass,
    qualityScore,
    summary:
      typeof value?.summary === "string" && value.summary.trim()
        ? value.summary.trim()
        : buildSummary(issues.length, highRiskCount, mediumRiskCount, lowRiskCount),
    issues,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    remainingRisks: Array.isArray(value?.remainingRisks)
      ? uniqueStrings(value.remainingRisks)
      : issues.map((issue) => issue.problem),
  };
}

export function createPassingQualityAudit(): ResumeQualityAuditResult {
  return normalizeResumeQualityAuditResult({
    checked: true,
    issues: [],
    summary: "规则质检通过，未发现明显 JD 硬贴、过度包装或 AI 痕迹。",
    qualityScore: 96,
  });
}

export function createFallbackQualityAudit(
  reason = "质检执行失败，已保留当前定制结果。",
): ResumeQualityAuditResult {
  return {
    checked: false,
    pass: false,
    qualityScore: 0,
    summary: reason,
    issues: [],
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    remainingRisks: [reason],
  };
}

export function createQualityReview(input: {
  before: ResumeQualityAuditResult;
  after: ResumeQualityAuditResult;
  fixedIssues: string[];
}): ResumeQualityReview {
  return buildQualityReview({
    before: input.before,
    final: input.after,
    fixedIssues: input.fixedIssues,
    repaired: input.fixedIssues.length > 0,
  });
}

export function createFinalQualityReview(input: {
  before: ResumeQualityAuditResult;
  final: ResumeQualityAuditResult;
  fixedIssues: string[];
  repaired?: boolean;
}): ResumeQualityReview {
  return buildQualityReview({
    before: input.before,
    final: input.final,
    fixedIssues: input.fixedIssues,
    repaired: input.repaired ?? input.fixedIssues.length > 0,
  });
}

function buildQualityReview(input: {
  before: ResumeQualityAuditResult;
  final: ResumeQualityAuditResult;
  fixedIssues: string[];
  repaired: boolean;
}): ResumeQualityReview {
  const final = input.final;
  const summary = input.repaired
    ? final.issues.length > 0
      ? `已自动清理 ${input.fixedIssues.length} 处 JD 解释性表达；最终质检仍发现 ${final.issues.length} 个需复核问题。`
      : `已自动清理 ${input.fixedIssues.length} 处 JD 解释性表达；最终规则质检通过。`
    : final.summary;

  return {
    checked: final.checked,
    repaired: input.repaired,
    scoreBefore: input.before.qualityScore,
    scoreAfter: final.qualityScore,
    finalScore: final.qualityScore,
    issueCount: final.issues.length,
    highRiskCount: final.highRiskCount,
    mediumRiskCount: final.mediumRiskCount,
    lowRiskCount: final.lowRiskCount,
    summary,
    fixedIssues: input.fixedIssues,
    remainingRisks: final.remainingRisks,
  };
}

function normalizeIssue(value: unknown): ResumeQualityIssue | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Partial<ResumeQualityIssue>;
  const severity = validSeverities.includes(
    input.severity as ResumeQualityIssueSeverity,
  )
    ? (input.severity as ResumeQualityIssueSeverity)
    : "low";
  const category = validCategories.includes(
    input.category as ResumeQualityIssueCategory,
  )
    ? (input.category as ResumeQualityIssueCategory)
    : "WORDING";

  return {
    id: normalizeString(input.id, `issue-${category}-${severity}`),
    severity,
    category,
    location: normalizeString(input.location, "unknown"),
    originalText: normalizeString(input.originalText, ""),
    problem: normalizeString(input.problem, "发现可能影响简历可信度的表达。"),
    suggestedFix: normalizeString(input.suggestedFix, "建议人工复核。"),
    shouldAutoFix: Boolean(input.shouldAutoFix),
  };
}

function buildSummary(
  issueCount: number,
  highRiskCount: number,
  mediumRiskCount: number,
  lowRiskCount: number,
) {
  if (issueCount === 0) {
    return "规则质检通过，未发现明显 JD 硬贴、过度包装或 AI 痕迹。";
  }

  return `规则质检发现 ${issueCount} 个问题，其中高风险 ${highRiskCount} 个，中风险 ${mediumRiskCount} 个，低风险 ${lowRiskCount} 个。`;
}

function calculateQualityScore(
  highRiskCount: number,
  mediumRiskCount: number,
  lowRiskCount: number,
) {
  return clampScore(100 - highRiskCount * 22 - mediumRiskCount * 10 - lowRiskCount * 4);
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function uniqueStrings(items: unknown[]) {
  return Array.from(
    new Set(
      items
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    ),
  );
}
