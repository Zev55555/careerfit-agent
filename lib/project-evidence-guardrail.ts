import type { JDAnalysisResult } from "@/lib/role-classifier";
import type { ResumeBullet, ResumeData, ResumeProject } from "@/lib/resume-schema";
import {
  isB2BBusinessSystemJd,
  isAgentEngineeringJd,
  isContentAiProductJd,
  isProductDataJd,
} from "@/lib/strong-evidence-patterns";

type EnsureProjectEvidenceRewriteInput = {
  resume: ResumeData;
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  selectedRole: string;
};

type EnsureProjectEvidenceRewriteResult = {
  resume: ResumeData;
  actions: string[];
};

type EvidenceMode = "agent" | "product" | "content" | null;
type ProjectBridgeRole = "primary" | "secondary" | "supporting";
type BridgeRiskLevel = "low" | "medium" | "high";

type EnsureProjectBridgeBulletsInput = {
  resume: ResumeData;
  masterResume?: ResumeData;
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  selectedRole: string;
};

type BridgeValidationResult = {
  pass: boolean;
  reason: string;
  riskLevel: BridgeRiskLevel;
};

const sovaAgentBullets: ResumeBullet[] = [
  {
    id: "sova-agent-metric-spec",
    text: "任务拆解：设计自然语言问题到结构化 Metric Spec 的解析流程，将用户输入拆解为指标口径、字段映射、时间范围和拆解维度等可执行参数。",
    tags: ["agent-workflow", "metric-spec"],
  },
  {
    id: "sova-agent-duckdb-tool",
    text: "工具执行：基于 DuckDB 构建本地数据计算模块，支持按照 Metric Spec 执行指标计算、异动拆解和结果复查，区分 LLM 判断与确定性计算边界。",
    tags: ["duckdb", "structured-output"],
  },
  {
    id: "sova-agent-stability",
    text: "稳定性验证：设计规则兜底与异常案例回归测试流程，记录 LLM 字段误判、SQL 不稳定和输出偏差，降低模型幻觉对主流程的影响。",
    tags: ["badcase", "stability"],
  },
];

const sovaProductBullets: ResumeBullet[] = [
  {
    id: "sova-product-scenario",
    text: "产品场景：面向业务团队“指标下跌但原因不明”的场景，设计 AI 指标异动分析 Agent，将模糊问题拆解为指标澄清、字段识别、指标计算、异动拆解、证据链生成和报告输出流程。",
    tags: ["product-scenario", "ai-workflow"],
  },
  {
    id: "sova-product-step-flow",
    text: "流程设计：梳理用户输入业务问题后的核心路径，设计 Step 1-10 分步式分析流程，覆盖指标口径确认、对比周期选择、拆解维度选择、数据上传和报告生成等关键节点。",
    tags: ["product-flow", "prd"],
  },
  {
    id: "sova-product-metric-spec",
    text: "产品机制：将自然语言业务问题转化为结构化 Metric Spec，明确指标公式、分子 / 分母字段、时间字段、拆解维度和辅助指标，减少 LLM 自由生成 SQL 带来的不稳定输出。",
    tags: ["metric-spec", "prompt"],
  },
  {
    id: "sova-product-ai-interaction",
    text: "交互验证：设计引导式 AI 对话与结构化输入流程，降低用户直接写 SQL 或自行设计分析路径的门槛，并通过规则兜底、输出检查和结果复查提升模型输出稳定性。",
    tags: ["ai-interaction", "stability"],
  },
];

const sovaContentBullets: ResumeBullet[] = [
  {
    id: "sova-content-scenario",
    text: "产品场景：面向业务团队“指标下跌但原因不明”的场景，设计 AI 指标异动分析 Agent，将模糊问题拆解为指标澄清、字段识别、指标计算、异动拆解、证据链生成和报告输出流程。",
    tags: ["ai-native", "product-scenario"],
  },
  {
    id: "sova-content-intent",
    text: "意图理解：设计引导式 AI 对话和结构化输入流程，将用户问题拆解为指标口径、字段映射、时间范围、拆解维度和分析路径，提升 AI 对用户意图与关键信息的理解能力。",
    tags: ["user-intent", "structured-input"],
  },
  {
    id: "sova-content-metric-spec",
    text: "Prompt 机制：将自然语言业务问题转化为结构化 Metric Spec，明确指标公式、分子 / 分母字段、时间字段、拆解维度和辅助指标，减少 LLM 自由生成 SQL 带来的不稳定输出。",
    tags: ["prompt-tuning", "metric-spec"],
  },
  {
    id: "sova-content-quality-eval",
    text: "输出评估：设计 AI 输出质量评估框架，从信息完整性、解释清晰度、证据链、异常风险和业务可用性等维度评估模型生成结果。",
    tags: ["quality-evaluation", "ai-native"],
  },
  {
    id: "sova-content-prompt-review",
    text: "测试验证：基于物流、SaaS、客服、游戏、营销等场景构造测试案例，记录字段误判、场景泛化、Prompt 偏差和输出稳定性问题，沉淀可复用的 Prompt 调优与结果评估方法。",
    tags: ["prompt-tuning", "badcase"],
  },
];

export function ensureProjectEvidenceRewrite({
  resume,
  jdText,
  jdAnalysis,
  selectedRole,
}: EnsureProjectEvidenceRewriteInput): EnsureProjectEvidenceRewriteResult {
  return { resume, actions: [] };

  const mode = getEvidenceMode({ jdText, jdAnalysis, selectedRole });

  if (!mode) {
    return { resume, actions: [] };
  }

  const sovaProject =
    resume.projects.find((project) => isSovaProject(project.name)) ??
    resume.projects[0];

  if (!sovaProject || hasCompleteSovaEvidence(sovaProject, mode)) {
    return { resume, actions: [] };
  }

  const bullets = getSovaBullets(mode);
  const action =
    mode === "agent"
      ? "已将 SOVA AI 作为 Agent / 大模型应用主项目证据，补齐 Metric Spec、DuckDB 工具执行、badcase / 输出稳定性验证 3 条岗位视角 bullet。"
      : mode === "content"
        ? "已将 SOVA AI 作为 AI Native / 内容产品主项目证据，补齐产品场景、用户意图理解、Prompt / Metric Spec、输出质量评估和 badcase 验证 5 条岗位视角 bullet。"
        : "已将 SOVA AI 作为 AI 产品主项目证据，补齐用户场景、AI 产品流程、Metric Spec 产品机制与输出稳定性 4 条岗位视角 bullet。";

  return {
    resume: {
      ...resume,
      projects: orderProjectsForPrimaryDepth(
        resume.projects.map((project) =>
          project.id === sovaProject.id
            ? {
                ...project,
                bullets,
              }
            : project,
        ),
        mode,
      ),
    },
    actions: [action],
  };
}

export function ensureProjectBridgeBullets({
  resume,
  masterResume,
  jdText,
  jdAnalysis,
  selectedRole,
}: EnsureProjectBridgeBulletsInput): EnsureProjectEvidenceRewriteResult {
  const mode = getEvidenceMode({ jdText, jdAnalysis, selectedRole });

  if (!mode) {
    return { resume, actions: [] };
  }

  const bridgeProjectIds = selectBridgeProjectIds({
    projects: resume.projects,
    masterResume,
    jdText,
    jdAnalysis,
    mode,
  });
  const actions: string[] = [];
  const projects = resume.projects.map((project) => {
    const masterProject = findMatchingProject(masterResume, project);
    const bridgeRank = bridgeProjectIds.indexOf(project.id);

    if (bridgeRank === -1) {
      return ensureBulletTitlesForProject(project);
    }

    const role: ProjectBridgeRole = bridgeRank === 0 ? "primary" : "secondary";
    const projectWithMasterEvidence = restoreMasterBulletsForBridge(
      project,
      masterProject,
    );
    const bridge = buildProjectBridgeBullet({
      project: projectWithMasterEvidence,
      masterProject,
      jdText,
      jdAnalysis,
      mode,
      role,
    });

    if (!bridge) {
      return ensureBulletTitlesForProject(project);
    }

    const validation = validateProjectBridgeBullet({
      bridgeBullet: bridge.text,
      project: projectWithMasterEvidence,
      masterProject,
      jdText,
      jdAnalysis,
    });

    if (!validation.pass) {
      return ensureBulletTitlesForProject(project);
    }

    const existingBridgeIndex =
      projectWithMasterEvidence.bullets.findIndex(isBridgeBullet);
    const nextBullets =
      existingBridgeIndex >= 0
        ? projectWithMasterEvidence.bullets.map((bullet, bulletIndex) =>
            bulletIndex === existingBridgeIndex ? bridge : bullet,
          )
        : appendBridgeBullet(projectWithMasterEvidence.bullets, bridge);

    actions.push(
      `${project.name}：已补充项目策略推演表达，将项目事实与当前岗位核心职责建立直接证据关系。`,
    );

    return ensureBulletTitlesForProject({
      ...projectWithMasterEvidence,
      bullets: nextBullets,
    });
  });

  if (actions.length === 0) {
    return { resume, actions: [] };
  }

  return {
    resume: {
      ...resume,
      projects: projects.map(ensureBulletTitlesForProject),
    },
    actions: [
      "已为核心项目补充策略推演表达，使项目经历与当前岗位职责形成直接证据关系。",
      ...actions,
    ],
  };
}

function selectBridgeProjectIds({
  projects,
  masterResume,
  jdText,
  jdAnalysis,
  mode,
}: {
  projects: ResumeProject[];
  masterResume?: ResumeData;
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  mode: EvidenceMode;
}) {
  const scoredProjects = projects
    .map((project, index) => {
      const masterProject = findMatchingProject(masterResume, project);
      return {
        id: project.id,
        index,
        score: scoreProjectForBridge({
          project,
          masterProject,
          jdText,
          jdAnalysis,
          mode,
        }),
      };
    })
    .filter((item) => item.score >= 28)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scoredProjects.slice(0, 2).map((item) => item.id);
}

function scoreProjectForBridge({
  project,
  masterProject,
  jdText,
  jdAnalysis,
  mode,
}: {
  project: ResumeProject;
  masterProject?: ResumeProject;
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  mode: EvidenceMode;
}) {
  const context = buildContextText(jdText, jdAnalysis);
  const projectText = buildProjectText(project, masterProject);
  const normalizedName = project.name.toLowerCase();
  let score = 0;

  for (const item of jdAnalysis.evidenceMatrix ?? []) {
    const matchWeight =
      item.matchLevel === "strong" ? 42 : item.matchLevel === "medium" ? 28 : 0;
    if (
      matchWeight > 0 &&
      item.matchedProjects.some((name) =>
        namesOverlap(normalizedName, name.toLowerCase()),
      )
    ) {
      score += matchWeight;
    }
  }

  const priorityIndex = jdAnalysis.resumeThesis?.projectPriority?.findIndex((name) =>
    namesOverlap(normalizedName, name.toLowerCase()),
  );
  if (priorityIndex !== undefined && priorityIndex >= 0) {
    score += Math.max(12, 32 - priorityIndex * 6);
  }

  const jdTerms = getJdScenarioTerms(jdText, jdAnalysis);
  score += jdTerms.filter((term) => includesTerm(projectText, term)).length * 5;

  if (isSovaProject(project.name)) {
    score += mode === "agent" || mode === "product" || mode === "content" ? 30 : 8;
  }

  if (isTransitProject(project.name)) {
    score += isProductDataJd(jdText, jdAnalysis) ? 30 : 4;
  }

  if (isPortfolioProject(project.name)) {
    score += shouldBridgePortfolio(jdText, jdAnalysis, project, masterProject)
      ? 24
      : 6;
  }

  if (isResumeAgentProject(project.name)) {
    score += hasAny(context, ["简历", "求职", "岗位匹配", "JD", "ATS", "resume"])
      ? 34
      : 14;
  }

  if (isDeprecatedLowPriorityProject(project.name)) {
    score -= 40;
  }

  return score;
}

function restoreMasterBulletsForBridge(
  project: ResumeProject,
  masterProject?: ResumeProject,
): ResumeProject {
  if (!masterProject?.bullets.length) {
    return project;
  }

  const existingBridge = project.bullets.find(isBridgeBullet);
  const bridgeBullets = existingBridge ? [existingBridge] : [];

  return {
    ...project,
    context: project.context || masterProject.context,
    bullets: [...masterProject.bullets, ...bridgeBullets],
  };
}

function ensureBulletTitlesForProject(project: ResumeProject): ResumeProject {
  return {
    ...project,
    bullets: project.bullets.map((bullet) => {
      const cleanText = sanitizeBulletMetaLanguage(bullet.text);

      if (hasBulletTitle(cleanText)) {
        return {
          ...bullet,
          text: cleanText,
        };
      }

      return {
        ...bullet,
        text: `${inferBulletTitle(project, { ...bullet, text: cleanText })}：${cleanText}`,
      };
    }),
  };
}

function hasBulletTitle(text: string) {
  return /^([^:：]{2,18}[:：])(.+)$/.test(text.trim());
}

function inferBulletTitle(project: ResumeProject, bullet: ResumeBullet) {
  const text = bullet.text;

  if (bullet.tags?.includes("jd-bridge") || /^围绕.+场景/.test(text)) {
    return "策略推演";
  }

  if (isSovaProject(project.name)) {
    if (hasAny(text, ["产品场景", "业务团队", "指标下跌", "用户场景"])) return "产品场景";
    if (hasAny(text, ["Step 1-10", "流程", "路径", "节点"])) return "流程设计";
    if (hasAny(text, ["Metric Spec", "Prompt", "分子", "分母"])) return "Prompt 机制";
    if (hasAny(text, ["输出质量", "内容评估", "信息完整性", "解释清晰度"])) return "输出评估";
    if (hasAny(text, ["测试案例", "badcase", "字段误判", "稳定性"])) return "测试验证";
    if (hasAny(text, ["结构化输入", "用户意图", "引导式"])) return "意图理解";
  }

  if (isTransitProject(project.name)) {
    if (hasAny(text, ["晚间出行体验", "服务供给", "问题", "17:00-22:00"])) return "问题定义";
    if (hasAny(text, ["Evening Service Gap Score", "GTFS", "SQL", "DuckDB", "Pandas"])) return "指标设计";
    if (hasAny(text, ["排班", "末班车", "晚间班次", "站点覆盖", "业务建议"])) return "业务建议";
  }

  if (isPortfolioProject(project.name)) {
    if (hasAny(text, ["JD Match Console", "岗位匹配", "技能标签"])) return "信息架构";
    if (hasAny(text, ["Figma", "作品集", "信息架构", "项目展示"])) return "项目展示";
  }

  return "项目证据";
}

function sanitizeBulletMetaLanguage(text: string) {
  return text
    .replace(/^岗位桥接\s*[:：]\s*/u, "策略推演：")
    .replace(/^背景对齐\s*[:：]\s*/u, "项目背景：")
    .replace(/^JD\s*匹配\s*[:：]\s*/iu, "信息关联：")
    .replace(/^匹配设计\s*[:：]\s*/u, "信息架构：")
    .replace(/^技能映射\s*[:：]\s*/u, "能力呈现：")
    .replace(/岗位桥接/u, "策略推演")
    .replace(/背景对齐/u, "项目背景")
    .replace(/JD\s*匹配/iu, "信息关联")
    .replace(/匹配设计/u, "信息架构")
    .replace(/技能映射/u, "能力呈现");
}

function getEvidenceMode({
  jdText,
  jdAnalysis,
  selectedRole,
}: {
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  selectedRole: string;
}): EvidenceMode {
  if (selectedRole === "AI_AGENT_APPLICATION") {
    return "agent";
  }

  const agentEngineering = isAgentEngineeringJd(jdText, jdAnalysis);
  const productData = isProductDataJd(jdText, jdAnalysis, selectedRole);
  const b2bBusinessSystem = isB2BBusinessSystemJd(jdText, jdAnalysis);
  const contentAiProduct = isContentAiProductJd(jdText, jdAnalysis);
  
  if (
    selectedRole === "LLM_APPLICATION_PRODUCT" &&
    agentEngineering &&
    !productData
  ) {
    return "agent";
  }

  if (contentAiProduct && !b2bBusinessSystem) {
    return "content";
  }

  if (selectedRole === "AI_PRODUCT_MANAGER") {
    return "product";
  }

  if (productData) {
    return "product";
  }

  if (agentEngineering) {
    return "agent";
  }

  return null;
}

function buildProjectBridgeBullet({
  project,
  masterProject,
  jdText,
  jdAnalysis,
  mode,
  role,
}: {
  project: ResumeProject;
  masterProject?: ResumeProject;
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  mode: EvidenceMode;
  role: ProjectBridgeRole;
}): ResumeBullet | null {
  if (isSovaProject(project.name)) {
    return createBridgeBullet(
      "sova",
      getSovaBridgeText(mode),
      role,
      ["jd-bridge", "sova", mode ?? "general"],
    );
  }

  if (isTransitProject(project.name)) {
    if (mode !== "product" && mode !== "content" && !isProductDataJd(jdText, jdAnalysis)) {
      return null;
    }

    return createBridgeBullet(
      "transit",
      getTransitBridgeText(mode),
      role,
      ["jd-bridge", "transit", "product-data"],
    );
  }

  if (isPortfolioProject(project.name)) {
    return createBridgeBullet(
      "portfolio",
      getPortfolioBridgeText(jdText, jdAnalysis, project, masterProject),
      role,
      ["jd-bridge", "portfolio", "product-display"],
    );
  }

  if (isResumeAgentProject(project.name)) {
    return createBridgeBullet(
      "resume-agent",
      getResumeAgentBridgeText(mode),
      role,
      ["jd-bridge", "resume-agent", mode ?? "general"],
    );
  }

  return buildGenericProjectBridge({
    project,
    masterProject,
    jdText,
    jdAnalysis,
    role,
  });
}

export function validateProjectBridgeBullet({
  bridgeBullet,
  project,
  masterProject,
  jdText,
  jdAnalysis,
}: {
  bridgeBullet: string;
  project: ResumeProject;
  masterProject?: ResumeProject;
  jdText: string;
  jdAnalysis: JDAnalysisResult;
}): BridgeValidationResult {
  if (
    hasAny(bridgeBullet, highRiskBridgeTerms) ||
    /商业化上线|企业级落地|真实用户增长|DAU|MAU|模型训练|模型微调|正式跨团队主导|负责全生命周期|主导核心组件上线/i.test(
      bridgeBullet,
    )
  ) {
    return {
      pass: false,
      reason: "桥接 bullet 包含高风险虚构或过度包装表达。",
      riskLevel: "high",
    };
  }

  if (hasAny(bridgeBullet, aiTraceTerms)) {
    return {
      pass: false,
      reason: "桥接 bullet 包含 JD 解释性表达，容易显得像 AI 硬贴。",
      riskLevel: "high",
    };
  }

  const projectFacts = getProjectFactTerms(project, masterProject);
  const jdScenarioTerms = getJdScenarioTerms(jdText, jdAnalysis);
  const contextText = buildContextText(jdText, jdAnalysis);
  const hasProjectFact = projectFacts.some((term) => includesTerm(bridgeBullet, term));
  const hasJdScenario =
    jdScenarioTerms.some((term) => includesTerm(bridgeBullet, term)) ||
    sharedScenarioTerms.some(
      (term) => includesTerm(contextText, term) && includesTerm(bridgeBullet, term),
    ) ||
    (contextText.length > 0 &&
      sharedScenarioTerms.some((term) => includesTerm(bridgeBullet, term)));

  if (!hasProjectFact && hasJdScenario) {
    return {
      pass: false,
      reason: "桥接 bullet 只命中 JD 场景，缺少项目事实支撑。",
      riskLevel: "high",
    };
  }

  if (hasProjectFact && !hasJdScenario) {
    return {
      pass: false,
      reason: "桥接 bullet 只描述项目事实，没有连接当前 JD 场景。",
      riskLevel: "medium",
    };
  }

  if (!hasProjectFact || !hasJdScenario) {
    return {
      pass: false,
      reason: "桥接 bullet 未同时连接项目事实与 JD 场景。",
      riskLevel: "medium",
    };
  }

  return {
    pass: true,
    reason: "桥接 bullet 通过项目事实与 JD 场景校验。",
    riskLevel: "low",
  };
}

function hasCompleteSovaEvidence(project: ResumeProject, mode: EvidenceMode) {
  const text = project.bullets.map((bullet) => bullet.text).join("\n");

  if (project.bullets.length < getMinimumSovaBullets(mode)) {
    return false;
  }

  if (mode === "agent") {
    return (
      hasAny(text, ["Metric Spec", "结构化"]) &&
      hasAny(text, ["DuckDB", "Tool Calling", "工具"]) &&
      hasAny(text, ["badcase", "异常案例", "规则兜底", "输出稳定性"])
    );
  }

  if (mode === "content") {
    return (
      hasAny(text, ["输出质量", "内容评估", "信息完整性", "解释清晰度", "证据链"]) &&
      hasAny(text, ["用户意图", "结构化输入", "分析路径"]) &&
      hasAny(text, ["Prompt", "Metric Spec", "调优"]) &&
      hasAny(text, ["测试案例", "badcase", "输出稳定性", "结果评估"])
    );
  }

  return (
    hasAny(text, ["业务团队", "用户场景", "业务问题", "指标下跌"]) &&
    hasAny(text, ["Step 1-10", "分步式", "产品流程", "报告生成"]) &&
    hasAny(text, ["Metric Spec", "分子", "分母", "时间字段"]) &&
    hasAny(text, ["引导式", "结构化输入", "规则兜底", "输出稳定性", "结果复查"])
  );
}

function getMinimumSovaBullets(mode: EvidenceMode) {
  if (mode === "content" || mode === "product") {
    return 4;
  }

  return 3;
}

function getSovaBridgeText(mode: EvidenceMode) {
  if (mode === "agent") {
    return "围绕 Agent 输出稳定性与任务执行可靠性，基于多场景测试案例记录字段误判、SQL 不稳定和结果偏差问题，并通过规则兜底与异常案例回归测试提升主流程可复查性。";
  }

  if (mode === "content") {
    return "围绕内容筛选与 AI 输出质量评估场景，从信息完整性、解释清晰度、证据链、异常风险和业务可用性等维度整理评估规则，并结合多场景 badcase 记录沉淀 Prompt 调优思路。";
  }

  return "业务系统设计：基于 Metric Spec、结构化输入和规则兜底机制，将业务团队的模糊指标问题转化为可执行分析流程，并通过输出检查和结果复查验证方案稳定性。";
}

function getTransitBridgeText(mode: EvidenceMode) {
  if (mode === "content") {
    return "策略推演：将信息供给中的优先级排序逻辑迁移到校园班车调度场景，基于路线-站点-时间多维模型和 Evening Service Gap Score 量化高优先级供给缺口，支撑排班优化判断。";
  }

  return "产品决策：基于校园班车调度场景，将学生晚间出行体验拆解为时间、路线、站点和资源优先级，并通过 Evening Service Gap Score 将服务缺口转化为可排序的排班优化建议。";
}

function getResumeAgentBridgeText(mode: EvidenceMode) {
  if (mode === "agent") {
    return "围绕简历定制 Agent 的任务拆解与结果可复查场景，基于 JD 分析、结构化输出和规则兜底流程，将岗位策略转化为可验证的简历改写结果。";
  }

  if (mode === "content") {
    return "围绕 AI Native 内容生成与评估场景，基于 JD 策略、证据矩阵和质量检查流程，整理输出质量、事实一致性和用户可读性的评估规则。";
  }

  return "围绕数据驱动简历定制场景，基于 JD 分析、项目证据矩阵和一页内容预算流程，将岗位筛选点转化为可解释的项目改写策略。";
}

function getPortfolioBridgeText(
  jdText: string,
  jdAnalysis: JDAnalysisResult,
  project: ResumeProject,
  masterProject?: ResumeProject,
) {
  if (shouldBridgePortfolio(jdText, jdAnalysis, project, masterProject)) {
    return "信息架构：基于作品集信息架构与 Figma 原型展示，设计 JD Match Console 模块，将岗位描述、项目经历和技能标签进行关联，帮助访问者更快理解候选人的项目证据。";
  }

  return "项目展示：基于作品集信息架构和 JD Match Console，将 SOVA AI、UCSD Transit 等项目经历与技能标签进行关联，帮助访问者快速理解候选人的项目证据。";
}

function buildGenericProjectBridge({
  project,
  masterProject,
  jdText,
  jdAnalysis,
  role,
}: {
  project: ResumeProject;
  masterProject?: ResumeProject;
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  role: ProjectBridgeRole;
}) {
  const projectFacts = getProjectFactTerms(project, masterProject);

  if (projectFacts.length === 0) {
    return null;
  }

  const scenario = pickBridgeScenario(jdText, jdAnalysis);
  const factPhrase = projectFacts.slice(0, 3).join(" / ");
  const methodPhrase = pickBridgeMethod(projectFacts);

  return createBridgeBullet(
    normalizeBridgeIdPart(project.name),
    `围绕${scenario}，基于 ${factPhrase} 等项目事实，整理${methodPhrase}，用于支持岗位中的问题拆解、方案验证和结果复查。`,
    role,
    ["jd-bridge", "generic-project"],
  );
}

function pickBridgeScenario(jdText: string, jdAnalysis: JDAnalysisResult) {
  const context = buildContextText(jdText, jdAnalysis);

  if (hasAny(context, ["内容分发", "内容评估", "搜索推荐", "AI Native"])) {
    return "内容筛选与 AI 输出质量评估场景";
  }

  if (hasAny(context, ["Agent", "Tool Calling", "Workflow", "RAG"])) {
    return "Agent 工作流与任务执行可靠性场景";
  }

  if (hasAny(context, ["数据分析", "指标", "策略", "运营", "电商", "广告"])) {
    return "数据驱动策略判断场景";
  }

  if (hasAny(context, ["用户体验", "原型", "Figma", "C端", "产品设计"])) {
    return "用户体验与产品可用性验证场景";
  }

  return "AI 产品方案验证场景";
}

function pickBridgeMethod(projectFacts: string[]) {
  if (projectFacts.some((term) => hasAny(term, ["Figma", "原型", "信息架构"]))) {
    return "信息架构、原型展示和匹配路径";
  }

  if (projectFacts.some((term) => hasAny(term, ["SQL", "Pandas", "DuckDB", "指标"]))) {
    return "指标拆解、数据分析和可复查输出";
  }

  if (projectFacts.some((term) => hasAny(term, ["Prompt", "Metric Spec", "badcase"]))) {
    return "结构化输入、Prompt 调试和异常案例验证流程";
  }

  return "项目动作、关键证据和验证流程";
}

function getSovaBullets(mode: EvidenceMode) {
  if (mode === "agent") {
    return sovaAgentBullets;
  }

  if (mode === "content") {
    return sovaContentBullets;
  }

  return sovaProductBullets;
}

function createBridgeBullet(
  idPart: string,
  text: string,
  role: ProjectBridgeRole,
  tags: string[],
): ResumeBullet {
  return {
    id: `${idPart}-jd-bridge`,
    text,
    tags: [...tags, `bridge-${role}`],
    riskLevel: "low",
  };
}

function appendBridgeBullet(
  bullets: ResumeBullet[],
  bridge: ResumeBullet,
) {
  return [...bullets, bridge];
}

// Kept for quick rollback if bridge insertion needs replacement semantics again.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findWeakestBulletIndex(bullets: ResumeBullet[]) {
  const genericTerms = [
    "负责",
    "参与",
    "优化",
    "提升",
    "支持",
    "整理",
    "展示",
    "项目展示",
  ];
  let fallbackIndex = bullets.length - 1;
  let lowestScore = Number.POSITIVE_INFINITY;

  bullets.forEach((bullet, index) => {
    if (isBridgeBullet(bullet)) {
      return;
    }

    const score =
      bullet.text.length / 80 +
      (hasAny(bullet.text, genericTerms) ? -1 : 0) +
      (hasAny(bullet.text, [
        "Metric Spec",
        "Evening Service Gap Score",
        "DuckDB",
        "Pandas",
        "badcase",
        "Figma",
        "JD Match Console",
      ])
        ? 3
        : 0);

    if (score < lowestScore) {
      lowestScore = score;
      fallbackIndex = index;
    }
  });

  return fallbackIndex;
}

function isBridgeBullet(bullet: ResumeBullet) {
  return bullet.tags?.includes("jd-bridge") ?? false;
}

// Kept for quick rollback if bridge assignment returns to position-based semantics.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getProjectBridgeRole(
  project: ResumeProject,
  index: number,
  mode: EvidenceMode,
): ProjectBridgeRole {
  if (isSovaProject(project.name)) {
    return "primary";
  }

  if ((mode === "product" || mode === "content") && isTransitProject(project.name)) {
    return "secondary";
  }

  if (index === 0) {
    return "primary";
  }

  if (index === 1) {
    return "secondary";
  }

  return "supporting";
}

function findMatchingProject(masterResume: ResumeData | undefined, project: ResumeProject) {
  return masterResume?.projects.find((item) =>
    namesOverlap(item.name.toLowerCase(), project.name.toLowerCase()),
  );
}

function shouldBridgePortfolio(
  jdText: string,
  jdAnalysis: JDAnalysisResult,
  project: ResumeProject,
  masterProject?: ResumeProject,
) {
  const text = buildContextText(jdText, jdAnalysis);
  const projectText = buildProjectText(project, masterProject);

  return (
    hasAny(text, ["Figma", "原型", "作品集", "产品展示", "信息架构", "用户体验"]) &&
    hasAny(projectText, ["Figma", "JD Match Console", "Portfolio", "作品集", "信息架构"])
  );
}

function getProjectFactTerms(project: ResumeProject, masterProject?: ResumeProject) {
  const projectText = buildProjectText(project, masterProject);

  if (isSovaProject(project.name)) {
    return [
      "Metric Spec",
      "Prompt",
      "DuckDB",
      "badcase",
      "输出稳定性",
      "规则兜底",
      "测试案例",
      "结构化输入",
      "字段误判",
      "证据链",
      "结果复查",
    ].filter((term) => includesTerm(projectText, term));
  }

  if (isTransitProject(project.name)) {
    return [
      "SQL",
      "DuckDB",
      "Pandas",
      "GTFS",
      "热力图",
      "20:00",
      "21:00-22:00",
      "Evening Service Gap Score",
      "排班优化建议",
      "服务缺口",
      "晚间出行体验",
    ].filter((term) => includesTerm(projectText, term));
  }

  if (isPortfolioProject(project.name)) {
    return [
      "Figma",
      "JD Match Console",
      "Portfolio",
      "作品集",
      "信息架构",
      "产品展示",
      "原型",
      "交互",
    ].filter((term) => includesTerm(projectText, term));
  }

  if (isResumeAgentProject(project.name)) {
    return [
      "JD",
      "ATS",
      "qualityReview",
      "ResumeData",
      "证据矩阵",
      "内容预算",
      "规则兜底",
      "结构化输出",
    ].filter((term) => includesTerm(projectText, term));
  }

  return extractReusableProjectTerms(projectText);
}

function getJdScenarioTerms(jdText: string, jdAnalysis: JDAnalysisResult) {
  const context = buildContextText(jdText, jdAnalysis);
  const terms = [
    "Agent",
    "Workflow",
    "Tool Calling",
    "RAG",
    "Prompt",
    "输出稳定性",
    "badcase",
    "规则兜底",
    "结构化输出",
    "AI 产品",
    "用户场景",
    "需求拆解",
    "产品可用性",
    "指标口径",
    "内容分发",
    "内容筛选",
    "内容评估",
    "搜索推荐",
    "AI Native",
    "信源分级",
    "语义行为",
    "个性化策略",
    "Figma",
    "原型",
    "作品集",
    "岗位匹配",
    "数据驱动",
    "产品优化",
    "数据分析",
    "策略判断",
    "业务建议",
    "效果评估",
    "用户体验",
    "交互流程",
    "可用性验证",
  ];

  const matched = terms.filter((term) => includesTerm(context, term));
  return matched.length > 0 ? matched : ["产品", "AI", "数据", "评估"];
}

function extractReusableProjectTerms(text: string) {
  return [
    "Python",
    "SQL",
    "Pandas",
    "DuckDB",
    "Figma",
    "Prompt",
    "数据分析",
    "原型",
    "测试",
    "指标",
    "流程",
    "用户",
  ].filter((term) => includesTerm(text, term));
}

function normalizeBridgeIdPart(projectName: string) {
  const normalized = projectName
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "project";
}

function buildProjectText(project: ResumeProject, masterProject?: ResumeProject) {
  return [
    project.name,
    project.context,
    ...project.bullets.map((bullet) => bullet.text),
    masterProject?.name,
    masterProject?.context,
    ...(masterProject?.bullets.map((bullet) => bullet.text) ?? []),
  ].join("\n");
}

function buildContextText(jdText: string, jdAnalysis: JDAnalysisResult) {
  return [
    jdText,
    jdAnalysis.roleLabel,
    jdAnalysis.summary,
    jdAnalysis.detectedRole?.label ?? "",
    jdAnalysis.detectedRole?.category ?? "",
    jdAnalysis.resumeThesis?.oneSentence ?? "",
    ...(jdAnalysis.jdHighlights ?? []),
    ...(jdAnalysis.requiredAbilities ?? []),
    ...(jdAnalysis.preferredAbilities ?? []),
    ...(jdAnalysis.abilityMap?.productSkills ?? []),
    ...(jdAnalysis.abilityMap?.aiSkills ?? []),
    ...(jdAnalysis.abilityMap?.businessSkills ?? []),
    ...(jdAnalysis.abilityMap?.evaluationSkills ?? []),
  ].join("\n");
}

function isResumeAgentProject(projectName: string) {
  const normalized = projectName.toLowerCase();
  return (
    normalized.includes("resume agent") ||
    normalized.includes("jd tailor") ||
    normalized.includes("careerfit") ||
    normalized.includes("career fit") ||
    normalized.includes("job match") ||
    normalized.includes("简历") ||
    normalized.includes("resume")
  );
}

function isSovaProject(projectName: string) {
  return projectName.toLowerCase().includes("sova");
}

function isDeprecatedLowPriorityProject(projectName: string) {
  const normalized = projectName.toLowerCase();
  return (
    normalized.includes("ai exposure") ||
    normalized.includes("insightflow") ||
    normalized.includes("就业前景")
  );
}

function orderProjectsForPrimaryDepth(projects: ResumeProject[], mode: EvidenceMode) {
  if (mode !== "product" && mode !== "content") {
    return projects;
  }

  return [...projects].sort(
    (a, b) => getProjectDepthOrder(a.name) - getProjectDepthOrder(b.name),
  );
}

function getProjectDepthOrder(projectName: string) {
  if (isSovaProject(projectName)) {
    return 0;
  }

  if (isTransitProject(projectName)) {
    return 1;
  }

  if (isPortfolioProject(projectName)) {
    return 2;
  }

  return 3;
}

function isTransitProject(projectName: string) {
  const normalized = projectName.toLowerCase();
  return normalized.includes("transit") || normalized.includes("triton");
}

function isPortfolioProject(projectName: string) {
  const normalized = projectName.toLowerCase();
  return normalized.includes("portfolio") || normalized.includes("jd match");
}

function namesOverlap(a: string, b: string) {
  return a.includes(b) || b.includes(a);
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.toLowerCase().includes(term.toLowerCase()));
}

function includesTerm(text: string, term: string) {
  return text.toLowerCase().includes(term.toLowerCase());
}

const aiTraceTerms = [
  "对应 JD",
  "对应JD",
  "满足岗位要求",
  "覆盖 JD",
  "覆盖JD",
  "贴合岗位",
  "符合岗位",
];

const highRiskBridgeTerms = [
  "商业化上线",
  "企业级落地",
  "真实用户增长",
  "DAU",
  "MAU",
  "模型训练",
  "模型微调",
  "正式跨团队主导",
  "负责全生命周期",
  "主导核心组件上线",
];

const sharedScenarioTerms = [
  "Agent",
  "Prompt",
  "内容分发",
  "内容评估",
  "AI Native",
  "信源分级",
  "语义行为",
  "个性化策略",
  "Figma",
  "原型",
  "数据驱动",
  "产品优化",
  "数据分析",
  "用户体验",
  "业务建议",
];
