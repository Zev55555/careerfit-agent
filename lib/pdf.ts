import { readFile } from "node:fs/promises";
import path from "node:path";
import { shouldUseCompactResumeLayout } from "@/lib/resume-density";
import type { ResumeData, ResumeProject } from "@/lib/resume-schema";
import {
  applyInferredSchoolBadge,
  cleanEducationDetailItems,
  normalizeSchoolNameForDisplay,
} from "@/lib/school-badge";

export type PdfExportInput = {
  resume: ResumeData;
  fileName?: string;
};

export type PdfExportResult = {
  buffer: Buffer;
  fileName: string;
};

export async function exportResumePdf({
  resume,
  fileName,
}: PdfExportInput): Promise<PdfExportResult> {
  const { chromium } = await import("playwright");
  const html = await renderResumeHtml(resume);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({
      viewport: {
        width: 794,
        height: 1123,
      },
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    return {
      buffer: Buffer.from(pdf),
      fileName: sanitizePdfFileName(fileName || buildResumeFileName(resume)),
    };
  } finally {
    await browser.close();
  }
}

export async function renderResumeHtml(resume: ResumeData) {
  const cssPath = path.join(process.cwd(), "templates", "resume.css");
  const resumeCss = await readFile(cssPath, "utf8");
  const resumeMarkup = renderResumeMarkup(resume);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(resume.profile.name)} Resume</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      background: #ffffff;
    }
    body {
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    ${resumeCss}
    .resume-page {
      box-shadow: none;
      height: 297mm;
      min-height: 297mm;
      max-height: 297mm;
    }
  </style>
</head>
<body>
  ${resumeMarkup}
</body>
</html>`;
}

function renderResumeMarkup(resume: ResumeData) {
  const compactClass = shouldUseCompactResumeLayout(resume)
    ? " resume-page-compact"
    : "";

  return `<article class="resume-page${compactClass}" aria-label="Resume preview">
    <header class="resume-header">
      <h1>${renderInlineHtml(resume.profile.name)}</h1>
      <div class="resume-contact">
        ${[
          resume.profile.email,
          resume.profile.phone,
          getAgeText(resume),
          getGithubLink(resume.profile.links),
        ]
          .filter(Boolean)
          .map((item) => `<span>${renderInlineHtml(item)}</span>`)
          .join("<span> | </span>")}
      </div>
    </header>

    ${resume.education.length > 0 ? renderEducationMarkup(resume) : ""}

    <section class="resume-section">
      <h2>专业技能</h2>
      <ul class="resume-skills-list">
        ${resume.skills
          .filter((group) => group.label || group.items.length > 0)
          .map(
            (group) =>
              `<li>${
                group.label ? `<strong>${renderInlineHtml(group.label)}：</strong>` : ""
              }${renderInlineHtml(group.items.join("、"))}</li>`,
          )
          .join("")}
      </ul>
    </section>

    <section class="resume-section">
      <h2>项目经历</h2>
      <div class="resume-projects">
        ${resume.projects.map(renderProjectMarkup).join("")}
      </div>
    </section>
  </article>`;
}

function getGithubLink(links: string[]) {
  return links.find((link) => /github\.com\//i.test(link)) ?? "";
}

function getAgeText(resume: ResumeData) {
  const source = [
    resume.profile.headline,
    resume.profile.title,
    resume.profile.targetTitle,
    ...(resume.notes ?? []),
    resume.rawText,
  ]
    .filter(Boolean)
    .join(" ");
  const match = source.match(/(?:年龄\s*[:：]?\s*)?((?:1[6-9]|2\d|3[0-5])\s*岁)/);

  return match?.[1]?.replace(/\s+/g, "") ?? "";
}

function renderEducationMarkup(resume: ResumeData) {
  return `<section class="resume-section">
    <h2>教育背景</h2>
    ${resume.education
      .map((item) => {
        const schoolBadge = applyInferredSchoolBadge(
          item.school,
          item.schoolBadge,
        );
        const schoolName = normalizeSchoolNameForDisplay(item.school);
        const schoolWithBadge = schoolBadge
          ? `${schoolName}（${schoolBadge}）`
          : schoolName;
        const secondLine = [
          item.major,
          item.timeframe,
          item.gpa ? `GPA：${item.gpa}` : "",
        ].filter(Boolean);
        const courseLine = cleanEducationDetailItems([
          ...(item.courses ?? []),
          ...item.details,
        ]).join("、");

        return `<div class="resume-education">
          ${
            schoolWithBadge
              ? `<p class="resume-education-main education-school-line">${renderInlineHtml(schoolWithBadge)}</p>`
              : ""
          }
          ${
            secondLine.length > 0
              ? `<p class="resume-meta">${renderInlineHtml(secondLine.join(" | "))}</p>`
              : ""
          }
          ${
            courseLine
              ? `<p class="resume-meta">相关课程：${renderInlineHtml(courseLine)}</p>`
              : ""
          }
        </div>`;
      })
      .join("")}
  </section>`;
}

function renderProjectMarkup(project: ResumeProject) {
  const projectLinks = renderProjectLinks(project);
  const bullets = project.bullets.filter((bullet) => bullet.text.trim());

  return `<section class="resume-project">
    <h3>${renderInlineHtml(project.name)}</h3>
    ${projectLinks}
    ${project.context ? `<p class="resume-context">${renderInlineHtml(project.context)}</p>` : ""}
    ${
      bullets.length > 0
        ? `<ul>${bullets
            .map((bullet) => `<li>${renderBulletHtml(bullet.text)}</li>`)
            .join("")}</ul>`
        : ""
    }
  </section>`;
}

function renderProjectLinks(project: ResumeProject) {
  const legacyLink = project.link ?? "";
  const github =
    project.links?.github || (/github\.com\//i.test(legacyLink) ? legacyLink : "");
  const website =
    project.links?.website || (!/github\.com\//i.test(legacyLink) ? legacyLink : "");
  const links = [
    website ? `Website：${website}` : "",
    github ? `GitHub：${github}` : "",
  ].filter(Boolean);

  return links.length > 0
    ? `<p class="resume-link">${renderInlineHtml(links.join(" | "))}</p>`
    : "";
}

function buildResumeFileName(resume: ResumeData) {
  const name = resume.profile.name.trim() || "resume";
  return `${name}_定制简历.pdf`;
}

function sanitizePdfFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .trim();

  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

function renderBulletHtml(text: string) {
  const match = text.match(/^([^:：]{2,18}[:：])(.+)$/);

  if (!match) {
    return renderInlineHtml(text);
  }

  return `<strong>${renderInlineHtml(match[1])}</strong>${renderInlineHtml(match[2])}`;
}

function renderInlineHtml(value: string) {
  return value
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => {
      const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);

      if (boldMatch) {
        return `<strong>${escapeHtml(boldMatch[1])}</strong>`;
      }

      return escapeHtml(part);
    })
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
