"use client";

import { ClipboardList, Search } from "lucide-react";
import { LiquidButton } from "@/components/LiquidButton";

type JDInputProps = {
  value: string;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onChange: (value: string) => void;
};

export function JDInput({
  value,
  isAnalyzing,
  onAnalyze,
  onChange,
}: JDInputProps) {
  const canAnalyze = value.trim().length > 0 && !isAnalyzing;

  return (
    <section className="liquid-section rounded-[20px] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">目标岗位 JD</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            粘贴岗位描述，用于识别方向和生成定制版本。
          </p>
        </div>
        <ClipboardList className="h-5 w-5 text-slate-500" aria-hidden="true" />
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-36 w-full resize-none rounded-[16px] border border-white/80 bg-white/70 px-3 py-2 text-sm leading-6 text-zinc-900 outline-none transition"
        placeholder="粘贴 AI 产品经理、AI Agent 应用、大模型应用或其他目标岗位 JD..."
      />
      <LiquidButton
        className="mt-3"
        type="button"
        fullWidth
        disabled={!canAnalyze}
        loading={isAnalyzing}
        onClick={onAnalyze}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        {isAnalyzing ? "分析中..." : "分析 JD"}
      </LiquidButton>
    </section>
  );
}
