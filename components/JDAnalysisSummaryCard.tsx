import type { JDAnalysisResult } from "@/lib/role-classifier";
import { getTopRisks } from "@/lib/jd-risk-utils";

type JDAnalysisSummaryCardProps = {
  result: JDAnalysisResult;
};

export function JDAnalysisSummaryCard({ result }: JDAnalysisSummaryCardProps) {
  const topProjects = getTopProjects(result);
  const risks = getTopRisks(result).slice(0, 3);
  const conclusion = buildConclusion(result, risks);
  const nextSteps = buildNextSteps(result);

  return (
    <div className="liquid-section rounded-[20px] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">JD 真实岗位</p>
          <h3 className="mt-1 text-base font-semibold text-zinc-950">
            {result.detectedRole.label || result.roleLabel || "暂无"}
            <span className="ml-2 font-mono text-xs text-zinc-500">
              {Math.round(
                (result.detectedRole.confidence || result.confidence) * 100,
              )}
              %
            </span>
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            当前定制策略：
            {result.strategyRole.label || result.roleLabel || "暂无"}
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-xs ${
            result.analyzer === "ai"
              ? "border-sky-200 bg-sky-50 text-sky-800"
              : "border-zinc-200 bg-zinc-50 text-zinc-700"
          }`}
        >
          {result.analyzer === "ai" ? "AI 分析" : "规则分析"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm leading-6">
        {result.roleMismatch?.hasMismatch ? (
          <div className="rounded-[16px] border border-blue-200 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-900">
            <p className="font-semibold">方向不匹配提醒</p>
            <p className="mt-1">{result.roleMismatch.message}</p>
            <p className="mt-1">{result.roleMismatch.suggestedAction}</p>
          </div>
        ) : null}
        <SummaryBlock title="一句话结论" value={conclusion} />
        <TagBlock title="最该强化的项目" items={topProjects} />
        <TagBlock
          title="主要风险"
          items={risks}
          tone="warning"
          emptyText="未发现明显高风险包装点。"
        />
        <SummaryBlock title="下一步建议" value={nextSteps} />
      </div>
    </div>
  );
}

function SummaryBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{title}</p>
      <p className="mt-1 text-zinc-800">{value || "暂无"}</p>
    </div>
  );
}

function TagBlock({
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
    <div>
      <p className="text-xs text-zinc-500">{title}</p>
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
        <p className="mt-1 text-xs text-zinc-500">{emptyText}</p>
      )}
    </div>
  );
}

function buildConclusion(result: JDAnalysisResult, risks: string[]) {
  if (result.roleMismatch?.hasMismatch) {
    return `${result.roleMismatch.message} ${result.roleMismatch.suggestedAction}`;
  }

  if (risks.length > 0 && hasHardRisk(risks[0])) {
    return `${risks[0]}。建议先确认硬门槛，再围绕 ${
      result.resumeThesis.oneSentence ||
      result.screeningProfile.whoTheyWant ||
      result.detectedRole.label
    } 调整表达。`;
  }

  const thesis = result.resumeThesis.oneSentence || result.summary;
  const profile = result.screeningProfile.whoTheyWant;
  const riskText = risks.length > 0 ? `但 ${risks[0]}，不能硬包装。` : "";

  return [thesis, profile ? `岗位主要在筛：${profile}` : "", riskText]
    .filter(Boolean)
    .join(" ");
}

function buildNextSteps(result: JDAnalysisResult) {
  const skillPriority = result.resumeThesis.skillPriority.slice(0, 4);
  const projectPriority = result.resumeThesis.projectPriority.slice(0, 3);

  if (skillPriority.length > 0 || projectPriority.length > 0) {
    return `生成定制简历时建议优先突出 ${
      skillPriority.join("、") || "核心能力"
    }，项目顺序优先参考 ${projectPriority.join("、") || "强匹配项目"}。`;
  }

  return "建议先生成定制简历，再重点检查弱匹配项是否被过度包装。";
}

function getTopProjects(result: JDAnalysisResult) {
  const evidenceProjects = result.evidenceMatrix
    .filter((item) => item.matchLevel === "strong" || item.matchLevel === "medium")
    .flatMap((item) => item.matchedProjects);
  const recommended = result.recommendedProjects.map(
    (project) => project.projectName ?? project.name,
  );

  return Array.from(new Set([...evidenceProjects, ...recommended].filter(Boolean))).slice(
    0,
    3,
  );
}

function hasHardRisk(value: string) {
  return /毕业|年限|工作经验|行业经验|学历|专业不符|全职实习|实习时长/i.test(
    value,
  );
}
