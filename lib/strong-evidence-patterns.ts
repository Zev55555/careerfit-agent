import type { JDAnalysisResult } from "@/lib/role-classifier";

export type ProtectedEvidencePatterns = {
  transit: string[];
  sova: string[];
  portfolio: string[];
  all: string[];
  protectPortfolio: boolean;
  productDataJd: boolean;
  contentAiProductJd: boolean;
  agentEngineeringJd: boolean;
  b2bBusinessSystemJd: boolean;
};

export type EvidenceChainResult = Record<string, boolean>;

const productRoleTerms = [
  "AI 产品经理",
  "AI 产品实习生",
  "产品经理",
  "产品实习生",
  "数据产品",
  "策略产品",
  "用户体验产品",
  "B端产品",
  "C端产品",
  "商业化产品",
  "运营产品",
];

const productDataTerms = [
  "用户体验",
  "用户反馈",
  "用户需求",
  "用户行为",
  "数据分析",
  "产品效果",
  "转化率",
  "留存",
  "满意度",
  "营销",
  "电商",
  "广告",
  "C端",
  "B端",
  "产品策略",
  "需求分析",
  "产品方案",
  "策略迭代",
  "效果评估",
  "运营",
  "指标",
  "漏斗",
  "Figma",
  "Axure",
  "原型设计",
];

const explicitContentAiProductTerms = [
  "内容分发",
  "内容评估",
  "搜索推荐",
  "智能信息流",
  "Prompt 调优策略",
  "信源分级",
  "内容评估体系",
  "语义行为分析",
  "个性化策略",
  "内容筛选",
  "推荐决策",
  "策略流控",
];

const b2bBusinessSystemTerms = [
  "B端业务系统",
  "B 端业务系统",
  "b端业务系统",
  "b 端业务系统",
  "B端系统",
  "B 端系统",
  "业务系统",
  "业务中台",
  "商业化落地",
  "商业化",
  "产品路线图",
  "路线图",
  "Roadmap",
  "整体规划",
  "发展计划",
  "业务规划",
  "产研协同",
  "需求管理",
  "需求评审",
  "业务流程",
  "业务闭环",
  "客户需求",
  "经营分析",
  "数据支持",
  "模型原理",
  "大模型落地",
];

const designTerms = [
  "Figma",
  "Axure",
  "原型",
  "原型设计",
  "产品设计",
  "用户体验",
  "交互",
  "信息架构",
];

const engineeringTerms = [
  "Agent 开发",
  "Python 开发",
  "自动化测试",
  "算法评测",
  "后端开发",
  "大模型应用开发",
  "工程效能",
  "接口测试",
  "测试开发",
  "数据结构",
  "算法",
  "CI/CD",
  "持续集成",
  "质量效能",
];

const transitPatterns = [
  "SQL",
  "DuckDB",
  "Pandas",
  "GTFS",
  "热力图",
  "路线 × 小时",
  "路线-小时",
  "20:00",
  "21:00-22:00",
  "Evening Service Gap Score",
  "服务缺口",
  "排班优化建议",
  "晚间出行体验",
  "用户体验痛点",
  "末班车",
  "晚间班次",
  "站点覆盖",
];

const sovaPatterns = [
  "Metric Spec",
  "分子",
  "分母",
  "规则兜底",
  "输出稳定性",
  "测试案例",
  "营销",
  "字段误判",
  "场景泛化",
  "badcase",
  "Badcase",
  "DuckDB",
  "结果可复查",
  "Prompt",
  "Prompt 调优",
  "输出质量",
  "用户意图",
  "结构化输入",
  "信息完整性",
  "解释清晰度",
  "证据链",
  "AI Native",
];

const portfolioPatterns = [
  "Figma",
  "JD Match Console",
  "信息架构",
  "产品展示",
  "原型",
  "交互",
];

export function isProductDataJd(
  jdText: string,
  jdAnalysis?: JDAnalysisResult,
  selectedRole?: string,
) {
  if (isProductSelectedRole(selectedRole)) {
    return true;
  }

  const text = buildContextText(jdText, jdAnalysis);
  const productHits = countHits(text, productDataTerms);
  const productRoleHits = countHits(text, productRoleTerms);
  const engineeringHits = countHits(text, engineeringTerms);
  const hasSpecificProductSignal = [...productRoleTerms, ...productDataTerms]
    .filter((term) => term !== "数据分析" && term !== "指标")
    .some((term) => includesTerm(text, term));

  if (productHits + productRoleHits === 0) {
    return false;
  }

  if (engineeringHits >= productHits + productRoleHits + 2 && !hasSpecificProductSignal) {
    return false;
  }

  return hasSpecificProductSignal || productHits + productRoleHits >= 2;
}

export function isAgentEngineeringJd(
  jdText: string,
  jdAnalysis?: JDAnalysisResult,
) {
  const text = buildContextText(jdText, jdAnalysis);
  const engineeringHits = countHits(text, engineeringTerms);
  const agentHits = countHits(text, [
    "Agent",
    "Tool Calling",
    "Workflow",
    "RAG",
    "Multi-Agent",
    "Python",
    "自动化测试",
    "算法评测",
    "工程效能",
    "测试案例",
    "badcase",
    "输出稳定性",
  ]);

  return engineeringHits + agentHits >= 2;
}

export function isContentAiProductJd(
  jdText: string,
  jdAnalysis?: JDAnalysisResult,
) {
  const text = buildContextText(jdText, jdAnalysis);
  if (isB2BBusinessSystemJd(jdText, jdAnalysis)) {
    return false;
  }

  return explicitContentAiProductTerms.some((term) => includesTerm(text, term));
}

export function isB2BBusinessSystemJd(
  jdText: string,
  jdAnalysis?: JDAnalysisResult,
) {
  const text = buildContextText(jdText, jdAnalysis);
  const b2bHits = countHits(text, b2bBusinessSystemTerms);
  const contentHits = countHits(text, explicitContentAiProductTerms);

  return b2bHits >= 2 || (b2bHits >= 1 && contentHits === 0);
}

export function getProtectedEvidencePatterns(
  jdText: string,
  jdAnalysis?: JDAnalysisResult,
  selectedRole?: string,
): ProtectedEvidencePatterns {
  const contentAiProductJd = isContentAiProductJd(jdText, jdAnalysis);
  const b2bBusinessSystemJd = isB2BBusinessSystemJd(jdText, jdAnalysis);
  const productDataJd = isProductDataJd(jdText, jdAnalysis, selectedRole);
  const agentEngineeringJd = isAgentEngineeringJd(jdText, jdAnalysis);
  const contextText = buildContextText(jdText, jdAnalysis);
  const protectPortfolio =
    productDataJd && designTerms.some((term) => includesTerm(contextText, term));
  const transit = productDataJd ? transitPatterns : [];
  const sova =
    productDataJd || agentEngineeringJd || contentAiProductJd ? sovaPatterns : [];
  const portfolio = protectPortfolio ? portfolioPatterns : [];

  return {
    transit,
    sova,
    portfolio,
    all: [...transit, ...sova, ...portfolio],
    protectPortfolio,
    productDataJd,
    contentAiProductJd,
    agentEngineeringJd,
    b2bBusinessSystemJd,
  };
}

export function isProtectedEvidenceText(
  text: string,
  patterns: ProtectedEvidencePatterns | string[],
) {
  const source = Array.isArray(patterns) ? patterns : patterns.all;
  return source.some((pattern) => includesTerm(text, pattern));
}

export function countEvidenceChainElements(text: string) {
  const groups = [
    ["学生", "用户", "体验", "痛点", "晚间出行", "服务缺口", "问题"],
    ["SQL", "DuckDB", "Pandas", "GTFS", "数据", "热力图"],
    ["20:00", "21:00-22:00", "Evening Service Gap Score", "指标", "发现", "缺口"],
    ["建议", "排班", "优化", "策略", "末班车", "班次", "站点覆盖"],
  ];

  return groups.filter((group) => group.some((term) => includesTerm(text, term)))
    .length;
}

export function detectTransitEvidenceChain(text: string): EvidenceChainResult {
  return {
    userPain: hasAny(text, [
      "学生晚间出行",
      "晚间出行体验",
      "用户体验痛点",
      "服务缺口",
      "痛点",
    ]),
    dataMethod: hasAny(text, ["SQL", "DuckDB", "Pandas", "GTFS"]),
    visualization: hasAny(text, ["热力图", "路线 × 小时", "路线-小时", "路线 小时"]),
    finding: hasAny(text, ["20:00", "21:00-22:00", "20:00 后", "服务缺口"]),
    metric: hasAny(text, ["Evening Service Gap Score"]),
    recommendation: hasAny(text, [
      "排班优化",
      "排班优化建议",
      "延后末班车",
      "增加晚间班次",
      "补强重点站点覆盖",
      "优化建议",
    ]),
  };
}

export function detectSovaEvidenceChain(text: string): EvidenceChainResult {
  return {
    metricSpec: hasAny(text, ["Metric Spec"]),
    numeratorDenominator: hasAny(text, ["分子", "分母"]),
    duckdb: hasAny(text, ["DuckDB"]),
    fallbackRules: hasAny(text, ["规则兜底", "兜底"]),
    testCases: hasAny(text, ["测试案例", "测试用例"]),
    badcase: hasAny(text, ["badcase", "Badcase", "字段误判", "场景泛化"]),
    stability: hasAny(text, ["输出稳定性", "结果可复查", "稳定性验证"]),
  };
}

export function detectPortfolioEvidenceChain(text: string): EvidenceChainResult {
  return {
    figma: hasAny(text, ["Figma"]),
    jdMatchConsole: hasAny(text, ["JD Match Console"]),
    informationArchitecture: hasAny(text, ["信息架构"]),
    productShowcase: hasAny(text, ["产品展示", "作品集展示"]),
    prototypeInteraction: hasAny(text, ["原型", "交互"]),
  };
}

export function countEvidenceElements(chainResult: EvidenceChainResult) {
  return Object.values(chainResult).filter(Boolean).length;
}

function isProductSelectedRole(selectedRole?: string) {
  return selectedRole === "ai_product_manager" || selectedRole === "AI_PRODUCT_MANAGER";
}

function buildContextText(jdText: string, jdAnalysis?: JDAnalysisResult) {
  return [
    jdText,
    jdAnalysis?.roleLabel ?? "",
    jdAnalysis?.summary ?? "",
    jdAnalysis?.detectedRole?.label ?? "",
    jdAnalysis?.detectedRole?.category ?? "",
    jdAnalysis?.strategyRole?.label ?? "",
    jdAnalysis?.resumeThesis?.oneSentence ?? "",
    jdAnalysis?.resumeThesis?.positioning ?? "",
    ...(jdAnalysis?.jdHighlights ?? []),
    ...(jdAnalysis?.requiredAbilities ?? []),
    ...(jdAnalysis?.preferredAbilities ?? []),
    ...(jdAnalysis?.abilityMap?.hardSkills ?? []),
    ...(jdAnalysis?.abilityMap?.productSkills ?? []),
    ...(jdAnalysis?.abilityMap?.businessSkills ?? []),
    ...(jdAnalysis?.abilityMap?.evaluationSkills ?? []),
  ].join("\n");
}

function countHits(text: string, terms: string[]) {
  return terms.filter((term) => includesTerm(text, term)).length;
}

function includesTerm(text: string, term: string) {
  return text.toLowerCase().includes(term.toLowerCase());
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => includesTerm(text, term));
}
