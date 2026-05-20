import type { CoverageCheck } from "@/lib/role-classifier";

type CoverageCheckPanelProps = {
  coverageCheck: CoverageCheck;
};

export function CoverageCheckPanel({ coverageCheck }: CoverageCheckPanelProps) {
  const status = getCoverageStatus(coverageCheck.overallScore);

  return (
    <div className="liquid-section rounded-[20px] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-zinc-950">覆盖度检查</h4>
          <p className={`mt-1 text-xs ${status.className}`}>{status.label}</p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-sm font-semibold text-zinc-900">
          {coverageCheck.overallScore}/100
        </span>
      </div>

      <div className="mt-3 grid gap-3 text-xs leading-5 text-zinc-700">
        <ListSection title="已覆盖要求" items={coverageCheck.coveredRequirements} />
        <ListSection
          title="部分覆盖要求"
          items={coverageCheck.partiallyCoveredRequirements}
        />
        <ListSection
          title="缺失要求"
          items={coverageCheck.missingRequirements}
          tone="danger"
        />
        <ListSection
          title="过度包装风险"
          items={coverageCheck.overPackagingRisks}
          tone="warning"
        />
        <ListSection
          title="建议人工检查"
          items={coverageCheck.suggestedManualReview}
        />
      </div>
    </div>
  );
}

function ListSection({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div>
      <p className="text-zinc-500">{title}</p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              className={`rounded-full border px-2 py-1 text-xs ${getTagClassName(tone)}`}
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-zinc-500">暂无</p>
      )}
    </div>
  );
}

function getCoverageStatus(score: number) {
  if (score >= 80) {
    return {
      label: "匹配度较高",
      className: "text-sky-700",
    };
  }

  if (score >= 60) {
    return {
      label: "有一定匹配，但需要优化表达",
      className: "text-blue-700",
    };
  }

  return {
    label: "匹配风险较高",
    className: "text-blue-800",
  };
}

function getTagClassName(tone: "default" | "warning" | "danger") {
  if (tone === "warning" || tone === "danger") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}
