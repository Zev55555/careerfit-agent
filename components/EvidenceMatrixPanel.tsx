import type {
  EvidenceMatchLevel,
  EvidenceMatrixItem,
} from "@/lib/role-classifier";

type EvidenceMatrixPanelProps = {
  items: EvidenceMatrixItem[];
};

const matchLabels: Record<EvidenceMatchLevel, string> = {
  strong: "强匹配",
  medium: "中匹配",
  weak: "弱匹配",
  missing: "缺失",
};

const matchClassNames: Record<EvidenceMatchLevel, string> = {
  strong: "border-sky-200 bg-sky-50 text-sky-800",
  medium: "border-zinc-200 bg-zinc-50 text-zinc-700",
  weak: "border-blue-200 bg-blue-50 text-blue-800",
  missing: "border-blue-200 bg-blue-50 text-blue-800",
};

export function EvidenceMatrixPanel({ items }: EvidenceMatrixPanelProps) {
  return (
    <details className="liquid-section rounded-[20px] p-3">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
        经历证据矩阵
      </summary>
      <div className="mt-3 grid gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <EvidenceCard
              item={item}
              key={`${item.jdRequirement}-${item.matchLevel}`}
            />
          ))
        ) : (
          <p className="text-xs leading-5 text-zinc-500">暂无证据矩阵。</p>
        )}
      </div>
    </details>
  );
}

function EvidenceCard({ item }: { item: EvidenceMatrixItem }) {
  return (
    <div className="rounded-[16px] border border-white/75 bg-white/52 p-3 text-xs leading-5 text-zinc-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-950">
          {item.jdRequirement}
        </p>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${matchClassNames[item.matchLevel]}`}
        >
          {matchLabels[item.matchLevel]}
        </span>
      </div>

      <Info label="匹配项目" value={formatList(item.matchedProjects)} />
      <Info label="证据说明" value={item.evidence} />
      <Info label="改写重点" value={item.rewriteFocus} />
      {item.riskNote ? (
        <Info label="风险提醒" value={item.riskNote} tone="warning" />
      ) : null}
    </div>
  );
}

function Info({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <p className={tone === "warning" ? "mt-2 text-blue-800" : "mt-2"}>
      <span className="font-semibold text-zinc-900">{label}：</span>
      {value || "暂无"}
    </p>
  );
}

function formatList(items: string[]) {
  return items.length > 0 ? items.join("、") : "暂无";
}
