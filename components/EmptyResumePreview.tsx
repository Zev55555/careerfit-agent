"use client";

import { FileJson, FileUp } from "lucide-react";
import { LiquidButton } from "@/components/LiquidButton";

type EmptyResumePreviewProps = {
  onImportResume: () => void;
  onImportJson: () => void;
};

export function EmptyResumePreview({
  onImportResume,
  onImportJson,
}: EmptyResumePreviewProps) {
  return (
    <div className="flex h-full min-h-[560px] items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(245,248,253,0.78))] p-8">
      <section className="liquid-section max-w-lg rounded-[28px] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/80 bg-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_30px_rgba(59,130,246,0.10)]">
          <FileUp className="h-7 w-7 text-sky-600" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-950">
          导入你的 Master 简历
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          上传 PDF 或导入 resume-master.json 后，系统会在这里显示固定 A4 预览。未导入前不会显示任何默认姓名、联系方式或项目内容。
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <LiquidButton type="button" fullWidth onClick={onImportResume}>
            <FileUp className="h-4 w-4" aria-hidden="true" />
            导入简历
          </LiquidButton>
          <LiquidButton
            type="button"
            variant="secondary"
            fullWidth
            onClick={onImportJson}
          >
            <FileJson className="h-4 w-4" aria-hidden="true" />
            导入 Master JSON
          </LiquidButton>
        </div>
      </section>
    </div>
  );
}
