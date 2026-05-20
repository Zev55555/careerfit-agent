import { AlertTriangle, ListChecks } from "lucide-react";
import type { TailorChangeLog } from "@/lib/resume-schema";
import { normalizeChangeLogForDisplay } from "@/lib/change-log-utils";

type ChangeLogPanelProps = {
  changeLog: TailorChangeLog | null;
  error: string;
  tailorSource?: "ai" | "mock" | null;
  fallbackReason?: string;
};

export function ChangeLogPanel({
  changeLog,
  error,
  tailorSource,
  fallbackReason,
}: ChangeLogPanelProps) {
  if (error) {
    return (
      <section
        className="liquid-section rounded-[20px] border-blue-200/80 p-4"
        aria-live="polite"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-blue-700" />
          <div>
            <h2 className="text-sm font-semibold text-blue-800">生成失败</h2>
            <p className="mt-1 text-sm leading-6 text-blue-800">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!changeLog) {
    return (
      <section className="liquid-section rounded-[20px] p-4">
        <PanelHeader tailorSource={tailorSource} />
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          生成定制简历后，这里会显示面向用户的简短修改摘要。
        </p>
      </section>
    );
  }

  const displayLog = normalizeChangeLogForDisplay(changeLog);

  return (
    <section className="liquid-section rounded-[20px] p-4" aria-live="polite">
      <PanelHeader tailorSource={tailorSource} />

      {fallbackReason ? (
        <div className="mt-3 rounded-[16px] border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
          {fallbackReason}
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 text-sm">
        <SummaryBlock title="定制结论" value={displayLog.summary} />
        <ProjectChangeGroup title="重点强化" items={displayLog.strengthened} />
        <ProjectChangeGroup title="弱化 / 移除" items={displayLog.weakened} />
        <SimpleList title="技能调整" items={displayLog.skillChanges} />
        <SimpleList
          title="主要风险"
          items={displayLog.riskWarnings}
          tone="warning"
          emptyText="未发现明显高风险包装点。"
        />
        <TruthSummary
          passed={displayLog.truthPassed}
          warnings={displayLog.truthWarnings}
        />
        <FullChangeLog changeLog={displayLog.fullLog} />
      </div>
    </section>
  );
}

function PanelHeader({
  tailorSource,
}: {
  tailorSource?: "ai" | "mock" | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-zinc-950">本次定制摘要</h2>
      <div className="flex items-center gap-2">
        {tailorSource ? (
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
            {tailorSource === "ai" ? "AI 定制" : "Mock 定制"}
          </span>
        ) : null}
        <ListChecks className="h-5 w-5 text-zinc-500" aria-hidden="true" />
      </div>
    </div>
  );
}

function SummaryBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-white/52 px-3 py-2">
      <p className="text-xs text-zinc-500">{title}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-800">
        {value || "暂无"}
      </p>
    </div>
  );
}

function ProjectChangeGroup({
  title,
  items,
}: {
  title: string;
  items: TailorChangeLog["strengthenedProjects"];
}) {
  return (
    <div className="rounded-[16px] bg-white/52 px-3 py-2">
      <p className="text-xs text-zinc-500">{title}</p>
      {items.length > 0 ? (
        <div className="mt-2 grid gap-2">
          {items.map((item) => (
            <div
              className="rounded-[16px] border border-white/75 bg-white/65 p-2"
              key={`${title}-${item.projectName}-${item.reason}`}
            >
              <p className="font-semibold text-zinc-900">{item.projectName}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-600">
                {item.reason || "暂无"}
              </p>
              {item.changes.length > 0 ? (
                <ul className="mt-2 grid gap-1 text-xs leading-5 text-zinc-700">
                  {item.changes.slice(0, 2).map((change) => (
                    <li key={change}>- {change}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-zinc-600">暂无</p>
      )}
    </div>
  );
}

function SimpleList({
  title,
  items,
  tone = "default",
  emptyText = "暂无",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warning";
  emptyText?: string;
}) {
  return (
    <div className="rounded-[16px] bg-white/52 px-3 py-2">
      <p className="text-xs text-zinc-500">{title}</p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              className={`rounded-full border px-2 py-1 text-xs ${
                tone === "warning"
                  ? "border-blue-200 bg-blue-50 text-blue-800"
                  : "border-zinc-200 bg-white text-zinc-700"
              }`}
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-zinc-600">{emptyText}</p>
      )}
    </div>
  );
}

function TruthSummary({
  passed,
  warnings,
}: {
  passed: boolean;
  warnings: string[];
}) {
  return (
    <div className="rounded-[16px] bg-white/52 px-3 py-2">
      <p className="text-xs text-zinc-500">真实性检查</p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">
        {passed ? "通过" : "存在风险"}
      </p>
      {warnings.length > 0 ? (
        <ul className="mt-2 grid gap-1 text-xs leading-5 text-blue-800">
          {warnings.map((warning) => (
            <li key={warning}>- {warning}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs leading-5 text-zinc-600">
          未发现模型训练、微调、百万用户或无依据增长等高风险表达。
        </p>
      )}
    </div>
  );
}

function FullChangeLog({ changeLog }: { changeLog: TailorChangeLog }) {
  return (
    <details className="liquid-section rounded-[20px] p-3">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
        查看完整修改日志
      </summary>
      <div className="mt-3 grid gap-3">
        <ProjectChangeGroup
          title="强化项目（全量）"
          items={changeLog.strengthenedProjects}
        />
        <ProjectChangeGroup
          title="弱化项目（全量）"
          items={changeLog.weakenedProjects}
        />
        <SimpleList title="技能调整（全量）" items={changeLog.skillChanges} />
        <SimpleList
          title="定位表达调整（全量）"
          items={changeLog.summaryChanges}
        />
        <SimpleList
          title="风险提醒（全量）"
          items={changeLog.riskWarnings}
          tone="warning"
        />
        <SimpleList
          title="真实性提醒（全量）"
          items={changeLog.truthCheck.warnings}
          tone="warning"
        />
      </div>
    </details>
  );
}
