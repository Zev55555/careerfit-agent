"use client";

import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  LockKeyhole,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { LiquidButton } from "@/components/LiquidButton";
import type {
  ResumeBullet,
  ResumeData,
  ResumeProject,
} from "@/lib/resume-schema";
import { cleanEducationDetailItems } from "@/lib/school-badge";
import { getResumeValidationWarnings } from "@/lib/validation";

type ResumeEditorProps = {
  resume: ResumeData;
  canReset: boolean;
  isLocked: boolean;
  onChange: (resume: ResumeData) => void;
  onSave: () => void;
  onReset: () => void;
  onLock: () => void;
};

export function ResumeEditor({
  resume,
  canReset,
  isLocked,
  onChange,
  onSave,
  onReset,
  onLock,
}: ResumeEditorProps) {
  const warnings = getResumeValidationWarnings(resume);
  const github = getGithubLink(resume.profile.links);

  return (
    <section className="liquid-section rounded-[20px] p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-950">解析结果整理</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          编辑的是 ResumeData JSON，右侧预览始终由固定 A4 模板渲染。
        </p>
      </div>

      {warnings.length > 0 ? (
        <div className="mt-3 rounded-[20px] border border-blue-200/80 bg-blue-50/70 px-3 py-2">
          <p className="text-xs font-semibold text-blue-800">整理提醒</p>
          <ul className="mt-2 grid gap-1 text-xs leading-5 text-blue-700">
            {warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4">
        <EditorBlock title="基本信息">
          <TextField
            label="姓名"
            value={resume.profile.name}
            onChange={(value) =>
              onChange({
                ...resume,
                profile: { ...resume.profile, name: value },
              })
            }
          />
          <TextField
            label="邮箱"
            value={resume.profile.email}
            onChange={(value) =>
              onChange({
                ...resume,
                profile: { ...resume.profile, email: value },
              })
            }
          />
          <TextField
            label="手机"
            value={resume.profile.phone}
            onChange={(value) =>
              onChange({
                ...resume,
                profile: { ...resume.profile, phone: value },
              })
            }
          />
          <TextField
            label="GitHub"
            value={github}
            onChange={(value) =>
              onChange({
                ...resume,
                profile: {
                  ...resume.profile,
                  links: mergeLinks(value),
                },
              })
            }
          />
        </EditorBlock>

        <EditorBlock title="教育背景">
          {resume.education.map((item, index) => (
            <div
              className="liquid-section rounded-[20px] p-3"
              key={`${item.school}-${index}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-600">
                  教育经历 {index + 1}
                </p>
                <IconButton
                  label="删除教育经历"
                  onClick={() =>
                    onChange({
                      ...resume,
                      education: resume.education.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
              <TextField
                label="学校"
                value={item.school}
                onChange={(value) =>
                  onChange({
                    ...resume,
                    education: replaceAt(resume.education, index, {
                      ...item,
                      school: value,
                    }),
                  })
                }
              />
              <TextField
                label="学校标签 / 排名"
                value={item.schoolBadge ?? ""}
                helperText="例如：985 / 211 / QS世界排名#66 | U.S. News全美#29"
                onChange={(value) =>
                  onChange({
                    ...resume,
                    education: replaceAt(resume.education, index, {
                      ...item,
                      schoolBadge: value,
                    }),
                  })
                }
              />
              <TextField
                label="专业"
                value={item.major ?? ""}
                onChange={(value) =>
                  onChange({
                    ...resume,
                    education: replaceAt(resume.education, index, {
                      ...item,
                      major: value,
                    }),
                  })
                }
              />
              <TextField
                label="时间 / 预计毕业时间"
                value={item.timeframe}
                onChange={(value) =>
                  onChange({
                    ...resume,
                    education: replaceAt(resume.education, index, {
                      ...item,
                      timeframe: value,
                    }),
                  })
                }
              />
              <TextField
                label="GPA"
                value={item.gpa ?? ""}
                onChange={(value) =>
                  onChange({
                    ...resume,
                    education: replaceAt(resume.education, index, {
                      ...item,
                      gpa: value,
                    }),
                  })
                }
              />
              <TextAreaField
                label="相关课程 / 补充信息"
                rows={3}
                value={[...(item.courses ?? []), ...item.details].join("\n")}
                onChange={(value) =>
                  onChange({
                    ...resume,
                    education: replaceAt(resume.education, index, {
                      ...item,
                      courses: [],
                      details: cleanEducationDetailItems(splitList(value)),
                    }),
                  })
                }
              />
            </div>
          ))}
          <AddButton
            label="新增教育经历"
            onClick={() =>
              onChange({
                ...resume,
                education: [
                  ...resume.education,
                  {
                    school: "",
                    schoolBadge: "",
                    major: "",
                    timeframe: "",
                    details: [],
                  },
                ],
              })
            }
          />
        </EditorBlock>

        <EditorBlock title="专业技能">
          <div className="grid gap-3">
            {resume.skills.map((group, index) => (
              <div
                className="liquid-section rounded-[20px] p-3"
                key={`${group.label}-${index}`}
              >
                <div className="grid gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        技能分类 {index + 1}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                        分类名称和技能内容分开编辑，避免长内容在窄栏中挤压。
                      </p>
                    </div>
                    <IconButton
                      label="删除技能分类"
                      onClick={() =>
                        onChange({
                          ...resume,
                          skills: resume.skills.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                  <TextField
                    label="分类名称"
                    value={group.label}
                    onChange={(value) =>
                      onChange({
                        ...resume,
                        skills: replaceAt(resume.skills, index, {
                          ...group,
                          label: value,
                        }),
                      })
                    }
                  />
                  <TextAreaField
                    label="技能内容"
                    rows={4}
                    placeholder="支持顿号、逗号、分号或换行分隔，例如：SQL、Python、Pandas、Prompt Engineering"
                    value={group.items.join("、")}
                    onChange={(value) =>
                      onChange({
                        ...resume,
                        skills: replaceAt(resume.skills, index, {
                          ...group,
                          items: splitList(value),
                        }),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <AddButton
            label="新增技能分类"
            onClick={() =>
              onChange({
                ...resume,
                skills: [...resume.skills, { label: "", items: [] }],
              })
            }
          />
        </EditorBlock>

        <EditorBlock title="项目经历">
          {resume.projects.map((project, index) => (
            <ProjectEditor
              key={project.id}
              project={project}
              index={index}
              total={resume.projects.length}
              onChange={(nextProject) =>
                onChange({
                  ...resume,
                  projects: replaceAt(resume.projects, index, nextProject),
                })
              }
              onDelete={() =>
                onChange({
                  ...resume,
                  projects: resume.projects.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                })
              }
              onMoveUp={() =>
                onChange({
                  ...resume,
                  projects: moveItem(resume.projects, index, index - 1),
                })
              }
              onMoveDown={() =>
                onChange({
                  ...resume,
                  projects: moveItem(resume.projects, index, index + 1),
                })
              }
            />
          ))}
          <AddButton
            label="新增项目"
            onClick={() =>
              onChange({
                ...resume,
                projects: [...resume.projects, createProject()],
              })
            }
          />
        </EditorBlock>
      </div>

      <div className="sticky bottom-0 mt-4 grid gap-2 border-t border-white/60 bg-white/60 pt-3 backdrop-blur-xl">
        <LiquidButton type="button" fullWidth onClick={onSave}>
          <Save className="h-4 w-4" />
          保存整理结果
        </LiquidButton>
        <div className="grid grid-cols-2 gap-2">
          <LiquidButton
            variant="secondary"
            type="button"
            fullWidth
            disabled={!canReset}
            onClick={onReset}
          >
            <RotateCcw className="h-4 w-4" />
            重置为解析结果
          </LiquidButton>
          <LiquidButton
            variant="secondary"
            type="button"
            fullWidth
            onClick={onLock}
          >
            <LockKeyhole className="h-4 w-4" />
            {isLocked ? "已锁定" : "锁定 Master"}
          </LiquidButton>
        </div>
      </div>
    </section>
  );
}

function ProjectEditor({
  project,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  project: ResumeProject;
  index: number;
  total: number;
  onChange: (project: ResumeProject) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const projectLinks = getProjectLinks(project);

  return (
    <div className="liquid-section rounded-[20px] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-600">项目 {index + 1}</p>
        <div className="flex gap-1">
          <IconButton label="上移项目" disabled={index === 0} onClick={onMoveUp}>
            <ArrowUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label="下移项目"
            disabled={index === total - 1}
            onClick={onMoveDown}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label="删除项目" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
      <TextField
        label="项目名称"
        value={project.name}
        onChange={(value) => onChange({ ...project, name: value })}
      />
      <TextField
        label="项目链接 / Website"
        value={projectLinks.website}
        onChange={(value) =>
          onChange({
            ...project,
            link: value,
            links: {
              ...project.links,
              website: value,
              github: projectLinks.github,
            },
          })
        }
      />
      <TextField
        label="GitHub 链接"
        value={projectLinks.github}
        onChange={(value) =>
          onChange({
            ...project,
            links: {
              ...project.links,
              website: projectLinks.website,
              github: value,
            },
          })
        }
      />
      <TextAreaField
        label="一句话描述"
        rows={3}
        value={project.context}
        onChange={(value) => onChange({ ...project, context: value })}
      />
      <div className="mt-3 grid gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-zinc-600">Bullet 列表</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Bullet 是项目下方的经历要点，例如：场景抽象：…… / 数据分析链路：……
            </p>
          </div>
          <IconButton
            label="新增 bullet"
            onClick={() =>
              onChange({
                ...project,
                bullets: [...project.bullets, createBullet(project.id)],
              })
            }
          >
            <Plus className="h-3.5 w-3.5" />
          </IconButton>
        </div>
        {project.bullets.map((bullet, bulletIndex) => (
          <div
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
            key={bullet.id}
          >
            <textarea
              className="min-h-20 resize-y rounded-[16px] border border-white/85 bg-white/70 px-3 py-2 text-sm leading-5 text-zinc-900 outline-none transition focus:border-sky-300"
              value={bullet.text}
              onChange={(event) =>
                onChange({
                  ...project,
                  bullets: replaceAt(project.bullets, bulletIndex, {
                    ...bullet,
                    text: event.target.value,
                  }),
                })
              }
            />
            <IconButton
              label="删除 bullet"
              onClick={() =>
                onChange({
                  ...project,
                  bullets: project.bullets.filter(
                    (_, itemIndex) => itemIndex !== bulletIndex,
                  ),
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="liquid-section rounded-[20px] p-3" open>
      <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
        {title}
      </summary>
      <div className="mt-3 grid gap-3">{children}</div>
    </details>
  );
}

function TextField({
  label,
  value,
  helperText,
  onChange,
}: {
  label: string;
  value: string;
  helperText?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-zinc-600">
      {label}
      <input
        className="h-10 rounded-[16px] border border-white/85 bg-white/70 px-3 text-sm font-normal text-zinc-900 outline-none transition focus:border-sky-300"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {helperText ? (
        <span className="text-[11px] font-normal leading-4 text-zinc-500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  rows,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-zinc-600">
      {label}
      <textarea
        className="min-h-24 resize-y rounded-[16px] border border-white/85 bg-white/70 px-3 py-2 text-sm font-normal leading-5 text-zinc-900 outline-none transition focus:border-sky-300"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function IconButton({
  label,
  disabled = false,
  children,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <LiquidButton
      className="shrink-0"
      variant="ghost"
      size="sm"
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </LiquidButton>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <LiquidButton variant="secondary" type="button" fullWidth onClick={onClick}>
      <Plus className="h-4 w-4" />
      {label}
    </LiquidButton>
  );
}

function splitList(value: string) {
  return value
    .split(/[\n,，;；、]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function replaceAt<T>(items: T[], index: number, nextItem: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function getGithubLink(links: string[]) {
  return links.find((link) => /github\.com\//i.test(link)) ?? "";
}

function mergeLinks(github = "") {
  return [github].map((link) => link.trim()).filter(Boolean);
}

function getProjectLinks(project: ResumeProject) {
  const legacyLink = project.link ?? "";
  const github =
    project.links?.github ||
    (/github\.com\//i.test(legacyLink) ? legacyLink : "");
  const website =
    project.links?.website ||
    (!/github\.com\//i.test(legacyLink) ? legacyLink : "");

  return { website, github };
}

function createProject(): ResumeProject {
  const id = `project-${Date.now()}`;
  return {
    id,
    name: "",
    links: {},
    context: "",
    bullets: [createBullet(id)],
    emphasis: ["ai_product_manager"],
  };
}

function createBullet(projectId: string): ResumeBullet {
  return {
    id: `${projectId}-bullet-${Date.now()}`,
    text: "",
    tags: ["manual-edit"],
    riskLevel: "low",
  };
}
