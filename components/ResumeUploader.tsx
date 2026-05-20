"use client";

import { AlertTriangle, CheckCircle2, FileUp, LockKeyhole } from "lucide-react";
import { LiquidButton } from "@/components/LiquidButton";
import type { ResumeParseDiagnostics } from "@/lib/resume-parse-diagnostics";

type ResumeUploaderProps = {
  fileName: string;
  isUploading: boolean;
  uploadMessage: string;
  uploadError: string;
  warnings: string[];
  parseDiagnostics?: ResumeParseDiagnostics | null;
  rawTextPreview: string;
  aiStatus: {
    configured: boolean;
    model: string;
    tier?: "fast" | "deep";
    tierLabel?: string;
    modelStatusLabel?: string;
  } | null;
  parser: "ai" | "rule" | null;
  canLock: boolean;
  isLocked: boolean;
  onFileSelected: (file: File | null) => void;
  onLockMaster: () => void;
};

export function ResumeUploader({
  fileName,
  isUploading,
  uploadMessage,
  uploadError,
  warnings,
  parseDiagnostics,
  rawTextPreview,
  aiStatus,
  parser,
  canLock,
  isLocked,
  onFileSelected,
  onLockMaster,
}: ResumeUploaderProps) {
  return (
    <section className="liquid-section rounded-[20px] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">
            原始简历 PDF
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            上传后会提取 PDF 文本，并生成可编辑的 ResumeData。
          </p>
        </div>
        <FileUp className="h-5 w-5 text-slate-500" aria-hidden="true" />
      </div>

      <LiquidButton
        as="label"
        className="mt-4"
        variant="secondary"
        fullWidth
        loading={isUploading}
        disabled={isUploading}
      >
        <input
          className="sr-only"
          type="file"
          accept="application/pdf"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            onFileSelected(file);
            event.target.value = "";
          }}
        />
        {isUploading ? "正在解析简历 PDF..." : fileName || "选择 PDF"}
      </LiquidButton>

      {aiStatus ? (
        <div
          className={`mt-3 rounded-[16px] border px-3 py-2 text-sm ${
            aiStatus.configured
              ? "border-sky-200/70 bg-sky-50/70 text-sky-800"
              : "border-white/70 bg-white/55 text-slate-700"
          }`}
        >
          <p className="font-semibold">
            {aiStatus.configured
              ? "已启用 AI 简历解析"
              : "未配置 OPENAI_API_KEY，将使用规则解析"}
          </p>
          <p className="mt-1 text-xs leading-5">
            模型：{aiStatus.modelStatusLabel ?? aiStatus.model}
          </p>
        </div>
      ) : null}

      {parser ? (
        <div
          className={`mt-3 rounded-[16px] border px-3 py-2 text-sm ${
            parser === "ai"
              ? "border-sky-200/70 bg-sky-50/70 text-sky-800"
              : "border-sky-200/70 bg-sky-50/60 text-sky-800"
          }`}
        >
          <p className="font-semibold">
            解析来源：{parser === "ai" ? "AI 解析" : "规则解析"}
          </p>
          {parser === "rule" ? (
            <p className="mt-1 text-xs leading-5">
              当前为规则解析，项目字段可能需要更多人工整理。
            </p>
          ) : null}
        </div>
      ) : null}

      {uploadMessage ? (
        <div className="mt-3 flex items-start gap-2 rounded-[16px] border border-sky-200/70 bg-sky-50/70 px-3 py-2 text-sm text-sky-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{uploadMessage}</p>
        </div>
      ) : null}

      {uploadError ? (
        <div className="mt-3 flex items-start gap-2 rounded-[16px] border border-blue-200/80 bg-blue-50/75 px-3 py-2 text-sm text-blue-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{uploadError}</p>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mt-3 rounded-[16px] border border-blue-200/80 bg-blue-50/70 px-3 py-2">
          <p className="text-xs font-semibold text-blue-800">解析提醒</p>
          <ul className="mt-2 grid gap-1 text-xs leading-5 text-blue-700">
            {warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {parseDiagnostics?.checked ? (
        <div className="mt-3 rounded-[16px] border border-blue-200/80 bg-blue-50/70 px-3 py-2">
          <p className="text-xs font-semibold text-blue-800">解析诊断</p>
          {parseDiagnostics.detectedProjectNames.length > 0 ? (
            <p className="mt-2 text-xs leading-5 text-blue-700">
              解析到的项目：{parseDiagnostics.detectedProjectNames.join("、")}
            </p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-blue-700">
              暂未识别到明确项目标题。
            </p>
          )}
          {parseDiagnostics.suspiciousOldProjects.length > 0 ? (
            <p className="mt-2 text-xs leading-5 text-blue-700">
              检测到旧项目：
              {summarizeProjectNames(parseDiagnostics.suspiciousOldProjects)}
            </p>
          ) : null}
          {(parseDiagnostics.removedDeprecatedProjects?.length ?? 0) > 0 ? (
            <div className="mt-2 rounded-[14px] border border-blue-200/80 bg-white/55 px-3 py-2 text-xs leading-5 text-blue-800">
              <p className="font-semibold">
                已过滤：
                {summarizeProjectNames(
                  parseDiagnostics.removedDeprecatedProjects ?? [],
                )}
              </p>
              <p className="mt-1 text-blue-700">
                这些项目仍可能存在于 PDF 文本层，但已不会进入本次
                Master。若需要保留，可在编辑器中手动添加。
              </p>
            </div>
          ) : null}
          {parseDiagnostics.warnings.length > 0 ? (
            <ul className="mt-2 grid gap-1 text-xs leading-5 text-blue-700">
              {parseDiagnostics.warnings.map((warning) => (
                <li key={warning}>- {warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {rawTextPreview ? (
        <details className="mt-3 rounded-[16px] border border-white/70 bg-white/55 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">
            查看解析文本摘要
          </summary>
          <p className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-600">
            {rawTextPreview}
          </p>
        </details>
      ) : null}

      {canLock ? (
        <LiquidButton
          className="mt-3"
          variant="secondary"
          type="button"
          fullWidth
          onClick={onLockMaster}
        >
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          {isLocked ? "已锁定为 Master 简历" : "锁定为 Master 简历"}
        </LiquidButton>
      ) : null}
    </section>
  );
}

function summarizeProjectNames(projectNames: string[]) {
  const hasAiExposure = projectNames.some(
    (name) => /ai exposure/i.test(name) || name.includes("编程职业"),
  );
  const hasInsightFlow = projectNames.some(
    (name) => /insightflow/i.test(name) || name.includes("数据分析业务流程"),
  );
  const summary = [
    hasAiExposure ? "AI Exposure" : null,
    hasInsightFlow ? "InsightFlow" : null,
  ].filter(Boolean);

  return summary.length > 0
    ? summary.join("、")
    : Array.from(new Set(projectNames)).join("、");
}
