import type {
  AtsKeywordEvidence,
  AtsKeywordImportance,
  AtsReviewResult,
  AtsSuggestedPlacement,
  AtsSupportLevel,
} from "@/lib/ats-review-schema";
import {
  createFallbackAtsReview,
  normalizeAtsReviewResult,
} from "@/lib/ats-review-schema";
import type { JDAnalysisResult } from "@/lib/role-classifier";
import type { ResumeQualityReview } from "@/lib/resume-quality-audit-schema";
import type { ResumeData } from "@/lib/resume-schema";

type RunAtsKeywordReviewInput = {
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  masterResume: ResumeData;
  tailoredResume: ResumeData;
  qualityReview?: Partial<ResumeQualityReview>;
};

export type AtsGuidance = {
  mustCoverKeywords: string[];
  shouldCoverKeywords: string[];
  weakKeywords: string[];
  forbiddenKeywords: string[];
  riskyKeywordInsertions: string[];
  keywordEvidenceMap: AtsKeywordEvidence[];
};

type KeywordSpec = {
  keyword: string;
  patterns: RegExp[];
  evidenceTerms: string[];
  relatedEvidenceTerms?: string[];
  importance: AtsKeywordImportance;
  placement: AtsSuggestedPlacement;
};

type ExtractedKeyword = KeywordSpec & {
  sourceInJD: string;
};

const keywordSpecs: KeywordSpec[] = [
  tech("Python", ["Python"], ["Python"], "high"),
  tech("SQL", ["SQL"], ["SQL", "DuckDB", "指标计算", "数据分析"], "high"),
  tech("Pandas", ["Pandas"], ["Pandas", "Python", "数据处理"], "medium"),
  tech("DuckDB", ["DuckDB"], ["DuckDB", "指标计算", "SQL"], "medium"),
  tech("Java", ["Java"], ["Java"], "medium"),
  tech("Linux", ["Linux"], ["Linux", "命令行", "脚本"], "medium"),
  tech("HTTP", ["HTTP"], ["HTTP", "接口", "API"], "medium"),
  tech("TCP/IP", ["TCP/IP"], ["TCP/IP", "网络协议"], "medium"),
  strictTech("MySQL", ["MySQL"], "medium"),
  strictTech("Django", ["Django"], "medium"),
  tech("Figma", ["Figma"], ["Figma", "原型", "交互设计", "UI 设计", "作品集"], "high"),
  tech("Axure", ["Axure"], ["Axure", "原型", "产品原型"], "medium"),
  tech("Agent", ["Agent", "AI Agent", "智能体"], ["Agent", "智能体", "任务拆解", "工作流"], "high"),
  tech("Agent Workflow", ["Agent Workflow", "Workflow", "工作流"], ["Agent Workflow", "工作流", "任务拆解"], "high"),
  tech("Tool Calling", ["Tool Calling", "工具调用", "函数调用"], ["Tool Calling", "工具调用", "字段识别"], "high"),
  tech("RAG", ["RAG", "知识库检索"], ["RAG", "知识库检索", "检索"], "medium"),
  tech("Prompt", ["Prompt", "提示词"], ["Prompt", "提示词", "System Prompt", "Few-shot"], "high"),
  tech("Prompt 调优", ["Prompt 调优", "Prompt Engineering", "提示词优化"], ["Prompt 调优", "Prompt Engineering", "输出效果验证"], "high"),
  tech("NLP", ["NLP", "自然语言处理"], ["NLP", "语义理解", "意图识别"], "medium"),
  tech("大模型", ["大模型", "LLM", "大语言模型"], ["大模型", "LLM", "模型输出", "Prompt"], "high"),
  tech("AI Native", ["AI Native"], ["AI Native", "AI 产品", "AI 工作流"], "medium"),
  responsibility("数据分析", ["数据分析", "数据处理"], ["数据分析", "指标", "SQL", "Python", "Pandas"], "high"),
  responsibility("需求分析", ["需求分析", "需求调研", "用户需求"], ["需求分析", "需求拆解", "用户场景"], "high"),
  responsibility("产品方案", ["产品方案", "产品设计", "方案设计"], ["产品方案", "功能设计", "原型"], "high"),
  responsibility("用户反馈", ["用户反馈", "反馈整理"], ["用户反馈", "反馈整理", "体验痛点"], "medium"),
  responsibility("用户体验优化", ["用户体验优化", "体验优化"], ["用户体验", "体验痛点", "交互设计"], "medium"),
  responsibility("效果评估", ["效果评估", "模型评估", "评估指标"], ["效果评估", "评估指标", "输出质量评估"], "high"),
  responsibility("策略迭代", ["策略迭代", "产品迭代"], ["策略迭代", "优化建议", "版本迭代"], "medium"),
  responsibility("测试验证", ["测试验证", "测试案例", "验证"], ["测试验证", "测试案例", "结果验证"], "high"),
  responsibility("自动化测试", ["自动化测试", "测试自动化"], ["自动化测试", "脚本", "测试案例", "输出稳定性"], "high"),
  responsibility("算法评测", ["算法评测", "算法评价"], ["算法评测", "评测验证", "输出质量评估", "Badcase"], "high"),
  responsibility("持续集成", ["持续集成", "CI/CD", "CI"], ["持续集成", "CI/CD", "自动化流程"], "medium"),
  responsibility("线上问题分析", ["线上问题分析", "线上问题"], ["问题定位", "指标异动", "问题分析"], "medium"),
  responsibility("意图识别", ["意图识别"], ["意图识别", "需求澄清", "字段识别"], "medium"),
  responsibility("回复质量", ["回复质量", "回答质量"], ["回复质量", "输出质量", "输出规范"], "medium"),
  responsibility("任务效率", ["任务效率", "效率提升"], ["任务效率", "业务提效", "流程自动化"], "medium"),
  scenario("飞书", ["飞书"], ["飞书", "协同", "办公提效"], "medium"),
  scenario("多维表格", ["多维表格"], ["多维表格", "表格", "指标"], "medium"),
  scenario("Coze", ["Coze", "扣子"], ["Coze", "Agent", "智能体"], "medium"),
  scenario("C端产品", ["C端", "C 端"], ["C端", "用户体验", "用户路径"], "medium"),
  scenario("B端产品", ["B端", "B 端"], ["B端", "业务流程", "企业场景"], "medium"),
  scenario("Work OS", ["Work OS"], ["Work OS", "办公协同", "业务提效"], "medium"),
  scenario("Agent 平台", ["Agent 平台", "智能体平台"], ["Agent 平台", "Agent", "工作流"], "high"),
  scenario("运营调优", ["运营调优", "运营优化"], ["运营调优", "策略分析", "数据分析"], "medium"),
  scenario("AI 应用", ["AI 应用", "AI应用"], ["AI 应用", "AI 产品", "大模型应用"], "high"),
];

const blockedJdWords = [
  "薪资",
  "地点",
  "福利",
  "餐补",
  "实习天数",
  "每周",
  "到岗",
  "base",
  "学历",
];

export function runAtsKeywordReview({
  jdText,
  jdAnalysis,
  masterResume,
  tailoredResume,
  qualityReview,
}: RunAtsKeywordReviewInput): AtsReviewResult {
  try {
    const safeQualityReview = {
      highRiskCount: qualityReview?.highRiskCount ?? 0,
      mediumRiskCount: qualityReview?.mediumRiskCount ?? 0,
      lowRiskCount: qualityReview?.lowRiskCount ?? 0,
    };
    const keywords = extractKeywords(jdText, jdAnalysis);
    const masterText = resumeToText(masterResume);
    const tailoredText = resumeToText(tailoredResume);
    const keywordEvidenceMap = keywords.map((keyword) =>
      buildKeywordEvidence(keyword, {
        masterText,
        tailoredText,
      }),
    );
    const riskyKeywordInsertions = keywordEvidenceMap
      .filter(
        (item) =>
          item.supportLevel === "missing" &&
          containsAny(tailoredText, [item.keyword]),
      )
      .map((item) => item.keyword);
    const score = scoreAts(keywordEvidenceMap, safeQualityReview, riskyKeywordInsertions);

    return normalizeAtsReviewResult({
      checked: true,
      score,
      summary: buildAtsSummary(score, keywordEvidenceMap, riskyKeywordInsertions),
      keywordEvidenceMap,
      coveredKeywords: keywordEvidenceMap
        .filter((item) => item.supportLevel === "strong")
        .map((item) => item.keyword),
      partiallyCoveredKeywords: keywordEvidenceMap
        .filter((item) => item.supportLevel === "medium" || item.supportLevel === "weak")
        .map((item) => item.keyword),
      missingImportantKeywords: keywordEvidenceMap
        .filter(
          (item) =>
            item.supportLevel === "missing" && item.importance !== "low",
        )
        .map((item) => item.keyword),
      riskyKeywordInsertions,
      suggestions: buildSuggestions(keywordEvidenceMap, riskyKeywordInsertions),
    });
  } catch {
    return createFallbackAtsReview();
  }
}

export function buildAtsGuidanceFromReview(
  atsReview: AtsReviewResult,
): AtsGuidance {
  const mustCoverKeywords = atsReview.keywordEvidenceMap
    .filter(
      (item) =>
        item.importance === "high" &&
        (item.supportLevel === "strong" || item.supportLevel === "medium") &&
        item.safeToUse,
    )
    .map((item) => item.keyword);
  const shouldCoverKeywords = atsReview.keywordEvidenceMap
    .filter(
      (item) =>
        item.importance === "medium" &&
        (item.supportLevel === "strong" || item.supportLevel === "medium") &&
        item.safeToUse,
    )
    .map((item) => item.keyword);
  const weakKeywords = atsReview.keywordEvidenceMap
    .filter((item) => item.supportLevel === "weak" && item.safeToUse)
    .map((item) => item.keyword);
  const forbiddenKeywords = atsReview.keywordEvidenceMap
    .filter((item) => item.supportLevel === "missing" || !item.safeToUse)
    .map((item) => item.keyword);

  return {
    mustCoverKeywords: uniqueStrings(mustCoverKeywords),
    shouldCoverKeywords: uniqueStrings(shouldCoverKeywords),
    weakKeywords: uniqueStrings(weakKeywords),
    forbiddenKeywords: uniqueStrings([
      ...forbiddenKeywords,
      ...atsReview.missingImportantKeywords,
    ]),
    riskyKeywordInsertions: uniqueStrings(atsReview.riskyKeywordInsertions),
    keywordEvidenceMap: atsReview.keywordEvidenceMap,
  };
}

function extractKeywords(jdText: string, jdAnalysis: JDAnalysisResult) {
  const jdSources = [
    jdText,
    jdAnalysis.roleLabel,
    jdAnalysis.summary,
    ...(jdAnalysis.jdHighlights ?? []),
    ...(jdAnalysis.requiredAbilities ?? []),
    ...(jdAnalysis.preferredAbilities ?? []),
    ...(jdAnalysis.resumeThesis?.skillPriority ?? []),
    ...(jdAnalysis.abilityMap?.hardSkills ?? []),
    ...(jdAnalysis.abilityMap?.productSkills ?? []),
    ...(jdAnalysis.abilityMap?.aiSkills ?? []),
    ...(jdAnalysis.abilityMap?.evaluationSkills ?? []),
  ].filter(Boolean);
  const combined = jdSources.join("\n");
  const extracted: ExtractedKeyword[] = [];

  for (const spec of keywordSpecs) {
    const matched = spec.patterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(combined);
    });

    if (!matched || blockedJdWords.some((word) => spec.keyword.includes(word))) {
      continue;
    }

    extracted.push({
      ...spec,
      importance: inferImportance(spec, jdAnalysis, jdText),
      sourceInJD: findSourceSnippet(spec, jdSources),
    });
  }

  return dedupeKeywords(extracted)
    .sort((a, b) => importanceRank(b.importance) - importanceRank(a.importance))
    .slice(0, 20);
}

function buildKeywordEvidence(
  keyword: ExtractedKeyword,
  {
    masterText,
    tailoredText,
  }: {
    masterText: string;
    tailoredText: string;
  },
): AtsKeywordEvidence {
  const masterExact = containsAny(masterText, [keyword.keyword, ...keyword.evidenceTerms]);
  const tailoredExact = containsAny(tailoredText, [keyword.keyword, ...keyword.evidenceTerms]);
  const masterRelated = containsAny(masterText, keyword.relatedEvidenceTerms ?? []);
  const tailoredRelated = containsAny(tailoredText, keyword.relatedEvidenceTerms ?? []);
  let supportLevel: AtsSupportLevel = "missing";
  let evidenceInResume = "";

  if (tailoredExact && masterExact) {
    supportLevel = "strong";
    evidenceInResume = "定制简历已自然覆盖，且 Master 中有明确证据支撑。";
  } else if ((tailoredExact || tailoredRelated) && (masterExact || masterRelated)) {
    supportLevel = "medium";
    evidenceInResume = "定制简历中有相关表达，Master 中存在相近项目证据。";
  } else if (!tailoredExact && (masterExact || masterRelated)) {
    supportLevel = "medium";
    evidenceInResume = "Master 中存在证据，但定制简历没有直接突出该关键词。";
  } else if (tailoredExact && !masterExact && !masterRelated) {
    supportLevel = "missing";
    evidenceInResume = "定制简历出现该关键词，但 Master 中缺少明确支撑，存在硬塞风险。";
  } else if (tailoredRelated || masterRelated) {
    supportLevel = "weak";
    evidenceInResume = "仅有间接相关证据，建议弱表达或人工复核。";
  } else {
    evidenceInResume = "Master 和定制简历中均未发现明确证据。";
  }

  return {
    keyword: keyword.keyword,
    importance: keyword.importance,
    sourceInJD: keyword.sourceInJD,
    evidenceInResume,
    supportLevel,
    safeToUse: supportLevel !== "missing",
    suggestedPlacement:
      supportLevel === "missing" ? "omit" : keyword.placement,
  };
}

function scoreAts(
  items: AtsKeywordEvidence[],
  qualityReview: Pick<
    ResumeQualityReview,
    "highRiskCount" | "mediumRiskCount" | "lowRiskCount"
  >,
  riskyKeywordInsertions: string[],
) {
  if (items.length === 0) {
    return 0;
  }

  const total = items.reduce((sum, item) => sum + weightFor(item.importance), 0);
  const covered = items.reduce(
    (sum, item) =>
      sum + weightFor(item.importance) * multiplierFor(item.supportLevel),
    0,
  );
  const baseScore = (covered / Math.max(total, 1)) * 100;
  const qualityPenalty =
    qualityReview.highRiskCount * 8 +
    qualityReview.mediumRiskCount * 4 +
    qualityReview.lowRiskCount * 1.5 +
    riskyKeywordInsertions.length * 6;

  return clampScore(baseScore - qualityPenalty);
}

function buildAtsSummary(
  score: number,
  items: AtsKeywordEvidence[],
  riskyKeywordInsertions: string[],
) {
  if (riskyKeywordInsertions.length > 0) {
    return "发现部分关键词出现在定制简历中，但 Master 证据不足，建议避免为了 ATS 硬塞关键词。";
  }

  const missingHigh = items.filter(
    (item) => item.importance === "high" && item.supportLevel === "missing",
  ).length;

  if (score >= 85) {
    return "核心 ATS 关键词覆盖较好，关键词与项目证据绑定比较自然。";
  }

  if (score >= 70) {
    return missingHigh > 0
      ? "ATS 覆盖基本够，但有少量高优先级关键词缺少明确证据。"
      : "ATS 覆盖基本够，建议继续避免关键词堆砌。";
  }

  if (score >= 50) {
    return "ATS 覆盖不足，部分核心关键词只被间接覆盖或未出现在定制简历中。";
  }

  return "ATS 风险较高，多个核心关键词缺少可解释证据或没有被自然覆盖。";
}

function buildSuggestions(
  items: AtsKeywordEvidence[],
  riskyKeywordInsertions: string[],
) {
  const suggestions = new Set<string>();
  const missing = items.filter(
    (item) => item.supportLevel === "missing" && item.importance !== "low",
  );
  const weak = items.filter((item) => item.supportLevel === "weak");

  if (riskyKeywordInsertions.length > 0) {
    suggestions.add("不要把缺少 Master 证据的关键词硬塞进技能区或项目 bullet。");
  }

  if (missing.length > 0) {
    suggestions.add("缺少明确证据的高优先级关键词应进入风险提醒，而不是写进简历正文。");
  }

  if (weak.length > 0) {
    suggestions.add("弱证据关键词可以用“了解 / 项目中涉及 / 可迁移”方式表达。");
  }

  if (suggestions.size === 0) {
    suggestions.add("继续保持关键词与项目证据绑定，避免复制 JD 技术清单。");
  }

  return Array.from(suggestions);
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
      ...(project.tags ?? []),
      ...(project.role ? [project.role] : []),
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

function tech(
  keyword: string,
  patterns: string[],
  evidenceTerms: string[],
  importance: AtsKeywordImportance,
): KeywordSpec {
  return {
    keyword,
    patterns: patterns.map(toPattern),
    evidenceTerms,
    relatedEvidenceTerms: evidenceTerms,
    importance,
    placement: "skills",
  };
}

function strictTech(
  keyword: string,
  patterns: string[],
  importance: AtsKeywordImportance,
): KeywordSpec {
  return {
    keyword,
    patterns: patterns.map(toPattern),
    evidenceTerms: [keyword],
    relatedEvidenceTerms: [],
    importance,
    placement: "skills",
  };
}

function responsibility(
  keyword: string,
  patterns: string[],
  evidenceTerms: string[],
  importance: AtsKeywordImportance,
): KeywordSpec {
  return {
    keyword,
    patterns: patterns.map(toPattern),
    evidenceTerms,
    relatedEvidenceTerms: evidenceTerms,
    importance,
    placement: "project_bullet",
  };
}

function scenario(
  keyword: string,
  patterns: string[],
  evidenceTerms: string[],
  importance: AtsKeywordImportance,
): KeywordSpec {
  return {
    keyword,
    patterns: patterns.map(toPattern),
    evidenceTerms,
    relatedEvidenceTerms: evidenceTerms,
    importance,
    placement: "project_intro",
  };
}

function toPattern(value: string) {
  return new RegExp(escapeRegExp(value), "i");
}

function inferImportance(
  spec: KeywordSpec,
  jdAnalysis: JDAnalysisResult,
  jdText: string,
): AtsKeywordImportance {
  const highSources = [
    ...(jdAnalysis.requiredAbilities ?? []),
    ...(jdAnalysis.jdHighlights ?? []),
    jdAnalysis.detectedRole?.label ?? "",
    jdAnalysis.roleLabel,
  ].join("\n");
  const preferredSources = [
    ...(jdAnalysis.preferredAbilities ?? []),
    ...(jdAnalysis.resumeThesis?.skillPriority ?? []),
  ].join("\n");

  if (containsAny(highSources, [spec.keyword, ...spec.patterns.map(String)])) {
    return "high";
  }

  if (containsAny(preferredSources, [spec.keyword])) {
    return spec.importance === "low" ? "medium" : spec.importance;
  }

  if (spec.importance === "high" && containsAny(jdText, [spec.keyword])) {
    return "high";
  }

  return spec.importance;
}

function findSourceSnippet(spec: KeywordSpec, sources: string[]) {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    const matched = spec.patterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(source);
    });

    if (matched) {
      return source.length > 120 ? `${source.slice(0, 117)}...` : source;
    }
  }

  return spec.keyword;
}

function containsAny(text: string, terms: string[]) {
  return terms
    .filter(Boolean)
    .some((term) => new RegExp(escapeRegExp(term), "i").test(text));
}

function dedupeKeywords(items: ExtractedKeyword[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.keyword.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function importanceRank(importance: AtsKeywordImportance) {
  if (importance === "high") {
    return 3;
  }

  if (importance === "medium") {
    return 2;
  }

  return 1;
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

function multiplierFor(level: AtsSupportLevel) {
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}
