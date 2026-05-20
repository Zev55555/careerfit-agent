import type { JDAnalysisResult } from "@/lib/role-classifier";
import type { ResumeData, ResumeProject } from "@/lib/resume-schema";
import {
  countEvidenceChainElements,
  getProtectedEvidencePatterns,
  isProtectedEvidenceText,
  type ProtectedEvidencePatterns,
} from "@/lib/strong-evidence-patterns";

type ApplyResumeContentBudgetInput = {
  resume: ResumeData;
  selectedRole?: string;
  analysisResult?: JDAnalysisResult;
  jdText?: string;
};

type ApplyResumeContentBudgetResult = {
  resume: ResumeData;
  actions: string[];
  warnings: string[];
};

const maxProjects = 4;
const maxEstimatedLines = 78;

export function applyResumeContentBudget({
  resume,
  selectedRole,
  analysisResult,
  jdText = "",
}: ApplyResumeContentBudgetInput): ApplyResumeContentBudgetResult {
  const actions: string[] = [];
  const warnings: string[] = [];
  const projectPriority = analysisResult?.resumeThesis.projectPriority ?? [];
  const evidenceProjects = buildEvidenceProjectMap(analysisResult);
  const protectedPatterns = getProtectedEvidencePatterns(
    jdText,
    analysisResult,
    selectedRole,
  );
  let projects = resume.projects.map((project) =>
    capProjectBullets(project, actions, protectedPatterns),
  );

  if (
    protectedPatterns.productDataJd &&
    projects.some((project) => isTransitProject(project.name))
  ) {
    actions.push(
      "产品类岗位已保留 UCSD Triton Transit 的产品决策链路，包括问题定义、Evening Service Gap Score 指标设计和排班优化建议。",
    );
  }

  if (projects.length > maxProjects) {
    const removed = pickProjectsToRemove(
      projects,
      projects.length - maxProjects,
      projectPriority,
      evidenceProjects,
      protectedPatterns,
    );
    const removedIds = new Set(removed.map((project) => project.id));
    projects = projects.filter((project) => !removedIds.has(project.id));

    for (const project of removed) {
      actions.push(
        `${project.name}：与当前 JD 相关性较低或优先级靠后，为保证一页完整展示而移除。`,
      );
      if (isAiExposureProject(project.name)) {
        actions.push(
          "AI Exposure：与当前 JD 相关性较低且为最低优先级项目，为保证一页完整展示而移除。",
        );
      }
    }
  }

  projects = trimByEstimatedLines(
    projects,
    resume,
    projectPriority,
    evidenceProjects,
    protectedPatterns,
    actions,
  );

  if (estimateResumeLines({ ...resume, projects }) > maxEstimatedLines) {
    warnings.push(
      "已进行一页内容预算控制，但内容仍可能接近页面底部，请导出前确认一页适配状态。",
    );
  }

  if (actions.length > 0) {
    actions.unshift("已进行一页内容预算控制，避免项目或 bullet 在 PDF 底部被截断。");
  }

  return {
    resume: {
      ...resume,
      projects,
    },
    actions: Array.from(new Set(actions)),
    warnings: Array.from(new Set(warnings)),
  };
}

function capProjectBullets(
  project: ResumeProject,
  actions: string[],
  protectedPatterns: ProtectedEvidencePatterns,
) {
  if (hasPrimaryOrSecondaryBridge(project)) {
    return project;
  }

  const maxBulletsForProject = getMaxBulletsForProject(
    project.name,
    protectedPatterns,
  );

  if (project.bullets.length <= maxBulletsForProject) {
    return project;
  }

  actions.push(
    `${project.name}：bullet 从 ${project.bullets.length} 条压缩到 ${maxBulletsForProject} 条，保留完整要点，避免底部截断。`,
  );

  return {
    ...project,
    bullets: pickBulletsToKeep(project, maxBulletsForProject, protectedPatterns),
  };
}

function pickBulletsToKeep(
  project: ResumeProject,
  limit: number,
  protectedPatterns: ProtectedEvidencePatterns,
) {
  const scored = project.bullets.map((bullet, index) => ({
    bullet,
    index,
    score: getBulletProtectionScore(
      project.name,
      bullet.text,
      protectedPatterns,
      bullet.tags,
    ),
  }));
  const picked = new Set<number>();

  scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .forEach((item) => picked.add(item.index));

  for (const item of scored) {
    if (picked.size >= limit) {
      break;
    }

    picked.add(item.index);
  }

  return scored
    .filter((item) => picked.has(item.index))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.bullet);
}

function trimByEstimatedLines(
  projects: ResumeProject[],
  resume: ResumeData,
  projectPriority: string[],
  evidenceProjects: Map<string, number>,
  protectedPatterns: ProtectedEvidencePatterns,
  actions: string[],
) {
  let nextProjects = projects;

  while (
    estimateResumeLines({ ...resume, projects: nextProjects }) > maxEstimatedLines
  ) {
    const targetProject = [...nextProjects]
      .filter((project) => hasRemovableBullet(project, protectedPatterns))
      .sort(
        (a, b) =>
          getProjectPriorityScore(b, projectPriority, evidenceProjects, protectedPatterns) -
          getProjectPriorityScore(a, projectPriority, evidenceProjects, protectedPatterns),
      )[0];

    if (!targetProject) {
      const removable = [...nextProjects]
        .filter((project) => !isProtectedProject(project.name, protectedPatterns))
        .sort(
          (a, b) =>
            getProjectPriorityScore(b, projectPriority, evidenceProjects, protectedPatterns) -
            getProjectPriorityScore(a, projectPriority, evidenceProjects, protectedPatterns),
        )[0];

      if (!removable) {
        break;
      }

      actions.push(
        `${removable.name}：内容仍接近一页上限，作为低优先级项目移除以保留底部安全留白。`,
      );
      nextProjects = nextProjects.filter((project) => project.id !== removable.id);
      continue;
    }

    actions.push(
      `${targetProject.name}：进一步压缩 1 条低优先级 bullet，保证项目要点完整展示。`,
    );
    nextProjects = nextProjects.map((project) =>
      project.id === targetProject.id
        ? { ...project, bullets: removeLowestPriorityBullet(project, protectedPatterns) }
        : project,
    );
  }

  return nextProjects;
}

function pickProjectsToRemove(
  projects: ResumeProject[],
  count: number,
  projectPriority: string[],
  evidenceProjects: Map<string, number>,
  protectedPatterns: ProtectedEvidencePatterns,
) {
  return [...projects]
    .filter((project) => !isProtectedProject(project.name, protectedPatterns))
    .sort(
      (a, b) =>
        getProjectPriorityScore(b, projectPriority, evidenceProjects, protectedPatterns) -
        getProjectPriorityScore(a, projectPriority, evidenceProjects, protectedPatterns),
    )
    .slice(0, count);
}

function getProjectPriorityScore(
  project: ResumeProject,
  projectPriority: string[],
  evidenceProjects: Map<string, number>,
  protectedPatterns: ProtectedEvidencePatterns,
) {
  const normalized = normalizeName(project.name);
  const strategyIndex = projectPriority.findIndex((item) =>
    namesOverlap(normalized, normalizeName(item)),
  );
  const evidenceScore = evidenceProjects.get(normalized) ?? 0;
  let score = 50;

  if (strategyIndex !== -1) {
    score -= Math.max(0, 22 - strategyIndex * 4);
  }

  score -= evidenceScore * 6;

  if (isSovaProject(project.name)) {
    score -= 40;
  }

  if (isInsightFlowProject(project.name)) {
    score -= 28;
  }

  if (isPortfolioProject(project.name) || isTransitProject(project.name)) {
    score -= 8;
  }

  if (isTransitProject(project.name) && hasProjectProtectedEvidence(project, protectedPatterns.transit)) {
    score -= protectedPatterns.productDataJd ? 34 : 8;
  }

  if (isSovaProject(project.name) && hasProjectProtectedEvidence(project, protectedPatterns.sova)) {
    score -= protectedPatterns.contentAiProductJd
      ? 36
      : protectedPatterns.productDataJd
        ? 28
        : 8;
  }

  if (
    protectedPatterns.protectPortfolio &&
    isPortfolioProject(project.name) &&
    hasProjectProtectedEvidence(project, protectedPatterns.portfolio)
  ) {
    score -= 18;
  }

  if (isAiExposureProject(project.name)) {
    score += 42;
  }

  return score;
}

function buildEvidenceProjectMap(analysisResult?: JDAnalysisResult) {
  const evidenceProjects = new Map<string, number>();

  for (const item of analysisResult?.evidenceMatrix ?? []) {
    const weight =
      item.matchLevel === "strong" ? 3 : item.matchLevel === "medium" ? 2 : 0;

    if (weight === 0) {
      continue;
    }

    for (const projectName of item.matchedProjects) {
      const key = normalizeName(projectName);
      evidenceProjects.set(key, (evidenceProjects.get(key) ?? 0) + weight);
    }
  }

  return evidenceProjects;
}

function estimateResumeLines(resume: ResumeData) {
  const headerLines = 3;
  const educationLines = resume.education.length > 0 ? 5 : 0;
  const skillLines =
    resume.skills.length +
    resume.skills.reduce(
      (sum, group) => sum + Math.max(0, Math.ceil(group.items.join("、").length / 48) - 1),
      0,
    );
  const projectLines = resume.projects.reduce((sum, project) => {
    const linkLines = project.links?.website || project.links?.github || project.link ? 1 : 0;
    const contextLines = project.context ? Math.ceil(project.context.length / 58) : 0;
    const bulletLines = project.bullets.reduce(
      (bulletSum, bullet) => bulletSum + Math.max(1, Math.ceil(bullet.text.length / 52)),
      0,
    );

    return sum + 1.5 + linkLines + contextLines + bulletLines;
  }, 0);
  const sectionTitleLines = 4.5;

  return headerLines + educationLines + skillLines + projectLines + sectionTitleLines;
}

function getMaxBulletsForProject(
  projectName: string,
  protectedPatterns: ProtectedEvidencePatterns,
) {
  if (isSovaProject(projectName)) {
    return protectedPatterns.contentAiProductJd || protectedPatterns.productDataJd ? 5 : 4;
  }

  if (isInsightFlowProject(projectName)) {
    return 3;
  }

  if (isTransitProject(projectName)) {
    return protectedPatterns.productDataJd ? 3 : 2;
  }

  if (isPortfolioProject(projectName)) {
    return 2;
  }

  if (isAiExposureProject(projectName)) {
    return 2;
  }

  return 3;
}

function getMinimumBullets(
  projectName: string,
  protectedPatterns: ProtectedEvidencePatterns,
) {
  if (isAiExposureProject(projectName)) {
    return 0;
  }

  if (isTransitProject(projectName)) {
    return protectedPatterns.productDataJd ? 3 : 1;
  }

  if (isSovaProject(projectName)) {
    return protectedPatterns.contentAiProductJd || protectedPatterns.productDataJd ? 4 : 2;
  }

  if (isPortfolioProject(projectName)) {
    return 1;
  }

  return 2;
}

function hasRemovableBullet(
  project: ResumeProject,
  protectedPatterns: ProtectedEvidencePatterns,
) {
  if (hasPrimaryOrSecondaryBridge(project)) {
    return false;
  }

  if (project.bullets.length <= getMinimumBullets(project.name, protectedPatterns)) {
    return false;
  }

    return project.bullets.some(
    (bullet) =>
      getBulletProtectionScore(
        project.name,
        bullet.text,
        protectedPatterns,
        bullet.tags,
      ) <= 0,
  );
}

function removeLowestPriorityBullet(
  project: ResumeProject,
  protectedPatterns: ProtectedEvidencePatterns,
) {
  const candidates = project.bullets
    .map((bullet, index) => ({
      bullet,
      index,
      score: getBulletProtectionScore(
        project.name,
        bullet.text,
        protectedPatterns,
        bullet.tags,
      ),
    }))
    .filter((item) => item.score <= 0);

  if (candidates.length === 0) {
    return project.bullets;
  }

  const removeIndex = candidates[candidates.length - 1].index;
  return project.bullets.filter((_, index) => index !== removeIndex);
}

function hasPrimaryOrSecondaryBridge(project: ResumeProject) {
  return project.bullets.some(
    (bullet) =>
      bullet.tags?.includes("bridge-primary") ||
      bullet.tags?.includes("bridge-secondary"),
  );
}

function getBulletProtectionScore(
  projectName: string,
  text: string,
  protectedPatterns: ProtectedEvidencePatterns,
  tags: string[] = [],
) {
  if (tags.includes("jd-bridge")) {
    if (isSovaProject(projectName)) {
      return tags.includes("bridge-primary") ? 42 : 32;
    }

    if (isTransitProject(projectName)) {
      return tags.includes("bridge-primary") ? 36 : 28;
    }

    if (isPortfolioProject(projectName)) {
      return tags.includes("bridge-supporting") ? 14 : 22;
    }

    return tags.includes("bridge-primary") ? 24 : 12;
  }

  if (
    !protectedPatterns.productDataJd &&
    !protectedPatterns.contentAiProductJd &&
    !protectedPatterns.agentEngineeringJd
  ) {
    return 0;
  }

  if (isTransitProject(projectName)) {
    const chainScore = countEvidenceChainElements(text);
    const patternScore = protectedPatterns.transit.filter((pattern) =>
      text.toLowerCase().includes(pattern.toLowerCase()),
    ).length;
    return chainScore * 12 + patternScore * 4;
  }

  if (isSovaProject(projectName)) {
    return isProtectedEvidenceText(text, protectedPatterns.sova)
      ? protectedPatterns.contentAiProductJd
        ? 36
        : protectedPatterns.agentEngineeringJd
          ? 30
          : 24
      : 0;
  }

  if (protectedPatterns.protectPortfolio && isPortfolioProject(projectName)) {
    return isProtectedEvidenceText(text, protectedPatterns.portfolio) ? 22 : 0;
  }

  return isProtectedEvidenceText(text, protectedPatterns) ? 8 : 0;
}

function hasProjectProtectedEvidence(
  project: ResumeProject,
  patterns: string[],
) {
  if (patterns.length === 0) {
    return false;
  }

  const text = [
    project.name,
    project.context,
    ...project.bullets.map((bullet) => bullet.text),
  ].join("\n");

  return isProtectedEvidenceText(text, patterns);
}

function isProtectedProject(
  projectName: string,
  protectedPatterns: ProtectedEvidencePatterns,
) {
  return (
    isSovaProject(projectName) ||
    isInsightFlowProject(projectName) ||
    (protectedPatterns.productDataJd && isTransitProject(projectName)) ||
    (protectedPatterns.protectPortfolio && isPortfolioProject(projectName))
  );
}

function isSovaProject(projectName: string) {
  return normalizeName(projectName).includes("sova");
}

function isInsightFlowProject(projectName: string) {
  return normalizeName(projectName).includes("insightflow");
}

function isPortfolioProject(projectName: string) {
  const normalized = normalizeName(projectName);
  return normalized.includes("portfolio") || normalized.includes("jd match");
}

function isTransitProject(projectName: string) {
  const normalized = normalizeName(projectName);
  return normalized.includes("transit") || normalized.includes("triton");
}

function isAiExposureProject(projectName: string) {
  const normalized = normalizeName(projectName);
  return normalized.includes("exposure") || normalized.includes("就业前景");
}

function namesOverlap(a: string, b: string) {
  return a.includes(b) || b.includes(a);
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
