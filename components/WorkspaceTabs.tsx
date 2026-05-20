"use client";

import { FileText, PenLine, ScrollText, Sparkles } from "lucide-react";

export type WorkspacePanel = "master" | "jd" | "tailor" | "export";

type WorkspaceTabsProps = {
  activePanel: WorkspacePanel;
  onChange: (panel: WorkspacePanel) => void;
};

const tabs: Array<{
  value: WorkspacePanel;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    value: "master",
    label: "简历 Master",
    description: "导入、整理、锁定",
    icon: FileText,
  },
  {
    value: "jd",
    label: "JD 分析",
    description: "岗位判断与策略",
    icon: ScrollText,
  },
  {
    value: "tailor",
    label: "定制摘要",
    description: "生成与修改说明",
    icon: Sparkles,
  },
  {
    value: "export",
    label: "编辑导出",
    description: "检查与导出",
    icon: PenLine,
  },
];

export function WorkspaceTabs({ activePanel, onChange }: WorkspaceTabsProps) {
  return (
    <nav className="grid grid-cols-2 gap-2" aria-label="工作台步骤">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.value === activePanel;

        return (
          <button
            className={`flex min-h-[72px] items-start gap-2.5 rounded-[20px] border px-3 py-2.5 text-left transition duration-200 ${
              active
                ? "border-white/90 bg-white/78 text-slate-950 shadow-[0_10px_28px_rgba(59,130,246,0.12),0_4px_10px_rgba(24,39,75,0.05),inset_0_1px_0_rgba(255,255,255,0.98)]"
                : "border-white/70 bg-white/46 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] hover:-translate-y-0.5 hover:border-white/90 hover:bg-white/68 hover:shadow-[0_10px_24px_rgba(24,39,75,0.06)]"
            }`}
            key={tab.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.value)}
          >
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[16px] ${
                active ? "bg-sky-50 text-sky-600" : "bg-white/65 text-slate-500"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${active ? "text-sky-600" : "text-slate-500"}`}
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {tab.label}
              </span>
              <span
                className={`mt-0.5 block text-xs leading-4 ${
                  active ? "text-slate-500" : "text-slate-500"
                }`}
              >
                {tab.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
