import type { ResumeData } from "@/lib/resume-schema";

export function validateResumeData(resume: ResumeData) {
  const issues = getResumeValidationWarnings(resume);

  if (!resume.meta.templateLocked) {
    issues.unshift("模板尚未锁定；当前预览仍使用固定模板渲染。");
  }

  return {
    ok: getCriticalResumeWarnings(resume).length === 0,
    issues,
  };
}

export function getResumeValidationWarnings(resume: ResumeData) {
  return getCriticalResumeWarnings(resume);
}

function getCriticalResumeWarnings(resume: ResumeData) {
  const warnings: string[] = [];

  if (!resume.profile.name.trim()) {
    warnings.push("姓名为空，建议补全后再锁定 Master。");
  }

  if (!resume.profile.email.trim()) {
    warnings.push("邮箱为空，建议补全后再锁定 Master。");
  }

  if (resume.education.length === 0) {
    warnings.push("教育背景为空，建议至少保留一条教育经历。");
  }

  if (resume.skills.length === 0) {
    warnings.push("专业技能为空，建议至少保留一个技能分类。");
  }

  if (resume.projects.length === 0) {
    warnings.push("项目经历为空，至少需要一个项目用于简历渲染。");
  }

  return warnings;
}
