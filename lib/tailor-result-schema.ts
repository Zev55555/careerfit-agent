import type {
  ResumeBullet,
  ResumeData,
  ResumeProject,
  RoleDirection,
  TailorChangeLog,
  TailorProjectChange,
} from "@/lib/resume-schema";
import {
  applyInferredSchoolBadge,
  cleanEducationDetailItems,
} from "@/lib/school-badge";
import { normalizePersonalProfileLinks } from "@/lib/profile-links";
import { validateResumeData } from "@/lib/validation";

export type ValidatedTailorResult = {
  tailoredResume: ResumeData;
  changeLog: TailorChangeLog;
};

const validDirections: RoleDirection[] = [
  "ai_product_manager",
  "ai_agent_application",
  "llm_application",
];

export function validateTailorResult(
  data: unknown,
  originalResume?: ResumeData,
): ValidatedTailorResult {
  if (!data || typeof data !== "object") {
    throw new Error("Tailor result is not an object.");
  }

  const input = data as {
    tailoredResume?: unknown;
    changeLog?: unknown;
  };

  const tailoredResume = normalizeResumeData(
    input.tailoredResume,
    originalResume,
  );
  const changeLog = normalizeChangeLog(input.changeLog);
  const validation = validateResumeData(tailoredResume);

  if (!validation.ok) {
    throw new Error(`Tailored resume failed validation: ${validation.issues.join("; ")}`);
  }

  return {
    tailoredResume,
    changeLog,
  };
}

function normalizeResumeData(
  value: unknown,
  originalResume?: ResumeData,
): ResumeData {
  if (!value || typeof value !== "object") {
    throw new Error("tailoredResume is missing.");
  }

  const input = value as Partial<ResumeData>;
  const originalProfile = originalResume?.profile;

  const resume: ResumeData = {
    meta: {
      version: normalizeString(input.meta?.version, originalResume?.meta.version ?? "1.0"),
      templateLocked: true,
      lastUpdated: new Date().toISOString().slice(0, 10),
      source: "tailored",
    },
    profile: normalizeProfile(input.profile, originalProfile),
    skills: normalizeSkills(input.skills, originalResume?.skills),
    projects: normalizeProjects(input.projects, originalResume?.projects),
    education: normalizeEducation(input.education, originalResume?.education, {
      preferFallback: Boolean(originalResume?.education?.length),
    }),
    notes: normalizeStringArray(input.notes ?? originalResume?.notes),
  };

  if (input.rawText || originalResume?.rawText) {
    resume.rawText = normalizeString(input.rawText, originalResume?.rawText ?? "");
  }

  return resume;
}

function normalizeProfile(
  profile: Partial<ResumeData["profile"]> | undefined,
  originalProfile?: ResumeData["profile"],
): ResumeData["profile"] {
  if (originalProfile) {
    return {
      name: originalProfile.name,
      email: originalProfile.email,
      phone: originalProfile.phone,
      headline: originalProfile.headline,
      title: originalProfile.title,
      targetTitle: originalProfile.targetTitle,
      location: originalProfile.location,
      links: normalizeProfileLinks(undefined, originalProfile),
    };
  }

  return {
    name: normalizeString(profile?.name, ""),
    email: normalizeString(profile?.email, ""),
    phone: normalizeString(profile?.phone, ""),
    headline: normalizeString(profile?.headline, ""),
    title: normalizeString(profile?.title, ""),
    targetTitle: normalizeString(profile?.targetTitle, ""),
    location: normalizeString(profile?.location, ""),
    links: normalizeProfileLinks(profile),
  };
}

function normalizeProfileLinks(
  profile: Partial<ResumeData["profile"]> | undefined,
  originalProfile?: ResumeData["profile"],
) {
  const links = normalizeStringArray(profile?.links);
  const originalLinks = normalizeStringArray(originalProfile?.links);
  const combined = originalProfile ? originalLinks : [...links, ...originalLinks];
  const sanitized = Array.from(new Set(combined)).filter(
    (link) => !looksLikeEmailDomain(link),
  );

  return normalizePersonalProfileLinks(sanitized);
}

function normalizeSkills(
  value: unknown,
  fallback: ResumeData["skills"] = [],
): ResumeData["skills"] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const skills = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const group = item as { label?: unknown; category?: unknown; items?: unknown; content?: unknown };
      const label = normalizeString(group.label ?? group.category, "");
      const items =
        Array.isArray(group.items)
          ? normalizeStringArray(group.items)
          : splitSkillContent(group.content);

      if (!label && items.length === 0) {
        return null;
      }

      return { label, items };
    })
    .filter((item): item is ResumeData["skills"][number] => Boolean(item));

  return skills.length > 0 ? skills : fallback;
}

function normalizeProjects(
  value: unknown,
  fallback: ResumeProject[] = [],
): ResumeProject[] {
  if (!Array.isArray(value)) {
    return fallback.map(stripHiddenProjectFields);
  }

  const projects = value
    .map((item, index) => normalizeProject(item, fallback[index], fallback))
    .filter((item): item is ResumeProject => Boolean(item));

  return projects.length > 0 ? projects : fallback.map(stripHiddenProjectFields);
}

function normalizeProject(
  value: unknown,
  fallbackProject: ResumeProject | undefined,
  allFallbackProjects: ResumeProject[],
): ResumeProject | null {
  if (!value || typeof value !== "object") {
    return fallbackProject ? stripHiddenProjectFields(fallbackProject) : null;
  }

  const input = value as Partial<ResumeProject> & {
    description?: unknown;
    website?: unknown;
    github?: unknown;
  };
  const name = normalizeString(input.name, fallbackProject?.name ?? "");

  if (!name) {
    return null;
  }

  const matchedFallback =
    findProjectByName(allFallbackProjects, name) ?? fallbackProject;
  const projectLinks = normalizeProjectLinks(input, matchedFallback);
  const bullets = normalizeBullets(input.bullets, name, matchedFallback);

  return {
    id: normalizeString(input.id, matchedFallback?.id ?? slugify(name)),
    name,
    links: projectLinks,
    context: normalizeString(
      input.context ?? input.description,
      matchedFallback?.context ?? "",
    ),
    bullets,
    emphasis: normalizeEmphasis(input.emphasis, matchedFallback?.emphasis),
  };
}

function stripHiddenProjectFields(project: ResumeProject): ResumeProject {
  return {
    id: project.id,
    name: project.name,
    links: normalizeProjectLinks(project, project),
    context: project.context,
    bullets: normalizeBullets(project.bullets, project.name, project),
    emphasis: normalizeEmphasis(project.emphasis, project.emphasis),
  };
}

function normalizeProjectLinks(
  project: Partial<ResumeProject> & { website?: unknown; github?: unknown },
  fallback?: ResumeProject,
) {
  const link = normalizeString(project.link, "");
  const website = normalizeString(
    project.links?.website ?? project.website,
    fallback?.links?.website ?? (!isGithubUrl(link) ? link : ""),
  );
  const github = normalizeString(
    project.links?.github ?? project.github,
    fallback?.links?.github ?? (isGithubUrl(link) ? link : ""),
  );

  return {
    website: isUsefulWebsite(website) ? website : "",
    github: isGithubUrl(github) ? github : "",
  };
}

function normalizeBullets(
  value: unknown,
  projectName: string,
  fallbackProject?: ResumeProject,
): ResumeBullet[] {
  const source = Array.isArray(value) ? value : fallbackProject?.bullets ?? [];
  const bullets = source
    .map((item, index) => normalizeBullet(item, projectName, index))
    .filter((item): item is ResumeBullet => Boolean(item));

  return bullets.length > 0 ? bullets : [];
}

function normalizeBullet(
  value: unknown,
  projectName: string,
  index: number,
): ResumeBullet | null {
  const text =
    typeof value === "string"
      ? value.trim()
      : value && typeof value === "object"
        ? normalizeString((value as Partial<ResumeBullet>).text, "")
        : "";

  if (!text || shouldDropBullet(text, projectName)) {
    return null;
  }

  const input = value && typeof value === "object" ? (value as Partial<ResumeBullet>) : {};

  return {
    id: normalizeString(input.id, `${slugify(projectName)}-bullet-${index + 1}`),
    text,
    tags: normalizeStringArray(input.tags),
    riskLevel: normalizeRiskLevel(input.riskLevel),
  };
}

function normalizeEducation(
  value: unknown,
  fallback: ResumeData["education"] = [],
  options: { preferFallback?: boolean } = {},
): ResumeData["education"] {
  if (options.preferFallback && fallback.length > 0) {
    return fallback.map(stripHiddenEducationFields);
  }

  if (!Array.isArray(value)) {
    return fallback.map(stripHiddenEducationFields);
  }

  const education = value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const input = item as ResumeData["education"][number] & {
        graduationTime?: unknown;
        relatedCourses?: unknown;
      };
      const fallbackItem = fallback[index];
      const courses = normalizeStringArray(
        input.courses ?? input.relatedCourses ?? fallbackItem?.courses,
      );
      const details = normalizeStringArray(input.details ?? fallbackItem?.details);
      const school = normalizeString(input.school, fallbackItem?.school ?? "");

      if (!school) {
        return null;
      }

      return {
        school,
        schoolBadge: applyInferredSchoolBadge(
          school,
          normalizeString(input.schoolBadge, fallbackItem?.schoolBadge ?? ""),
        ),
        major: preserveOriginalMajorLevel(
          normalizeString(input.major, fallbackItem?.major ?? ""),
          fallbackItem?.major ?? "",
        ),
        timeframe: normalizeString(
          input.timeframe ?? input.graduationTime,
          fallbackItem?.timeframe ?? "",
        ),
        gpa: preserveOriginalGpaDetail(
          normalizeString(input.gpa, fallbackItem?.gpa ?? ""),
          fallbackItem?.gpa ?? "",
        ),
        courses: cleanEducationDetailItems(courses),
        details: cleanEducationDetailItems(details),
      };
    })
    .filter(Boolean) as ResumeData["education"];

  return education.length > 0 ? education : fallback.map(stripHiddenEducationFields);
}

function stripHiddenEducationFields(
  item: ResumeData["education"][number],
): ResumeData["education"][number] {
  return {
    school: item.school,
    schoolBadge: applyInferredSchoolBadge(item.school, item.schoolBadge),
    major: item.major,
    timeframe: item.timeframe,
    gpa: item.gpa,
    courses: cleanEducationDetailItems(item.courses),
    details: cleanEducationDetailItems(item.details),
  };
}

function normalizeChangeLog(value: unknown): TailorChangeLog {
  const input =
    value && typeof value === "object" ? (value as Partial<TailorChangeLog>) : {};

  return {
    strengthenedProjects: normalizeProjectChanges(input.strengthenedProjects),
    weakenedProjects: normalizeProjectChanges(input.weakenedProjects),
    skillChanges: normalizeStringArray(input.skillChanges),
    summaryChanges: normalizeStringArray(input.summaryChanges),
    riskWarnings: normalizeStringArray(input.riskWarnings),
    truthCheck: {
      passed:
        typeof input.truthCheck?.passed === "boolean"
          ? input.truthCheck.passed
          : true,
      warnings: normalizeStringArray(input.truthCheck?.warnings),
    },
  };
}

function normalizeProjectChanges(value: unknown): TailorProjectChange[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const input = item as Partial<TailorProjectChange>;
      const projectName = normalizeString(input.projectName, "");

      if (!projectName) {
        return null;
      }

      return {
        projectName,
        reason: normalizeString(input.reason, ""),
        changes: normalizeStringArray(input.changes),
      };
    })
    .filter((item): item is TailorProjectChange => Boolean(item));
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function preserveOriginalGpaDetail(current: string, original: string) {
  if (!original) {
    return current;
  }

  if (!current || current.length < original.length) {
    return original;
  }

  return current;
}

function preserveOriginalMajorLevel(current: string, original: string) {
  if (!original.includes("本科") || current.includes("本科")) {
    return current || original;
  }

  return `${current || original} 本科`.trim();
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }

    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function splitSkillContent(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeStringArray(value);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[;；、，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEmphasis(value: unknown, fallback: unknown): RoleDirection[] {
  const directions = normalizeStringArray(value).filter(
    (item): item is RoleDirection => validDirections.includes(item as RoleDirection),
  );
  const fallbackDirections = normalizeStringArray(fallback).filter(
    (item): item is RoleDirection => validDirections.includes(item as RoleDirection),
  );

  return directions.length > 0
    ? directions
    : fallbackDirections.length > 0
      ? fallbackDirections
      : ["ai_product_manager"];
}

function normalizeRiskLevel(value: unknown): ResumeBullet["riskLevel"] {
  return value === "medium" || value === "high" ? value : "low";
}

function findProjectByName(projects: ResumeProject[], name: string) {
  const normalizedName = name.toLowerCase();
  return projects.find((project) => {
    const current = project.name.toLowerCase();
    return current.includes(normalizedName) || normalizedName.includes(current);
  });
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `project-${Date.now()}`
  );
}

function isGithubUrl(value: string) {
  return /github\.com\/[A-Za-z0-9_.-]+/i.test(value);
}

function isUsefulWebsite(value: string) {
  if (!value) {
    return false;
  }

  return (
    /https?:\/\//i.test(value) ||
    /^www\./i.test(value) ||
    /(portfolio|vercel|cloud-ip|filegear|website|site)/i.test(value)
  );
}

function looksLikeEmailDomain(value: string) {
  return /^(gmail|qq|163|outlook|hotmail)\.com$/i.test(value.trim());
}

function shouldDropBullet(text: string, projectName: string) {
  const normalized = text.trim();

  return (
    normalized === projectName ||
    /^-{2,}\s*\d+\s+of\s+\d+\s*-{2,}$/i.test(normalized) ||
    /^page\s*\d+$/i.test(normalized) ||
    /github\.com\//i.test(normalized) ||
    /^website[:：]/i.test(normalized) ||
    /^https?:\/\//i.test(normalized) ||
    looksLikeEmailDomain(normalized)
  );
}
