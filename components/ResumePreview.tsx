"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { LiquidButton } from "@/components/LiquidButton";
import { PageFitStatus } from "@/components/PageFitStatus";
import { calculatePageFit } from "@/lib/fit-one-page";
import type { PageFitStatus as PageFitStatusValue } from "@/lib/fit-one-page";
import type { ResumeData } from "@/lib/resume-schema";
import { ResumeLayout } from "@/templates/resume-layout";

type ResumePreviewProps = {
  resume: ResumeData;
  fitStatus: PageFitStatusValue | null;
  suggestedCompressionProjects?: string[];
  onFitStatusChange: (status: PageFitStatusValue) => void;
  showChrome?: boolean;
  editable?: boolean;
  onResumeChange?: (resume: ResumeData) => void;
};

export function ResumePreview({
  resume,
  fitStatus,
  suggestedCompressionProjects = [],
  onFitStatusChange,
  showChrome = true,
  editable = false,
  onResumeChange,
}: ResumePreviewProps) {
  const pageRef = useRef<HTMLElement | null>(null);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const canEditPreview = editable && Boolean(onResumeChange);

  useLayoutEffect(() => {
    const page = pageRef.current;

    if (!page) {
      return;
    }

    const measure = () => {
      onFitStatusChange(
        calculatePageFit(
          Math.ceil(page.scrollHeight),
          Math.ceil(page.clientHeight),
        ),
      );
    };
    const observer = new ResizeObserver(measure);

    measure();
    observer.observe(page);

    return () => observer.disconnect();
  }, [resume, onFitStatusChange]);

  const canvas = (
    <div className="relative h-full overflow-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(245,248,253,0.78))] px-1 py-4">
      {canEditPreview ? (
        <div className="sticky top-2 z-30 mb-2 flex justify-end px-3">
          <LiquidButton
            type="button"
            size="sm"
            variant={isEditingPreview ? "primary" : "secondary"}
            onClick={() => setIsEditingPreview((value) => !value)}
          >
            {isEditingPreview ? "完成预览编辑" : "编辑预览内容"}
          </LiquidButton>
        </div>
      ) : null}
      <div className="flex min-w-[794px] justify-center">
        <div
          className="shadow-[0_18px_40px_rgba(24,39,75,0.10),0_2px_10px_rgba(24,39,75,0.05)]"
          ref={(node) => {
            pageRef.current = node?.querySelector(".resume-page") ?? null;
          }}
        >
          <ResumeLayout
            editable={canEditPreview && isEditingPreview}
            onResumeChange={onResumeChange}
            resume={resume}
          />
        </div>
      </div>
      {isEditingPreview ? (
        <p className="sticky bottom-2 z-30 mx-auto mt-2 w-fit rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs text-slate-500 shadow-sm backdrop-blur">
          点击文字直接修改；可增加或删除现有文本；Enter 不会新增行。
        </p>
      ) : null}
    </div>
  );

  if (!showChrome) {
    return <div className="h-full min-h-0 overflow-hidden">{canvas}</div>;
  }

  return (
    <section className="liquid-panel overflow-hidden rounded-[28px]">
      <div className="flex items-start justify-between gap-4 border-b border-white/60 bg-white/42 px-4 py-3 backdrop-blur-xl">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">HTML 简历预览</h2>
          <p className="mt-1 text-xs text-slate-500">
            固定 A4 模板，当前渲染内存中的 ResumeData。
          </p>
        </div>
        <span className="liquid-pill rounded-full px-2.5 py-1 text-xs font-medium text-slate-600">
          A4 / 1 page
        </span>
      </div>
      <div className="border-b border-white/60 px-4 py-3">
        <PageFitStatus
          status={fitStatus}
          suggestedProjects={suggestedCompressionProjects}
        />
      </div>
      {canvas}
    </section>
  );
}
