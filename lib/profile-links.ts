import type { ResumeData } from "@/lib/resume-schema";

export function normalizePersonalProfileLinks(links: string[] = []) {
  const github = links.find((link) => /github\.com\//i.test(link.trim())) ?? "";

  return [github].filter(Boolean);
}

export function normalizeResumeProfileLinks(resume: ResumeData): ResumeData {
  return {
    ...resume,
    profile: {
      ...resume.profile,
      links: normalizePersonalProfileLinks(resume.profile.links),
    },
  };
}
