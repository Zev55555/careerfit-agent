import type { ResumeData } from "@/lib/resume-schema";

const compactLineThreshold = 64;

export function shouldUseCompactResumeLayout(resume: ResumeData) {
  return estimateResumeDensityLines(resume) > compactLineThreshold;
}

function estimateResumeDensityLines(resume: ResumeData) {
  const headerLines = 3;
  const educationLines = resume.education.length > 0 ? 5 : 0;
  const skillLines =
    resume.skills.length +
    resume.skills.reduce(
      (sum, group) =>
        sum + Math.max(0, Math.ceil(group.items.join("、").length / 48) - 1),
      0,
    );
  const projectLines = resume.projects.reduce((sum, project) => {
    const linkLines =
      project.links?.website || project.links?.github || project.link ? 1 : 0;
    const contextLines = project.context
      ? Math.max(1, Math.ceil(project.context.length / 58))
      : 0;
    const bulletLines = project.bullets.reduce(
      (bulletSum, bullet) =>
        bulletSum + Math.max(1, Math.ceil(bullet.text.length / 52)),
      0,
    );

    return sum + 1.5 + linkLines + contextLines + bulletLines;
  }, 0);

  return headerLines + educationLines + skillLines + projectLines + 4.5;
}
