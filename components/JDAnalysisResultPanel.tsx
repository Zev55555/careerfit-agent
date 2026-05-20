import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CoverageCheckPanel } from "@/components/CoverageCheckPanel";
import { EvidenceMatrixPanel } from "@/components/EvidenceMatrixPanel";
import { JDAnalysisSummaryCard } from "@/components/JDAnalysisSummaryCard";
import { ResumeStrategyPanel } from "@/components/ResumeStrategyPanel";
import type {
  JDAnalysisResult,
  ProjectRecommendation,
} from "@/lib/role-classifier";
import { getTopRisks } from "@/lib/jd-risk-utils";

type JDAnalysisResultPanelProps = {
  result: JDAnalysisResult | null;
  error: string;
};

export function JDAnalysisResultPanel({
  result,
  error,
}: JDAnalysisResultPanelProps) {
  if (!result && !error) {
    return (
      <section className="liquid-section rounded-[20px] p-4" aria-live="polite">
        <h2 className="text-sm font-semibold text-zinc-950">JD 分析结果</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          粘贴 JD 后点击分析，这里会优先展示精简结论，完整岗位作战策略可展开查看。
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="liquid-section rounded-[20px] border-blue-200/80 p-4"
        aria-live="polite"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-blue-700" />
          <div>
            <h2 className="text-sm font-semibold text-blue-800">JD 分析失败</h2>
            <p className="mt-1 text-sm leading-6 text-blue-800">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!result) {
    return null;
  }

  const topRisks = getTopRisks(result);

  return (
    <section className="liquid-section rounded-[20px] p-4" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-950">JD 分析结果</h2>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${
                result.analyzer === "ai"
                  ? "border-sky-200 bg-sky-50 text-sky-800"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700"
              }`}
            >
              {result.analyzer === "ai" ? "AI 分析" : "规则分析"}
            </span>
          </div>
          {result.fallbackReason ? (
            <p className="mt-2 rounded-[16px] border border-blue-200 bg-blue-50 px-2 py-1 text-xs leading-5 text-blue-800">
              {result.fallbackReason}
            </p>
          ) : null}
        </div>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600" />
      </div>

      <div className="mt-4 grid gap-3">
        <JDAnalysisSummaryCard result={result} />
        <TopRiskSection risks={topRisks} />
        <StrategyPreview result={result} />

        <details className="liquid-section rounded-[20px] p-3">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
            查看完整岗位作战策略
          </summary>
          <div className="mt-3 grid gap-3">
            <ResumeStrategyPanel
              screeningProfile={result.screeningProfile}
              resumeThesis={result.resumeThesis}
            />
            <details className="liquid-section rounded-[20px] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
                JD 关键词、能力与项目建议
              </summary>
              <div className="mt-3 grid gap-2 text-sm">
                <ResultList title="JD 关键词" items={result.jdHighlights} />
                <ResultList title="必需能力" items={result.requiredAbilities} />
                <ResultList title="加分能力" items={result.preferredAbilities} />
                <ProjectList title="推荐强化项目" items={result.recommendedProjects} />
                <ProjectList title="建议弱化项目" items={result.weakenedProjects} />
                <ResultList
                  title="风险提醒"
                  items={result.riskWarnings}
                  tone="warning"
                />
              </div>
            </details>
            <AbilityMapPanel result={result} />
            <EvidenceMatrixPanel items={result.evidenceMatrix} />
            <details className="liquid-section rounded-[20px] p-3">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
                覆盖度检查详情
              </summary>
              <div className="mt-3">
                <CoverageCheckPanel coverageCheck={result.coverageCheck} />
              </div>
            </details>
          </div>
        </details>
      </div>
    </section>
  );
}

function TopRiskSection({ risks }: { risks: string[] }) {
  return (
    <div className="rounded-[20px] border border-blue-200 bg-blue-50 p-3">
      <h3 className="text-sm font-semibold text-blue-900">高风险提醒</h3>
      {risks.length > 0 ? (
        <ul className="mt-2 grid gap-1 text-xs leading-5 text-blue-800">
          {risks.slice(0, 5).map((risk) => (
            <li key={risk}>- {risk}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs leading-5 text-blue-800">
          未发现明显高风险包装点。
        </p>
      )}
    </div>
  );
}

function StrategyPreview({ result }: { result: JDAnalysisResult }) {
  return (
    <div className="liquid-section rounded-[20px] p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-950">岗位作战策略</h3>
        <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 font-mono text-xs text-zinc-600">
          {result.coverageCheck.overallScore}/100
        </span>
      </div>
      <div className="mt-3 grid gap-3 text-sm leading-6">
        <InfoLine
          label="这个岗位在筛什么人"
          value={result.screeningProfile.whoTheyWant}
        />
        <InfoLine
          label="本次简历主线"
          value={result.resumeThesis.oneSentence}
        />
      </div>
    </div>
  );
}

function AbilityMapPanel({ result }: { result: JDAnalysisResult }) {
  return (
    <details className="liquid-section rounded-[20px] p-3">
      <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
        能力要求拆解
      </summary>
      <div className="mt-3 grid gap-2">
        <ResultList title="硬技能" items={result.abilityMap.hardSkills} />
        <ResultList title="产品能力" items={result.abilityMap.productSkills} />
        <ResultList title="业务能力" items={result.abilityMap.businessSkills} />
        <ResultList title="AI 能力" items={result.abilityMap.aiSkills} />
        <ResultList
          title="协作能力"
          items={result.abilityMap.collaborationSkills}
        />
        <ResultList title="评估能力" items={result.abilityMap.evaluationSkills} />
        <ResultList
          title="风险区域"
          items={result.abilityMap.riskAreas}
          tone="warning"
        />
      </div>
    </details>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-zinc-800">{value || "暂无"}</p>
    </div>
  );
}

function ResultList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warning";
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
        <p className="mt-1 text-xs text-zinc-500">暂无</p>
      )}
    </div>
  );
}

function ProjectList({
  title,
  items,
}: {
  title: string;
  items: ProjectRecommendation[];
}) {
  return (
    <div className="rounded-[16px] bg-white/52 px-3 py-2">
      <p className="text-xs text-zinc-500">{title}</p>
      {items.length > 0 ? (
        <div className="mt-2 grid gap-2">
          {items.map((item) => {
            const projectName = item.projectName ?? item.name;

            return (
              <div
                className="rounded-[16px] border border-white/75 bg-white/65 p-2"
                key={projectName}
              >
                <p className="text-sm font-semibold text-zinc-900">
                  {projectName}
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-600">
                  {item.reason || "暂无"}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-1 text-xs text-zinc-500">暂无</p>
      )}
    </div>
  );
}
