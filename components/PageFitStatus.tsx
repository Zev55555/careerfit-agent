import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PageFitStatus as PageFitStatusValue } from "@/lib/fit-one-page";

type PageFitStatusProps = {
  status: PageFitStatusValue | null;
  suggestedProjects?: string[];
};

export function PageFitStatus({
  status,
  suggestedProjects = [],
}: PageFitStatusProps) {
  if (!status) {
    return (
      <div className="rounded-[16px] border border-white/70 bg-white/55 px-3 py-2 text-xs text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
        正在检查一页 A4 适配状态...
      </div>
    );
  }

  if (status.fitsOnePage) {
    return (
      <div className="flex items-start gap-2 rounded-[16px] border border-sky-200/70 bg-sky-50/70 px-3 py-2 text-sm text-sky-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">当前内容适合一页 A4</p>
          <p className="mt-1 text-xs text-sky-700">
            当前高度 {status.scrollHeight}px / 页面高度 {status.clientHeight}px
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-[16px] border border-blue-200/80 bg-blue-50/70 px-3 py-2 text-sm text-blue-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">当前简历可能超出一页 A4</p>
        <p className="mt-1 text-xs text-blue-700">
          当前高度 {status.scrollHeight}px / 页面高度 {status.clientHeight}
          px，超出约 {status.overflowPx}px。建议压缩低相关项目或减少 bullet。
        </p>
        {suggestedProjects.length > 0 ? (
          <p className="mt-1 text-xs text-blue-700">
            优先压缩：{suggestedProjects.join("、")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
