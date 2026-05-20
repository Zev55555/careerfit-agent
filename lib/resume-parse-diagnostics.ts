import {
  getDefaultDeprecatedProjectNames,
  isDeprecatedProjectName,
} from "@/lib/deprecated-projects";
import type { ResumeData } from "@/lib/resume-schema";

export type ResumeParseDiagnostics = {
  checked: boolean;
  warnings: string[];
  detectedProjectNames: string[];
  duplicateProjectNames: string[];
  suspiciousOldProjects: string[];
  removedDeprecatedProjects?: string[];
  rawTextPreview?: string;
};

export function runResumeParseDiagnostics({
  rawText,
  parsedResume,
  removedDeprecatedProjects = [],
}: {
  rawText: string;
  parsedResume: ResumeData;
  removedDeprecatedProjects?: string[];
}): ResumeParseDiagnostics {
  const detectedProjectNames = Array.from(
    new Set(
      parsedResume.projects.map((project) => project.name.trim()).filter(Boolean),
    ),
  );
  const duplicateProjectNames = findDuplicateProjectNames(
    rawText,
    detectedProjectNames,
  );
  const suspiciousOldProjects = getDefaultDeprecatedProjectNames().filter(
    (name) => includesText(rawText, name),
  );
  const warnings: string[] = [];
  const isolatedBulletCount = countIsolatedBullets(rawText);
  const normalizedRemovedProjects = Array.from(
    new Set(removedDeprecatedProjects.filter(Boolean)),
  );

  if (suspiciousOldProjects.length > 0) {
    warnings.push(
      `PDF 文本层中仍检测到旧项目名称：${summarizeDeprecatedNames(suspiciousOldProjects)}。可能是导出了旧版本 PDF，或 PDF 内存在隐藏/重复文本层。`,
    );
  }

  if (normalizedRemovedProjects.length > 0) {
    warnings.push(
      `PDF 文本层中检测到旧项目残留，并已从本次解析结果中过滤：${summarizeDeprecatedNames(normalizedRemovedProjects)}。若这是误删，可在 Resume Editor 中手动恢复。`,
    );
  }

  if (duplicateProjectNames.length > 0) {
    warnings.push(
      `检测到重复项目标题：${duplicateProjectNames.join("、")}。可能存在 PDF 文本层重复。`,
    );
  }

  if (isolatedBulletCount >= 8) {
    warnings.push("检测到较多孤立 bullet 符号，建议从源文件重新导出 PDF 后再上传。");
  }

  if (parsedResume.projects.length > 6) {
    warnings.push("解析到的项目数量超过 6 个，请检查是否有重复解析或旧内容残留。");
  }

  return {
    checked: true,
    warnings,
    detectedProjectNames,
    duplicateProjectNames,
    suspiciousOldProjects: Array.from(new Set(suspiciousOldProjects)),
    removedDeprecatedProjects: normalizedRemovedProjects,
    rawTextPreview: rawText.slice(0, 1200),
  };
}

function findDuplicateProjectNames(rawText: string, projectNames: string[]) {
  return projectNames.filter((name) => countOccurrences(rawText, name) > 1);
}

function countOccurrences(text: string, needle: string) {
  if (!needle) {
    return 0;
  }

  return text.toLowerCase().split(needle.toLowerCase()).length - 1;
}

function countIsolatedBullets(text: string) {
  return text.split(/\r?\n/).filter((line) => /^[\s•·-]+$/.test(line.trim()))
    .length;
}

function includesText(text: string, needle: string) {
  if (!needle) {
    return false;
  }

  return (
    text.toLowerCase().includes(needle.toLowerCase()) ||
    (isDeprecatedProjectName(needle) &&
      getDeprecatedAliases(needle).some((alias) =>
        text.toLowerCase().includes(alias.toLowerCase()),
      ))
  );
}

function getDeprecatedAliases(projectName: string) {
  if (/ai exposure/i.test(projectName) || projectName.includes("编程职业")) {
    return ["AI Exposure", "编程职业就业前景分析"];
  }

  if (/insightflow/i.test(projectName) || projectName.includes("数据分析业务流程")) {
    return ["InsightFlow", "AI 数据分析业务流程助手"];
  }

  return [projectName];
}

function summarizeDeprecatedNames(projectNames: string[]) {
  const hasAiExposure = projectNames.some(
    (name) => /ai exposure/i.test(name) || name.includes("编程职业"),
  );
  const hasInsightFlow = projectNames.some(
    (name) => /insightflow/i.test(name) || name.includes("数据分析业务流程"),
  );
  const summary = [
    hasAiExposure ? "AI Exposure" : null,
    hasInsightFlow ? "InsightFlow" : null,
  ].filter(Boolean);

  return summary.length > 0
    ? summary.join("、")
    : Array.from(new Set(projectNames)).join("、");
}
