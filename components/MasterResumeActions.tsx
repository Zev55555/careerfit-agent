"use client";

import { Download, FileJson, Trash2, Upload } from "lucide-react";
import { LiquidButton } from "@/components/LiquidButton";
import type { ResumeData } from "@/lib/resume-schema";
import { validateResumeData } from "@/lib/validation";

type MasterResumeActionsProps = {
  resumeToDownload: ResumeData | null;
  hasLocalMaster: boolean;
  onImport: (resume: ResumeData) => void;
  onClear: () => void;
  onError: (message: string) => void;
};

export function MasterResumeActions({
  resumeToDownload,
  hasLocalMaster,
  onImport,
  onClear,
  onError,
}: MasterResumeActionsProps) {
  async function handleImport(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      if (!isResumeDataLike(parsed)) {
        throw new Error("JSON 结构不是有效的 ResumeData。");
      }

      const validation = validateResumeData(parsed);

      if (!validation.ok) {
        throw new Error(`ResumeData 校验失败：${validation.issues.join("；")}`);
      }

      onImport(parsed);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "导入失败，请确认文件是有效的 resume-master.json。",
      );
    }
  }

  return (
    <section className="liquid-section rounded-[20px] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">
            Master 简历管理
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            下载、导入或清除本地保存的 resume-master.json。
          </p>
        </div>
        <FileJson className="h-5 w-5 text-slate-500" aria-hidden="true" />
      </div>

      <div className="mt-4 grid gap-2">
        <LiquidButton
          type="button"
          fullWidth
          disabled={!resumeToDownload}
          onClick={() => {
            if (resumeToDownload) {
              downloadMasterJson(resumeToDownload);
            }
          }}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          下载 Master JSON
        </LiquidButton>

        <LiquidButton as="label" variant="secondary" fullWidth>
          <Upload className="h-4 w-4" aria-hidden="true" />
          导入 Master JSON
          <input
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleImport(file);
              event.target.value = "";
            }}
          />
        </LiquidButton>

        <LiquidButton
          variant="danger"
          type="button"
          fullWidth
          disabled={!hasLocalMaster}
          onClick={onClear}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          清除本地 Master
        </LiquidButton>
      </div>
    </section>
  );
}

function downloadMasterJson(resume: ResumeData) {
  const blob = new Blob([JSON.stringify(resume, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "resume-master.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function isResumeDataLike(value: unknown): value is ResumeData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const resume = value as ResumeData;

  return (
    Boolean(resume.meta) &&
    typeof resume.meta.version === "string" &&
    typeof resume.meta.templateLocked === "boolean" &&
    typeof resume.meta.lastUpdated === "string" &&
    Boolean(resume.profile) &&
    typeof resume.profile.name === "string" &&
    typeof resume.profile.email === "string" &&
    typeof resume.profile.phone === "string" &&
    Array.isArray(resume.profile.links) &&
    Array.isArray(resume.education) &&
    Array.isArray(resume.skills) &&
    Array.isArray(resume.projects) &&
    resume.skills.every(
      (group) =>
        group &&
        typeof group.label === "string" &&
        Array.isArray(group.items) &&
        group.items.every((item) => typeof item === "string"),
    ) &&
    resume.projects.every(
      (project) =>
        project &&
        typeof project.id === "string" &&
        typeof project.name === "string" &&
        typeof project.context === "string" &&
        Array.isArray(project.bullets) &&
        Array.isArray(project.emphasis),
    )
  );
}
