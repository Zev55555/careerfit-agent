import type { ResumeData } from "@/lib/resume-schema";

const defaultDeprecatedProjectNames = [
  "AI Exposure",
  "AI Exposure 与编程职业就业前景分析",
  "编程职业就业前景分析",
  "InsightFlow",
  "InsightFlow AI",
  "InsightFlow AI 数据分析业务流程助手",
  "AI 数据分析业务流程助手",
];

export function getDefaultDeprecatedProjectNames() {
  return [...defaultDeprecatedProjectNames];
}

export function isDeprecatedProjectName(projectName: string): boolean {
  const normalizedName = normalizeProjectName(projectName);

  if (!normalizedName) {
    return false;
  }

  return defaultDeprecatedProjectNames.some((deprecatedName) => {
    const normalizedDeprecatedName = normalizeProjectName(deprecatedName);

    return (
      normalizedName.includes(normalizedDeprecatedName) ||
      normalizedDeprecatedName.includes(normalizedName)
    );
  });
}

export function filterDeprecatedProjects(resumeData: ResumeData): {
  resumeData: ResumeData;
  removedProjects: string[];
} {
  const removedProjects: string[] = [];
  const projects = resumeData.projects.filter((project) => {
    if (isDeprecatedProjectName(project.name)) {
      removedProjects.push(project.name);
      return false;
    }

    return true;
  });

  return {
    resumeData: {
      ...resumeData,
      projects,
    },
    removedProjects: Array.from(new Set(removedProjects)),
  };
}

function normalizeProjectName(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s｜|/\\:：\-—_]+/g, "")
    .trim();
}
