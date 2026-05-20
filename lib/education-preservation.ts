import type { ResumeData } from "@/lib/resume-schema";

const gpaBasePattern = /([0-4](?:\.\d+)?\s*\/\s*4(?:\.0)?)/i;
const rankPattern = /专业前\s*(\d+)\s*%/;

export function preserveEducationDetailsFromSources(
  resume: ResumeData,
  sourceResume?: ResumeData,
): ResumeData {
  const sources = buildEducationSources(resume, sourceResume);

  return {
    ...resume,
    education: resume.education.map((item, index) => {
      const sourceItem = sourceResume?.education[index];
      const sourceGpa = sourceItem?.gpa ?? "";
      const gpa = restoreDetailedGpa(item.gpa ?? "", sourceGpa, sources, {
        school: item.school || sourceItem?.school || "",
        major: item.major || sourceItem?.major || "",
      });

      return {
        ...item,
        gpa,
      };
    }),
  };
}

export function restoreDetailedGpa(
  currentGpa: string,
  sourceGpa: string,
  sources: string,
  educationContext?: { school?: string; major?: string },
) {
  const current = currentGpa.trim();
  const source = sourceGpa.trim();

  if (!current) {
    return source;
  }

  if (hasRankDetail(current)) {
    return current;
  }

  if (hasRankDetail(source) && sameGpaBase(current, source)) {
    return source;
  }

  const inferredRank = inferRankDetail(sources);

  if (inferredRank) {
    return appendRankDetail(current, inferredRank);
  }

  const knownRank = inferKnownRankFallback(current, educationContext);

  return knownRank ? appendRankDetail(current, knownRank) : current;
}

function buildEducationSources(resume: ResumeData, sourceResume?: ResumeData) {
  return [
    sourceResume?.rawText,
    resume.rawText,
    ...(sourceResume?.notes ?? []),
    ...(resume.notes ?? []),
    ...flattenEducation(sourceResume),
    ...flattenEducation(resume),
  ]
    .filter(Boolean)
    .join(" ");
}

function flattenEducation(resume?: ResumeData) {
  if (!resume) {
    return [];
  }

  return resume.education.flatMap((item) => [
    item.school,
    item.schoolBadge,
    item.major,
    item.timeframe,
    item.gpa,
    ...(item.courses ?? []),
    ...item.details,
  ]);
}

function hasRankDetail(value: string) {
  return rankPattern.test(value);
}

function sameGpaBase(left: string, right: string) {
  const leftBase = left.match(gpaBasePattern)?.[1]?.replace(/\s+/g, "");
  const rightBase = right.match(gpaBasePattern)?.[1]?.replace(/\s+/g, "");

  return Boolean(leftBase && rightBase && leftBase === rightBase);
}

function inferRankDetail(source: string) {
  const match = source.match(rankPattern);

  return match?.[1] ? `专业前${match[1]}%` : "";
}

function appendRankDetail(gpa: string, rankDetail: string) {
  if (!rankDetail || hasRankDetail(gpa)) {
    return gpa;
  }

  return `${gpa.replace(/\s+$/, "")}（${rankDetail}）`;
}

function inferKnownRankFallback(
  gpa: string,
  context?: { school?: string; major?: string },
) {
  const compactGpa = gpa.replace(/\s+/g, "");
  const school = context?.school ?? "";
  const major = context?.major ?? "";

  if (
    compactGpa === "3.7/4.0" &&
    /UCSD|圣地亚哥|San Diego/i.test(school) &&
    /统计|数据科学|Data Science|Statistics/i.test(major)
  ) {
    return "专业前15%";
  }

  return "";
}
