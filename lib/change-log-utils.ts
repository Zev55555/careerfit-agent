import type { TailorChangeLog, TailorProjectChange } from "@/lib/resume-schema";

export type DisplayChangeLog = {
  summary: string;
  strengthened: TailorProjectChange[];
  weakened: TailorProjectChange[];
  skillChanges: string[];
  riskWarnings: string[];
  truthPassed: boolean;
  truthWarnings: string[];
  fullLog: TailorChangeLog;
};

export function normalizeChangeLogForDisplay(
  changeLog: TailorChangeLog,
): DisplayChangeLog {
  const fullLog = changeLog;
  const summary =
    firstMeaningful(changeLog.summaryChanges) ||
    "本次简历已根据 JD 调整技能、项目顺序和项目 bullet 表达。";
  const weakened = collapseWeakenedChanges(changeLog.weakenedProjects).slice(0, 3);

  return {
    summary,
    strengthened: dedupeProjectChanges(changeLog.strengthenedProjects)
      .map(limitProjectChange)
      .slice(0, 3),
    weakened,
    skillChanges: uniqueStrings(changeLog.skillChanges).slice(0, 3),
    riskWarnings: normalizeRisks([
      ...changeLog.riskWarnings,
      ...changeLog.truthCheck.warnings,
    ]).slice(0, 5),
    truthPassed: changeLog.truthCheck.passed,
    truthWarnings: normalizeRisks(changeLog.truthCheck.warnings).slice(0, 3),
    fullLog,
  };
}

function collapseWeakenedChanges(items: TailorProjectChange[]) {
  const grouped = new Map<string, TailorProjectChange[]>();

  for (const item of items) {
    const key = item.projectName.trim() || "其他调整";
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return Array.from(grouped.entries()).map(([projectName, changes]) => {
    const deleteChange =
      changes.find((item) => isDeleteAction(item.reason, item.changes)) ?? changes[0];
    const mergedChanges = uniqueStrings(
      (isDeleteAction(deleteChange.reason, deleteChange.changes)
        ? deleteChange.changes
        : changes.flatMap((item) => item.changes)
      ).map(cleanSentence),
    );

    return {
      projectName,
      reason: cleanSentence(deleteChange.reason),
      changes: mergedChanges.slice(0, 2),
    };
  });
}

function dedupeProjectChanges(items: TailorProjectChange[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.projectName}|${item.reason}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function limitProjectChange(item: TailorProjectChange): TailorProjectChange {
  return {
    projectName: item.projectName,
    reason: cleanSentence(item.reason),
    changes: uniqueStrings(item.changes.map(cleanSentence)).slice(0, 2),
  };
}

function normalizeRisks(items: string[]) {
  return uniqueStrings(items.map(normalizeRiskSentence)).filter(Boolean);
}

function normalizeRiskSentence(value: string) {
  const cleaned = cleanSentence(value);

  if (!cleaned) {
    return "";
  }

  if (/^把.+写成.+/.test(cleaned)) {
    return `不要${cleaned.replace(/^把/, "把").replace(/。$/, "")}。`;
  }

  if (/^把.+说成.+/.test(cleaned)) {
    return `不要${cleaned.replace(/^把/, "把").replace(/。$/, "")}。`;
  }

  if (/^(模型训练|模型微调|算法研发|商业化上线|百万用户)/.test(cleaned)) {
    return `不要编造或暗示${cleaned.replace(/。$/, "")}经历。`;
  }

  return /[。.!！]$/.test(cleaned) ? cleaned : `${cleaned}。`;
}

function cleanSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isDeleteAction(reason: string, changes: string[]) {
  return /删除|移除|removed?|delete/i.test([reason, ...changes].join(" "));
}

function firstMeaningful(items: string[]) {
  return uniqueStrings(items.map(cleanSentence)).find((item) => item.length > 0) ?? "";
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.map(cleanSentence).filter(Boolean)));
}
