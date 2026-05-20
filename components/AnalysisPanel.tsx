import { ScanSearch } from "lucide-react";
import type { RoleDirection } from "@/lib/resume-schema";
import { roleLabels } from "@/lib/role-strategy";

type AnalysisPanelProps = {
  selectedRole: RoleDirection;
  jdText: string;
  validation: {
    ok: boolean;
    issues: string[];
  };
};

export function AnalysisPanel({
  selectedRole,
  jdText,
  validation,
}: AnalysisPanelProps) {
  return (
    <section className="liquid-section rounded-[20px] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-950">识别与校验</h2>
        <ScanSearch className="h-5 w-5 text-zinc-500" aria-hidden="true" />
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="rounded-[16px] bg-white/52 px-3 py-2">
          <p className="text-xs text-zinc-500">当前方向</p>
          <p className="mt-1 font-semibold text-zinc-950">
            {roleLabels[selectedRole]}
          </p>
        </div>
        <div className="rounded-[16px] bg-white/52 px-3 py-2">
          <p className="text-xs text-zinc-500">JD 状态</p>
          <p className="mt-1 text-zinc-800">
            {jdText.trim()
              ? `已输入 ${jdText.trim().length} 个字符。`
              : "尚未输入 JD。"}
          </p>
        </div>
        <div className="rounded-[16px] bg-white/52 px-3 py-2">
          <p className="text-xs text-zinc-500">JSON 校验</p>
          <p className="mt-1 text-zinc-800">
            {validation.ok ? "resume-master.json 可渲染。" : validation.issues[0]}
          </p>
        </div>
      </div>
    </section>
  );
}
