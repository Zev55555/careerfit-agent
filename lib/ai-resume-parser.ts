import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  ResumeBullet,
  ResumeData,
  ResumeProject,
  RoleDirection,
} from "@/lib/resume-schema";
import { getOpenAiApiKey, getOpenAiModel, isOpenAiConfigured } from "@/lib/openai-config";
import { normalizePersonalProfileLinks } from "@/lib/profile-links";
import {
  applyInferredSchoolBadge,
  cleanEducationDetailItems,
} from "@/lib/school-badge";
import { validateResumeData } from "@/lib/validation";

type AiResumeImportResponse = {
  resume: ResumeData;
  warnings?: string[];
};

const resumeImportSchema = {
  type: "object",
  additionalProperties: false,
  required: ["resume", "warnings"],
  properties: {
    resume: {
      type: "object",
      additionalProperties: false,
      required: ["meta", "profile", "skills", "projects", "education"],
      properties: {
        meta: {
          type: "object",
          additionalProperties: false,
          required: ["version", "templateLocked", "lastUpdated", "source"],
          properties: {
            version: { type: "string" },
            templateLocked: { type: "boolean" },
            lastUpdated: { type: "string" },
            source: { type: "string", enum: ["pdf-upload"] },
          },
        },
        profile: {
          type: "object",
          additionalProperties: false,
          required: ["name", "email", "phone", "links"],
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            links: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        skills: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "items"],
            properties: {
              label: { type: "string" },
              items: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
        projects: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "name", "links", "context", "bullets", "emphasis"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              links: {
                type: "object",
                additionalProperties: false,
                required: ["website", "github"],
                properties: {
                  website: { type: "string" },
                  github: { type: "string" },
                },
              },
              context: { type: "string" },
              bullets: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "text", "tags", "riskLevel"],
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                    tags: {
                      type: "array",
                      items: { type: "string" },
                    },
                    riskLevel: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                    },
                  },
                },
              },
              emphasis: {
                type: "array",
                items: {
                  type: "string",
                  enum: [
                    "ai_product_manager",
                    "ai_agent_application",
                    "llm_application",
                  ],
                },
              },
            },
          },
        },
        education: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "school",
              "schoolBadge",
              "major",
              "timeframe",
              "gpa",
              "courses",
              "details",
            ],
            properties: {
              school: { type: "string" },
              schoolBadge: { type: "string" },
              major: { type: "string" },
              timeframe: { type: "string" },
              gpa: { type: "string" },
              courses: {
                type: "array",
                items: { type: "string" },
              },
              details: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

export async function parseResumeWithAI(rawText: string): Promise<{
  resume: ResumeData;
  warnings: string[];
}> {
  const apiKey = getOpenAiApiKey();

  if (!isOpenAiConfigured()) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const prompt = await readImportPrompt();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      input: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `请把下面 PDF rawText 解析成 ResumeData JSON：\n\n${rawText.slice(0, 18000)}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "resume_import_result",
          strict: true,
          schema: resumeImportSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI resume import failed: ${detail.slice(0, 500)}`);
  }

  const payload = (await response.json()) as { output_text?: string };
  const outputText = payload.output_text ?? extractOutputText(payload);

  if (!outputText) {
    throw new Error("OpenAI resume import returned no text output.");
  }

  const parsed = JSON.parse(outputText) as AiResumeImportResponse;
  const resume = normalizeAiResume(parsed.resume, rawText);
  const validation = validateResumeData(resume);
  const parserWarnings = validation.issues.filter(
    (issue) => !issue.includes("模板尚未锁定"),
  );

  if (!validation.ok) {
    throw new Error(`AI parsed resume failed validation: ${validation.issues.join("；")}`);
  }

  return {
    resume,
    warnings: [...(parsed.warnings ?? []), ...parserWarnings],
  };
}

function normalizeAiResume(resume: ResumeData, rawText: string): ResumeData {
  const links = normalizeProfileLinks(resume.profile.links ?? []);
  const inferredMajor = inferMajorFromRawText(rawText);
  const inferredGpa = inferGpaFromRawText(rawText);
  const inferredAge = inferAgeFromRawText(rawText);

  return {
    meta: {
      version: "0.1.0-ai-import",
      templateLocked: false,
      lastUpdated: new Date().toISOString().slice(0, 10),
      source: "pdf-upload",
    },
    profile: {
      name: cleanInline(resume.profile.name),
      email: cleanEmail(resume.profile.email),
      phone: cleanInline(resume.profile.phone),
      headline: inferredAge,
      links,
    },
    summary: "",
    skills: (resume.skills ?? [])
      .map((group) => ({
        label: cleanInline(group.label),
        items: group.items.map(cleanInline).filter(Boolean),
      }))
      .filter((group) => group.label || group.items.length > 0),
    education: (resume.education ?? [])
      .map((item) => ({
        school: cleanInline(item.school),
        schoolBadge: applyInferredSchoolBadge(
          cleanInline(item.school),
          cleanInline(item.schoolBadge ?? ""),
        ),
        major: chooseEducationMajor(cleanInline(item.major ?? ""), inferredMajor),
        timeframe: cleanInline(item.timeframe),
        gpa: chooseDetailedText(cleanInline(item.gpa ?? ""), inferredGpa),
        courses: cleanEducationDetailItems(
          (item.courses ?? []).map(cleanInline).filter(Boolean),
        ),
        details: cleanEducationDetailItems(
          (item.details ?? []).map(cleanInline).filter(Boolean),
        ),
      }))
      .filter((item) => item.school || item.major || item.timeframe || item.gpa),
    projects: (resume.projects ?? [])
      .map((project, index) => normalizeProject(project, index))
      .filter((project): project is ResumeProject => Boolean(project)),
    notes: [
      "This resume was generated from PDF text by an AI parser.",
      `Raw text length: ${rawText.length} characters.`,
    ],
    rawText: rawText.slice(0, 8000),
  };
}

function chooseEducationMajor(current: string, inferredMajor: string) {
  if (inferredMajor) {
    return inferredMajor;
  }

  return current;
}

function inferMajorFromRawText(rawText: string) {
  const normalized = rawText.replace(/\s+/g, " ");
  const statisticsMinor = normalized.match(
    /统计学专业\s*[+＋]\s*数据科学辅修/i,
  );

  if (statisticsMinor?.[0]) {
    return statisticsMinor[0].replace(/\s*[+＋]\s*/, " + ").trim();
  }

  const majorMatch = normalized.match(
    /(?:专业|Major)\s*[:：]\s*([^|。；;\n]+?)(?:\s*\|\s*(?:大一|大二|大三|大四|GPA)|\s+GPA|$)/i,
  );

  return majorMatch?.[1]?.trim() ?? "";
}

function inferGpaFromRawText(rawText: string) {
  const normalized = rawText.replace(/\s+/g, " ");
  const match = normalized.match(
    /GPA\s*[:：]?\s*([0-4](?:\.\d+)?\s*\/\s*4(?:\.0)?(?:\s*[（(]\s*专业前\s*\d+\s*%\s*[）)])?)/i,
  );

  return match?.[1]?.replace(/\s+/g, "") ?? "";
}

function inferAgeFromRawText(rawText: string) {
  const normalized = rawText.replace(/\s+/g, " ");
  const match = normalized.match(/(?:年龄\s*[:：]?\s*)?((?:1[6-9]|2\d|3[0-5])\s*岁)/);
  return match?.[1]?.replace(/\s+/g, "") ?? "";
}

function chooseDetailedText(current: string, inferred: string) {
  if (!inferred) {
    return current;
  }

  if (!current || inferred.length > current.length) {
    return inferred;
  }

  return current;
}

function normalizeProject(project: ResumeProject, index: number): ResumeProject | null {
  const name = cleanInline(project.name);

  if (!name || isNoiseLine(name)) {
    return null;
  }

  const links = {
    website: normalizeWebsite(project.links?.website ?? project.link ?? ""),
    github: normalizeGithub(project.links?.github ?? ""),
  };
  const bullets = project.bullets
    .map((bullet, bulletIndex) => normalizeBullet(bullet, name, index, bulletIndex))
    .filter((bullet): bullet is ResumeBullet => Boolean(bullet));

  return {
    id: cleanId(project.id) || `ai-project-${index + 1}`,
    name,
    links,
    link: links.website,
    context: cleanInline(project.context),
    bullets,
    emphasis: normalizeEmphasis(project.emphasis),
  };
}

function normalizeBullet(
  bullet: ResumeBullet,
  projectName: string,
  projectIndex: number,
  bulletIndex: number,
): ResumeBullet | null {
  const text = cleanInline(bullet.text);

  if (
    !text ||
    text === projectName ||
    text.includes(projectName) && text.length <= projectName.length + 4 ||
    isNoiseLine(text) ||
    isLinkLike(text) ||
    isEmailDomain(text)
  ) {
    return null;
  }

  return {
    id: cleanId(bullet.id) || `ai-project-${projectIndex + 1}-${bulletIndex + 1}`,
    text,
    tags: bullet.tags?.length ? bullet.tags.map(cleanInline).filter(Boolean) : ["ai-import"],
    riskLevel: bullet.riskLevel ?? "low",
  };
}

function normalizeProfileLinks(links: string[]) {
  const website = links.map(normalizeWebsite).find(Boolean) ?? "";
  const github = links.map(normalizeGithub).find(Boolean) ?? "";
  return normalizePersonalProfileLinks([website, github].filter(Boolean));
}

function normalizeWebsite(value: string) {
  const cleaned = cleanInline(value);

  if (!cleaned || /github\.com\//i.test(cleaned) || isEmailDomain(cleaned)) {
    return "";
  }

  return cleaned;
}

function normalizeGithub(value: string) {
  const cleaned = cleanInline(value);
  const match = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+(?:\/[^\s,，。；;]*)?/i);
  return match?.[0] ?? "";
}

function normalizeEmphasis(value: RoleDirection[] | undefined): RoleDirection[] {
  const allowed: RoleDirection[] = [
    "ai_product_manager",
    "ai_agent_application",
    "llm_application",
  ];
  const next = (value ?? []).filter((item): item is RoleDirection =>
    allowed.includes(item),
  );

  return next.length > 0 ? next : ["ai_product_manager"];
}

function cleanEmail(value: string) {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? "";
}

function cleanInline(value: string) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[-•·]\s*/, "")
    .trim();
}

function cleanId(value: string) {
  return cleanInline(value).replace(/[^a-z0-9_-]/gi, "-").slice(0, 80);
}

function isLinkLike(value: string) {
  return /github\.com\/|https?:\/\/|www\.|Website[:：]|项目链接[:：]|作品集链接[:：]/i.test(
    value,
  );
}

function isEmailDomain(value: string) {
  return /^(gmail|qq|163|126|outlook|hotmail|icloud|foxmail)\.com$/i.test(value);
}

function isNoiseLine(value: string) {
  return /^[-–—\s]*\d+\s*(of|\/)\s*\d+[-–—\s]*$/i.test(value) ||
    /^page\s*\d+/i.test(value) ||
    /^[-–—\s]+$/.test(value);
}

async function readImportPrompt() {
  const promptPath = path.join(process.cwd(), "prompts", "resume_import_parser.md");
  return readFile(promptPath, "utf8");
}

function extractOutputText(payload: unknown) {
  const response = payload as {
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };

  return response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim();
}
