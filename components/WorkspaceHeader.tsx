"use client";

type WorkspaceHeaderProps = {
  masterStatus: string;
  currentDirection: string;
  modelLabel: string;
  previewStatus: string;
};

export function WorkspaceHeader({
  masterStatus,
  currentDirection,
  modelLabel,
  previewStatus,
}: WorkspaceHeaderProps) {
  return (
    <header className="h-16 shrink-0 border-b border-white/60 bg-white/52 shadow-[0_8px_30px_rgba(24,39,75,0.05)] backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-[1640px] items-center justify-between gap-4 px-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-zinc-950">
            CareerFit Agent
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            AI 求职材料匹配原型
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap justify-end gap-1.5 text-xs text-slate-600">
          <StatusPill label="Master" value={masterStatus} />
          <StatusPill label="方向" value={currentDirection} />
          <StatusPill label="模型" value={modelLabel} />
          <StatusPill label="预览" value={previewStatus} />
        </div>
      </div>
    </header>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="liquid-pill flex max-w-[220px] items-center gap-1.5 rounded-full px-2.5 py-1">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="truncate font-medium text-slate-700">{value}</span>
    </span>
  );
}
