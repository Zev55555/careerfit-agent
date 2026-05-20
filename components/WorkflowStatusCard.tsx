"use client";

type StatusTone = "neutral" | "success" | "warning" | "danger";

export type WorkflowStatusItem = {
  label: string;
  value: string;
  tone?: StatusTone;
};

type WorkflowStatusCardProps = {
  title: string;
  items: WorkflowStatusItem[];
};

const toneClassName: Record<StatusTone, string> = {
  neutral: "border-slate-200/70 bg-white/55 text-slate-700",
  success: "border-sky-200/70 bg-sky-50/70 text-sky-700",
  warning: "border-sky-200/70 bg-sky-50/60 text-sky-800",
  danger: "border-blue-200/80 bg-blue-50/75 text-blue-700",
};

export function WorkflowStatusCard({ title, items }: WorkflowStatusCardProps) {
  return (
    <section className="liquid-section rounded-[20px] p-4">
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div
            className="flex items-start justify-between gap-3 rounded-[16px] bg-white/52 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.76)]"
            key={item.label}
          >
            <span className="text-xs text-slate-500">{item.label}</span>
            <span
              className={`max-w-[260px] rounded-full border px-2 py-0.5 text-right text-xs font-medium ${
                toneClassName[item.tone ?? "neutral"]
              }`}
            >
              {item.value || "鏆傛棤"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

