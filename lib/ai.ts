export const AI_INTEGRATION_STATUS = "mock-only";

export function assertJsonOnlyRewrite() {
  return {
    allowed: ["resume-master.json", "tailored-resume.json", "projects.json"],
    forbidden: ["templates/resume-layout.tsx", "templates/resume.css"],
  };
}
