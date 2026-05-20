import type { AtsReviewResult } from "@/lib/ats-review-schema";
import type { JDAnalysisResult } from "@/lib/role-classifier";
import type { ResumeComparisonReview, LostEvidence } from "@/lib/resume-comparison-schema";
import type { ResumeQualityReview } from "@/lib/resume-quality-audit-schema";
import type {
  ResumeBullet,
  ResumeData,
  ResumeProject,
} from "@/lib/resume-schema";
import {
  countEvidenceElements,
  detectPortfolioEvidenceChain,
  detectSovaEvidenceChain,
  detectTransitEvidenceChain,
} from "@/lib/strong-evidence-patterns";
import {
  normalizeHybridRepairLog,
  type HybridRepairResult,
} from "@/lib/resume-hybrid-repair-schema";

type RepairResumeWithHybridInput = {
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  masterResume: ResumeData;
  tailoredResume: ResumeData;
  comparisonReview: ResumeComparisonReview;
  atsReview: AtsReviewResult;
  qualityReview: ResumeQualityReview;
};

const maxProjects = 4;
const maxRestoredBulletsPerProject = 2;

export async function repairResumeWithHybrid({
  jdAnalysis,
  masterResume,
  tailoredResume,
  comparisonReview,
  atsReview,
}: RepairResumeWithHybridInput): Promise<HybridRepairResult> {
  const hybridResume = cloneResume(tailoredResume);
  const recoveredEvidence = new Set<string>();
  const restoredSkills = new Set<string>();
  const restoredProjects = new Set<string>();
  const restoredBullets = new Set<string>();
  const removedWeakContent = new Set<string>();
  const lostEvidence = comparisonReview.lostEvidence.filter(
    (item) => item.importance === "high" || item.importance === "medium",
  );

  for (const evidence of lostEvidence) {
    if (evidence.type === "skill" || evidence.type === "tool") {
      const restored = restoreSkillEvidence({
        evidence,
        masterResume,
        hybridResume,
      });

      if (restored) {
        recoveredEvidence.add(evidence.value);
        restoredSkills.add(restored);
      }
    }

    const projectRestore = restoreProjectEvidence({
      evidence,
      masterResume,
      hybridResume,
    });

    if (projectRestore.restoredProject) {
      recoveredEvidence.add(evidence.value);
      restoredProjects.add(projectRestore.restoredProject);
    }

    for (const bullet of projectRestore.restoredBullets) {
      recoveredEvidence.add(evidence.value);
      restoredBullets.add(bullet);
    }
  }

  trimHybridProjects({
    hybridResume,
    masterResume,
    jdAnalysis,
    atsReview,
    recoveredEvidence,
    removedWeakContent,
  });

  const repairLog = normalizeHybridRepairLog({
    repaired: recoveredEvidence.size > 0,
    recoveredEvidence: Array.from(recoveredEvidence),
    restoredSkills: Array.from(restoredSkills),
    restoredProjects: Array.from(restoredProjects),
    restoredBullets: Array.from(restoredBullets),
    removedWeakContent: Array.from(removedWeakContent),
    summary:
      recoveredEvidence.size > 0
        ? `Hybrid repair restored ${recoveredEvidence.size} Master evidence item(s) that were weakened by the tailored resume.`
        : "Hybrid repair found no recoverable Master evidence.",
  });

  return {
    hybridResume,
    repairLog,
  };
}

function restoreSkillEvidence({
  evidence,
  masterResume,
  hybridResume,
}: {
  evidence: LostEvidence;
  masterResume: ResumeData;
  hybridResume: ResumeData;
}) {
  const masterSkill = findSkillItem(masterResume, evidence.value);
  const skillToRestore = masterSkill ?? evidence.value;

  if (!masterResumeContains(masterResume, skillToRestore)) {
    return "";
  }

  if (resumeContains(hybridResume, skillToRestore)) {
    return "";
  }

  const targetGroup =
    findSkillGroup(hybridResume, skillToRestore) ??
    hybridResume.skills[0] ??
    createSkillGroup(hybridResume);

  targetGroup.items = Array.from(new Set([...targetGroup.items, skillToRestore]));
  return skillToRestore;
}

function restoreProjectEvidence({
  evidence,
  masterResume,
  hybridResume,
}: {
  evidence: LostEvidence;
  masterResume: ResumeData;
  hybridResume: ResumeData;
}) {
  const restoredBullets: string[] = [];
  const evidenceKind = getEvidenceChainProjectKind(evidence.value);
  const masterProject = evidenceKind
    ? findProjectByKind(masterResume, evidenceKind)
    : findMasterProjectForEvidence(masterResume, evidence.value);

  if (!masterProject) {
    return { restoredProject: "", restoredBullets };
  }

  const tailoredProject = findProjectByName(hybridResume.projects, masterProject.name);
  const relevantBullets = evidenceKind
    ? findEvidenceChainBullets(masterProject, evidenceKind)
    : findRelevantBullets(masterProject, evidence.value);

  if (tailoredProject) {
    const bulletsToRestore = relevantBullets
      .filter((bullet) => !projectHasBullet(tailoredProject, bullet.text))
      .slice(0, maxRestoredBulletsPerProject);

    if (bulletsToRestore.length === 0 && !containsText(tailoredProject.context, evidence.value)) {
      const context = mergeContext(tailoredProject.context, masterProject.context, evidence.value);
      if (context !== tailoredProject.context) {
        tailoredProject.context = context;
      }
    }

    for (const bullet of bulletsToRestore) {
      tailoredProject.bullets.push(cloneBullet(bullet, tailoredProject.name));
      restoredBullets.push(bullet.text);
    }

    return { restoredProject: "", restoredBullets };
  }

  if (evidence.importance !== "high") {
    return { restoredProject: "", restoredBullets };
  }

  const restoredProject = cloneProject(masterProject);
  restoredProject.bullets = (relevantBullets.length > 0
    ? relevantBullets
    : masterProject.bullets
  )
    .slice(0, maxRestoredBulletsPerProject)
    .map((bullet) => cloneBullet(bullet, restoredProject.name));
  hybridResume.projects.push(restoredProject);
  restoredProject.bullets.forEach((bullet) => restoredBullets.push(bullet.text));

  return {
    restoredProject: restoredProject.name,
    restoredBullets,
  };
}

function trimHybridProjects({
  hybridResume,
  jdAnalysis,
  atsReview,
  recoveredEvidence,
  removedWeakContent,
}: {
  hybridResume: ResumeData;
  masterResume: ResumeData;
  jdAnalysis: JDAnalysisResult;
  atsReview: AtsReviewResult;
  recoveredEvidence: Set<string>;
  removedWeakContent: Set<string>;
}) {
  while (hybridResume.projects.length > maxProjects) {
    const removable = [...hybridResume.projects]
      .filter((project) => !projectContainsRecoveredEvidence(project, recoveredEvidence))
      .sort(
        (a, b) =>
          scoreProjectForRemoval(b, jdAnalysis, atsReview) -
          scoreProjectForRemoval(a, jdAnalysis, atsReview),
      )[0];

    if (!removable) {
      break;
    }

    hybridResume.projects = hybridResume.projects.filter(
      (project) => project.id !== removable.id,
    );
    removedWeakContent.add(`${removable.name}: removed as lower-priority content to keep the hybrid resume within one page.`);
  }

  hybridResume.projects = hybridResume.projects.map((project) => {
    if (projectContainsRecoveredEvidence(project, recoveredEvidence)) {
      return {
        ...project,
        bullets: capProjectBullets(project, 4),
      };
    }

    return {
      ...project,
      bullets: capProjectBullets(project, getDefaultBulletLimit(project.name)),
    };
  });
}

function findSkillItem(resume: ResumeData, evidenceValue: string) {
  for (const group of resume.skills) {
    const direct = group.items.find((item) => containsText(item, evidenceValue));

    if (direct) {
      return direct;
    }
  }

  return "";
}

function findSkillGroup(resume: ResumeData, skill: string) {
  const normalized = skill.toLowerCase();

  return resume.skills.find((group) => {
    const label = group.label.toLowerCase();

    if (/(figma|axure|prototype|原型|产品|用户)/i.test(normalized)) {
      return /(产品|原型|设计|工具|协作)/i.test(label);
    }

    if (/(python|sql|pandas|duckdb|java|github|vercel|cursor|codex)/i.test(normalized)) {
      return /(技术|数据|工具|编程|协作)/i.test(label);
    }

    if (/(agent|prompt|badcase|测试|metric|tool calling|rag)/i.test(normalized)) {
      return /(AI|Agent|LLM|测试|评估|优化)/i.test(label);
    }

    return false;
  });
}

function createSkillGroup(resume: ResumeData) {
  const group = {
    label: "项目相关技能",
    items: [] as string[],
  };
  resume.skills.push(group);
  return group;
}

function findMasterProjectForEvidence(resume: ResumeData, evidenceValue: string) {
  return resume.projects.find((project) =>
    projectToText(project).toLowerCase().includes(evidenceValue.toLowerCase()),
  );
}

function getEvidenceChainProjectKind(value: string) {
  if (/Transit|数据分析闭环|Triton/i.test(value)) {
    return "transit" as const;
  }

  if (/SOVA|评测与稳定性/i.test(value)) {
    return "sova" as const;
  }

  if (/Portfolio|JD Match|Figma|产品展示/i.test(value)) {
    return "portfolio" as const;
  }

  return null;
}

function findProjectByKind(
  resume: ResumeData,
  kind: "transit" | "sova" | "portfolio",
) {
  return resume.projects.find((project) => {
    const normalized = normalizeName(project.name);

    if (kind === "transit") {
      return normalized.includes("transit") || normalized.includes("triton");
    }

    if (kind === "sova") {
      return normalized.includes("sova");
    }

    return normalized.includes("portfolio") || normalized.includes("jd match");
  });
}

function findEvidenceChainBullets(
  project: ResumeProject,
  kind: "transit" | "sova" | "portfolio",
) {
  const scored = project.bullets
    .map((bullet, index) => ({
      bullet,
      index,
      score: scoreEvidenceChainBullet(bullet.text, kind),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored.slice(0, kind === "portfolio" ? 1 : 2).map((item) => item.bullet);
}

function scoreEvidenceChainBullet(
  text: string,
  kind: "transit" | "sova" | "portfolio",
) {
  if (kind === "transit") {
    const chain = detectTransitEvidenceChain(text);
    return (
      countEvidenceElements(chain) * 10 +
      (chain.metric ? 12 : 0) +
      (chain.finding ? 8 : 0) +
      (chain.recommendation ? 8 : 0) +
      (chain.dataMethod ? 6 : 0)
    );
  }

  if (kind === "sova") {
    const chain = detectSovaEvidenceChain(text);
    return (
      countEvidenceElements(chain) * 10 +
      (chain.metricSpec ? 10 : 0) +
      (chain.testCases ? 8 : 0) +
      (chain.badcase ? 8 : 0) +
      (chain.stability ? 8 : 0) +
      (chain.fallbackRules ? 6 : 0)
    );
  }

  const chain = detectPortfolioEvidenceChain(text);
  return (
    countEvidenceElements(chain) * 10 +
    (chain.figma ? 10 : 0) +
    (chain.jdMatchConsole ? 8 : 0) +
    (chain.informationArchitecture ? 6 : 0)
  );
}

function findRelevantBullets(project: ResumeProject, evidenceValue: string) {
  const normalized = evidenceValue.toLowerCase();
  const direct = project.bullets.filter((bullet) =>
    bullet.text.toLowerCase().includes(normalized),
  );

  if (direct.length > 0) {
    return direct;
  }

  const relatedTerms = buildRelatedTerms(evidenceValue);
  return project.bullets.filter((bullet) =>
    relatedTerms.some((term) => bullet.text.toLowerCase().includes(term.toLowerCase())),
  );
}

function buildRelatedTerms(evidenceValue: string) {
  const value = evidenceValue.toLowerCase();

  if (/figma|axure|原型|用户体验/i.test(value)) {
    return ["Figma", "原型", "用户体验", "交互", "作品集"];
  }

  if (/python|sql|pandas|duckdb|数据|指标|metric/i.test(value)) {
    return ["Python", "SQL", "Pandas", "DuckDB", "数据", "指标", "Metric"];
  }

  if (/agent|prompt|badcase|测试|稳定|复查/i.test(value)) {
    return ["Agent", "Prompt", "badcase", "测试", "稳定", "复查", "验证"];
  }

  return [evidenceValue];
}

function mergeContext(current: string, fallback: string, evidenceValue: string) {
  if (!fallback || !containsText(fallback, evidenceValue)) {
    return current;
  }

  if (!current) {
    return fallback;
  }

  return current;
}

function scoreProjectForRemoval(
  project: ResumeProject,
  jdAnalysis: JDAnalysisResult,
  atsReview: AtsReviewResult,
) {
  const text = projectToText(project).toLowerCase();
  const priorityIndex = jdAnalysis.resumeThesis.projectPriority.findIndex((item) =>
    namesOverlap(project.name, item),
  );
  const atsHits = atsReview.keywordEvidenceMap.filter(
    (item) =>
      item.supportLevel !== "missing" &&
      text.includes(item.keyword.toLowerCase()),
  ).length;
  let score = 50 - atsHits * 6;

  if (priorityIndex >= 0) {
    score -= 22 - priorityIndex * 4;
  }

  if (isSovaProject(project.name)) {
    score -= 36;
  }

  if (isInsightFlowProject(project.name)) {
    score -= 26;
  }

  if (isAiExposureProject(project.name)) {
    score += 42;
  }

  return score;
}

function projectContainsRecoveredEvidence(
  project: ResumeProject,
  recoveredEvidence: Set<string>,
) {
  const text = projectToText(project).toLowerCase();
  return Array.from(recoveredEvidence).some((item) =>
    text.includes(item.toLowerCase()),
  );
}

function capProjectBullets(project: ResumeProject, limit: number) {
  if (project.bullets.length <= limit) {
    return project.bullets;
  }

  return project.bullets.slice(0, limit);
}

function getDefaultBulletLimit(projectName: string) {
  if (isSovaProject(projectName)) {
    return 4;
  }

  if (isInsightFlowProject(projectName)) {
    return 3;
  }

  return 2;
}

function projectHasBullet(project: ResumeProject, text: string) {
  return project.bullets.some((bullet) => normalizeText(bullet.text) === normalizeText(text));
}

function masterResumeContains(resume: ResumeData, value: string) {
  return resumeToText(resume).toLowerCase().includes(value.toLowerCase());
}

function resumeContains(resume: ResumeData, value: string) {
  return resumeToText(resume).toLowerCase().includes(value.toLowerCase());
}

function containsText(text: string, value: string) {
  return text.toLowerCase().includes(value.toLowerCase());
}

function findProjectByName(projects: ResumeProject[], name: string) {
  const normalized = normalizeName(name);

  return projects.find((project) => namesOverlap(normalizeName(project.name), normalized));
}

function namesOverlap(a: string, b: string) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  return left.includes(right) || right.includes(left);
}

function cloneResume(resume: ResumeData): ResumeData {
  return JSON.parse(JSON.stringify(resume)) as ResumeData;
}

function cloneProject(project: ResumeProject): ResumeProject {
  return {
    id: project.id,
    name: project.name,
    links: project.links,
    context: project.context,
    bullets: project.bullets.map((bullet) => cloneBullet(bullet, project.name)),
    emphasis: project.emphasis,
  };
}

function cloneBullet(bullet: ResumeBullet, projectName: string): ResumeBullet {
  return {
    id: bullet.id || `${slugify(projectName)}-restored-${Date.now()}`,
    text: bullet.text,
    tags: bullet.tags ?? [],
    riskLevel: bullet.riskLevel,
  };
}

function resumeToText(resume: ResumeData) {
  return [
    ...resume.skills.flatMap((group) => [group.label, ...group.items]),
    ...resume.projects.map(projectToText),
  ].join("\n");
}

function projectToText(project: ResumeProject) {
  return [
    project.name,
    project.context,
    project.links?.website ?? "",
    project.links?.github ?? "",
    ...project.bullets.map((bullet) => bullet.text),
  ].join("\n");
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

function isSovaProject(projectName: string) {
  return normalizeName(projectName).includes("sova");
}

function isInsightFlowProject(projectName: string) {
  return normalizeName(projectName).includes("insightflow");
}

function isAiExposureProject(projectName: string) {
  const normalized = normalizeName(projectName);
  return normalized.includes("exposure") || normalized.includes("就业前景");
}
