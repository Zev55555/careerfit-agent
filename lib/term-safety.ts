import type { JDAnalysisResult } from "@/lib/role-classifier";
import type { ResumeData, TailorChangeLog } from "@/lib/resume-schema";

type ApplyTermSafetyInput = {
  resume: ResumeData;
  changeLog: TailorChangeLog;
  jdText: string;
  analysisResult: JDAnalysisResult;
};

type ApplyTermSafetyResult = {
  resume: ResumeData;
  changeLog: TailorChangeLog;
  actions: string[];
};

const cleanupWarning =
  "已移除 JD 中未明确出现的高阶术语，避免过度包装或岗位词幻觉。";

const riskyTerms = [
  {
    pattern: /\bDFX\b/gi,
    aliases: ["dfx"],
    replacement: "测试验证",
    label: "DFX",
  },
  {
    pattern: /\bE2E\s*闭环\b/gi,
    aliases: ["e2e闭环", "e2e 闭环"],
    replacement: "从输入到输出的流程",
    label: "E2E 闭环",
  },
  {
    pattern: /\bE2E\b/gi,
    aliases: ["e2e"],
    replacement: "从输入到输出的流程",
    label: "E2E",
  },
  {
    pattern: /端到端闭环/g,
    aliases: ["端到端闭环"],
    replacement: "从输入到输出的流程",
    label: "端到端闭环",
  },
  {
    pattern: /安全可信体系/g,
    aliases: ["安全可信体系"],
    replacement: "安全相关场景理解",
    label: "安全可信体系",
  },
  {
    pattern: /可信体系/g,
    aliases: ["可信体系"],
    replacement: "结果可靠性验证",
    label: "可信体系",
  },
  {
    pattern: /工程质量体系/g,
    aliases: ["工程质量体系"],
    replacement: "质量验证流程",
    label: "工程质量体系",
  },
  {
    pattern: /质量中台/g,
    aliases: ["质量中台"],
    replacement: "质量验证工具",
    label: "质量中台",
  },
  {
    pattern: /可观测性/g,
    aliases: ["可观测性"],
    replacement: "问题记录与结果检查",
    label: "可观测性",
  },
  {
    pattern: /商业化上线/g,
    aliases: ["商业化上线"],
    replacement: "项目验证",
    label: "商业化上线",
  },
  {
    pattern: /企业级落地/g,
    aliases: ["企业级落地"],
    replacement: "业务场景验证",
    label: "企业级落地",
  },
  {
    pattern: /用户增长闭环/g,
    aliases: ["用户增长闭环"],
    replacement: "用户增长流程",
    label: "用户增长闭环",
  },
  {
    pattern: /全链路/g,
    aliases: ["全链路"],
    replacement: "完整流程",
    label: "全链路",
  },
  {
    pattern: /闭环/g,
    aliases: ["闭环"],
    replacement: "完整流程",
    label: "闭环",
  },
  {
    pattern: /体系化/g,
    aliases: ["体系化"],
    replacement: "结构化",
    label: "体系化",
  },
  {
    pattern: /方法论沉淀/g,
    aliases: ["方法论沉淀"],
    replacement: "经验整理",
    label: "方法论沉淀",
  },
  {
    pattern: /可信/g,
    aliases: ["可信"],
    replacement: "可靠",
    label: "可信",
  },
] as const;

const contextualForbiddenTerms = [
  {
    pattern: /内容分发/g,
    aliases: ["内容分发"],
    replacement: "业务系统",
    label: "内容分发",
  },
  {
    pattern: /内容筛选/g,
    aliases: ["内容筛选"],
    replacement: "信息筛选",
    label: "内容筛选",
  },
  {
    pattern: /策略流控/g,
    aliases: ["策略流控"],
    replacement: "优先级控制",
    label: "策略流控",
  },
  {
    pattern: /推荐决策/g,
    aliases: ["推荐决策"],
    replacement: "优先级决策",
    label: "推荐决策",
  },
  {
    pattern: /搜索推荐/g,
    aliases: ["搜索推荐"],
    replacement: "信息检索与排序",
    label: "搜索推荐",
  },
  {
    pattern: /智能信息流/g,
    aliases: ["智能信息流"],
    replacement: "信息展示流程",
    label: "智能信息流",
  },
  {
    pattern: /信源分级/g,
    aliases: ["信源分级"],
    replacement: "信息来源评估",
    label: "信源分级",
  },
  {
    pattern: /语义行为分析/g,
    aliases: ["语义行为分析"],
    replacement: "用户意图分析",
    label: "语义行为分析",
  },
  {
    pattern: /个性化策略/g,
    aliases: ["个性化策略"],
    replacement: "策略优先级判断",
    label: "个性化策略",
  },
] as const;

export function applyTermSafety({
  resume,
  changeLog,
  jdText,
  analysisResult,
}: ApplyTermSafetyInput): ApplyTermSafetyResult {
  const sourceText = buildAllowedSourceText(jdText, analysisResult);
  const actions = new Set<string>();

  const clean = (value: string) =>
    cleanContextualTerms(cleanUnsafeTerms(value, sourceText, actions), sourceText, actions);

  const safeResume: ResumeData = {
    ...resume,
    skills: resume.skills.map((group) => ({
      ...group,
      label: clean(group.label),
      items: group.items.map(clean),
    })),
    projects: resume.projects.map((project) => ({
      ...project,
      context: clean(project.context),
      bullets: project.bullets.map((bullet) => ({
        ...bullet,
        text: clean(bullet.text),
      })),
    })),
  };

  const safeChangeLog: TailorChangeLog = {
    ...changeLog,
    strengthenedProjects: changeLog.strengthenedProjects.map((project) => ({
      projectName: clean(project.projectName),
      reason: clean(project.reason),
      changes: project.changes.map(clean),
    })),
    weakenedProjects: changeLog.weakenedProjects.map((project) => ({
      projectName: clean(project.projectName),
      reason: clean(project.reason),
      changes: project.changes.map(clean),
    })),
    skillChanges: changeLog.skillChanges.map(clean),
    summaryChanges: changeLog.summaryChanges.map(clean),
    riskWarnings: changeLog.riskWarnings.map(clean),
    truthCheck: {
      ...changeLog.truthCheck,
      warnings: changeLog.truthCheck.warnings.map(clean),
    },
  };

  if (actions.size > 0) {
    safeChangeLog.riskWarnings = appendUnique(
      safeChangeLog.riskWarnings,
      cleanupWarning,
    );
    safeChangeLog.truthCheck = {
      ...safeChangeLog.truthCheck,
      warnings: appendUnique(safeChangeLog.truthCheck.warnings, cleanupWarning),
    };
  }

  return {
    resume: safeResume,
    changeLog: safeChangeLog,
    actions: Array.from(actions),
  };
}

function cleanContextualTerms(
  value: string,
  allowedSourceText: string,
  actions: Set<string>,
) {
  return contextualForbiddenTerms.reduce((nextValue, rule) => {
    if (!rule.pattern.test(nextValue)) {
      rule.pattern.lastIndex = 0;
      return nextValue;
    }

    rule.pattern.lastIndex = 0;

    if (isTermAllowed(rule.aliases, allowedSourceText)) {
      return nextValue;
    }

    actions.add(`移除未在当前 JD 中明确出现的外部行业词：${rule.label}`);
    return nextValue.replace(rule.pattern, rule.replacement);
  }, value);
}

function buildAllowedSourceText(
  jdText: string,
  analysisResult: JDAnalysisResult,
) {
  return normalizeText(
    [
      jdText,
      ...analysisResult.jdHighlights,
      ...analysisResult.requiredAbilities,
      ...analysisResult.preferredAbilities,
    ].join("\n"),
  );
}

function cleanUnsafeTerms(
  value: string,
  allowedSourceText: string,
  actions: Set<string>,
) {
  return riskyTerms.reduce((nextValue, rule) => {
    if (!rule.pattern.test(nextValue)) {
      rule.pattern.lastIndex = 0;
      return nextValue;
    }

    rule.pattern.lastIndex = 0;

    if (isTermAllowed(rule.aliases, allowedSourceText)) {
      return nextValue;
    }

    actions.add(`移除未在 JD 中明确出现的高阶术语：${rule.label}`);
    return nextValue.replace(rule.pattern, rule.replacement);
  }, value);
}

function isTermAllowed(aliases: readonly string[], allowedSourceText: string) {
  return aliases.some((alias) => allowedSourceText.includes(normalizeText(alias)));
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function appendUnique(items: string[], item: string) {
  return Array.from(new Set([...items, item]));
}
