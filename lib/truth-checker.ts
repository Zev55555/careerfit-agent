import type { ResumeData } from "@/lib/resume-schema";

const forbiddenClaims = [
  "模型训练",
  "模型微调",
  "算法研发",
  "百万用户",
  "商业化上线",
  "提升 50%",
  "提升50%",
  "提升 100%",
  "提升100%",
  "主导公司级",
  "负责底层模型",
];

export type TruthCheckResult = {
  passed: boolean;
  warnings: string[];
};

export function checkResumeTruthfulness(resume: ResumeData): TruthCheckResult {
  const resumeText = JSON.stringify(resume);
  const warnings = forbiddenClaims
    .filter((claim) => resumeText.includes(claim))
    .map((claim) => `发现高风险表达：${claim}`);

  return {
    passed: warnings.length === 0,
    warnings,
  };
}
