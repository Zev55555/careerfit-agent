import type { FocusEvent, KeyboardEvent, ReactNode } from "react";
import { shouldUseCompactResumeLayout } from "@/lib/resume-density";
import type { ResumeData, ResumeProject } from "@/lib/resume-schema";
import {
  applyInferredSchoolBadge,
  cleanEducationDetailItems,
  normalizeSchoolNameForDisplay,
} from "@/lib/school-badge";

type ResumeLayoutProps = {
  resume: ResumeData;
  editable?: boolean;
  onResumeChange?: (resume: ResumeData) => void;
};

export function ResumeLayout({
  resume,
  editable = false,
  onResumeChange,
}: ResumeLayoutProps) {
  const canEdit = editable && Boolean(onResumeChange);

  const updateProfile = (patch: Partial<ResumeData["profile"]>) => {
    onResumeChange?.({
      ...resume,
      profile: { ...resume.profile, ...patch },
    });
  };

  const updateEducation = (
    index: number,
    patch: Partial<ResumeData["education"][number]>,
  ) => {
    onResumeChange?.({
      ...resume,
      education: resume.education.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  };

  const updateSkillGroup = (
    index: number,
    patch: Partial<ResumeData["skills"][number]>,
  ) => {
    onResumeChange?.({
      ...resume,
      skills: resume.skills.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  };

  const updateProject = (projectId: string, patch: Partial<ResumeProject>) => {
    onResumeChange?.({
      ...resume,
      projects: resume.projects.map((project) =>
        project.id === projectId ? { ...project, ...patch } : project,
      ),
    });
  };

  const updateProjectLinks = (
    project: ResumeProject,
    patch: Partial<NonNullable<ResumeProject["links"]>>,
  ) => {
    updateProject(project.id, {
      links: { ...(project.links ?? {}), ...patch },
    });
  };

  const updateProjectBullet = (
    projectId: string,
    bulletId: string,
    nextText: string,
  ) => {
    onResumeChange?.({
      ...resume,
      projects: resume.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              bullets: project.bullets.map((bullet) =>
                bullet.id === bulletId ? { ...bullet, text: nextText } : bullet,
              ),
            }
          : project,
      ),
    });
  };

  const updateGithubLink = (nextGithub: string) => {
    const existingLinks = resume.profile.links ?? [];
    const nextLinks = existingLinks.some((link) => /github\.com\//i.test(link))
      ? existingLinks.map((link) =>
          /github\.com\//i.test(link) ? nextGithub : link,
        )
      : [...existingLinks, nextGithub].filter(Boolean);

    updateProfile({ links: nextLinks.filter(Boolean) });
  };

  const contactItems = [
    {
      key: "email",
      value: resume.profile.email,
      onCommit: (nextValue: string) => updateProfile({ email: nextValue }),
    },
    {
      key: "phone",
      value: resume.profile.phone,
      onCommit: (nextValue: string) => updateProfile({ phone: nextValue }),
    },
    {
      key: "age",
      value: getAgeText(resume),
      onCommit: (nextValue: string) => updateProfile({ headline: nextValue }),
    },
    {
      key: "github",
      value: getGithubLink(resume.profile.links),
      onCommit: updateGithubLink,
    },
  ].filter((item) => item.value);

  return (
    <article
      aria-label="Resume preview"
      className={`resume-page${shouldUseCompactResumeLayout(resume) ? " resume-page-compact" : ""}`}
    >
      <header className="resume-header">
        <h1
          {...editableTextProps(canEdit, resume.profile.name, (nextValue) =>
            updateProfile({ name: nextValue }),
          )}
        >
          {renderInlineRichText(resume.profile.name)}
        </h1>
        <div className="resume-contact">
          {contactItems.map((item, index) => (
            <span key={item.key}>
              <span {...editableTextProps(canEdit, item.value, item.onCommit)}>
                {renderInlineRichText(item.value)}
              </span>
              {index < contactItems.length - 1 ? " | " : ""}
            </span>
          ))}
        </div>
      </header>

      {resume.education.length > 0 ? (
        <section className="resume-section">
          <h2>教育背景</h2>
          {resume.education.map((item, index) => {
            const schoolBadge = applyInferredSchoolBadge(
              item.school,
              item.schoolBadge,
            );
            const schoolName = normalizeSchoolNameForDisplay(item.school);
            const schoolWithBadge = schoolBadge
              ? `${schoolName}（${schoolBadge}）`
              : schoolName;
            const courseLine = cleanEducationDetailItems([
              ...(item.courses ?? []),
              ...item.details,
            ])
              .filter(Boolean)
              .join("、");

            return (
              <div className="resume-education" key={`${item.school}-${index}`}>
                {schoolWithBadge ? (
                  <p
                    className="resume-education-main education-school-line"
                    {...editableTextProps(canEdit, schoolWithBadge, (nextValue) =>
                      updateEducation(index, { school: nextValue }),
                    )}
                  >
                    {renderInlineRichText(schoolWithBadge)}
                  </p>
                ) : null}
                {item.major || item.timeframe || item.gpa ? (
                  <p className="resume-meta">
                    {item.major ? (
                      <span
                        {...editableTextProps(canEdit, item.major, (nextValue) =>
                          updateEducation(index, { major: nextValue }),
                        )}
                      >
                        {renderInlineRichText(item.major)}
                      </span>
                    ) : null}
                    {item.major && item.timeframe ? " | " : ""}
                    {item.timeframe ? (
                      <span
                        {...editableTextProps(
                          canEdit,
                          item.timeframe,
                          (nextValue) =>
                            updateEducation(index, { timeframe: nextValue }),
                        )}
                      >
                        {renderInlineRichText(item.timeframe)}
                      </span>
                    ) : null}
                    {(item.major || item.timeframe) && item.gpa ? " | " : ""}
                    {item.gpa ? (
                      <>
                        GPA：
                        <span
                          {...editableTextProps(canEdit, item.gpa, (nextValue) =>
                            updateEducation(index, { gpa: nextValue }),
                          )}
                        >
                          {renderInlineRichText(item.gpa)}
                        </span>
                      </>
                    ) : null}
                  </p>
                ) : null}
                {courseLine ? (
                  <p className="resume-meta">
                    相关课程：
                    <span
                      {...editableTextProps(canEdit, courseLine, (nextValue) =>
                        updateEducation(index, {
                          courses: [],
                          details: splitEditableList(nextValue),
                        }),
                      )}
                    >
                      {renderInlineRichText(courseLine)}
                    </span>
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="resume-section">
        <h2>专业技能</h2>
        <ul className="resume-skills-list">
          {resume.skills
            .filter((group) => group.label || group.items.length > 0)
            .map((group, index) => (
              <li key={group.label || group.items.join("、")}>
                {group.label ? (
                  <>
                    <strong
                      {...editableTextProps(canEdit, group.label, (nextValue) =>
                        updateSkillGroup(index, { label: nextValue }),
                      )}
                    >
                      {renderInlineRichText(group.label)}
                    </strong>
                    ：
                  </>
                ) : null}
                <span
                  {...editableTextProps(canEdit, group.items.join("、"), (nextValue) =>
                    updateSkillGroup(index, { items: splitEditableList(nextValue) }),
                  )}
                >
                  {renderInlineRichText(group.items.join("、"))}
                </span>
              </li>
            ))}
        </ul>
      </section>

      <section className="resume-section">
        <h2>项目经历</h2>
        <div className="resume-projects">
          {resume.projects.map((project) => (
            <section className="resume-project" key={project.id}>
              <h3
                {...editableTextProps(canEdit, project.name, (nextValue) =>
                  updateProject(project.id, { name: nextValue }),
                )}
              >
                {renderInlineRichText(project.name)}
              </h3>
              <ProjectLinks
                editable={canEdit}
                onChange={(patch) => updateProjectLinks(project, patch)}
                project={project}
              />
              {project.context ? (
                <p
                  className="resume-context"
                  {...editableTextProps(canEdit, project.context, (nextValue) =>
                    updateProject(project.id, { context: nextValue }),
                  )}
                >
                  {renderInlineRichText(project.context)}
                </p>
              ) : null}
              {project.bullets.length > 0 ? (
                <ul>
                  {project.bullets
                    .filter((bullet) => canEdit || bullet.text.trim())
                    .map((bullet) => (
                      <li
                        className={canEdit ? "resume-editable-bullet" : undefined}
                        key={bullet.id}
                      >
                        <span
                          className={
                            canEdit ? "resume-editable-bullet-text" : undefined
                          }
                          {...editableTextProps(canEdit, bullet.text, (nextValue) =>
                            updateProjectBullet(project.id, bullet.id, nextValue),
                          )}
                        >
                          {renderBulletText(bullet.text)}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </section>
    </article>
  );
}

function editableTextProps(
  editable: boolean,
  value: string,
  onCommit: (value: string) => void,
) {
  if (!editable) {
    return {};
  }

  return {
    contentEditable: true,
    onBlur: (event: FocusEvent<HTMLElement>) => {
      const nextValue = normalizeEditableText(event.currentTarget.innerText);

      if (nextValue && nextValue !== stripMarkdownBold(value)) {
        onCommit(nextValue);
      } else {
        event.currentTarget.innerText = stripMarkdownBold(value);
      }
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        event.currentTarget.innerText = stripMarkdownBold(value);
        event.currentTarget.blur();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
      }
    },
    suppressContentEditableWarning: true,
  };
}

function normalizeEditableText(value: string) {
  return stripMarkdownBold(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdownBold(value: string) {
  return value.replace(/\*\*(.*?)\*\*/g, "$1");
}

function splitEditableList(value: string) {
  return value
    .split(/[、,，;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function ProjectLinks({
  project,
  editable = false,
  onChange,
}: {
  project: ResumeProject;
  editable?: boolean;
  onChange?: (patch: Partial<NonNullable<ResumeProject["links"]>>) => void;
}) {
  const github =
    project.links?.github ||
    (/github\.com\//i.test(project.link ?? "") ? project.link : "");
  const website =
    project.links?.website ||
    (!/github\.com\//i.test(project.link ?? "") ? project.link : "");

  if (!website && !github) {
    return null;
  }

  return (
    <p className="resume-link">
      {website ? (
        <>
          Website：
          <span
            {...editableTextProps(editable, website, (nextValue) =>
              onChange?.({ website: nextValue }),
            )}
          >
            {renderInlineRichText(website)}
          </span>
        </>
      ) : null}
      {website && github ? " | " : ""}
      {github ? (
        <>
          GitHub：
          <span
            {...editableTextProps(editable, github, (nextValue) =>
              onChange?.({ github: nextValue }),
            )}
          >
            {renderInlineRichText(github)}
          </span>
        </>
      ) : null}
    </p>
  );
}

function renderBulletText(text: string) {
  const cleanText = stripMarkdownBold(text);
  const leadingWhitespace = cleanText.match(/^\s*/)?.[0] ?? "";
  const bodyText = cleanText.trimStart();
  const match = bodyText.match(/^([^:：]{2,24}[:：])(.+)$/);

  if (!match) {
    return cleanText;
  }

  return (
    <>
      {leadingWhitespace}
      <strong>{match[1]}</strong>
      {match[2]}
    </>
  );
}

function renderInlineRichText(text: string): ReactNode {
  return stripMarkdownBold(text);
}
