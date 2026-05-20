import { NextResponse } from "next/server";
import type { AtsReviewResult } from "@/lib/ats-review-schema";
import { createFallbackAtsReview } from "@/lib/ats-review-schema";
import {
  buildAtsGuidanceFromReview,
  runAtsKeywordReview,
} from "@/lib/ats-keyword-review";
import { tailorResumeWithAI } from "@/lib/ai-resume-tailor";
import {
  hasCustomRoleIntent,
  normalizeCustomRoleInput,
} from "@/lib/custom-role";
import { isOpenAiConfigured } from "@/lib/openai-config";
import {
  ensureProjectBridgeBullets,
  ensureProjectEvidenceRewrite,
} from "@/lib/project-evidence-guardrail";
import { preserveEducationDetailsFromSources } from "@/lib/education-preservation";
import { ensureProductTransitDecisionChain } from "@/lib/product-transit-guardrail";
import { validateJDAnalysisResult } from "@/lib/jd-analysis-schema";
import type { ApiRole, JDAnalysisResult } from "@/lib/role-classifier";
import { applyResumeContentBudget } from "@/lib/resume-content-budget";
import type { ResumeQualityReview } from "@/lib/resume-quality-audit-schema";
import {
  createFinalQualityReview,
  createFallbackQualityAudit,
  createQualityReview,
} from "@/lib/resume-quality-audit-schema";
import {
  applySafeQualityFixes,
  runResumeQualityAudit,
} from "@/lib/resume-quality-rules";
import type { ResumeData, TailorChangeLog } from "@/lib/resume-schema";
import { tailorResumeMock } from "@/lib/resume-tailor";
import { validateTailorResult } from "@/lib/tailor-result-schema";
import { applyTermSafety } from "@/lib/term-safety";
import { checkResumeTruthfulness } from "@/lib/truth-checker";
import type { ResumeComparisonReview } from "@/lib/resume-comparison-schema";
import { createFallbackComparisonReview } from "@/lib/resume-comparison-schema";
import { runResumeComparisonReview } from "@/lib/resume-comparison-review";
import { repairResumeWithHybrid } from "@/lib/ai-resume-hybrid-repair";
import {
  createFallbackHybridRepairLog,
  type HybridRepairLog,
} from "@/lib/resume-hybrid-repair-schema";

type TailorableApiRole = Exclude<ApiRole, "OTHER">;

type TailorResumeRequest = {
  jdText?: unknown;
  selectedRole?: unknown;
  customRoleInput?: unknown;
  analysisResult?: unknown;
  resume?: unknown;
};

type FinalizeContext = {
  selectedRole: TailorableApiRole;
  analysisResult: JDAnalysisResult;
  jdText: string;
  masterResume: ResumeData;
};

const validRoles: TailorableApiRole[] = [
  "AI_PRODUCT_MANAGER",
  "AI_AGENT_APPLICATION",
  "LLM_APPLICATION_PRODUCT",
  "AUTO_DETECT_ROLE",
  "CUSTOM_ROLE",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TailorResumeRequest;
    const jdText = typeof body.jdText === "string" ? body.jdText : "";
    const selectedRole = parseSelectedRole(body.selectedRole);
    const customRoleInput = normalizeCustomRoleInput(
      typeof body.customRoleInput === "object" && body.customRoleInput
        ? body.customRoleInput
        : undefined,
    );
    const rawAnalysisResult = body.analysisResult as JDAnalysisResult | undefined;
    const resume = body.resume as ResumeData | undefined;

    if (!jdText.trim()) {
      return NextResponse.json(
        { error: "JD 不能为空，请先粘贴并分析岗位描述。" },
        { status: 400 },
      );
    }

    if (!rawAnalysisResult) {
      return NextResponse.json(
        { error: "缺少 JD 分析结果，请先点击分析 JD。" },
        { status: 400 },
      );
    }

    if (selectedRole === "CUSTOM_ROLE" && !hasCustomRoleIntent(customRoleInput)) {
      return NextResponse.json(
        { error: "请填写自定义岗位名称或修改偏好。" },
        { status: 400 },
      );
    }

    if (!resume?.profile || !Array.isArray(resume.projects)) {
      return NextResponse.json(
        { error: "缺少可定制的 resume JSON。" },
        { status: 400 },
      );
    }

    const analysisResult = validateJDAnalysisResult(rawAnalysisResult);
    const context: FinalizeContext = {
      selectedRole,
      analysisResult,
      jdText,
      masterResume: resume,
    };
    const preTailorAtsReview = runPreTailorAtsReview(context);
    const atsGuidance = buildAtsGuidanceFromReview(preTailorAtsReview);

    if (isOpenAiConfigured()) {
      try {
        const aiResult = await tailorResumeWithAI({
          resume,
          selectedRole,
          customRoleInput,
          analysisResult,
          jdText,
          atsGuidance,
        });

        return NextResponse.json({
          ...(await finalizeTailorResult(validateTailorResult(aiResult, resume), context)),
          tailor: "ai",
        });
      } catch (error) {
        return NextResponse.json({
          ...(await finalizeTailorResult(
            validateTailorResult(
              tailorResumeMock({
                resume,
                selectedRole,
                customRoleInput,
                analysisResult,
                jdText,
                atsGuidance,
              }),
              resume,
            ),
            context,
          )),
          tailor: "mock",
          fallbackReason: buildFallbackReason(error),
        });
      }
    }

    return NextResponse.json({
      ...(await finalizeTailorResult(
        validateTailorResult(
          tailorResumeMock({
            resume,
            selectedRole,
            customRoleInput,
            analysisResult,
            jdText,
            atsGuidance,
          }),
          resume,
        ),
        context,
      )),
      tailor: "mock",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "简历定制生成失败，请检查输入。";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function parseSelectedRole(value: unknown): TailorableApiRole {
  if (typeof value === "string" && validRoles.includes(value as TailorableApiRole)) {
    return value as TailorableApiRole;
  }

  return "AI_PRODUCT_MANAGER";
}

async function finalizeTailorResult(
  result: {
    tailoredResume: ResumeData;
    changeLog: TailorChangeLog;
  },
  context: FinalizeContext,
) {
  const initial = buildStableFinalState(result, context);

  if (!initial.comparisonReview.shouldGenerateHybrid) {
    return {
      ...initial,
      finalDecision: buildFinalDecision(initial.qualityReview, initial.comparisonReview),
    };
  }

  try {
    const hybridRepair = await repairResumeWithHybrid({
      jdText: context.jdText,
      jdAnalysis: context.analysisResult,
      masterResume: context.masterResume,
      tailoredResume: initial.tailoredResume,
      comparisonReview: initial.comparisonReview,
      atsReview: initial.atsReview,
      qualityReview: initial.qualityReview,
    });
    const hybridChangeLog = appendHybridWarnings(
      initial.changeLog,
      hybridRepair.repairLog,
    );
    const hybridResult = validateTailorResult(
      {
        tailoredResume: hybridRepair.hybridResume,
        changeLog: hybridChangeLog,
      },
      context.masterResume,
    );
    const final = buildStableFinalState(hybridResult, context);

    return {
      ...final,
      hybridRepairLog: hybridRepair.repairLog,
      finalDecision: buildHybridFinalDecision(
        final.qualityReview,
        hybridRepair.repairLog,
      ),
    };
  } catch (error) {
    const fallbackReason =
      error instanceof Error
        ? `Hybrid 修复失败，已保留质检后的定制版本：${sanitizeErrorMessage(error.message)}`
        : "Hybrid 修复失败，已保留质检后的定制版本。";
    const hybridRepairLog = createFallbackHybridRepairLog(fallbackReason);

    return {
      ...initial,
      hybridRepairLog,
      finalDecision: {
        selectedVersion: "repaired" as const,
        reason: fallbackReason,
        safetyPassed: initial.qualityReview.highRiskCount === 0,
      },
    };
  }
}

function buildStableFinalState(
  result: {
    tailoredResume: ResumeData;
    changeLog: TailorChangeLog;
  },
  context: FinalizeContext,
) {
  const preBudgetProjectEvidence = ensureProjectEvidenceRewrite({
    resume: result.tailoredResume,
    jdText: context.jdText,
    jdAnalysis: context.analysisResult,
    selectedRole: context.selectedRole,
  });
  const preBudgetTransit = ensureProductTransitDecisionChain({
    resume: preBudgetProjectEvidence.resume,
    masterResume: context.masterResume,
    jdText: context.jdText,
    jdAnalysis: context.analysisResult,
    selectedRole: context.selectedRole,
  });
  const preBudgetBridge = ensureProjectBridgeBullets({
    resume: preBudgetTransit.resume,
    masterResume: context.masterResume,
    jdText: context.jdText,
    jdAnalysis: context.analysisResult,
    selectedRole: context.selectedRole,
  });
  const resultWithTransit: {
    tailoredResume: ResumeData;
    changeLog: TailorChangeLog;
  } = {
    tailoredResume: preBudgetBridge.resume,
    changeLog: appendSummaryChanges(result.changeLog, [
      ...preBudgetProjectEvidence.actions,
      ...preBudgetTransit.actions,
      ...preBudgetBridge.actions,
    ]),
  };
  const quality = runQualityGuardrail(resultWithTransit, context);
  const truthCheck = checkResumeTruthfulness(quality.resume);
  const budget = applyResumeContentBudget({
    resume: quality.resume,
    selectedRole: context.selectedRole,
    analysisResult: context.analysisResult,
    jdText: context.jdText,
  });
  const postBudgetTransit = ensureProductTransitDecisionChain({
    resume: budget.resume,
    masterResume: context.masterResume,
    jdText: context.jdText,
    jdAnalysis: context.analysisResult,
    selectedRole: context.selectedRole,
  });
  const postBudgetProjectEvidence = ensureProjectEvidenceRewrite({
    resume: postBudgetTransit.resume,
    jdText: context.jdText,
    jdAnalysis: context.analysisResult,
    selectedRole: context.selectedRole,
  });
  const postBudgetBridge = ensureProjectBridgeBullets({
    resume: postBudgetProjectEvidence.resume,
    masterResume: context.masterResume,
    jdText: context.jdText,
    jdAnalysis: context.analysisResult,
    selectedRole: context.selectedRole,
  });
  const budgetResume = postBudgetBridge.resume;
  const budgetActions = Array.from(
    new Set([
      ...budget.actions,
      ...postBudgetTransit.actions,
      ...postBudgetProjectEvidence.actions,
      ...postBudgetBridge.actions,
    ]),
  );
  const budgetProjectChanges = buildBudgetProjectChanges(budget.actions);
  const riskWarnings = buildRiskWarnings({
    changeLog: quality.changeLog,
    truthCheckWarnings: truthCheck.warnings,
    budgetWarnings: budget.warnings,
    qualityReview: quality.qualityReview,
    roleMismatchWarning:
      context.analysisResult.roleMismatch?.hasMismatch &&
      context.analysisResult.roleMismatch.severity === "high"
        ? "当前 JD 与所选定制方向存在冲突，本次仍按用户选择方向定制。"
        : "",
  });
  const changeLog: TailorChangeLog = {
    ...quality.changeLog,
    weakenedProjects: [
      ...quality.changeLog.weakenedProjects,
      ...budgetProjectChanges,
    ],
    summaryChanges: Array.from(
      new Set([...quality.changeLog.summaryChanges, ...budgetActions]),
    ),
    riskWarnings,
    truthCheck: {
      passed:
        quality.changeLog.truthCheck.passed &&
        truthCheck.passed &&
        quality.qualityReview.highRiskCount === 0,
      warnings: riskWarnings,
    },
  };
  const termSafety = applyTermSafety({
    resume: budgetResume,
    changeLog,
    jdText: context.jdText,
    analysisResult: context.analysisResult,
  });
  const finalChangeLog: TailorChangeLog = {
    ...termSafety.changeLog,
    summaryChanges: Array.from(
      new Set([...termSafety.changeLog.summaryChanges, ...termSafety.actions]),
    ),
  };
  const protectedFinalResume = restoreMasterBasics(
    termSafety.resume,
    context.masterResume,
  );
  const finalQualityReview = runFinalQualityAudit({
    resume: protectedFinalResume,
    context,
    quality,
  });
  const atsReview = runSafeAtsReview({
    resume: protectedFinalResume,
    context,
    qualityReview: finalQualityReview,
  });
  const comparisonReview = runSafeComparisonReview({
    resume: protectedFinalResume,
    context,
    qualityReview: finalQualityReview,
    atsReview,
  });
  const finalChangeLogWithAts = appendComparisonWarnings(
    appendAtsWarnings(finalChangeLog, atsReview),
    comparisonReview,
  );

  return {
    tailoredResume: protectedFinalResume,
    changeLog: finalChangeLogWithAts,
    qualityReview: finalQualityReview,
    atsReview,
    comparisonReview,
  };
}

function restoreMasterBasics(resume: ResumeData, masterResume: ResumeData): ResumeData {
  return preserveEducationDetailsFromSources({
    ...resume,
    profile: {
      ...resume.profile,
      name: masterResume.profile.name,
      email: masterResume.profile.email,
      phone: masterResume.profile.phone,
      links: masterResume.profile.links,
      headline: masterResume.profile.headline ?? resume.profile.headline,
      title: masterResume.profile.title ?? resume.profile.title,
      targetTitle: masterResume.profile.targetTitle ?? resume.profile.targetTitle,
      location: masterResume.profile.location ?? resume.profile.location,
    },
    education: masterResume.education.map((item) => ({ ...item })),
    notes: resume.notes?.length ? resume.notes : masterResume.notes,
    rawText: resume.rawText ?? masterResume.rawText,
  }, masterResume);
}

function appendSummaryChanges(
  changeLog: TailorChangeLog,
  changes: string[],
): TailorChangeLog {
  if (changes.length === 0) {
    return changeLog;
  }

  return {
    ...changeLog,
    summaryChanges: Array.from(
      new Set([...changeLog.summaryChanges, ...changes]),
    ),
  };
}

function runQualityGuardrail(
  result: {
    tailoredResume: ResumeData;
    changeLog: TailorChangeLog;
  },
  context: FinalizeContext,
): {
  resume: ResumeData;
  changeLog: TailorChangeLog;
  beforeAudit: ReturnType<typeof runResumeQualityAudit>;
  qualityReview: ResumeQualityReview;
} {
  try {
    const before = runResumeQualityAudit({
      resume: result.tailoredResume,
      changeLog: result.changeLog,
      jdText: context.jdText,
      masterResume: context.masterResume,
    });
    const safeFix = applySafeQualityFixes(result.tailoredResume, before, {
      changeLog: result.changeLog,
      masterResume: context.masterResume,
    });
    const fixedChangeLog = safeFix.changeLog ?? result.changeLog;
    const after = runResumeQualityAudit({
      resume: safeFix.resume,
      changeLog: fixedChangeLog,
      jdText: context.jdText,
      masterResume: context.masterResume,
    });

    return {
      resume: safeFix.resume,
      changeLog: fixedChangeLog,
      beforeAudit: before,
      qualityReview: createQualityReview({
        before,
        after,
        fixedIssues: safeFix.fixedIssues,
      }),
    };
  } catch {
    const fallback = createFallbackQualityAudit();

    return {
      resume: result.tailoredResume,
      changeLog: result.changeLog,
      beforeAudit: fallback,
      qualityReview: createQualityReview({
        before: fallback,
        after: fallback,
        fixedIssues: [],
      }),
    };
  }
}

function runFinalQualityAudit({
  resume,
  context,
  quality,
}: {
  resume: ResumeData;
  context: FinalizeContext;
  quality: {
    beforeAudit: ReturnType<typeof runResumeQualityAudit>;
    qualityReview: ResumeQualityReview;
  };
}) {
  try {
    const finalAudit = runResumeQualityAudit({
      resume,
      jdText: context.jdText,
      masterResume: context.masterResume,
    });

    return createFinalQualityReview({
      before: quality.beforeAudit,
      final: finalAudit,
      fixedIssues: quality.qualityReview.fixedIssues,
      repaired: quality.qualityReview.repaired,
    });
  } catch {
    const fallback = createFallbackQualityAudit(
      "最终质检执行失败，已保留当前定制结果。",
    );

    return createFinalQualityReview({
      before: quality.beforeAudit,
      final: fallback,
      fixedIssues: quality.qualityReview.fixedIssues,
      repaired: quality.qualityReview.repaired,
    });
  }
}

function runSafeAtsReview({
  resume,
  context,
  qualityReview,
}: {
  resume: ResumeData;
  context: FinalizeContext;
  qualityReview: ResumeQualityReview;
}) {
  try {
    return runAtsKeywordReview({
      jdText: context.jdText,
      jdAnalysis: context.analysisResult,
      masterResume: context.masterResume,
      tailoredResume: resume,
      qualityReview,
    });
  } catch {
    return createFallbackAtsReview();
  }
}

function runPreTailorAtsReview(context: FinalizeContext) {
  try {
    return runAtsKeywordReview({
      jdText: context.jdText,
      jdAnalysis: context.analysisResult,
      masterResume: context.masterResume,
      tailoredResume: context.masterResume,
    });
  } catch {
    return createFallbackAtsReview();
  }
}

function appendAtsWarnings(
  changeLog: TailorChangeLog,
  atsReview: AtsReviewResult,
): TailorChangeLog {
  const warnings = new Set(changeLog.riskWarnings);

  if (atsReview.checked) {
    warnings.add("已完成 ATS 关键词覆盖检查，核心关键词将以证据支撑为前提自然使用。");
  }

  if (atsReview.missingImportantKeywords.length > 0) {
    warnings.add("部分重要关键词缺少明确证据，未强行写入简历正文。");
  }

  const riskWarnings = Array.from(warnings);

  return {
    ...changeLog,
    riskWarnings,
    truthCheck: {
      ...changeLog.truthCheck,
      warnings: Array.from(new Set([...changeLog.truthCheck.warnings, ...riskWarnings])),
    },
  };
}

function runSafeComparisonReview({
  resume,
  context,
  qualityReview,
  atsReview,
}: {
  resume: ResumeData;
  context: FinalizeContext;
  qualityReview: ResumeQualityReview;
  atsReview: AtsReviewResult;
}) {
  try {
    return runResumeComparisonReview({
      jdText: context.jdText,
      jdAnalysis: context.analysisResult,
      masterResume: context.masterResume,
      tailoredResume: resume,
      qualityReview,
      atsReview,
    });
  } catch {
    return createFallbackComparisonReview();
  }
}

function appendComparisonWarnings(
  changeLog: TailorChangeLog,
  comparisonReview: ResumeComparisonReview,
): TailorChangeLog {
  const warnings = new Set(changeLog.riskWarnings);

  if (comparisonReview.checked && comparisonReview.winner === "tailored") {
    warnings.add("改前改后对比通过，定制版整体优于 Master。");
  }

  if (
    comparisonReview.checked &&
    (comparisonReview.winner === "hybrid_recommended" ||
      comparisonReview.winner === "master")
  ) {
    warnings.add(
      "改前改后对比发现定制版可能丢失部分 Master 强证据，建议后续生成混合修复版。",
    );
  }

  const riskWarnings = Array.from(warnings);

  return {
    ...changeLog,
    riskWarnings,
    truthCheck: {
      ...changeLog.truthCheck,
      warnings: Array.from(new Set([...changeLog.truthCheck.warnings, ...riskWarnings])),
    },
  };
}

function appendHybridWarnings(
  changeLog: TailorChangeLog,
  repairLog: HybridRepairLog,
): TailorChangeLog {
  const warnings = new Set(changeLog.riskWarnings);
  const summaryChanges = new Set(changeLog.summaryChanges);

  if (repairLog.repaired) {
    warnings.add(
      "改前改后对比发现部分 Master 强证据被弱化，已生成混合修复版并恢复关键证据。",
    );
    summaryChanges.add(repairLog.summary);
  }

  if (repairLog.fallbackReason) {
    warnings.add(repairLog.fallbackReason);
  }

  const riskWarnings = Array.from(warnings);

  return {
    ...changeLog,
    summaryChanges: Array.from(summaryChanges),
    riskWarnings,
    truthCheck: {
      ...changeLog.truthCheck,
      warnings: Array.from(new Set([...changeLog.truthCheck.warnings, ...riskWarnings])),
    },
  };
}

function buildFinalDecision(
  qualityReview: ResumeQualityReview,
  comparisonReview: ResumeComparisonReview,
) {
  const safetyPassed = qualityReview.highRiskCount === 0;

  if (comparisonReview.shouldGenerateHybrid) {
    return {
      selectedVersion: "hybrid_recommended" as const,
      reason:
        comparisonReview.summary ||
        "改前改后对比建议后续生成混合修复版，但本阶段仍返回当前最终定制版。",
      safetyPassed,
    };
  }

  if (qualityReview.repaired) {
    return {
      selectedVersion: "repaired" as const,
      reason: "已采用规则质检修复后的定制版本。",
      safetyPassed,
    };
  }

  return {
    selectedVersion: "tailored" as const,
    reason: "定制版通过当前质量检查与改前改后对比。",
    safetyPassed,
  };
}

function buildHybridFinalDecision(
  qualityReview: ResumeQualityReview,
  repairLog: HybridRepairLog,
) {
  const safetyPassed = qualityReview.highRiskCount === 0;

  if (repairLog.repaired) {
    return {
      selectedVersion: "hybrid" as const,
      reason:
        "定制版存在强证据丢失，已恢复 Master 中与当前 JD 相关的关键证据。",
      safetyPassed,
    };
  }

  return {
    selectedVersion: "repaired" as const,
    reason:
      repairLog.fallbackReason ||
      "建议生成混合修复版，但未找到可安全恢复的 Master 强证据，已保留质检后的定制版本。",
    safetyPassed,
  };
}

function buildRiskWarnings({
  changeLog,
  truthCheckWarnings,
  budgetWarnings,
  qualityReview,
  roleMismatchWarning,
}: {
  changeLog: TailorChangeLog;
  truthCheckWarnings: string[];
  budgetWarnings: string[];
  qualityReview: ResumeQualityReview;
  roleMismatchWarning: string;
}) {
  return Array.from(
    new Set([
      ...changeLog.riskWarnings,
      ...changeLog.truthCheck.warnings,
      ...truthCheckWarnings,
      ...budgetWarnings,
      ...(qualityReview.issueCount > 0
        ? ["已完成规则质检，发现可能的 JD 复制、过度包装或 AI 痕迹表达。"]
        : []),
      ...(qualityReview.fixedIssues.length > 0
        ? ["已自动降级或清理部分高风险表达，避免 JD 复制、过度包装或 AI 痕迹。"]
        : []),
      ...(roleMismatchWarning ? [roleMismatchWarning] : []),
    ]),
  );
}

function buildBudgetProjectChanges(actions: string[]) {
  return actions
    .filter((action) => /[:：锛]/.test(action))
    .map((action) => {
      const [projectName, ...rest] = action.split(/[:：锛]/);

      return {
        projectName: projectName.trim(),
        reason: rest.join("：").trim(),
        changes: [action],
      };
    });
}

function buildFallbackReason(error: unknown) {
  if (!(error instanceof Error)) {
    return "AI 定制失败，已切换到 mock 定制。";
  }

  return `AI 定制失败，已切换到 mock 定制：${sanitizeErrorMessage(error.message)}`;
}

function sanitizeErrorMessage(message: string) {
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 240);
}
