import type { JDAnalysisResult } from "@/lib/role-classifier";

const hardRiskPatterns = [
  /毕业|年限|工作经验|行业经验|学历|专业不符|全职实习|实习时长/i,
  /3\s*年|三年|2\s*年|两年|硕士|博士/i,
];

const packagingRiskPatterns = [
  /模型训练|模型微调|算法研发|商业化上线|百万用户|真实企业客户|大规模生产部署|底层模型/i,
];

const evidenceGapPatterns = [
  /RAG|Multi-Agent|金融量化|海外社区|英文写作|英语写作|社区运营|量化/i,
];

export function getTopRisks(analysisResult: JDAnalysisResult): string[] {
  const candidates = [
    ...analysisResult.coverageCheck.overPackagingRisks,
    ...analysisResult.coverageCheck.missingRequirements,
    ...analysisResult.riskWarnings,
    ...analysisResult.coverageCheck.suggestedManualReview,
    ...analysisResult.evidenceMatrix
      .filter((item) => item.matchLevel === "weak" || item.matchLevel === "missing")
      .map((item) => item.riskNote || `${item.jdRequirement} 证据不足，不能硬包装。`),
  ].filter(Boolean);

  return uniqueStrings(candidates)
    .sort((a, b) => getRiskPriority(a) - getRiskPriority(b))
    .slice(0, 5);
}

function getRiskPriority(value: string) {
  if (hardRiskPatterns.some((pattern) => pattern.test(value))) {
    return 1;
  }

  if (packagingRiskPatterns.some((pattern) => pattern.test(value))) {
    return 2;
  }

  if (evidenceGapPatterns.some((pattern) => pattern.test(value))) {
    return 3;
  }

  return 4;
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}
