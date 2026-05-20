import {
  type CustomRoleInput,
  getCustomRoleLabel,
  normalizeCustomRoleInput,
} from "@/lib/custom-role";
import type { RoleDirection } from "@/lib/resume-schema";

export type ApiRole =
  | "AI_PRODUCT_MANAGER"
  | "AI_AGENT_APPLICATION"
  | "LLM_APPLICATION_PRODUCT"
  | "AUTO_DETECT_ROLE"
  | "CUSTOM_ROLE"
  | "OTHER";

export type ProjectRecommendation = {
  name: string;
  projectName?: string;
  reason: string;
};

export type ScreeningProfile = {
  whoTheyWant: string;
  mustProve: string[];
  niceToHave: string[];
  avoidPositioningAs: string[];
  hiddenRequirements: string[];
};

export type AbilityMap = {
  hardSkills: string[];
  productSkills: string[];
  businessSkills: string[];
  aiSkills: string[];
  collaborationSkills: string[];
  evaluationSkills: string[];
  riskAreas: string[];
};

export type EvidenceMatchLevel = "strong" | "medium" | "weak" | "missing";

export type EvidenceMatrixItem = {
  jdRequirement: string;
  matchedProjects: string[];
  matchLevel: EvidenceMatchLevel;
  evidence: string;
  rewriteFocus: string;
  riskNote?: string;
};

export type ResumeThesis = {
  oneSentence: string;
  positioning: string;
  openingFocus: string[];
  projectPriority: string[];
  skillPriority: string[];
};

export type CoverageCheck = {
  overallScore: number;
  coveredRequirements: string[];
  partiallyCoveredRequirements: string[];
  missingRequirements: string[];
  overPackagingRisks: string[];
  suggestedManualReview: string[];
};

export type DetectedRole = {
  label: string;
  category: string;
  confidence: number;
  reason: string;
};

export type StrategyRole = {
  selectedRole: string;
  label: string;
  isUserForced: boolean;
};

export type RoleMismatch = {
  hasMismatch: boolean;
  severity: "none" | "low" | "medium" | "high";
  message: string;
  suggestedAction: string;
};

export type JDAnalysisResult = {
  primaryRole: ApiRole;
  secondaryRoles: ApiRole[];
  confidence: number;
  roleLabel: string;
  summary: string;
  jdHighlights: string[];
  requiredAbilities: string[];
  preferredAbilities: string[];
  recommendedProjects: ProjectRecommendation[];
  weakenedProjects: ProjectRecommendation[];
  riskWarnings: string[];
  screeningProfile: ScreeningProfile;
  abilityMap: AbilityMap;
  evidenceMatrix: EvidenceMatrixItem[];
  resumeThesis: ResumeThesis;
  coverageCheck: CoverageCheck;
  detectedRole: DetectedRole;
  strategyRole: StrategyRole;
  roleMismatch?: RoleMismatch;
  analyzer?: "ai" | "rule";
  fallbackReason?: string;
};

type RoleConfig = {
  role: ApiRole;
  direction: RoleDirection;
  label: string;
  keywords: string[];
  requiredAbilities: string[];
  preferredAbilities: string[];
  recommendedProjects: ProjectRecommendation[];
  weakenedProjects: ProjectRecommendation[];
};

type RoleScore = {
  role: ApiRole;
  score: number;
  matches: string[];
};

export const apiRoleToDirection: Record<ApiRole, RoleDirection> = {
  AI_PRODUCT_MANAGER: "ai_product_manager",
  AI_AGENT_APPLICATION: "ai_agent_application",
  LLM_APPLICATION_PRODUCT: "llm_application",
  AUTO_DETECT_ROLE: "auto_detect_role",
  CUSTOM_ROLE: "custom_role",
  OTHER: "ai_product_manager",
};

export const apiRoleLabels: Record<ApiRole, string> = {
  AI_PRODUCT_MANAGER: "AI 产品经理",
  AI_AGENT_APPLICATION: "AI Agent 应用",
  LLM_APPLICATION_PRODUCT: "大模型应用 / 大模型应用产品",
  AUTO_DETECT_ROLE: "自动识别岗位",
  CUSTOM_ROLE: "自定义岗位方向",
  OTHER: "其他方向",
};

export const directionToApiRole: Record<RoleDirection, ApiRole> = {
  ai_product_manager: "AI_PRODUCT_MANAGER",
  ai_agent_application: "AI_AGENT_APPLICATION",
  llm_application: "LLM_APPLICATION_PRODUCT",
  auto_detect_role: "AUTO_DETECT_ROLE",
  custom_role: "CUSTOM_ROLE",
};

const riskWarnings = [
  "不要写模型训练或微调",
  "不要编造商业化上线或明确增长数据",
  "不要声称百万用户、算法研发或没有依据的商业结果",
];

const roleConfigs: RoleConfig[] = [
  {
    role: "AI_PRODUCT_MANAGER",
    direction: "ai_product_manager",
    label: "AI 产品经理",
    keywords: [
      "AI产品经理",
      "大模型产品",
      "AIGC产品",
      "产品经理",
      "产品设计",
      "需求分析",
      "用户需求",
      "用户调研",
      "竞品分析",
      "产品方案",
      "PRD",
      "原型设计",
      "产品迭代",
      "用户体验",
      "业务场景",
      "模型能力边界",
      "产品落地",
      "效果评估",
    ],
    requiredAbilities: [
      "需求分析",
      "产品方案设计",
      "AI 工作流设计",
      "业务场景拆解",
    ],
    preferredAbilities: [
      "Prompt Engineering",
      "模型效果评估",
      "Agent 工作流理解",
    ],
    recommendedProjects: [
      {
        name: "SOVA AI",
        reason: "最能体现 AI 产品设计、Agent 工作流和指标分析场景。",
      },
      {
        name: "InsightFlow AI",
        reason: "能体现业务问题拆解、指标拆解和分析路径设计。",
      },
    ],
    weakenedProjects: [
      {
        name: "AI Exposure 与编程职业就业前景分析",
        reason: "偏研究分析，与 AI 产品落地和产品流程的直接相关度较低。",
      },
    ],
  },
  {
    role: "AI_AGENT_APPLICATION",
    direction: "ai_agent_application",
    label: "AI Agent 应用",
    keywords: [
      "Agent",
      "AI Agent",
      "智能体",
      "智能体应用",
      "Agent Workflow",
      "工作流",
      "任务拆解",
      "Tool Calling",
      "工具调用",
      "函数调用",
      "多步骤推理",
      "Human-in-the-loop",
      "人机协同",
      "自动化流程",
      "业务流程自动化",
      "结构化输出",
      "知识库检索",
      "RAG",
    ],
    requiredAbilities: [
      "Agent Workflow 设计",
      "任务拆解",
      "工具调用理解",
      "结构化输出设计",
    ],
    preferredAbilities: [
      "Human-in-the-loop",
      "业务流程自动化",
      "RAG 与知识库检索",
    ],
    recommendedProjects: [
      {
        name: "SOVA AI",
        reason: "包含指标澄清、字段识别、计算工具链和证据链输出，最贴近 Agent 工作流。",
      },
      {
        name: "Zev Portfolio",
        reason: "JD Match Console 可以作为任务匹配和结果复查的轻量工作流案例。",
      },
    ],
    weakenedProjects: [
      {
        name: "UCSD Triton Transit",
        reason: "偏数据分析和排班诊断，与 Agent 应用链路的直接相关度较低。",
      },
    ],
  },
  {
    role: "LLM_APPLICATION_PRODUCT",
    direction: "llm_application",
    label: "大模型应用 / 大模型应用产品",
    keywords: [
      "大模型应用",
      "LLM",
      "AIGC",
      "大语言模型",
      "Prompt Engineering",
      "提示词优化",
      "模型输出",
      "模型评测",
      "badcase",
      "效果评估",
      "输出稳定性",
      "业务可用性",
      "知识库",
      "RAG",
      "大模型落地",
      "应用场景",
    ],
    requiredAbilities: [
      "LLM 应用场景拆解",
      "Prompt Engineering",
      "模型输出评估",
      "Badcase 分析",
    ],
    preferredAbilities: [
      "输出稳定性优化",
      "业务可用性判断",
      "知识库与 RAG 理解",
    ],
    recommendedProjects: [
      {
        name: "InsightFlow AI",
        reason: "最能体现 Prompt 框架、业务问题拆解和结构化输出设计。",
      },
      {
        name: "SOVA AI",
        reason: "能体现 AI 推理与确定性计算边界，以及可复查的输出设计。",
      },
    ],
    weakenedProjects: [
      {
        name: "UCSD Triton Transit",
        reason: "项目价值明确但更偏传统数据分析，与大模型应用能力的直接匹配较弱。",
      },
    ],
  },
];

export function classifyJd(
  jdText: string,
  options: {
    selectedRole?: ApiRole;
    customRoleInput?: Partial<CustomRoleInput>;
  } = {},
): JDAnalysisResult {
  const normalizedJd = jdText.trim();

  if (!normalizedJd) {
    throw new Error("JD 不能为空，请先粘贴岗位描述。");
  }

  if (options.selectedRole === "CUSTOM_ROLE") {
    return classifyCustomRole(normalizedJd, options.customRoleInput);
  }

  const scores = roleConfigs.map((config) => scoreRole(normalizedJd, config));
  const totalScore = scores.reduce((sum, item) => sum + item.score, 0);
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const productScore = scores.find(
    (item) => item.role === "AI_PRODUCT_MANAGER",
  );
  let primary = sorted[0];

  if (
    productScore &&
    productScore.score > 0 &&
    primary.role !== "AI_PRODUCT_MANAGER" &&
    isCloseScore(productScore.score, primary.score)
  ) {
    primary = productScore;
  }

  if (primary.score === 0) {
    primary = {
      role: "AI_PRODUCT_MANAGER",
      score: 1,
      matches: ["业务场景"],
    };
  }

  const secondaryRoles = sorted
    .filter((item) => item.role !== primary.role && item.score > 0)
    .slice(0, 1)
    .map((item) => item.role);
  const config = getRoleConfig(primary.role);
  const secondaryLabels = secondaryRoles.map((role) => getRoleConfig(role).label);

  const baseAnalysis = {
    primaryRole: primary.role,
    secondaryRoles,
    confidence: calculateConfidence(primary.score, totalScore),
    roleLabel: config.label,
    summary: buildSummary(config.label, secondaryLabels),
    jdHighlights: buildHighlights(primary, secondaryRoles, scores),
    requiredAbilities: config.requiredAbilities,
    preferredAbilities: config.preferredAbilities,
    recommendedProjects: config.recommendedProjects,
    weakenedProjects: config.weakenedProjects,
    riskWarnings,
  };
  const roleMeta = buildRoleMeta({
    jdText: normalizedJd,
    selectedRole: options.selectedRole,
    customRoleInput: options.customRoleInput,
    fallbackRole: primary.role,
  });

  return {
    ...baseAnalysis,
    ...buildStrategyFallback(baseAnalysis),
    ...roleMeta,
  };
}

function scoreRole(jdText: string, config: RoleConfig): RoleScore {
  const lowerJd = jdText.toLowerCase();
  const matches = config.keywords.filter((keyword) =>
    lowerJd.includes(keyword.toLowerCase()),
  );
  const score = matches.reduce((sum, keyword) => sum + keywordWeight(keyword), 0);

  return {
    role: config.role,
    score,
    matches,
  };
}

function buildRoleMeta({
  jdText,
  selectedRole,
  customRoleInput,
  fallbackRole,
}: {
  jdText: string;
  selectedRole?: ApiRole;
  customRoleInput?: Partial<CustomRoleInput>;
  fallbackRole: ApiRole;
}): {
  detectedRole: DetectedRole;
  strategyRole: StrategyRole;
  roleMismatch: RoleMismatch;
} {
  const detectedRole = detectActualRole(jdText, fallbackRole);
  const strategyRole = buildStrategyRole(selectedRole, customRoleInput, detectedRole);
  const roleMismatch = buildRoleMismatch(detectedRole, strategyRole);

  return { detectedRole, strategyRole, roleMismatch };
}

function detectActualRole(jdText: string, fallbackRole: ApiRole): DetectedRole {
  const text = jdText.toLowerCase();
  const qualityMatches = countMatches(text, [
    "测试",
    "质量",
    "效能",
    "接口",
    "自动化测试",
    "缺陷",
    "验收",
    "脚本",
    "数据结构",
    "算法",
    "test",
    "qa",
  ]);
  const productMatches = countMatches(text, [
    "prd",
    "产品规划",
    "用户需求",
    "原型",
    "竞品",
    "用户反馈",
    "产品经理",
  ]);
  const agentMatches = countMatches(text, [
    "agent",
    "tool calling",
    "rag",
    "workflow",
    "memory",
    "multi-agent",
    "智能体",
  ]);
  const llmMatches = countMatches(text, [
    "llm",
    "大模型",
    "prompt",
    "badcase",
    "模型评测",
    "输出稳定",
  ]);

  if (qualityMatches >= Math.max(2, productMatches + 1, agentMatches, llmMatches)) {
    return {
      label: "AI 质量效能 / 测试自动化方向",
      category: "软件测试 / 测试效能 / AI 赋能测试",
      confidence: Math.min(0.95, 0.65 + qualityMatches * 0.05),
      reason:
        "JD 重点在接口、脚本、自动化测试、质量效能、缺陷或验收链路，而不是产品规划。",
    };
  }

  if (agentMatches >= Math.max(2, productMatches, llmMatches)) {
    return {
      label: "AI Agent 应用 / 智能体方向",
      category: "AI Agent 应用",
      confidence: Math.min(0.95, 0.62 + agentMatches * 0.05),
      reason: "JD 明确强调 Agent、Workflow、Tool Calling、RAG 或多步骤任务执行。",
    };
  }

  if (llmMatches >= Math.max(2, productMatches)) {
    return {
      label: "大模型应用 / LLM 应用产品方向",
      category: "大模型应用产品",
      confidence: Math.min(0.95, 0.62 + llmMatches * 0.05),
      reason: "JD 明确强调 Prompt、模型输出评估、Badcase、稳定性或 LLM 应用落地。",
    };
  }

  if (productMatches >= 2 || fallbackRole === "AI_PRODUCT_MANAGER") {
    return {
      label: "AI 产品经理 / 产品实习方向",
      category: "AI 产品经理",
      confidence: Math.min(0.92, 0.58 + Math.max(productMatches, 1) * 0.05),
      reason: "JD 更强调产品规划、需求理解、PRD、用户反馈、原型或竞品分析。",
    };
  }

  return {
    label: apiRoleLabels[fallbackRole] ?? "其他岗位方向",
    category: fallbackRole === "OTHER" ? "其他岗位" : apiRoleLabels[fallbackRole],
    confidence: 0.55,
    reason: "规则 fallback 未识别到足够明确的岗位类别信号。",
  };
}

function buildStrategyRole(
  selectedRole: ApiRole | undefined,
  customRoleInput: Partial<CustomRoleInput> | undefined,
  detectedRole: DetectedRole,
): StrategyRole {
  if (selectedRole === "AUTO_DETECT_ROLE" || !selectedRole) {
    return {
      selectedRole: "AUTO_DETECT_ROLE",
      label: `自动识别：${detectedRole.label}`,
      isUserForced: false,
    };
  }

  if (selectedRole === "CUSTOM_ROLE") {
    return {
      selectedRole,
      label: getCustomRoleLabel(customRoleInput),
      isUserForced: true,
    };
  }

  return {
    selectedRole,
    label: apiRoleLabels[selectedRole],
    isUserForced: true,
  };
}

function buildRoleMismatch(
  detectedRole: DetectedRole,
  strategyRole: StrategyRole,
): RoleMismatch {
  if (!strategyRole.isUserForced || strategyRole.selectedRole === "CUSTOM_ROLE") {
    return {
      hasMismatch: false,
      severity: "none",
      message: "",
      suggestedAction: "",
    };
  }

  const selectedKind = roleKindFromSelected(strategyRole.selectedRole);
  const detectedKind = roleKindFromDetected(detectedRole);

  if (!selectedKind || selectedKind === detectedKind) {
    return {
      hasMismatch: false,
      severity: "none",
      message: "",
      suggestedAction: "",
    };
  }

  const severity = detectedKind === "quality" || selectedKind === "product" ? "high" : "medium";

  return {
    hasMismatch: true,
    severity,
    message: `当前 JD 更像 ${detectedRole.label}，不是 ${strategyRole.label}。`,
    suggestedAction:
      "建议切换为自动识别岗位或自定义岗位方向后再生成定制简历。",
  };
}

function roleKindFromSelected(value: string) {
  if (value === "AI_PRODUCT_MANAGER") return "product";
  if (value === "AI_AGENT_APPLICATION") return "agent";
  if (value === "LLM_APPLICATION_PRODUCT") return "llm";
  return "";
}

function roleKindFromDetected(role: DetectedRole) {
  const text = `${role.label} ${role.category}`.toLowerCase();

  if (/测试|质量|效能|test|qa/.test(text)) return "quality";
  if (/agent|智能体|workflow/.test(text)) return "agent";
  if (/llm|大模型|prompt|模型/.test(text)) return "llm";
  if (/产品|prd|用户|竞品/.test(text)) return "product";
  return "other";
}

function countMatches(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length;
}

function classifyCustomRole(
  jdText: string,
  customRoleValue?: Partial<CustomRoleInput>,
): JDAnalysisResult {
  const customRoleInput = normalizeCustomRoleInput(customRoleValue);
  const roleLabel = customRoleInput.roleName || "自定义岗位方向";
  const focusAreas = splitCustomText(customRoleInput.focusAreas);
  const strengths = splitCustomText(customRoleInput.strengthsToHighlight);
  const avoidAreas = splitCustomText(customRoleInput.avoidAreas);
  const jdHighlights = Array.from(
    new Set([
      ...focusAreas,
      ...extractCustomKeywords(jdText),
      ...strengths.slice(0, 2),
    ]),
  ).slice(0, 8);
  const requiredAbilities = Array.from(
    new Set([...focusAreas, ...strengths, ...jdHighlights]),
  ).slice(0, 8);
  const preferredAbilities = strengths.length
    ? strengths.slice(0, 6)
    : ["业务理解", "数据分析", "沟通协作"];
  const recommendedProjects = buildCustomProjectRecommendations(requiredAbilities);
  const baseAnalysis = {
    primaryRole: "CUSTOM_ROLE" as ApiRole,
    secondaryRoles: [] as ApiRole[],
    confidence: 0.68,
    roleLabel,
    summary: `这个 JD 将按${getCustomRoleLabel(customRoleInput)}处理，重点参考用户填写的岗位侧重点和修改偏好。`,
    jdHighlights,
    requiredAbilities,
    preferredAbilities,
    recommendedProjects,
    weakenedProjects: [
      {
        name: "AI Exposure 与编程职业就业前景分析",
        reason: "除非 JD 明确要求研究分析，否则该项目通常作为低优先级补充。",
      },
    ],
    riskWarnings: Array.from(
      new Set([
        ...riskWarnings,
        ...avoidAreas.map((item) => `不要夸大：${item}`),
      ]),
    ),
  };
  const roleMeta = buildRoleMeta({
    jdText,
    selectedRole: "CUSTOM_ROLE",
    customRoleInput,
    fallbackRole: "CUSTOM_ROLE",
  });

  return {
    ...baseAnalysis,
    ...buildStrategyFallback(baseAnalysis),
    ...roleMeta,
    screeningProfile: {
      whoTheyWant: `${roleLabel}方向候选人，需要证明${requiredAbilities.slice(0, 4).join("、") || "岗位相关能力"}。`,
      mustProve: requiredAbilities,
      niceToHave: preferredAbilities,
      avoidPositioningAs: avoidAreas.length ? avoidAreas : ["与 JD 无关的 AI 技术岗", "没有证据支撑的增长或商业结果"],
      hiddenRequirements: [
        customRoleInput.rawText || "需要把项目证据转成该岗位可理解的能力表达。",
        "弱匹配或缺失要求只能谨慎表达，不能硬包装。",
      ],
    },
    resumeThesis: {
      oneSentence: `围绕${roleLabel}建立简历主线，优先突出${requiredAbilities.slice(0, 4).join("、") || "岗位核心能力"}，并用现有项目证据支撑。`,
      positioning: `${roleLabel}方向候选人`,
      openingFocus: requiredAbilities.slice(0, 3),
      projectPriority: recommendedProjects.map((project) => project.name),
      skillPriority: requiredAbilities.slice(0, 6),
    },
  };
}

function splitCustomText(value: string) {
  return value
    .split(/[;；、，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractCustomKeywords(jdText: string) {
  const candidates = [
    "用户增长",
    "转化率",
    "漏斗分析",
    "A/B Test",
    "商业化策略",
    "数据分析",
    "用户研究",
    "运营策略",
    "内容运营",
    "海外产品",
    "产品设计",
    "业务理解",
  ];

  return candidates.filter((item) => jdText.toLowerCase().includes(item.toLowerCase()));
}

function buildCustomProjectRecommendations(abilities: string[]) {
  const text = abilities.join(" ");
  const projects: ProjectRecommendation[] = [];

  if (/数据|指标|分析|漏斗|转化|策略|运营/i.test(text)) {
    projects.push({
      name: "UCSD Triton Transit",
      reason: "可作为数据分析、业务诊断和决策建议的项目证据。",
    });
  }

  projects.push(
    {
      name: "SOVA AI",
      reason: "可用于证明问题拆解、指标口径、流程设计和结果可复查能力。",
    },
    {
      name: "InsightFlow AI",
      reason: "可用于证明需求拆解、分析路径生成和结构化表达能力。",
    },
    {
      name: "Zev Portfolio / JD Match Console",
      reason: "可用于证明产品化展示、岗位匹配和证据约束意识。",
    },
  );

  return Array.from(new Map(projects.map((item) => [item.name, item])).values()).slice(0, 4);
}

function keywordWeight(keyword: string) {
  if (keyword.length >= 8 || keyword.includes(" ")) {
    return 2;
  }

  return 1;
}

function isCloseScore(productScore: number, topScore: number) {
  return topScore - productScore <= Math.max(2, topScore * 0.2);
}

function calculateConfidence(primaryScore: number, totalScore: number) {
  if (totalScore <= 0) {
    return 0.52;
  }

  const ratio = primaryScore / totalScore;
  return Number(Math.min(0.95, Math.max(0.55, ratio)).toFixed(2));
}

function getRoleConfig(role: ApiRole) {
  return roleConfigs.find((config) => config.role === role) ?? roleConfigs[0];
}

function buildSummary(primaryLabel: string, secondaryLabels: string[]) {
  if (secondaryLabels.length > 0) {
    return `这个 JD 更偏 ${primaryLabel}，同时包含 ${secondaryLabels.join("、")} 能力要求。`;
  }

  return `这个 JD 更偏 ${primaryLabel}，建议围绕该方向强化项目表达。`;
}

function buildHighlights(
  primary: RoleScore,
  secondaryRoles: ApiRole[],
  scores: RoleScore[],
) {
  const secondaryMatches = secondaryRoles.flatMap((role) => {
    const score = scores.find((item) => item.role === role);
    return score?.matches ?? [];
  });
  const highlights = [...primary.matches, ...secondaryMatches];

  return Array.from(new Set(highlights)).slice(0, 6);
}

function buildStrategyFallback(analysis: {
  primaryRole: ApiRole;
  confidence: number;
  roleLabel: string;
  requiredAbilities: string[];
  preferredAbilities: string[];
  recommendedProjects: ProjectRecommendation[];
  weakenedProjects: ProjectRecommendation[];
  riskWarnings: string[];
}) {
  const projectPriority = analysis.recommendedProjects.map(
    (project) => project.projectName ?? project.name,
  );
  const evidenceMatrix: EvidenceMatrixItem[] = analysis.requiredAbilities
    .slice(0, 5)
    .map((ability, index) => ({
      jdRequirement: ability,
      matchedProjects: projectPriority.slice(0, index === 0 ? 2 : 1),
      matchLevel: index <= 1 ? "strong" : "medium",
      evidence:
        index <= 1
          ? "可从推荐项目中提取对应能力证据。"
          : "可部分对应到现有项目表达，建议人工确认证据强度。",
      rewriteFocus: `围绕“${ability}”补充业务场景、AI 介入环节和验证方式。`,
      riskNote:
        index <= 1 ? "" : "规则分析只能粗略判断，避免把弱相关经历写成强结果。",
    }));

  return {
    screeningProfile: {
      whoTheyWant: buildFallbackWhoTheyWant(analysis.primaryRole),
      mustProve: analysis.requiredAbilities,
      niceToHave: analysis.preferredAbilities,
      avoidPositioningAs: [
        "算法工程师",
        "纯数据分析师",
        "只会堆 AI 关键词的工具开发者",
      ],
      hiddenRequirements: [
        "需要体现产品意识，而不仅是技术兴趣。",
        "需要证明能把 AI 能力放进真实业务场景。",
      ],
    },
    abilityMap: {
      hardSkills: inferHardSkills(analysis.requiredAbilities),
      productSkills: analysis.requiredAbilities.filter((item) =>
        /产品|需求|用户|PRD|原型|方案/.test(item),
      ),
      businessSkills: analysis.requiredAbilities.filter((item) =>
        /业务|场景|指标|流程/.test(item),
      ),
      aiSkills: [...analysis.preferredAbilities, ...analysis.requiredAbilities].filter(
        (item) => /AI|LLM|Agent|Prompt|模型|大模型/.test(item),
      ),
      collaborationSkills: analysis.requiredAbilities.filter((item) =>
        /协作|推进|沟通|跨团队/.test(item),
      ),
      evaluationSkills: [...analysis.requiredAbilities, ...analysis.preferredAbilities].filter(
        (item) => /评估|验证|效果|Badcase|质量|指标/.test(item),
      ),
      riskAreas: analysis.riskWarnings,
    },
    evidenceMatrix,
    resumeThesis: {
      oneSentence: buildFallbackThesis(analysis.primaryRole),
      positioning: `${analysis.roleLabel}方向候选人`,
      openingFocus: analysis.requiredAbilities.slice(0, 3),
      projectPriority,
      skillPriority: [...analysis.requiredAbilities, ...analysis.preferredAbilities].slice(0, 5),
    },
    coverageCheck: {
      overallScore: Math.round(analysis.confidence * 100),
      coveredRequirements: analysis.requiredAbilities.slice(0, 3),
      partiallyCoveredRequirements: analysis.requiredAbilities.slice(3, 6),
      missingRequirements: [],
      overPackagingRisks: analysis.riskWarnings,
      suggestedManualReview: [
        "请人工确认推荐项目证据是否足以支撑 JD 的核心要求。",
        "对实习年限、商业化结果、模型训练等硬门槛不要硬包装。",
      ],
    },
  };
}

function buildFallbackWhoTheyWant(role: ApiRole) {
  if (role === "AI_AGENT_APPLICATION") {
    return "能把业务流程拆成 Agent Workflow，并关注工具调用、结构化输出和人工兜底的候选人。";
  }

  if (role === "LLM_APPLICATION_PRODUCT") {
    return "理解 LLM 应用落地、Prompt 设计、输出评估和业务可用性的候选人。";
  }

  if (role === "OTHER") {
    return "该岗位与当前三个 AI 求职方向匹配度有限，需要谨慎判断是否适合投递。";
  }

  return "懂 AI 产品、能把业务需求拆解为产品方案、AI 工作流和效果评估闭环的候选人。";
}

function buildFallbackThesis(role: ApiRole) {
  if (role === "AI_AGENT_APPLICATION") {
    return "突出候选人能将业务任务拆解为可执行、可复查、可人工兜底的 AI Agent 工作流。";
  }

  if (role === "LLM_APPLICATION_PRODUCT") {
    return "突出候选人能围绕真实业务场景设计 LLM 应用流程，并通过输出评估和 Badcase 分析提升可用性。";
  }

  if (role === "OTHER") {
    return "突出与岗位最接近的项目证据，同时明确避免超出原始经历的包装。";
  }

  return "突出候选人能将模糊业务需求拆解为 AI 产品流程，并通过原型、Prompt、数据分析和评估指标验证可用性。";
}

function inferHardSkills(abilities: string[]) {
  return abilities.filter((item) =>
    /SQL|Python|数据|指标|RAG|Tool|API|DuckDB|Prompt|LLM|Agent/i.test(item),
  );
}
