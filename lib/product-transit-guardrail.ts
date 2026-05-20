import type { JDAnalysisResult } from "@/lib/role-classifier";
import type { ResumeBullet, ResumeData, ResumeProject } from "@/lib/resume-schema";
import { isProductDataJd } from "@/lib/strong-evidence-patterns";

type EnsureProductTransitDecisionChainInput = {
  resume: ResumeData;
  masterResume: ResumeData;
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  selectedRole: string;
};

type EnsureProductTransitDecisionChainResult = {
  resume: ResumeData;
  actions: string[];
};

const productTransitAction =
  "产品类岗位下已保留 UCSD Transit 的产品决策链路：问题定义、Evening Service Gap Score 指标设计和排班优化建议。";

const productTransitBullets: ResumeBullet[] = [
  {
    id: "transit-product-problem-definition",
    text: "问题定义：针对 UCSD 校园班车晚间服务供给不足的问题，将“学生晚间出行体验”拆解为时间段、路线、站点和资源优先级四个分析维度，明确 17:00-22:00 的服务缺口诊断目标。",
    tags: ["product", "problem-definition"],
  },
  {
    id: "transit-product-metric-design",
    text: "指标设计：基于 GTFS 数据构建路线-站点-时间维度的数据集，使用 SQL / DuckDB / Pandas 计算每小时计划班次数、估算发车间隔、晚间服务占比和末班车时间，并设计 Evening Service Gap Score 识别高优先级路线。",
    tags: ["data-analysis", "metric-design"],
  },
  {
    id: "transit-product-business-suggestion",
    text: "业务建议：通过路线 × 小时热力图、路线缺口评分和站点覆盖分析，发现晚间服务缺口集中在 20:00 后，尤其是 21:00-22:00 时段，并提出增加晚间班次、延后末班车和补强重点站点覆盖等排班优化建议。",
    tags: ["product-decision", "recommendation"],
  },
];

export function ensureProductTransitDecisionChain({
  resume,
  masterResume,
  jdText,
  jdAnalysis,
  selectedRole,
}: EnsureProductTransitDecisionChainInput): EnsureProductTransitDecisionChainResult {
  if (!shouldProtectProductTransit({ jdText, jdAnalysis, selectedRole })) {
    return { resume, actions: [] };
  }

  const transitProject = resume.projects.find((project) =>
    isTransitProject(project.name),
  );

  if (!transitProject || hasCompleteTransitDecisionChain(transitProject)) {
    return { resume, actions: [] };
  }

  const masterTransitProject = masterResume.projects.find((project) =>
    isTransitProject(project.name),
  );

  if (!masterTransitProject && transitProject.bullets.length === 0) {
    return { resume, actions: [] };
  }

  return {
    resume: {
      ...resume,
      projects: resume.projects.map((project) =>
        project.id === transitProject.id
          ? {
              ...project,
              bullets: productTransitBullets,
            }
          : project,
      ),
    },
    actions: [productTransitAction],
  };
}

function shouldProtectProductTransit({
  jdText,
  jdAnalysis,
  selectedRole,
}: {
  jdText: string;
  jdAnalysis: JDAnalysisResult;
  selectedRole: string;
}) {
  if (selectedRole === "AI_AGENT_APPLICATION") {
    return false;
  }

  if (selectedRole === "AI_PRODUCT_MANAGER") {
    return true;
  }

  if (selectedRole === "LLM_APPLICATION_PRODUCT") {
    return isProductDataJd(jdText, jdAnalysis, selectedRole);
  }

  return isProductDataJd(jdText, jdAnalysis, selectedRole);
}

function hasCompleteTransitDecisionChain(project: ResumeProject) {
  const text = project.bullets.map((bullet) => bullet.text).join("\n");

  return (
    project.bullets.length >= 3 &&
    hasProblemDefinition(text) &&
    hasMetricDesign(text) &&
    hasBusinessSuggestion(text)
  );
}

function hasProblemDefinition(text: string) {
  return hasAny(text, [
    "学生晚间出行体验",
    "晚间服务供给不足",
    "时间段",
    "路线",
    "站点",
    "资源优先级",
    "17:00-22:00",
  ]);
}

function hasMetricDesign(text: string) {
  return hasAny(text, [
    "GTFS",
    "SQL",
    "DuckDB",
    "Pandas",
    "发车间隔",
    "晚间服务占比",
    "末班车时间",
    "Evening Service Gap Score",
  ]);
}

function hasBusinessSuggestion(text: string) {
  return hasAny(text, [
    "20:00 后",
    "21:00-22:00",
    "高优先级路线",
    "增加晚间班次",
    "延后末班车",
    "补强重点站点覆盖",
    "排班优化建议",
  ]);
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.toLowerCase().includes(term.toLowerCase()));
}

function isTransitProject(projectName: string) {
  const normalized = projectName.toLowerCase();
  return normalized.includes("transit") || normalized.includes("triton");
}
