"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { ExportButton } from "@/components/ExportButton";
import { LiquidButton } from "@/components/LiquidButton";
import { PageFitStatus } from "@/components/PageFitStatus";
import type { WorkspacePanel } from "@/components/WorkspaceTabs";
import type { PageFitStatus as PageFitStatusValue } from "@/lib/fit-one-page";
import { getTopRisks } from "@/lib/jd-risk-utils";
import type { JDAnalysisResult } from "@/lib/role-classifier";

type WorkspaceSidePanelProps = {
  className?: string;
  activePanel: WorkspacePanel;
  currentDirection: string;
  jdAnalysis: JDAnalysisResult | null;
  masterStatus: string;
  modelLabel: string;
  previewStatus: string;
  pageFitStatus: PageFitStatusValue | null;
  suggestedCompressionProjects: string[];
  isExporting: boolean;
  exportError: string;
  onExport: () => void;
  onPanelChange: (panel: WorkspacePanel) => void;
};

const quickLinks: Array<{ label: string; panel: WorkspacePanel }> = [
  { label: "去 JD 分析", panel: "jd" },
  { label: "去定制摘要", panel: "tailor" },
  { label: "去编辑导出", panel: "export" },
];

export function WorkspaceSidePanel({
  className = "",
  activePanel,
  currentDirection,
  jdAnalysis,
  masterStatus,
  modelLabel,
  previewStatus,
  pageFitStatus,
  suggestedCompressionProjects,
  isExporting,
  exportError,
  onExport,
  onPanelChange,
}: WorkspaceSidePanelProps) {
  const topRisks = jdAnalysis ? getTopRisks(jdAnalysis).slice(0, 2) : [];

  return (
    <aside
      className={`liquid-panel flex min-h-[520px] flex-col overflow-hidden rounded-[28px] lg:min-h-0 ${className}`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <PanelSection eyebrow="预览" title="当前预览状态">
          <PageFitStatus
            status={pageFitStatus}
            suggestedProjects={suggestedCompressionProjects}
          />
        </PanelSection>

        <PanelSection eyebrow="导出" title="主要操作">
          <ExportButton
            isExporting={isExporting}
            error={exportError}
            onExport={onExport}
          />
        </PanelSection>

        <PanelSection eyebrow="状态" title="流程状态">
          <div className="grid gap-2 text-xs">
            <InfoRow label="Master" value={masterStatus} />
            <InfoRow label="方向" value={currentDirection} />
            <InfoRow label="模型" value={modelLabel} />
            <InfoRow label="预览" value={previewStatus} />
          </div>
        </PanelSection>

        <PanelSection eyebrow="风险" title="主要风险">
          {topRisks.length > 0 ? (
            <ul className="grid gap-2 text-xs leading-5 text-blue-700">
              {topRisks.map((risk) => (
                <li
                  className="rounded-[16px] border border-blue-200/75 bg-blue-50/65 px-2.5 py-2"
                  key={risk}
                >
                  {risk}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[16px] border border-sky-200/70 bg-sky-50/65 px-2.5 py-2 text-xs leading-5 text-sky-800">
              暂无明显高风险。
            </p>
          )}
        </PanelSection>

        <PanelSection eyebrow="导航" title="快捷导航">
          <div className="grid gap-2">
            {quickLinks.map((link) => (
              <LiquidButton
                key={link.panel}
                variant={activePanel === link.panel ? "secondary" : "ghost"}
                size="sm"
                type="button"
                fullWidth
                onClick={() => onPanelChange(link.panel)}
              >
                <span className="flex w-full items-center justify-between">
                  {link.label}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </LiquidButton>
            ))}
          </div>
        </PanelSection>
      </div>
    </aside>
  );
}

function PanelSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="liquid-section mb-2.5 rounded-[20px] p-3 last:mb-0">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-[16px] bg-white/55 px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.75)]">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}
