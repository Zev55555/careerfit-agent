import type {
  ResumeQualityAuditResult,
  ResumeQualityIssue,
  ResumeQualityIssueCategory,
  ResumeQualityIssueSeverity,
} from "@/lib/resume-quality-audit-schema";
import {
  createFallbackQualityAudit,
  createPassingQualityAudit,
  normalizeResumeQualityAuditResult,
} from "@/lib/resume-quality-audit-schema";
import type { ResumeData, TailorChangeLog } from "@/lib/resume-schema";

type RunResumeQualityAuditInput = {
  resume: ResumeData;
  changeLog?: TailorChangeLog;
  jdText: string;
  masterResume?: ResumeData;
};

type ApplySafeQualityFixesOptions = {
  changeLog?: TailorChangeLog;
  masterResume?: ResumeData;
};

type ApplySafeQualityFixesResult = {
  resume: ResumeData;
  changeLog?: TailorChangeLog;
  fixedIssues: string[];
  removedPhrases: string[];
  softenedClaims: string[];
  replacedTechLists: string[];
};

type TextScope = "skill" | "project" | "changeLog";

type TextTarget = {
  location: string;
  text: string;
  scope: TextScope;
};

type FixTracker = {
  fixedIssues: Set<string>;
  removedPhrases: Set<string>;
  softenedClaims: Set<string>;
  replacedTechLists: Set<string>;
};

const aiTracePatterns = [
  /对应\s*JD/gi,
  /满足\s*JD/gi,
  /覆盖\s*JD/gi,
  /对应JD/gi,
  /满足JD/gi,
  /覆盖JD/gi,
  /贴合岗位/g,
  /符合岗位/g,
  /岗位要求/g,
  /匹配岗位/g,
  /岗位桥接/g,
  /背景对齐/g,
  /JD\s*匹配/gi,
  /技能映射/g,
  /证据映射/g,
  /能力映射/g,
  /定向桥接/g,
  /Bridge bullet/gi,
];

const aiTraceCleanupPatterns = [
  /[，,；;。]?\s*对应\s*JD\s*对[^，,；;。]*(?:的要求)?/gi,
  /[，,；;。]?\s*对应\s*JD[^，,；;。]*(?:的要求)?/gi,
  /[，,；;。]?\s*满足\s*(?:JD|岗位要求)[^，,；;。]*/gi,
  /[，,；;。]?\s*覆盖\s*(?:JD|岗位要求)[^，,；;。]*/gi,
  /[，,；;。]?\s*贴合岗位[^，,；;。]*/g,
  /[，,；;。]?\s*符合岗位[^，,；;。]*/g,
  /[，,；;。]?\s*匹配岗位[^，,；;。]*/g,
];

const metaLanguageTitleReplacements: Array<[RegExp, string]> = [
  [/^岗位桥接\s*[:：]\s*/u, "策略推演："],
  [/^背景对齐\s*[:：]\s*/u, "项目背景："],
  [/^JD\s*匹配\s*[:：]\s*/iu, "信息关联："],
  [/^匹配设计\s*[:：]\s*/u, "信息架构："],
  [/^技能映射\s*[:：]\s*/u, "能力呈现："],
  [/^证据映射\s*[:：]\s*/u, "项目证据："],
  [/^能力映射\s*[:：]\s*/u, "能力呈现："],
  [/^定向桥接\s*[:：]\s*/u, "策略推演："],
  [/^Bridge bullet\s*[:：]\s*/iu, "策略推演："],
];

const techListCopyPatterns = [
  /Java\s*\/\s*Python\s*\/\s*C\s*\/\s*C\+\+\s*\/\s*C#\s*\/\s*PHP\s*\/\s*Shell\s*之一/i,
  /Java\/Python\/C\/C\+\+\/C#\/PHP\/Shell/i,
  /熟悉主流编程语言之一/g,
  /熟悉\s*Linux\s*系统和主流数据库/gi,
  /了解主流的互联网安全技术和安全产品/g,
  /防火墙、入侵检测和防病毒等安全产品/g,
];

const seniorityPhrases = [
  "主导产品全生命周期",
  "负责 E2E 落地",
  "负责E2E落地",
  "负责全局架构设计",
  "仲裁技术冲突",
  "推动商业化上市",
  "管理供应商",
  "管理产业链",
  "构建企业级体系",
];

const highRiskClaimPhrases = [
  "商业化上线",
  "企业级落地",
  "模型训练",
  "模型微调",
  "算法研发",
];

const mediumRiskClaimPhrases = [
  "精通",
  "主导",
  "负责全生命周期",
  "全生命周期管理",
  "全链路",
  "闭环",
  "体系化",
  "方法论沉淀",
  "生产级",
  "大规模用户",
  "用户增长数据",
  "架构负责人",
  "技术冲突仲裁",
  "供应商管理",
  "产业链管理",
  "全局最优架构",
];

const truthRiskPatterns = [
  /商业化上线/g,
  /企业客户/g,
  /\bDAU\b/gi,
  /\bMAU\b/gi,
  /增长\s*\d+%/g,
  /提升\s*\d+%/g,
  /降低\s*\d+%/g,
  /用户规模/g,
  /生产环境/g,
  /已上线/g,
  /模型训练/g,
  /模型微调/g,
];

export function runResumeQualityAudit({
  resume,
  changeLog,
  masterResume,
}: RunResumeQualityAuditInput): ResumeQualityAuditResult {
  try {
    const targets = collectTargets(resume, changeLog);
    const masterText = masterResume ? JSON.stringify(masterResume) : "";
    const hasFormalWorkEvidence = hasFormalEvidence(masterText);
    const issues: ResumeQualityIssue[] = [];

    for (const target of targets) {
      addAiTraceIssues(issues, target);
      addTechListCopyIssues(issues, target);
      addHighRiskClaimIssues(issues, target);
      addSeniorityIssues(issues, target, hasFormalWorkEvidence);
      addTruthRiskIssues(issues, target, masterText);
    }

    if (issues.length === 0) {
      return createPassingQualityAudit();
    }

    return normalizeResumeQualityAuditResult({
      checked: true,
      issues: dedupeIssues(issues),
    });
  } catch {
    return createFallbackQualityAudit();
  }
}

export function applySafeQualityFixes(
  resume: ResumeData,
  auditResult: ResumeQualityAuditResult,
  options: ApplySafeQualityFixesOptions = {},
): ApplySafeQualityFixesResult {
  const repairableIssueCount = auditResult.issues.filter(
    (issue) =>
      issue.shouldAutoFix ||
      issue.category === "OVERCLAIM" ||
      issue.category === "SENIORITY_MISMATCH" ||
      issue.category === "TRUTH_RISK",
  ).length;

  if (repairableIssueCount === 0) {
    return {
      resume,
      changeLog: options.changeLog,
      fixedIssues: [],
      removedPhrases: [],
      softenedClaims: [],
      replacedTechLists: [],
    };
  }

  const tracker = createFixTracker();
  const masterText = options.masterResume ? JSON.stringify(options.masterResume) : "";
  const technicalFoundation = buildTechnicalFoundation(masterText);

  const nextResume: ResumeData = {
    ...resume,
    skills: resume.skills.map((group, groupIndex) => ({
      ...group,
      items: group.items.map((item, itemIndex) =>
        fixText(item, {
          location: `skills.${groupIndex}.items.${itemIndex}`,
          scope: "skill",
          tracker,
          technicalFoundation,
          masterText,
        }),
      ),
    })),
    projects: resume.projects.map((project, projectIndex) => ({
      ...project,
      context: fixText(project.context, {
        location: `projects.${projectIndex}.context`,
        scope: "project",
        tracker,
        technicalFoundation,
        masterText,
      }),
      bullets: project.bullets.map((bullet, bulletIndex) => ({
        ...bullet,
        text: fixText(bullet.text, {
          location: `projects.${projectIndex}.bullets.${bulletIndex}`,
          scope: "project",
          tracker,
          technicalFoundation,
          masterText,
        }),
      })),
    })),
  };

  return {
    resume: nextResume,
    changeLog: options.changeLog
      ? fixChangeLog(options.changeLog, tracker, technicalFoundation, masterText)
      : undefined,
    fixedIssues: uniqueFixes(tracker),
    removedPhrases: Array.from(tracker.removedPhrases),
    softenedClaims: Array.from(tracker.softenedClaims),
    replacedTechLists: Array.from(tracker.replacedTechLists),
  };
}

function collectTargets(resume: ResumeData, changeLog?: TailorChangeLog) {
  const targets: TextTarget[] = [];

  resume.skills.forEach((group, groupIndex) => {
    group.items.forEach((item, itemIndex) => {
      targets.push({
        location: `skills.${groupIndex}.items.${itemIndex}`,
        text: item,
        scope: "skill",
      });
    });
  });

  resume.projects.forEach((project, projectIndex) => {
    targets.push({
      location: `projects.${projectIndex}.context`,
      text: project.context,
      scope: "project",
    });
    project.bullets.forEach((bullet, bulletIndex) => {
      targets.push({
        location: `projects.${projectIndex}.bullets.${bulletIndex}`,
        text: bullet.text,
        scope: "project",
      });
    });
  });

  if (changeLog) {
    addChangeLogTargets(targets, "changeLog.riskWarnings", changeLog.riskWarnings);
    addChangeLogTargets(targets, "changeLog.skillChanges", changeLog.skillChanges);
    addChangeLogTargets(targets, "changeLog.summaryChanges", changeLog.summaryChanges);

    changeLog.strengthenedProjects.forEach((item, index) => {
      addChangeLogTargets(targets, `changeLog.strengthenedProjects.${index}`, [
        item.reason,
        ...item.changes,
      ]);
    });
    changeLog.weakenedProjects.forEach((item, index) => {
      addChangeLogTargets(targets, `changeLog.weakenedProjects.${index}`, [
        item.reason,
        ...item.changes,
      ]);
    });
  }

  return targets.filter((target) => target.text.trim());
}

function addChangeLogTargets(
  targets: TextTarget[],
  location: string,
  items: string[],
) {
  items.forEach((text, index) => {
    targets.push({
      location: `${location}.${index}`,
      text,
      scope: "changeLog",
    });
  });
}

function addAiTraceIssues(issues: ResumeQualityIssue[], target: TextTarget) {
  for (const pattern of aiTracePatterns) {
    if (pattern.test(target.text)) {
      pattern.lastIndex = 0;
      issues.push(
        createIssue({
          severity: "high",
          category: "AI_TRACE",
          location: target.location,
          originalText: target.text,
          problem:
            "出现 JD 解释性表达，简历正文会显得像 AI 生成或在向系统解释匹配逻辑。",
          suggestedFix:
            "删除“对应 JD / 满足岗位要求”这类解释句，只保留真实项目动作。",
          shouldAutoFix: true,
        }),
      );
      return;
    }
  }
}

function addTechListCopyIssues(issues: ResumeQualityIssue[], target: TextTarget) {
  if (target.scope !== "skill" && target.scope !== "project") {
    return;
  }

  for (const pattern of techListCopyPatterns) {
    if (pattern.test(target.text)) {
      pattern.lastIndex = 0;
      issues.push(
        createIssue({
          severity: "high",
          category: "TECH_LIST_COPY",
          location: target.location,
          originalText: target.text,
          problem:
            "疑似原样复制 JD 技术清单，而不是基于真实经历表达技能。",
          suggestedFix:
            "不要复制 JD 技术清单，只保留 Master 中有证据的真实技能。",
          shouldAutoFix: true,
        }),
      );
      return;
    }
  }
}

function addHighRiskClaimIssues(issues: ResumeQualityIssue[], target: TextTarget) {
  for (const phrase of highRiskClaimPhrases) {
    if (target.text.includes(phrase)) {
      issues.push(
        createIssue({
          severity: "high",
          category: "OVERCLAIM",
          location: target.location,
          originalText: target.text,
          problem: `出现高风险强包装表达“${phrase}”。`,
          suggestedFix:
            "降级为“设计 / 参与 / 整理 / 验证 / 支持 / 基础认知 / 项目原型”。",
          shouldAutoFix: true,
        }),
      );
    }
  }

  for (const phrase of mediumRiskClaimPhrases) {
    if (target.text.includes(phrase)) {
      issues.push(
        createIssue({
          severity: "medium",
          category: "OVERCLAIM",
          location: target.location,
          originalText: target.text,
          problem: `出现可能过度包装的表达“${phrase}”。`,
          suggestedFix:
            "确认 Master 中是否有证据；如无证据，降级为更朴素的项目动作表达。",
          shouldAutoFix: true,
        }),
      );
    }
  }
}

function addSeniorityIssues(
  issues: ResumeQualityIssue[],
  target: TextTarget,
  hasFormalWorkEvidence: boolean,
) {
  if (hasFormalWorkEvidence) {
    return;
  }

  for (const phrase of seniorityPhrases) {
    if (target.text.includes(phrase)) {
      issues.push(
        createIssue({
          severity: "high",
          category: "SENIORITY_MISMATCH",
          location: target.location,
          originalText: target.text,
          problem: `学生项目中出现偏 senior / 正式负责人级表达“${phrase}”。`,
          suggestedFix:
            "改成“在项目中梳理需求拆解、方案整理、流程设计和功能验证”。",
          shouldAutoFix: true,
        }),
      );
    }
  }
}

function addTruthRiskIssues(
  issues: ResumeQualityIssue[],
  target: TextTarget,
  masterText: string,
) {
  for (const pattern of truthRiskPatterns) {
    const match = target.text.match(pattern)?.[0];

    if (!match) {
      continue;
    }

    if (masterText && masterText.includes(match)) {
      continue;
    }

    issues.push(
      createIssue({
        severity: "high",
        category: "TRUTH_RISK",
        location: target.location,
        originalText: target.text,
        problem: `出现 Master 中缺少明确证据的真实性风险表达“${match}”。`,
        suggestedFix:
          "如无事实依据，应降级为项目验证、原型验证、测试记录或风险问题记录等表达。",
        shouldAutoFix: true,
      }),
    );
  }
}

function fixChangeLog(
  changeLog: TailorChangeLog,
  tracker: FixTracker,
  technicalFoundation: string,
  masterText: string,
): TailorChangeLog {
  return {
    ...changeLog,
    riskWarnings: changeLog.riskWarnings.map((text, index) =>
      fixText(text, {
        location: `changeLog.riskWarnings.${index}`,
        scope: "changeLog",
        tracker,
        technicalFoundation,
        masterText,
      }),
    ),
    skillChanges: changeLog.skillChanges.map((text, index) =>
      fixText(text, {
        location: `changeLog.skillChanges.${index}`,
        scope: "changeLog",
        tracker,
        technicalFoundation,
        masterText,
      }),
    ),
    summaryChanges: changeLog.summaryChanges.map((text, index) =>
      fixText(text, {
        location: `changeLog.summaryChanges.${index}`,
        scope: "changeLog",
        tracker,
        technicalFoundation,
        masterText,
      }),
    ),
    strengthenedProjects: changeLog.strengthenedProjects.map((item, itemIndex) => ({
      ...item,
      reason: fixText(item.reason, {
        location: `changeLog.strengthenedProjects.${itemIndex}.reason`,
        scope: "changeLog",
        tracker,
        technicalFoundation,
        masterText,
      }),
      changes: item.changes.map((text, changeIndex) =>
        fixText(text, {
          location: `changeLog.strengthenedProjects.${itemIndex}.changes.${changeIndex}`,
          scope: "changeLog",
          tracker,
          technicalFoundation,
          masterText,
        }),
      ),
    })),
    weakenedProjects: changeLog.weakenedProjects.map((item, itemIndex) => ({
      ...item,
      reason: fixText(item.reason, {
        location: `changeLog.weakenedProjects.${itemIndex}.reason`,
        scope: "changeLog",
        tracker,
        technicalFoundation,
        masterText,
      }),
      changes: item.changes.map((text, changeIndex) =>
        fixText(text, {
          location: `changeLog.weakenedProjects.${itemIndex}.changes.${changeIndex}`,
          scope: "changeLog",
          tracker,
          technicalFoundation,
          masterText,
        }),
      ),
    })),
  };
}

function fixText(
  value: string,
  {
    location,
    scope,
    tracker,
    technicalFoundation,
    masterText,
  }: {
    location: string;
    scope: TextScope;
    tracker: FixTracker;
    technicalFoundation: string;
    masterText: string;
  },
) {
  const original = value;
  let next = value;

  next = replaceTechListCopy(next, location, scope, technicalFoundation, tracker);
  next = cleanAiTraceText(next, location, tracker);
  next = downgradeSeniorityText(next, location, tracker);
  next = downgradeClaimText(next, location, tracker);
  next = downgradeTruthRiskText(next, location, masterText, tracker);
  next = normalizeText(next);

  if (!next) {
    next = original;
  }

  return next;
}

function replaceTechListCopy(
  value: string,
  location: string,
  scope: TextScope,
  technicalFoundation: string,
  tracker: FixTracker,
) {
  if (scope !== "skill" && scope !== "project") {
    return value;
  }

  let next = value;

  for (const pattern of techListCopyPatterns) {
    if (pattern.test(next)) {
      pattern.lastIndex = 0;
      next = next.replace(pattern, technicalFoundation);
      tracker.replacedTechLists.add(`${location}: 替换 JD 技术清单为真实技术基础表达`);
    }
  }

  return next;
}

function cleanAiTraceText(value: string, location: string, tracker: FixTracker) {
  let next = value;

  for (const [pattern, replacement] of metaLanguageTitleReplacements) {
    if (pattern.test(next)) {
      pattern.lastIndex = 0;
      next = next.replace(pattern, replacement);
      tracker.removedPhrases.add(`${location}: 清理简历改写元语言`);
    }
  }

  for (const pattern of aiTraceCleanupPatterns) {
    if (pattern.test(next)) {
      pattern.lastIndex = 0;
      next = next.replace(pattern, "");
      tracker.removedPhrases.add(`${location}: 清理 JD 解释性表达`);
    }
  }

  const targetedReplacements: Array<[RegExp, string]> = [
    [/通过规则兜底满足岗位要求/g, "通过规则兜底提升输出稳定性"],
    [/覆盖\s*JD\s*中的算法评测要求/g, "用于支持算法评测相关的输出稳定性检查"],
    [/岗位桥接/g, "策略推演"],
    [/背景对齐/g, "项目背景"],
    [/JD\s*匹配/gi, "信息关联"],
    [/匹配设计/g, "信息架构"],
    [/技能映射/g, "能力呈现"],
    [/证据映射/g, "项目证据"],
    [/能力映射/g, "能力呈现"],
    [/定向桥接/g, "策略推演"],
    [/Bridge bullet/gi, "策略推演"],
  ];

  for (const [pattern, replacement] of targetedReplacements) {
    if (pattern.test(next)) {
      pattern.lastIndex = 0;
      next = next.replace(pattern, replacement);
      tracker.removedPhrases.add(`${location}: 改写 JD 解释性半句`);
    }
  }

  return next;
}

function downgradeSeniorityText(
  value: string,
  location: string,
  tracker: FixTracker,
) {
  const replacements: Array<[RegExp, string]> = [
    [/主导产品全生命周期管理/g, "参与梳理需求拆解、方案整理和功能验证流程"],
    [/主导产品全生命周期/g, "参与梳理需求拆解、方案整理和功能验证流程"],
    [/负责\s*E2E\s*落地/g, "参与从输入到输出的流程验证"],
    [/负责全局架构设计/g, "参与项目原型结构设计"],
    [/仲裁技术冲突/g, "整理技术方案差异并记录决策依据"],
    [/推动商业化上市/g, "完成项目原型验证和功能展示"],
    [/管理供应商/g, "整理外部资源和协作信息"],
    [/管理产业链/g, "整理业务链路和相关角色信息"],
    [/构建企业级体系/g, "整理业务场景验证流程"],
  ];

  return applyReplacements(value, replacements, location, tracker.softenedClaims);
}

function downgradeClaimText(value: string, location: string, tracker: FixTracker) {
  const replacements: Array<[RegExp, string]> = [
    [/精通/g, "熟悉"],
    [/主导/g, "参与设计"],
    [/负责全生命周期/g, "参与完整流程"],
    [/负责/g, "参与"],
    [/全生命周期管理/g, "完整流程整理"],
    [/全链路/g, "完整流程"],
    [/端到端闭环/g, "从输入到输出的流程验证"],
    [/闭环/g, "流程验证"],
    [/体系化/g, "结构化"],
    [/方法论沉淀/g, "经验整理"],
    [/生产级/g, "项目级"],
    [/企业级落地/g, "业务场景验证"],
    [/商业化上线/g, "项目验证"],
    [/模型训练/g, "模型调用与输出验证"],
    [/模型微调/g, "Prompt 调优与输出效果验证"],
    [/算法研发/g, "算法理解与评测验证"],
  ];

  return applyReplacements(value, replacements, location, tracker.softenedClaims);
}

function downgradeTruthRiskText(
  value: string,
  location: string,
  masterText: string,
  tracker: FixTracker,
) {
  let next = value;
  const replacements: Array<[RegExp, string]> = [
    [/\bDAU\b/gi, "用户使用情况"],
    [/\bMAU\b/gi, "用户使用情况"],
    [/用户规模/g, "用户使用情况"],
    [/增长\s*\d+%/g, "用于评估优化方向"],
    [/提升\s*\d+%/g, "用于评估优化方向"],
    [/降低\s*\d+%/g, "用于定位问题和提出优化建议"],
    [/企业客户/g, "业务场景"],
    [/生产环境/g, "项目环境"],
    [/已上线/g, "已完成在线 Demo 展示"],
  ];

  for (const [pattern, replacement] of replacements) {
    const match = next.match(pattern)?.[0];

    if (!match || (masterText && masterText.includes(match))) {
      continue;
    }

    next = next.replace(pattern, replacement);
    tracker.softenedClaims.add(`${location}: 降级真实性风险表达“${match}”`);
  }

  return next;
}

function applyReplacements(
  value: string,
  replacements: Array<[RegExp, string]>,
  location: string,
  target: Set<string>,
) {
  let next = value;

  for (const [pattern, replacement] of replacements) {
    const match = next.match(pattern)?.[0];

    if (!match) {
      continue;
    }

    next = next.replace(pattern, replacement);
    target.add(`${location}: 将“${match}”降级为“${replacement}”`);
  }

  return next;
}

function normalizeText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*([，。；：、])/g, "$1")
    .replace(/([，；：])\s*$/g, "")
    .replace(/，。/g, "。")
    .replace(/；。/g, "。")
    .trim();
}

function buildTechnicalFoundation(masterText: string) {
  const skills = [
    "Python",
    "SQL",
    "Pandas",
    "DuckDB",
    "Java",
    "Linux",
    "HTTP",
    "TCP/IP",
    "MySQL",
    "Django",
  ].filter((skill) => new RegExp(escapeRegExp(skill), "i").test(masterText));

  if (skills.length > 0) {
    return `技术基础：${skills.join("、")}，具备数据处理、指标分析和技术方案理解基础`;
  }

  return "技术基础：具备数据处理、指标分析和技术方案理解基础";
}

function createFixTracker(): FixTracker {
  return {
    fixedIssues: new Set<string>(),
    removedPhrases: new Set<string>(),
    softenedClaims: new Set<string>(),
    replacedTechLists: new Set<string>(),
  };
}

function uniqueFixes(tracker: FixTracker) {
  return Array.from(
    new Set([
      ...tracker.fixedIssues,
      ...tracker.removedPhrases,
      ...tracker.replacedTechLists,
      ...tracker.softenedClaims,
    ]),
  );
}

function createIssue(input: {
  severity: ResumeQualityIssueSeverity;
  category: ResumeQualityIssueCategory;
  location: string;
  originalText: string;
  problem: string;
  suggestedFix: string;
  shouldAutoFix: boolean;
}): ResumeQualityIssue {
  return {
    id: `${input.category}-${input.severity}-${hashText(
      `${input.location}-${input.originalText}-${input.problem}`,
    )}`,
    ...input,
  };
}

function dedupeIssues(issues: ResumeQualityIssue[]) {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key = `${issue.category}|${issue.severity}|${issue.location}|${issue.problem}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function hasFormalEvidence(masterText: string) {
  return /实习|Intern|工作经历|任职|公司|全职|兼职/i.test(masterText);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}
