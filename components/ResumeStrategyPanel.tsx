import type { ReactNode } from "react";
import type { ResumeThesis, ScreeningProfile } from "@/lib/role-classifier";

type ResumeStrategyPanelProps = {
  screeningProfile: ScreeningProfile;
  resumeThesis: ResumeThesis;
};

export function ResumeStrategyPanel({
  screeningProfile,
  resumeThesis,
}: ResumeStrategyPanelProps) {
  return (
    <div className="grid gap-3">
      <StrategyBlock title="岗位筛选画像">
        <InfoLine
          label="这个岗位在筛什么人"
          value={screeningProfile.whoTheyWant}
        />
        <TagList title="必须证明" items={screeningProfile.mustProve} />
        <TagList title="加分项" items={screeningProfile.niceToHave} />
        <TagList
          title="避免包装成"
          items={screeningProfile.avoidPositioningAs}
          tone="warning"
        />
        <BulletList title="隐性要求" items={screeningProfile.hiddenRequirements} />
      </StrategyBlock>

      <StrategyBlock title="本次简历主线">
        <InfoLine label="一句话主线" value={resumeThesis.oneSentence} />
        <InfoLine label="候选人定位" value={resumeThesis.positioning} />
        <TagList title="开头优先呈现" items={resumeThesis.openingFocus} />
        <TagList title="项目优先级" items={resumeThesis.projectPriority} />
        <TagList title="技能优先级" items={resumeThesis.skillPriority} />
      </StrategyBlock>
    </div>
  );
}

function StrategyBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="liquid-section rounded-[20px] p-3">
      <h4 className="text-sm font-semibold text-zinc-950">{title}</h4>
      <div className="mt-3 grid gap-3 text-xs leading-5 text-zinc-700">
        {children}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-900">
        {value || "暂无"}
      </p>
    </div>
  );
}

function TagList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warning";
}) {
  return (
    <div>
      <p className="text-zinc-500">{title}</p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              className={`rounded-full border px-2 py-1 text-xs ${
                tone === "warning"
                  ? "border-blue-200 bg-blue-50 text-blue-800"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700"
              }`}
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

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-zinc-500">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-1 grid gap-1">
          {items.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-zinc-500">暂无</p>
      )}
    </div>
  );
}
