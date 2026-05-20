import type { AtsReviewResult } from "@/lib/ats-review-schema";
import type { JDAnalysisResult } from "@/lib/role-classifier";
import type { ResumeQualityReview } from "@/lib/resume-quality-audit-schema";
import {
  createFallbackComparisonReview,
  normalizeResumeComparisonReview,
  type ComparisonDimension,
  type LostEvidence,
  type ResumeComparisonDimensionScore,
  type ResumeComparisonReview,
} from "@/lib/resume-comparison-schema";
import type { ResumeData, ResumeProject } from "@/lib/resume-schema";
import {
  countEvidenceElements,
  detectPortfolioEvidenceChain,
  detectSovaEvidenceChain,
  detectTransitEvidenceChain,
  getProtectedEvidencePatterns,
  isAgentEngineeringJd,
  isProductDataJd,
} from "@/lib/strong-evidence-patterns";

type RunResumeComparisonReviewInput = {
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  masterResume: ResumeData;
  tailoredResume: ResumeData;
  qualityReview: ResumeQualityReview;
  atsReview: AtsReviewResult;
};

type EvidenceSpec = {
  type: LostEvidence["type"];
  value: string;
  aliases: string[];
  relatedTerms: string[];
  recovery: string;
};

const evidenceSpecs: EvidenceSpec[] = [
  evidence("tool", "Figma", ["Figma"], ["原型", "交互设计", "用户体验", "作品集"], "恢复 Figma / 原型 / 用户体验相关证据。"),
  evidence("tool", "Axure", ["Axure"], ["原型", "产品原型"], "恢复 Axure 或产品原型相关证据。"),
  evidence("tool", "Python", ["Python"], ["脚本", "数据处理", "自动化"], "恢复 Python 在数据处理、测试或自动化中的真实使用。"),
  evidence("tool", "SQL", ["SQL"], ["指标", "数据库", "数据分析"], "恢复 SQL / 指标查询 / 数据分析证据。"),
  evidence("tool", "Pandas", ["Pandas"], ["数据处理", "Python"], "恢复 Pandas 数据处理证据。"),
  evidence("tool", "DuckDB", ["DuckDB"], ["Metric Spec", "指标计算"], "恢复 DuckDB / 指标计算链路证据。"),
  evidence("tool", "Java", ["Java"], ["编程基础"], "恢复 Java 基础，但不要写成高级工程经验。"),
  evidence("link", "GitHub", ["GitHub", "github.com"], ["代码", "项目链接"], "恢复 GitHub 或代码展示链接。"),
  evidence("link", "Vercel", ["Vercel", "vercel.app"], ["在线 Demo", "项目展示"], "恢复在线 Demo / 项目展示证据。"),
  evidence("tool", "Cursor", ["Cursor"], ["AI 编程", "开发工具"], "恢复 Cursor 工具使用证据。"),
  evidence("tool", "Claude Code", ["Claude Code"], ["AI 编程", "开发工具"], "恢复 Claude Code 工具使用证据。"),
  evidence("tool", "Codex", ["Codex"], ["AI 编程", "开发工具"], "恢复 Codex 工具使用证据。"),
  evidence("skill", "Agent", ["Agent", "AI Agent", "智能体"], ["任务拆解", "工作流"], "恢复 Agent / 智能体工作流相关证据。"),
  evidence("skill", "Prompt", ["Prompt", "提示词"], ["System Prompt", "Few-shot", "Prompt 调优"], "恢复 Prompt 设计、调试或输出约束证据。"),
  evidence("skill", "Prompt 调优", ["Prompt 调优", "Prompt Engineering"], ["输出效果", "稳定性"], "恢复 Prompt 调优与输出效果验证证据。"),
  evidence("metric", "Metric Spec", ["Metric Spec"], ["指标口径", "字段识别"], "恢复 Metric Spec / 指标口径 / 字段识别证据。"),
  evidence("skill", "结构化输出", ["结构化输出"], ["输出规范", "JSON"], "恢复结构化输出和输出规范证据。"),
  evidence("bullet", "测试案例", ["测试案例", "测试用例"], ["验证", "测试"], "恢复测试案例或测试验证证据。"),
  evidence("bullet", "badcase", ["badcase", "Badcase"], ["异常案例", "回归测试"], "恢复 badcase / 异常案例记录证据。"),
  evidence("bullet", "输出稳定性", ["输出稳定性"], ["输出质量", "稳定性验证"], "恢复输出稳定性验证证据。"),
  evidence("bullet", "结果复查", ["结果复查", "可复查"], ["证据链", "人工复核"], "恢复结果复查 / 证据链 / 人工复核证据。"),
  evidence("skill", "Tool Calling", ["Tool Calling", "工具调用"], ["函数调用", "字段识别"], "恢复 Tool Calling / 工具调用相关证据。"),
  evidence("skill", "RAG", ["RAG", "知识库检索"], ["检索", "知识库"], "如 Master 有 RAG 证据则恢复；否则保持风险提醒。"),
  evidence("bullet", "用户体验", ["用户体验", "体验优化"], ["用户路径", "痛点"], "恢复用户体验 / 体验痛点相关证据。"),
  evidence("bullet", "用户反馈", ["用户反馈"], ["反馈整理", "需求调研"], "恢复用户反馈或反馈整理证据。"),
  evidence("bullet", "场景痛点", ["场景痛点", "业务痛点"], ["用户场景", "问题痛点"], "恢复业务场景和痛点拆解证据。"),
  evidence("project", "数据分析", ["数据分析"], ["指标", "SQL", "Pandas", "DuckDB"], "恢复数据分析和指标链路证据。"),
  evidence("metric", "指标拆解", ["指标拆解", "指标体系"], ["Metric Spec", "指标口径"], "恢复指标拆解 / 指标口径证据。"),
  evidence("metric", "Evening Service Gap Score", ["Evening Service Gap Score"], ["晚间服务缺口", "Transit"], "恢复 Transit 项目中的服务缺口评分证据。"),
  evidence("metric", "热力图", ["热力图"], ["空间分布", "数据可视化"], "恢复热力图 / 数据可视化证据。"),
  evidence("metric", "漏斗分析", ["漏斗分析", "漏斗"], ["转化率", "用户转化"], "恢复漏斗分析证据，但不编造增长数据。"),
  evidence("metric", "转化率", ["转化率"], ["转化", "漏斗"], "恢复转化分析证据，但不编造具体提升数据。"),
  evidence("project", "JD Match Console", ["JD Match Console"], ["Portfolio", "岗位匹配"], "恢复 JD Match Console 和作品集展示证据。"),
  evidence("bullet", "原型设计", ["原型设计", "产品原型"], ["Figma", "Axure", "交互"], "恢复产品原型和交互结构证据。"),
];

const dimensionWeights: Record<ComparisonDimension, number> = {
  roleFit: 1.2,
  atsCoverage: 1.2,
  hardSkills: 1.1,
  projectEvidence: 1.25,
  productEvidence: 1.05,
  technicalDetails: 1.1,
  truthSafety: 1.2,
  aiTraceRisk: 1,
  pageEfficiency: 0.9,
};

export function runResumeComparisonReview({
  jdText,
  jdAnalysis,
  masterResume,
  tailoredResume,
  qualityReview,
  atsReview,
}: RunResumeComparisonReviewInput): ResumeComparisonReview {
  try {
    const masterText = resumeToText(masterResume);
    const tailoredText = resumeToText(tailoredResume);
    const roleTerms = buildRoleTerms(jdAnalysis);
    const atsTerms = atsReview.keywordEvidenceMap.map((item) => item.keyword);
    const relevantEvidence = getRelevantEvidenceSpecs(jdText, jdAnalysis, atsTerms);
    const lostEvidence = dedupeLostEvidence([
      ...detectLostEvidence({
      relevantEvidence,
      masterText,
      tailoredText,
      jdText,
      jdAnalysis,
      }),
      ...detectEvidenceChainWeakening({
        jdText,
        jdAnalysis,
        masterResume,
        tailoredResume,
      }),
    ]);
    const dimensionScores: ResumeComparisonDimensionScore[] = [
      scoreDimension("roleFit", roleTerms, masterText, tailoredText, "岗位主线与筛选画像匹配度"),
      scoreAtsDimension(atsReview, masterText, tailoredText),
      scoreDimension("hardSkills", buildHardSkillTerms(jdText, atsTerms), masterText, tailoredText, "硬技能和工具覆盖"),
      scoreProjectEvidence(masterResume, tailoredResume),
      scoreDimension("productEvidence", buildProductTerms(jdText, jdAnalysis), masterText, tailoredText, "产品/业务证据覆盖"),
      scoreDimension("technicalDetails", buildTechnicalDetailTerms(jdText, atsTerms), masterText, tailoredText, "技术细节保留"),
      scoreTruthSafety(qualityReview),
      scoreAiTraceRisk(qualityReview),
      scorePageEfficiency(tailoredResume, lostEvidence),
    ];
    const masterScore = weightedScore(dimensionScores, "masterScore");
    const tailoredScore = clampScore(
      weightedScore(dimensionScores, "tailoredScore") -
        lostEvidence.filter((item) => item.importance === "high").length * 4 -
        lostEvidence.filter((item) => item.importance === "medium").length * 2,
    );
    const highLostEvidence = lostEvidence.some((item) => item.importance === "high");
    const winner = decideWinner(masterScore, tailoredScore, highLostEvidence, qualityReview);
    const weakenedDimensions = dimensionScores
      .filter((item) => item.delta < -4)
      .map((item) => item.dimension);
    const recoveryActions = buildRecoveryActions(lostEvidence, weakenedDimensions);

    return normalizeResumeComparisonReview({
      checked: true,
      masterScore,
      tailoredScore,
      delta: tailoredScore - masterScore,
      winner,
      dimensionScores,
      lostEvidence,
      weakenedDimensions,
      recoveryActions,
      shouldGenerateHybrid: winner !== "tailored",
    });
  } catch {
    return createFallbackComparisonReview();
  }
}

function scoreDimension(
  dimension: ComparisonDimension,
  terms: string[],
  masterText: string,
  tailoredText: string,
  reasonPrefix: string,
): ResumeComparisonDimensionScore {
  const normalizedTerms = uniqueStrings(terms).slice(0, 16);
  const masterScore = coverageScore(normalizedTerms, masterText);
  const tailoredScore = coverageScore(normalizedTerms, tailoredText);

  return {
    dimension,
    masterScore,
    tailoredScore,
    delta: tailoredScore - masterScore,
    reason: `${reasonPrefix}：比较 ${normalizedTerms.slice(0, 6).join("、") || "核心证据"}。`,
  };
}

function scoreAtsDimension(
  atsReview: AtsReviewResult,
  masterText: string,
  tailoredText: string,
): ResumeComparisonDimensionScore {
  const terms = atsReview.keywordEvidenceMap
    .filter((item) => item.importance !== "low")
    .map((item) => item.keyword);
  const masterScore = coverageScore(terms, masterText);
  const tailoredScore = Math.max(
    coverageScore(terms, tailoredText),
    atsReview.score,
  );

  return {
    dimension: "atsCoverage",
    masterScore,
    tailoredScore,
    delta: tailoredScore - masterScore,
    reason: "参考最终 atsReview 以及 Master/Tailored 对 JD 核心关键词的自然覆盖。",
  };
}

function scoreProjectEvidence(
  masterResume: ResumeData,
  tailoredResume: ResumeData,
): ResumeComparisonDimensionScore {
  const masterScore = scoreProjects(masterResume);
  const tailoredScore = scoreProjects(tailoredResume);

  return {
    dimension: "projectEvidence",
    masterScore,
    tailoredScore,
    delta: tailoredScore - masterScore,
    reason: "比较项目 bullet 中动作、工具、指标、验证和结果复查等具体证据密度。",
  };
}

function scoreTruthSafety(
  qualityReview: ResumeQualityReview,
): ResumeComparisonDimensionScore {
  const tailoredScore = clampScore(
    96 - qualityReview.highRiskCount * 20 - qualityReview.mediumRiskCount * 8,
  );
  const masterScore = 92;

  return {
    dimension: "truthSafety",
    masterScore,
    tailoredScore,
    delta: tailoredScore - masterScore,
    reason: "参考最终 qualityReview 中的高风险和中风险表达数量。",
  };
}

function scoreAiTraceRisk(
  qualityReview: ResumeQualityReview,
): ResumeComparisonDimensionScore {
  const tailoredScore = clampScore(96 - qualityReview.highRiskCount * 16);
  const masterScore = 94;

  return {
    dimension: "aiTraceRisk",
    masterScore,
    tailoredScore,
    delta: tailoredScore - masterScore,
    reason: "参考 final quality audit 对 JD 硬贴、AI 痕迹和关键词堆砌的检测结果。",
  };
}

function scorePageEfficiency(
  tailoredResume: ResumeData,
  lostEvidence: LostEvidence[],
): ResumeComparisonDimensionScore {
  const projectCount = tailoredResume.projects.length;
  const bulletCount = tailoredResume.projects.reduce(
    (sum, project) => sum + project.bullets.length,
    0,
  );
  const tailoredScore = clampScore(
    92 - Math.max(0, projectCount - 4) * 8 - Math.max(0, bulletCount - 12) * 3,
  );
  const masterScore = clampScore(tailoredScore - lostEvidence.length * 2);

  return {
    dimension: "pageEfficiency",
    masterScore,
    tailoredScore,
    delta: tailoredScore - masterScore,
    reason: "检查一页空间是否留给最重要证据，并参考项目数量与 bullet 数量。",
  };
}

function detectLostEvidence({
  relevantEvidence,
  masterText,
  tailoredText,
  jdText,
  jdAnalysis,
}: {
  relevantEvidence: EvidenceSpec[];
  masterText: string;
  tailoredText: string;
  jdText: string;
  jdAnalysis: JDAnalysisResult;
}) {
  const lost: LostEvidence[] = [];
  const importantText = [
    jdText,
    ...jdAnalysis.requiredAbilities,
    ...jdAnalysis.jdHighlights,
    ...jdAnalysis.resumeThesis.skillPriority,
  ].join("\n");

  for (const spec of relevantEvidence) {
    const masterHas = containsAny(masterText, spec.aliases);
    const tailoredHas = containsAny(tailoredText, spec.aliases);

    if (!masterHas || tailoredHas) {
      continue;
    }

    const importance = containsAny(importantText, spec.aliases)
      ? "high"
      : containsAny(importantText, spec.relatedTerms)
        ? "medium"
        : "low";

    if (importance === "low") {
      continue;
    }

    lost.push({
      type: spec.type,
      value: spec.value,
      importance,
      reason: `Master 中存在“${spec.value}”相关证据，但定制版未保留；该证据与当前 JD 的核心要求有关。`,
      suggestedRecovery: spec.recovery,
    });
  }

  return dedupeLostEvidence(lost);
}

function detectEvidenceChainWeakening({
  jdText,
  jdAnalysis,
  masterResume,
  tailoredResume,
}: {
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  masterResume: ResumeData;
  tailoredResume: ResumeData;
}) {
  const lost: LostEvidence[] = [];
  const productDataJd = isProductDataJd(jdText, jdAnalysis);
  const agentEngineeringJd = isAgentEngineeringJd(jdText, jdAnalysis);
  const protectedPatterns = getProtectedEvidencePatterns(jdText, jdAnalysis);
  const masterTransit = findProjectByKind(masterResume, "transit");
  const tailoredTransit = findProjectByKind(tailoredResume, "transit");

  if (productDataJd && masterTransit && tailoredTransit) {
    const masterChain = detectTransitEvidenceChain(projectToText(masterTransit));
    const tailoredChain = detectTransitEvidenceChain(projectToText(tailoredTransit));
    const masterCount = countEvidenceElements(masterChain);
    const tailoredCount = countEvidenceElements(tailoredChain);
    const missingBusinessEnd =
      !tailoredChain.finding && !tailoredChain.metric && !tailoredChain.recommendation;

    if (masterCount >= 3 && (tailoredCount <= 1 || missingBusinessEnd)) {
      lost.push({
        type: "metric",
        value: "Transit 数据分析闭环",
        importance: "high",
        reason:
          "定制版保留了 Transit 项目，但弱化了数据方法、核心发现、指标设计或业务建议。",
        suggestedRecovery:
          "恢复热力图、20:00 后服务缺口、Evening Service Gap Score 或排班优化建议中的至少 1-2 个。",
      });
    }
  }

  const masterSova = findProjectByKind(masterResume, "sova");
  const tailoredSova = findProjectByKind(tailoredResume, "sova");

  if ((productDataJd || agentEngineeringJd) && masterSova && tailoredSova) {
    const masterChain = detectSovaEvidenceChain(projectToText(masterSova));
    const tailoredChain = detectSovaEvidenceChain(projectToText(tailoredSova));
    const masterCount = countEvidenceElements(masterChain);
    const tailoredCount = countEvidenceElements(tailoredChain);
    const missingEvaluationCore =
      !tailoredChain.metricSpec &&
      !tailoredChain.testCases &&
      !tailoredChain.badcase &&
      !tailoredChain.stability;

    if (masterCount >= 3 && (tailoredCount <= 1 || missingEvaluationCore)) {
      lost.push({
        type: "bullet",
        value: "SOVA AI 评测与稳定性证据链",
        importance: agentEngineeringJd ? "high" : "medium",
        reason:
          "定制版保留了 SOVA 项目，但弱化了 Metric Spec、测试案例、badcase、规则兜底或输出稳定性证据。",
        suggestedRecovery:
          "恢复 Metric Spec、测试案例、badcase 或输出稳定性验证中的 1-2 条关键证据。",
      });
    }
  }

  const masterPortfolio = findProjectByKind(masterResume, "portfolio");
  const tailoredPortfolio = findProjectByKind(tailoredResume, "portfolio");

  if (protectedPatterns.protectPortfolio && masterPortfolio && tailoredPortfolio) {
    const masterChain = detectPortfolioEvidenceChain(projectToText(masterPortfolio));
    const tailoredChain = detectPortfolioEvidenceChain(projectToText(tailoredPortfolio));
    const masterCount = countEvidenceElements(masterChain);
    const tailoredCount = countEvidenceElements(tailoredChain);

    if (masterCount >= 2 && tailoredCount === 0) {
      lost.push({
        type: "bullet",
        value: "Portfolio / JD Match Console 产品展示证据",
        importance: "medium",
        reason:
          "JD 明确看重原型、产品设计或用户体验，但定制版弱化了 Portfolio 中的 Figma / JD Match Console / 信息架构证据。",
        suggestedRecovery:
          "恢复 Figma、JD Match Console 或信息架构相关的 1 条证据即可，避免 Portfolio 抢占主项目空间。",
      });
    }
  }

  return lost;
}

function getRelevantEvidenceSpecs(
  jdText: string,
  jdAnalysis: JDAnalysisResult,
  atsTerms: string[],
) {
  const strategyText = [
    jdText,
    ...atsTerms,
    ...jdAnalysis.requiredAbilities,
    ...jdAnalysis.preferredAbilities,
    ...jdAnalysis.jdHighlights,
    ...jdAnalysis.resumeThesis.skillPriority,
    ...jdAnalysis.abilityMap.hardSkills,
    ...jdAnalysis.abilityMap.productSkills,
    ...jdAnalysis.abilityMap.aiSkills,
    ...jdAnalysis.abilityMap.evaluationSkills,
  ].join("\n");

  return evidenceSpecs.filter((spec) =>
    containsAny(strategyText, [...spec.aliases, ...spec.relatedTerms]),
  );
}

function buildRoleTerms(jdAnalysis: JDAnalysisResult) {
  return [
    jdAnalysis.roleLabel,
    jdAnalysis.detectedRole?.label ?? "",
    jdAnalysis.detectedRole?.category ?? "",
    jdAnalysis.resumeThesis.oneSentence,
    jdAnalysis.resumeThesis.positioning,
    ...jdAnalysis.resumeThesis.openingFocus,
    ...jdAnalysis.requiredAbilities,
  ];
}

function buildHardSkillTerms(jdText: string, atsTerms: string[]) {
  const hardSkillHints = [
    "Python",
    "SQL",
    "Pandas",
    "DuckDB",
    "Java",
    "Figma",
    "Axure",
    "Agent",
    "Prompt",
    "测试案例",
    "badcase",
    "TCP/IP",
    "HTTP",
    "MySQL",
    "Django",
    "Metric Spec",
  ];

  return hardSkillHints.filter((term) => jdText.includes(term) || atsTerms.includes(term));
}

function buildProductTerms(jdText: string, jdAnalysis: JDAnalysisResult) {
  const productHints = [
    "用户体验",
    "用户反馈",
    "场景痛点",
    "产品流程",
    "原型设计",
    "需求分析",
    "产品方案",
    "数据分析",
    "体验优化",
    "JD Match Console",
  ];

  return uniqueStrings([
    ...productHints.filter((term) => jdText.includes(term)),
    ...jdAnalysis.abilityMap.productSkills,
    ...jdAnalysis.abilityMap.businessSkills,
  ]);
}

function buildTechnicalDetailTerms(jdText: string, atsTerms: string[]) {
  const technicalHints = [
    "Python",
    "SQL",
    "Pandas",
    "DuckDB",
    "Metric Spec",
    "GTFS",
    "测试案例",
    "badcase",
    "输出稳定性",
    "指标设计",
    "字段识别",
    "Tool Calling",
  ];

  return technicalHints.filter((term) => jdText.includes(term) || atsTerms.includes(term));
}

function coverageScore(terms: string[], text: string) {
  const uniqueTerms = uniqueStrings(terms).filter(Boolean);

  if (uniqueTerms.length === 0) {
    return 70;
  }

  const hitCount = uniqueTerms.filter((term) => containsAny(text, [term])).length;
  return clampScore(45 + (hitCount / uniqueTerms.length) * 55);
}

function scoreProjects(resume: ResumeData) {
  const bulletText = resume.projects
    .flatMap((project) => [project.context, ...project.bullets.map((bullet) => bullet.text)])
    .join("\n");
  const evidenceTerms = [
    "设计",
    "拆解",
    "指标",
    "数据",
    "Python",
    "SQL",
    "Prompt",
    "测试",
    "验证",
    "badcase",
    "复查",
    "原型",
    "用户",
    "反馈",
    "Metric Spec",
    "DuckDB",
  ];
  const hitCount = evidenceTerms.filter((term) => bulletText.includes(term)).length;
  const bulletCount = resume.projects.reduce(
    (sum, project) => sum + project.bullets.length,
    0,
  );

  return clampScore(46 + hitCount * 3 + Math.min(bulletCount, 12) * 1.5);
}

function weightedScore(
  items: ResumeComparisonDimensionScore[],
  key: "masterScore" | "tailoredScore",
) {
  const totalWeight = items.reduce(
    (sum, item) => sum + dimensionWeights[item.dimension],
    0,
  );
  const weighted = items.reduce(
    (sum, item) => sum + item[key] * dimensionWeights[item.dimension],
    0,
  );

  return clampScore(weighted / Math.max(totalWeight, 1));
}

function decideWinner(
  masterScore: number,
  tailoredScore: number,
  hasHighLostEvidence: boolean,
  qualityReview: ResumeQualityReview,
): ResumeComparisonReview["winner"] {
  if (qualityReview.highRiskCount > 0) {
    return "hybrid_recommended";
  }

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

function buildRecoveryActions(
  lostEvidence: LostEvidence[],
  weakenedDimensions: string[],
) {
  const actions = new Set<string>();

  lostEvidence.slice(0, 6).forEach((item) => {
    actions.add(item.suggestedRecovery);
  });

  if (weakenedDimensions.length > 0) {
    actions.add(`建议复核弱化维度：${weakenedDimensions.join("、")}。`);
  }

  if (actions.size === 0) {
    actions.add("当前无需明显恢复动作，保持定制版主线即可。");
  }

  return Array.from(actions);
}

function resumeToText(resume: ResumeData) {
  return [
    resume.profile.name,
    resume.profile.email,
    resume.profile.phone,
    ...resume.profile.links,
    resume.summary ?? "",
    ...resume.skills.flatMap((group) => [group.label, ...group.items]),
    ...resume.projects.flatMap((project) => [
      project.name,
      project.context,
      project.links?.website ?? "",
      project.links?.github ?? "",
      ...(project.tags ?? []),
      ...project.bullets.map((bullet) => bullet.text),
    ]),
    ...resume.education.flatMap((item) => [
      item.school,
      item.major ?? "",
      item.gpa ?? "",
      ...item.details,
      ...(item.courses ?? []),
    ]),
  ].join("\n");
}

function findProjectByKind(
  resume: ResumeData,
  kind: "transit" | "sova" | "portfolio",
) {
  return resume.projects.find((project) => {
    const normalized = project.name.toLowerCase();

    if (kind === "transit") {
      return normalized.includes("transit") || normalized.includes("triton");
    }

    if (kind === "sova") {
      return normalized.includes("sova");
    }

    return normalized.includes("portfolio") || normalized.includes("jd match");
  });
}

function projectToText(project: ResumeProject) {
  return [
    project.name,
    project.context,
    project.links?.website ?? "",
    project.links?.github ?? "",
    ...project.bullets.map((bullet) => bullet.text),
  ].join("\n");
}

function evidence(
  type: LostEvidence["type"],
  value: string,
  aliases: string[],
  relatedTerms: string[],
  recovery: string,
): EvidenceSpec {
  return { type, value, aliases, relatedTerms, recovery };
}

function containsAny(text: string, terms: string[]) {
  const normalizedText = text.toLowerCase();
  return terms
    .filter(Boolean)
    .some((term) => normalizedText.includes(term.toLowerCase()));
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function dedupeLostEvidence(items: LostEvidence[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.type}|${item.value}|${item.importance}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}
