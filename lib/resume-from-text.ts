import type { ResumeData, ResumeProject, RoleDirection } from "@/lib/resume-schema";
import { normalizePersonalProfileLinks } from "@/lib/profile-links";
import {
  applyInferredSchoolBadge,
  cleanEducationDetailItems,
} from "@/lib/school-badge";

type ParsedSectionName = "skills" | "education" | "projects" | "other";

type ParsedSections = Record<ParsedSectionName, string[]>;

const emailDomainBlocklist = new Set([
  "gmail.com",
  "qq.com",
  "163.com",
  "126.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "foxmail.com",
]);

const sectionHeadings: Array<{ name: ParsedSectionName; patterns: RegExp[] }> = [
  {
    name: "education",
    patterns: [/^教育背景$/, /^教育经历$/, /^教育$/, /^education$/i],
  },
  {
    name: "skills",
    patterns: [
      /^专业技能$/,
      /^技能$/,
      /^技能特长$/,
      /^technical skills$/i,
      /^skills$/i,
    ],
  },
  {
    name: "projects",
    patterns: [
      /^项目经历$/,
      /^项目经验$/,
      /^个人项目$/,
      /^个人作品集$/,
      /^实践经历$/,
      /^实习经历$/,
      /^projects?$/i,
      /^selected projects$/i,
      /^experience$/i,
    ],
  },
];

const skillCategoryNames = [
  "AI 产品与 Agent 工作流",
  "AI 应用评测与优化",
  "数据分析与指标体系",
  "产品设计与需求分析",
  "工具与协作",
  "英语能力",
  "编程与数据工具",
  "大模型应用",
];

export function parseResumeTextToResumeData(rawText: string): {
  resume: ResumeData;
  warnings: string[];
} {
  const lines = normalizeLines(rawText);
  const warnings: string[] = [];

  if (lines.length === 0) {
    throw new Error("PDF 文本为空，无法生成 ResumeData。");
  }

  const sections = splitSections(lines);
  const profile = parseProfile(lines);
  const education = parseEducation(sections.education, lines);
  const skills = parseSkills(sections.skills, lines);
  const projects = parseProjects(sections.projects, lines);

  if (!profile.name) {
    warnings.push("未能可靠识别姓名，请在整理面板中补全。");
  }

  if (!profile.email) {
    warnings.push("未能可靠识别邮箱，请在整理面板中补全。");
  }

  if (education.length === 0) {
    warnings.push("未能可靠识别教育背景，请手动补充学校、专业、预计毕业时间和 GPA。");
  } else if (!education[0].gpa) {
    warnings.push("未能识别 GPA，请确认原 PDF 是否包含 GPA 信息。");
  }

  if (skills.length === 0) {
    warnings.push("未能可靠识别专业技能，请手动补充技能分类。");
  }

  if (projects.length === 0) {
    warnings.push("未能可靠识别项目经历，请手动补充项目名称和 bullet。");
  }

  const resume: ResumeData = {
    meta: {
      version: "0.1.0-pdf-import",
      templateLocked: false,
      lastUpdated: new Date().toISOString().slice(0, 10),
      source: "pdf-upload",
    },
    profile,
    summary: "",
    skills,
    projects,
    education,
    notes: buildNotes(warnings, rawText),
    rawText: rawText.slice(0, 8000),
  };

  return {
    resume,
    warnings,
  };
}

function normalizeLines(rawText: string) {
  return rawText
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function splitSections(lines: string[]): ParsedSections {
  const sections: ParsedSections = {
    skills: [],
    education: [],
    projects: [],
    other: [],
  };
  let current: ParsedSectionName = "other";

  for (const line of lines) {
    const heading = matchHeading(line);

    if (heading) {
      current = heading;
      continue;
    }

    sections[current].push(line);
  }

  return sections;
}

function matchHeading(line: string): ParsedSectionName | null {
  const normalized = line.replace(/[:：]/g, "").trim();
  const heading = sectionHeadings.find((item) =>
    item.patterns.some((pattern) => pattern.test(normalized)),
  );

  return heading?.name ?? null;
}

function parseProfile(lines: string[]): ResumeData["profile"] {
  const email = findMatch(lines, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) ?? "";
  const phone =
    findMatch(
      lines,
      /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}|(?:\+?86[-.\s]?)?1[3-9]\d{9}/,
    ) ?? "";
  const name =
    lines.find((line) => isLikelyName(line, email, phone))?.trim() ?? "";
  const github = findGithub(lines);
  const website = findWebsite(lines, email);

  return {
    name,
    email,
    phone,
    headline: extractAge(lines.join(" ")),
    links: normalizePersonalProfileLinks([website, github].filter(Boolean)),
  };
}

function isLikelyName(line: string, email: string, phone: string) {
  if (!line || line.includes("@") || /https?:\/\//i.test(line) || line === phone) {
    return false;
  }

  if (email && line.includes(email)) {
    return false;
  }

  const stripped = line.replace(/\s+/g, "");
  const hasSectionWords =
    /教育|项目|技能|经历|求职|意向|学校|大学|学院|课程|summary|education|project|skill/i.test(
      line,
    );
  const isChineseName = /^[\u4e00-\u9fa5]{2,5}$/.test(stripped);
  const isEnglishName = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(line);

  return !hasSectionWords && (isChineseName || isEnglishName);
}

function parseEducation(
  educationLines: string[],
  allLines: string[],
): ResumeData["education"] {
  const source =
    educationLines.length > 0
      ? educationLines
      : allLines.filter((line) => isEducationLine(line) || isGpaLine(line) || isCourseLine(line));

  if (source.length === 0) {
    return [];
  }

  const joined = source.join(" ");
  const gpa = extractGpa(joined);
  const courses = extractCourses(source);
  const school =
    source.find((line) => /university|college|school|大学|学院|分校/i.test(line)) ??
    "";
  const major = extractMajor(source, allLines);
  const timeframe = extractExpectedGraduation(source) || findDateRange(joined) || "";

  return [
    {
      school,
      schoolBadge: applyInferredSchoolBadge(school),
      major,
      timeframe,
      gpa,
      courses: cleanEducationDetailItems(courses),
      details: [],
    },
  ];
}

function extractMajor(lines: string[], allLines: string[] = lines) {
  const fullText = allLines.join(" ").replace(/\s+/g, " ");
  const statisticsMinor = fullText.match(/统计学专业\s*[+＋]\s*数据科学辅修/i);

  if (statisticsMinor?.[0]) {
    return statisticsMinor[0].replace(/\s*[+＋]\s*/, " + ").trim();
  }

  const explicit = lines.find((line) => /专业[:：]/.test(line));

  if (explicit) {
    return explicit.replace(/^.*专业[:：]\s*/, "").replace(/GPA.*$/i, "").trim();
  }

  const majorLine = lines.find(
    (line) =>
      /major|business|analytics|data science|computer science|management|经济|金融|统计|数据|商业分析|认知科学|计算机/i.test(
        line,
      ) && !isGpaLine(line) && !isCourseLine(line),
  );

  return majorLine?.trim() ?? "";
}

function extractGpa(text: string) {
  const match = text.match(/GPA\s*[:：]?\s*([0-4](?:\.\d+)?\s*\/\s*4(?:\.0)?(?:\s*[（(][^）)]*[）)])?)/i);
  return match?.[1]?.replace(/\s+/g, "") ?? "";
}

function extractAge(text: string) {
  const match = text.match(/(?:年龄\s*[:：]?\s*)?((?:1[6-9]|2\d|3[0-5])\s*岁)/);
  return match?.[1]?.replace(/\s+/g, "") ?? "";
}

function extractCourses(lines: string[]) {
  const courses: string[] = [];

  for (const line of lines) {
    const match = line.match(/相关课程\s*[:：]\s*(.+)$/);

    if (match?.[1]) {
      courses.push(...splitList(match[1]));
    }
  }

  return cleanEducationDetailItems(courses);
}

function extractExpectedGraduation(lines: string[]) {
  for (const line of lines) {
    const match = line.match(/(?:预计毕业时间|预计毕业|毕业时间)\s*[:：]?\s*(.+)$/);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function parseSkills(skillLines: string[], allLines: string[]) {
  const source = skillLines.length > 0 ? skillLines : inferSkillLines(allLines);
  const groups = source.flatMap(parseSkillLine).filter((group) => group.items.length > 0);
  const unique = new Map<string, string[]>();

  for (const group of groups) {
    const existing = unique.get(group.label) ?? [];
    unique.set(group.label, Array.from(new Set([...existing, ...group.items])));
  }

  return Array.from(unique.entries()).map(([label, items]) => ({ label, items }));
}

function parseSkillLine(line: string) {
  const normalized = line.replace(/^[-•·]\s*/, "").trim();
  const match = normalized.match(/^([^:：]{2,24})[:：]\s*(.+)$/);

  if (match?.[1] && match[2] && isSkillCategory(match[1])) {
    return [
      {
        label: match[1].trim(),
        items: splitList(match[2]),
      },
    ];
  }

  return [];
}

function isSkillCategory(value: string) {
  return (
    skillCategoryNames.some((name) => value.includes(name)) ||
    /技能|工具|协作|英语|产品|Agent|大模型|数据分析|指标|评测|优化|需求/i.test(value)
  );
}

function inferSkillLines(lines: string[]) {
  return lines.filter((line) =>
    /[:：].*(python|sql|prompt|llm|agent|figma|产品|数据|分析|模型|评测|优化|工具|英语)/i.test(
      line,
    ),
  );
}

function parseProjects(projectLines: string[], allLines: string[]): ResumeProject[] {
  const source =
    projectLines.length > 0
      ? projectLines
      : allLines.filter(
          (line) =>
            !isContactOrStandaloneLink(line) &&
            /项目|project|portfolio|agent|SOVA|InsightFlow|Transit|Exposure|JD Match/i.test(
              line,
            ),
        );

  if (source.length === 0) {
    return [];
  }

  return chunkProjects(source)
    .map((chunk, index) => chunkToProject(chunk, index))
    .filter((project): project is ResumeProject => Boolean(project));
}

function chunkProjects(lines: string[]) {
  const chunks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (isProjectTitle(line) && current.length > 0) {
      chunks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

function isProjectTitle(line: string) {
  const clean = line.replace(/^[-•·]\s*/, "").trim();

  if (
    clean.length > 80 ||
    isEducationLine(clean) ||
    isGpaLine(clean) ||
    isCourseLine(clean) ||
    /^GitHub[:：]/i.test(clean) ||
    /^(Website|项目链接|作品集链接)[:：]/i.test(clean) ||
    isContactOrStandaloneLink(clean)
  ) {
    return false;
  }

  return /SOVA|InsightFlow|Transit|Exposure|Portfolio|JD Match|项目|Project|Agent|Console/i.test(clean);
}

function chunkToProject(chunk: string[], index: number): ResumeProject | null {
  const title = chunk[0]?.replace(/^[-•·]\s*/, "").trim();

  if (!title || !isProjectTitle(title)) {
    return null;
  }

  const links = extractProjectLinks(chunk);
  const body = chunk
    .slice(1)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !isProjectLinkLine(line) &&
        line !== title &&
        !isProjectTitle(line),
    );
  const context = body.find((line) => line.length > 12 && !isBulletLike(line)) ?? "";
  const bulletLines = body
    .filter((line) => line !== context)
    .filter((line) => line.length > 6)
    .slice(0, 5);

  return {
    id: `pdf-project-${index + 1}`,
    name: title,
    links,
    link: links.website,
    context,
    bullets: bulletLines.map((text, bulletIndex) => ({
      id: `pdf-project-${index + 1}-${bulletIndex + 1}`,
      text: cleanBullet(text),
      tags: ["pdf-import"],
      riskLevel: "low" as const,
    })),
    emphasis: inferEmphasis(chunk.join(" ")),
  };
}

function extractProjectLinks(lines: string[]) {
  const links: { website?: string; github?: string } = {};

  for (const line of lines) {
    const github = line.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+(?:\/[^\s,，。；;]*)?/i)?.[0];
    const website = line.match(
      /(?:Website|项目链接|作品集链接|Project Link)\s*[:：]\s*((?:https?:\/\/|www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s,，。；;]*)?)/i,
    )?.[1];

    if (github) {
      links.github = github;
    }

    if (website && !/github\.com\//i.test(website)) {
      links.website = website;
    }
  }

  return links;
}

function isProjectLinkLine(line: string) {
  return /github\.com\/|Website[:：]|项目链接[:：]|作品集链接[:：]|Project Link[:：]/i.test(line);
}

function isContactOrStandaloneLink(line: string) {
  return (
    /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(line) ||
    /^(?:https?:\/\/|www\.)[^\s]+$/i.test(line) ||
    /^(?:github\.com|[A-Za-z0-9.-]+\.(?:com|net|io|dev|app))[^\s]*$/i.test(line)
  );
}

function isBulletLike(line: string) {
  return /^[-•·]/.test(line) || /^([^:：]{2,18})[:：]/.test(line);
}

function inferEmphasis(text: string): RoleDirection[] {
  const emphasis: RoleDirection[] = [];

  if (/产品|需求|用户|prd|product/i.test(text)) {
    emphasis.push("ai_product_manager");
  }

  if (/agent|智能体|workflow|tool|自动化/i.test(text)) {
    emphasis.push("ai_agent_application");
  }

  if (/llm|大模型|prompt|rag|模型|aigc/i.test(text)) {
    emphasis.push("llm_application");
  }

  return emphasis.length > 0 ? emphasis : ["ai_product_manager"];
}

function findGithub(lines: string[]) {
  for (const line of lines) {
    const match = line.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+(?:\/[^\s,，。；;]*)?/i);

    if (match?.[0]) {
      return match[0];
    }
  }

  return "";
}

function findWebsite(lines: string[], email: string) {
  const emailDomain = email.split("@")[1]?.toLowerCase();

  for (const line of lines) {
    const withoutEmail = email ? line.replace(email, " ") : line;

    if (/github\.com\//i.test(withoutEmail)) {
      continue;
    }

    const matches =
      withoutEmail.match(
        /(?:https?:\/\/|www\.)[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^\s,，。；;]*)?|(?:[A-Za-z0-9-]+\.)+(?:vercel\.app|com|net|io|dev|app)(?:\/[^\s,，。；;]*)?/gi,
      ) ?? [];

    for (const candidate of matches) {
      const normalized = candidate.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
      const domain = normalized.split("/")[0]?.toLowerCase() ?? "";

      if (!domain || domain === emailDomain || emailDomainBlocklist.has(domain)) {
        continue;
      }

      if (
        /^https?:\/\//i.test(candidate) ||
        /^www\./i.test(candidate) ||
        /portfolio|vercel|cloud-ip|filegear|作品集|个人网站|Website/i.test(line)
      ) {
        return candidate;
      }
    }
  }

  return "";
}

function isEducationLine(line: string) {
  return /university|college|school|bachelor|master|ucsd|california|san diego|大学|学院|分校|本科|硕士|学士|研究生|专业|预计毕业/i.test(
    line,
  );
}

function isGpaLine(line: string) {
  return /GPA\s*[:：]?\s*[0-4](?:\.\d+)?\s*\/\s*4(?:\.0)?/i.test(line);
}

function isCourseLine(line: string) {
  return /相关课程\s*[:：]/.test(line);
}

function findMatch(lines: string[], pattern: RegExp) {
  for (const line of lines) {
    const match = line.match(pattern);

    if (match?.[0]) {
      return match[0];
    }
  }

  return null;
}

function findDateRange(text: string) {
  const match = text.match(
    /(?:20\d{2}|19\d{2})(?:\s?[./年-]\s?(?:20\d{2}|19\d{2}|至今|present|now))?/i,
  );

  return match?.[0] ?? null;
}

function splitList(value: string) {
  return value
    .split(/[,，;；、]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanBullet(text: string) {
  return text.replace(/^[-•·]\s*/, "").replace(/\s+/g, " ").trim();
}

function buildNotes(warnings: string[], rawText: string) {
  return [
    "This resume was generated from PDF text by a rule-based parser.",
    ...warnings,
    `Raw text length: ${rawText.length} characters.`,
  ];
}
