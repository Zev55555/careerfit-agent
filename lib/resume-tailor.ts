import type { JDAnalysisResult, ApiRole } from "@/lib/role-classifier";
import type { AtsGuidance } from "@/lib/ats-keyword-review";
import {
  type CustomRoleInput,
  getCustomRoleLabel,
  normalizeCustomRoleInput,
} from "@/lib/custom-role";
import type {
  ResumeBullet,
  ResumeData,
  ResumeProject,
  TailorChangeLog,
} from "@/lib/resume-schema";
import { checkResumeTruthfulness } from "@/lib/truth-checker";

export type TailorResumeMockInput = {
  resume: ResumeData;
  selectedRole: ApiRole;
  customRoleInput?: Partial<CustomRoleInput>;
  analysisResult: JDAnalysisResult;
  jdText: string;
  atsGuidance?: AtsGuidance;
};

export type TailorResumeMockResult = {
  tailoredResume: ResumeData;
  changeLog: TailorChangeLog;
};

type RoleTailorConfig = {
  summary: string;
  skills: ResumeData["skills"];
  order: string[];
  strengthened: Record<string, { reason: string; bullets: string[] }>;
  weakened: Record<string, { reason: string; changes: string[] }>;
  summaryChanges: string[];
  skillChanges: string[];
};

type TailorableApiRole = Exclude<ApiRole, "OTHER" | "CUSTOM_ROLE" | "AUTO_DETECT_ROLE">;

const roleConfigs: Record<TailorableApiRole, RoleTailorConfig> = {
  AI_PRODUCT_MANAGER: {
    summary:
      "AI 产品经理方向候选人，擅长把模糊业务问题拆成用户场景、指标口径、AI 工作流和可验证产出。项目经验集中在指标异动分析 Agent、数据分析流程助手和 JD 匹配工具，强调需求分析、产品方案、模型能力边界、人工兜底、评估指标与结果验证。",
    skills: [
      {
        label: "AI 产品",
        items: [
          "AI 产品设计",
          "用户场景拆解",
          "需求分析",
          "产品方案",
          "AI 工作流",
          "大模型能力边界",
          "评估指标",
          "人工兜底",
        ],
      },
      {
        label: "LLM & Agent",
        items: [
          "Prompt Engineering",
          "结构化输出",
          "Agent Workflow",
          "模型效果评估",
          "Badcase 复盘",
        ],
      },
      {
        label: "Analytics",
        items: [
          "业务问题拆解",
          "Metric Spec",
          "DuckDB",
          "Top Movers",
          "证据链报告",
        ],
      },
    ],
    order: ["sova", "insightflow", "portfolio", "transit", "exposure"],
    strengthened: {
      sova: {
        reason: "SOVA AI 最能体现 AI 产品从业务问题到可复查结果的完整链路。",
        bullets: [
          "围绕指标异动这一业务痛点，设计从问题澄清、字段识别、Metric Spec 到报告输出的 AI 产品流程。",
          "将 AI 介入环节限定在口径澄清、分析路径建议和结果解释，保留 DuckDB 指标计算作为确定性步骤。",
          "设计 Top Movers 与证据链报告，让用户能复查字段选择、计算过程和异常归因依据。",
        ],
      },
      insightflow: {
        reason: "InsightFlow AI 能支撑需求分析、业务问题拆解和分析路径设计能力。",
        bullets: [
          "把复杂业务问题拆成目标、指标、维度和分析假设，形成可复用的 Prompt 框架。",
          "设计面向业务用户的分析路径输出，让用户先确认问题口径，再进入后续数据分析。",
          "强调人工确认假设和结果解释，避免把 LLM 输出包装成不可复查的最终结论。",
        ],
      },
      portfolio: {
        reason: "Zev Portfolio / JD Match Console 能体现面向求职场景的产品化表达。",
        bullets: [
          "将项目展示组织为问题、方案、AI 或数据介入环节和证据，提升读者判断项目相关性的效率。",
          "设计 JD Match Console 概念，用岗位要求反向匹配项目证据，约束简历改写不超出已有素材。",
        ],
      },
    },
    weakened: {
      exposure: {
        reason: "AI Exposure 更偏研究分析，对 AI 产品经理 JD 的直接匹配弱于 SOVA 和 InsightFlow。",
        changes: ["压缩为研究框架和影响分析能力，不作为主打项目。"],
      },
    },
    summaryChanges: [
      "把 summary 从通用 AI builder 调整为 AI 产品经理方向。",
      "强调业务问题、产品方案、AI 工作流、能力边界和结果验证。",
    ],
    skillChanges: [
      "新增 AI 产品设计、用户场景拆解、需求分析、产品方案。",
      "强化评估指标、人工兜底和大模型能力边界。",
    ],
  },
  AI_AGENT_APPLICATION: {
    summary:
      "AI Agent 应用方向候选人，关注把业务流程拆成可执行、可复查、可人工兜底的 Agent Workflow。项目经验覆盖指标异动分析 Agent、分析流程助手和 JD Match Console，强调任务拆解、Tool Calling、结构化输出、Human-in-the-loop 与业务流程自动化。",
    skills: [
      {
        label: "Agent Apps",
        items: [
          "Agent Workflow",
          "任务拆解",
          "Tool Calling",
          "函数调用理解",
          "结构化输出",
          "Human-in-the-loop",
          "结果可复查",
        ],
      },
      {
        label: "Workflow & Data",
        items: [
          "业务流程自动化",
          "Metric Spec",
          "DuckDB 指标计算",
          "Top Movers",
          "证据链生成",
        ],
      },
      {
        label: "LLM Product",
        items: [
          "Prompt 框架",
          "知识库检索理解",
          "RAG 理解",
          "模型输出评估",
        ],
      },
    ],
    order: ["sova", "insightflow", "portfolio", "transit", "exposure"],
    strengthened: {
      sova: {
        reason: "SOVA AI 的链路最接近 Agent 应用岗位要求。",
        bullets: [
          "将指标异动分析拆成指标澄清、字段识别、Metric Spec、DuckDB 计算、Top Movers 和报告输出等步骤。",
          "把 DuckDB 指标计算作为工具调用式能力节点，区分 AI 判断和确定性计算，提升结果可复查性。",
          "设计证据链生成与报告输出，让用户能追踪每一步输入、计算和结论来源。",
        ],
      },
      insightflow: {
        reason: "InsightFlow AI 能补充任务拆解和结构化输出能力。",
        bullets: [
          "用 Prompt 框架把业务问题拆成目标、指标、约束和分析路径，形成可执行的多步骤流程。",
          "输出结构化分析计划，并保留人工确认假设和调整方向的环节。",
        ],
      },
      portfolio: {
        reason: "JD Match Console 可以表达轻量 Agent 工作流和结果复查意识。",
        bullets: [
          "设计 JD Match Console，将岗位要求拆解为匹配项，并与项目证据进行结构化对照。",
          "强调结果可复查，不把匹配结论写成自动化招聘判断。",
        ],
      },
    },
    weakened: {
      transit: {
        reason: "UCSD Triton Transit 偏传统数据分析，与 Agent Workflow 的直接关联较弱。",
        changes: ["保留业务诊断价值，但减少篇幅和技术展开。"],
      },
    },
    summaryChanges: [
      "把 summary 调整为 AI Agent 应用方向。",
      "强调任务拆解、Tool Calling、Human-in-the-loop 和结果可复查。",
    ],
    skillChanges: [
      "新增 Agent Workflow、任务拆解、Tool Calling、结构化输出。",
      "强化业务流程自动化、证据链生成和结果可复查。",
    ],
  },
  LLM_APPLICATION_PRODUCT: {
    summary:
      "大模型应用 / 大模型应用产品方向候选人，关注 LLM 在真实业务场景中的可用性、输出质量和评估闭环。项目经验覆盖 Prompt 框架、指标分析 Agent、AI 影响研究和 JD 匹配工具，强调 Prompt Engineering、模型输出评估、Badcase 分析、输出稳定性、业务可用性与大模型能力边界。",
    skills: [
      {
        label: "LLM Applications",
        items: [
          "LLM 应用场景",
          "Prompt Engineering",
          "提示词优化",
          "模型输出评估",
          "Badcase 分析",
          "输出稳定性",
          "业务可用性",
          "大模型能力边界",
        ],
      },
      {
        label: "AI Product Workflow",
        items: [
          "结构化输出",
          "人工复查",
          "评估指标",
          "Prompt 框架",
          "RAG 理解",
        ],
      },
      {
        label: "Analytics",
        items: [
          "业务问题拆解",
          "AI 影响分析",
          "Metric Spec",
          "证据链报告",
        ],
      },
    ],
    order: ["sova", "insightflow", "exposure", "portfolio", "transit"],
    strengthened: {
      sova: {
        reason: "SOVA AI 能体现 LLM 输出和确定性计算的边界设计。",
        bullets: [
          "设计指标异动分析流程，将 LLM 用于问题澄清、分析解释和报告组织，避免替代确定性计算。",
          "通过 Metric Spec、DuckDB 计算和 Top Movers 输出，提升 LLM 分析结果的可复查性。",
          "围绕证据链报告设计结果验证路径，降低模型输出不稳定对业务判断的影响。",
        ],
      },
      insightflow: {
        reason: "InsightFlow AI 最能体现 Prompt Engineering 和结构化输出。",
        bullets: [
          "构建 Prompt 框架，将业务问题拆成目标、指标、假设和分析路径，提升输出稳定性。",
          "把模型输出设计为可复查的分析计划，而不是直接给出未经验证的业务结论。",
        ],
      },
      exposure: {
        reason: "AI Exposure 能补充大模型影响分析和应用场景判断。",
        bullets: [
          "围绕 AI exposure 和编程职业变化建立研究框架，分析任务变化、风险解释和应用场景影响。",
          "将研究结论组织成结构化叙事，突出大模型应用对具体职业任务的影响边界。",
        ],
      },
      portfolio: {
        reason: "JD Match Console 能展示大模型应用产品的证据约束意识。",
        bullets: [
          "设计 JD Match Console 概念，将岗位要求与项目证据结构化匹配，减少无依据改写。",
          "强调输出可解释和人工复核，不夸大为自动化招聘决策。",
        ],
      },
    },
    weakened: {
      transit: {
        reason: "UCSD Triton Transit 更偏运营数据分析，对大模型应用岗位支撑较弱。",
        changes: ["压缩为业务诊断案例，减少排班优化细节。"],
      },
    },
    summaryChanges: [
      "把 summary 调整为大模型应用 / 大模型应用产品方向。",
      "强调 Prompt Engineering、输出质量评估、Badcase 分析和业务可用性。",
    ],
    skillChanges: [
      "新增 LLM 应用场景、模型输出评估、Badcase 分析、输出稳定性。",
      "明确大模型能力边界，避免模型训练、微调和算法研发表述。",
    ],
  },
};

export function tailorResumeMock({
  resume,
  selectedRole,
  customRoleInput: customRoleValue,
  analysisResult,
  jdText: _jdText,
  atsGuidance,
}: TailorResumeMockInput): TailorResumeMockResult {
  void _jdText;
  const customRoleInput = normalizeCustomRoleInput(customRoleValue);
  const config =
    selectedRole === "CUSTOM_ROLE" || selectedRole === "AUTO_DETECT_ROLE"
      ? buildCustomRoleConfig(customRoleInput, analysisResult)
      : roleConfigs[toTailorableRole(selectedRole)];
  const skills = applyAtsGuidanceToSkills(
    applyStrategySkillPriority(
      config.skills,
      analysisResult.resumeThesis.skillPriority,
    ),
    atsGuidance,
  );
  const projectOrder =
    analysisResult.resumeThesis.projectPriority.length > 0
      ? analysisResult.resumeThesis.projectPriority
      : config.order;
  const tailoredResume: ResumeData = {
    ...resume,
    meta: {
      ...resume.meta,
      lastUpdated: new Date().toISOString().slice(0, 10),
    },
    summary: config.summary,
    skills,
    projects: reorderProjects(
      resume.projects.map((project) =>
        rewriteProject(project, config, analysisResult),
      ),
      projectOrder,
    ),
  };

  const truthCheck = checkResumeTruthfulness(tailoredResume);
  const changeLog: TailorChangeLog = {
    strengthenedProjects: mergeProjectChanges(
      buildStrengthenedLog(config),
      buildStrategyStrengthenedLog(analysisResult),
    ),
    weakenedProjects: mergeProjectChanges(
      buildWeakenedLog(config),
      buildStrategyWeakenedLog(analysisResult),
    ),
    skillChanges: config.skillChanges,
    summaryChanges: config.summaryChanges,
    riskWarnings: Array.from(
      new Set([...analysisResult.riskWarnings, ...truthCheck.warnings]),
    ),
    truthCheck,
  };
  changeLog.skillChanges = Array.from(
    new Set([
      ...changeLog.skillChanges,
      ...buildStrategySkillChanges(analysisResult),
      ...buildAtsSkillChanges(atsGuidance),
    ]),
  );
  changeLog.summaryChanges = Array.from(
    new Set([
      ...changeLog.summaryChanges,
      ...buildStrategySummaryChanges(analysisResult),
    ]),
  );
  changeLog.riskWarnings = Array.from(
    new Set([
      ...changeLog.riskWarnings,
      ...analysisResult.coverageCheck.overPackagingRisks,
    ]),
  );

  return {
    tailoredResume,
    changeLog,
  };
}

function applyAtsGuidanceToSkills(
  skills: ResumeData["skills"],
  atsGuidance?: AtsGuidance,
) {
  if (!atsGuidance) {
    return skills;
  }

  const forbidden = atsGuidance.forbiddenKeywords.map((item) => item.toLowerCase());
  const safeKeywords = [
    ...atsGuidance.mustCoverKeywords,
    ...atsGuidance.shouldCoverKeywords,
  ];
  const cleanedSkills = skills.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        !forbidden.some((keyword) => item.toLowerCase().includes(keyword)),
    ),
  }));

  if (safeKeywords.length === 0) {
    return cleanedSkills;
  }

  const firstGroup = cleanedSkills[0];

  if (!firstGroup) {
    return [
      {
        label: "ATS 核心关键词",
        items: safeKeywords.slice(0, 6),
      },
    ];
  }

  return [
    {
      ...firstGroup,
      items: Array.from(new Set([...safeKeywords.slice(0, 6), ...firstGroup.items])),
    },
    ...cleanedSkills.slice(1),
  ];
}

function buildAtsSkillChanges(atsGuidance?: AtsGuidance) {
  if (!atsGuidance) {
    return [];
  }

  const changes = [
    "已根据 ATS 关键词覆盖结果，优先保留有证据支撑的核心关键词。",
  ];

  if (atsGuidance.forbiddenKeywords.length > 0) {
    changes.push(
      `未写入缺少证据支撑的关键词：${atsGuidance.forbiddenKeywords.slice(0, 6).join("、")}`,
    );
  }

  return changes;
}

function buildCustomRoleConfig(
  customRoleInput: CustomRoleInput,
  analysisResult: JDAnalysisResult,
): RoleTailorConfig {
  const skillPriority = analysisResult.resumeThesis.skillPriority.length
    ? analysisResult.resumeThesis.skillPriority
    : splitCustomText(
        [
          customRoleInput.focusAreas,
          customRoleInput.strengthsToHighlight,
        ].join("、"),
      );
  const roleLabel =
    analysisResult.strategyRole.selectedRole === "AUTO_DETECT_ROLE"
      ? analysisResult.detectedRole.label
      : getCustomRoleLabel(customRoleInput);

  return {
    summary:
      analysisResult.resumeThesis.oneSentence ||
      `${roleLabel}方向定制，围绕用户填写的岗位侧重点和 JD 要求调整技能、项目顺序与 bullet 表达。`,
    skills: [
      {
        label: customRoleInput.roleName || "岗位核心能力",
        items: skillPriority.slice(0, 8),
      },
      {
        label: "项目证据与业务表达",
        items: [
          ...analysisResult.abilityMap.businessSkills,
          ...analysisResult.abilityMap.evaluationSkills,
        ].slice(0, 8),
      },
      {
        label: "工具与协作",
        items: [
          ...analysisResult.abilityMap.hardSkills,
          ...analysisResult.abilityMap.collaborationSkills,
        ].slice(0, 8),
      },
    ].filter((group) => group.items.length > 0),
    order: analysisResult.resumeThesis.projectPriority,
    strengthened: {},
    weakened: {},
    summaryChanges: [
      `按${roleLabel}处理，不强行套用三个固定 AI 岗位方向。`,
      ...(customRoleInput.rawText ? [`用户补充偏好：${customRoleInput.rawText}`] : []),
    ],
    skillChanges: [
      `技能区优先参考：${skillPriority.slice(0, 6).join("、") || roleLabel}`,
    ],
  };
}

function applyStrategySkillPriority(
  skills: ResumeData["skills"],
  skillPriority: string[],
) {
  if (skillPriority.length === 0) {
    return skills;
  }

  const priorityGroup = {
    label: "岗位核心能力",
    items: skillPriority.slice(0, 8),
  };

  const remainingSkills = skills.filter(
    (group) => group.label !== priorityGroup.label,
  );

  return [priorityGroup, ...remainingSkills].slice(0, 5);
}

function splitCustomText(value: string) {
  return value
    .split(/[;；、，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildStrategyStrengthenedLog(analysisResult: JDAnalysisResult) {
  return analysisResult.evidenceMatrix
    .filter(
      (item) =>
        (item.matchLevel === "strong" || item.matchLevel === "medium") &&
        item.matchedProjects.length > 0,
    )
    .flatMap((item) =>
      item.matchedProjects.map((projectName) => ({
        projectName,
        reason: item.evidence || `用于证明 JD 要求：${item.jdRequirement}`,
        changes: [
          item.rewriteFocus ||
            `围绕“${item.jdRequirement}”补充业务场景、方案设计和验证方式。`,
          `将相关 bullet 调整为岗位能力词开头，对应 evidenceMatrix 中“${item.jdRequirement}”的 ${item.matchLevel} 匹配。`,
        ],
      })),
    );
}

function buildStrategyWeakenedLog(analysisResult: JDAnalysisResult) {
  return analysisResult.evidenceMatrix
    .filter((item) => item.matchLevel === "weak" || item.matchLevel === "missing")
    .map((item) => ({
      projectName: item.matchedProjects[0] ?? item.jdRequirement,
      reason:
        item.riskNote ||
        `该要求当前证据强度为 ${item.matchLevel}，不适合硬包装。`,
      changes: [
        item.rewriteFocus ||
          "仅保留谨慎表达，并在风险提醒中提示人工确认。",
        `未将“${item.jdRequirement}”写成强经历，因为 evidenceMatrix 标记为 ${item.matchLevel}。`,
      ],
    }));
}

function buildStrategySkillChanges(analysisResult: JDAnalysisResult) {
  const changes: string[] = [];
  const skillPriority = analysisResult.resumeThesis.skillPriority;

  if (skillPriority.length > 0) {
    changes.push(`根据岗位作战策略调整技能优先级：${skillPriority.slice(0, 6).join("、")}`);
  }

  const abilityMap = analysisResult.abilityMap;
  const abilityBuckets = [
    ...abilityMap.aiSkills,
    ...abilityMap.productSkills,
    ...abilityMap.businessSkills,
    ...abilityMap.evaluationSkills,
  ];

  if (abilityBuckets.length > 0) {
    changes.push(`技能表达参考能力拆解：${Array.from(new Set(abilityBuckets)).slice(0, 8).join("、")}`);
  }

  return changes;
}

function buildStrategySummaryChanges(analysisResult: JDAnalysisResult) {
  const changes: string[] = [];

  if (analysisResult.resumeThesis.oneSentence) {
    changes.push(`本次简历主线：${analysisResult.resumeThesis.oneSentence}`);
  }

  if (analysisResult.screeningProfile.whoTheyWant) {
    changes.push(`岗位筛选画像：${analysisResult.screeningProfile.whoTheyWant}`);
  }

  return changes;
}

function mergeProjectChanges(
  base: TailorChangeLog["strengthenedProjects"],
  additions: TailorChangeLog["strengthenedProjects"],
) {
  const seen = new Set<string>();

  return [...base, ...additions].filter((item) => {
    const key = `${item.projectName}|${item.reason}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function toTailorableRole(role: ApiRole): TailorableApiRole {
  return role === "OTHER" || role === "CUSTOM_ROLE" || role === "AUTO_DETECT_ROLE"
    ? "AI_PRODUCT_MANAGER"
    : role;
}

function rewriteProject(
  project: ResumeProject,
  config: RoleTailorConfig,
  analysisResult: JDAnalysisResult,
): ResumeProject {
  const key = getProjectKey(project.name);
  const strengthened = key ? config.strengthened[key] : undefined;
  const strategyBullets = buildStrategyBulletsForProject(project, analysisResult);

  if (!strengthened && strategyBullets.length === 0) {
    return project;
  }

  const fallbackBullets = strengthened
    ? strengthened.bullets.map((text, index) =>
        makeBullet(project, text, index + strategyBullets.length),
      )
    : project.bullets;

  return {
    ...project,
    bullets: [...strategyBullets, ...fallbackBullets].slice(
      0,
      strengthened ? strengthened.bullets.length : project.bullets.length,
    ),
  };
}

function buildStrategyBulletsForProject(
  project: ResumeProject,
  analysisResult: JDAnalysisResult,
): ResumeBullet[] {
  const matchedEvidence = analysisResult.evidenceMatrix
    .filter(
      (item) =>
        (item.matchLevel === "strong" || item.matchLevel === "medium") &&
        item.matchedProjects.some((projectName) =>
          projectNamesOverlap(project.name, projectName),
        ),
    )
    .slice(0, 2);

  return matchedEvidence.map((item, index) =>
    makeBullet(project, buildStrategyBulletText(item, analysisResult), index),
  );
}

function buildStrategyBulletText(
  item: JDAnalysisResult["evidenceMatrix"][number],
  analysisResult: JDAnalysisResult,
) {
  const capability = inferCapabilityWord(item, analysisResult);
  const scenario = inferBusinessScenario(analysisResult);
  const actionVerb = item.matchLevel === "strong" ? "设计" : "围绕";
  const solution = cleanSentencePart(
    item.rewriteFocus || item.evidence || item.jdRequirement,
  );
  const validation = inferValidationFocus(item, analysisResult);

  return `${capability}：在${scenario}场景下，为回应“${item.jdRequirement}”要求，${actionVerb}${solution}，并通过${validation}降低输出不可复查或过度包装风险。`;
}

function inferCapabilityWord(
  item: JDAnalysisResult["evidenceMatrix"][number],
  analysisResult: JDAnalysisResult,
) {
  const text = [
    item.jdRequirement,
    item.rewriteFocus,
    ...analysisResult.resumeThesis.skillPriority,
    ...analysisResult.abilityMap.productSkills,
    ...analysisResult.abilityMap.aiSkills,
    ...analysisResult.abilityMap.evaluationSkills,
    ...analysisResult.abilityMap.businessSkills,
  ].join(" ");

  if (/竞品|research|洞察|资料|文档|用户路径/i.test(text)) {
    return "产品洞察";
  }

  if (/Agent|Workflow|Tool|工具调用|任务拆解|结构化|人工兜底|复查/i.test(text)) {
    return "Agent 任务拆解";
  }

  if (/Prompt|System|Few-shot|LLM|大模型|Badcase|输出|稳定/i.test(text)) {
    return "输出质量评估";
  }

  if (/指标|数据|SQL|分析|口径|趋势|诊断/i.test(text)) {
    return "数据分析";
  }

  if (/增长|转化|漏斗|运营|留存|商业化/i.test(text)) {
    return "策略评估";
  }

  if (/PRD|原型|需求|产品|用户|体验|方案/i.test(text)) {
    return "产品方案";
  }

  return item.jdRequirement.slice(0, 12) || "岗位能力";
}

function inferBusinessScenario(analysisResult: JDAnalysisResult) {
  const text = [
    analysisResult.screeningProfile.whoTheyWant,
    analysisResult.resumeThesis.oneSentence,
    ...analysisResult.jdHighlights,
    ...analysisResult.abilityMap.businessSkills,
    ...analysisResult.abilityMap.aiSkills,
  ].join(" ");

  if (/协同|办公|企业|提效|生产力/i.test(text)) {
    return "企业协同与业务提效";
  }

  if (/Agent|助理|任务|Workflow|自动化/i.test(text)) {
    return "AI 助理与任务执行";
  }

  if (/AIGC|内容|创意|生成/i.test(text)) {
    return "内容生成与创意输入";
  }

  if (/指标|数据|分析|诊断|决策/i.test(text)) {
    return "指标分析与业务诊断";
  }

  if (/增长|转化|漏斗|运营|留存/i.test(text)) {
    return "用户增长与策略分析";
  }

  return "目标岗位业务";
}

function inferValidationFocus(
  item: JDAnalysisResult["evidenceMatrix"][number],
  analysisResult: JDAnalysisResult,
) {
  const text = [
    item.jdRequirement,
    item.rewriteFocus,
    item.evidence,
    ...analysisResult.abilityMap.evaluationSkills,
  ].join(" ");

  if (/Badcase|异常|回归/i.test(text)) {
    return "Badcase 记录与异常案例复查";
  }

  if (/指标|数据|计算|口径/i.test(text)) {
    return "指标口径和计算链路校验";
  }

  if (/测试|评估|质量|稳定/i.test(text)) {
    return "测试案例和输出质量评估";
  }

  if (/证据|复查|trace|链路/i.test(text)) {
    return "证据链和人工复查";
  }

  return "人工确认、结果复查和风险提示";
}

function cleanSentencePart(value: string) {
  return value
    .replace(/[。.!！]+$/g, "")
    .replace(/^围绕/, "围绕")
    .trim();
}

function makeBullet(
  project: ResumeProject,
  text: string,
  index: number,
): ResumeBullet {
  return {
    id: `${project.id}-tailored-${index + 1}`,
    text,
    tags: ["tailored", ...project.emphasis],
    riskLevel: "low",
  };
}

function reorderProjects(projects: ResumeProject[], order: string[]) {
  return [...projects].sort((a, b) => {
    const aIndex = getOrderIndex(a.name, order);
    const bIndex = getOrderIndex(b.name, order);
    return aIndex - bIndex;
  });
}

function getOrderIndex(projectName: string, order: string[]) {
  const normalizedProject = normalizeProjectName(projectName);
  const directIndex = order.findIndex((item) => {
    const normalizedItem = normalizeProjectName(item);
    return (
      normalizedProject.includes(normalizedItem) ||
      normalizedItem.includes(normalizedProject)
    );
  });

  if (directIndex !== -1) {
    return directIndex;
  }

  const key = getProjectKey(projectName);
  const index = key ? order.indexOf(key) : -1;
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function normalizeProjectName(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function projectNamesOverlap(a: string, b: string) {
  const normalizedA = normalizeProjectName(a);
  const normalizedB = normalizeProjectName(b);

  return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}

function getProjectKey(projectName: string) {
  const normalized = projectName.toLowerCase();

  if (normalized.includes("sova")) {
    return "sova";
  }

  if (normalized.includes("insightflow")) {
    return "insightflow";
  }

  if (normalized.includes("portfolio") || normalized.includes("jd match")) {
    return "portfolio";
  }

  if (normalized.includes("transit") || normalized.includes("triton")) {
    return "transit";
  }

  if (normalized.includes("exposure")) {
    return "exposure";
  }

  return null;
}

function buildStrengthenedLog(config: RoleTailorConfig) {
  return Object.entries(config.strengthened).map(([, item]) => ({
    projectName: inferProjectName(item.reason),
    reason: item.reason,
    changes: item.bullets,
  }));
}

function buildWeakenedLog(config: RoleTailorConfig) {
  return Object.entries(config.weakened).map(([key, item]) => ({
    projectName: projectNames[key] ?? key,
    reason: item.reason,
    changes: item.changes,
  }));
}

const projectNames: Record<string, string> = {
  sova: "SOVA AI",
  insightflow: "InsightFlow AI",
  portfolio: "Zev Portfolio / JD Match Console",
  transit: "UCSD Triton Transit",
  exposure: "AI Exposure 与编程职业就业前景分析",
};

function inferProjectName(reason: string) {
  const matchedKey = Object.keys(projectNames).find((key) =>
    reason.toLowerCase().includes(key),
  );

  if (matchedKey) {
    return projectNames[matchedKey];
  }

  if (reason.includes("SOVA")) {
    return projectNames.sova;
  }

  if (reason.includes("InsightFlow")) {
    return projectNames.insightflow;
  }

  if (reason.includes("JD Match") || reason.includes("Portfolio")) {
    return projectNames.portfolio;
  }

  if (reason.includes("AI Exposure")) {
    return projectNames.exposure;
  }

  return "项目";
}
