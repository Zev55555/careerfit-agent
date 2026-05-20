"use client";

type WorkflowPanelHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function WorkflowPanelHeader({
  eyebrow,
  title,
  description,
}: WorkflowPanelHeaderProps) {
  return (
    <section className="liquid-section rounded-[20px] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </section>
  );
}
