"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AnalysisProgressProps = {
  status: "idle" | "running" | "success" | "error";
};

export function AnalysisProgress({ status }: AnalysisProgressProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    startedAtRef.current = Date.now();
    const resetTimer = window.setTimeout(() => setElapsedMs(0), 0);
    const interval = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedMs(Date.now() - startedAtRef.current);
      }
    }, 500);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearInterval(interval);
    };
  }, [status]);

  const current = useMemo(() => {
    if (status === "success") {
      return { progress: 100, label: "分析完成" };
    }

    if (status === "error") {
      return { progress: 100, label: "分析失败，请重试" };
    }

    return getRunningProgress(elapsedMs);
  }, [elapsedMs, status]);

  if (status === "idle") {
    return null;
  }

  return (
    <section className="liquid-section rounded-[20px] p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-950">JD 分析进度</p>
        <span className="font-mono text-xs text-zinc-500">
          {current.progress}%
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/55">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status === "error"
              ? "bg-blue-500"
              : "bg-[linear-gradient(90deg,#bae6fd,#93c5fd)]"
          }`}
          style={{ width: `${current.progress}%` }}
        />
      </div>
      <p
        className={`mt-2 text-xs leading-5 ${
          status === "error" ? "text-blue-800" : "text-zinc-600"
        }`}
      >
        {current.label}
        {status === "running" ? (
          <span className="ml-2 text-zinc-500">
            已用时 {Math.floor(elapsedMs / 1000)}s
          </span>
        ) : null}
      </p>
      {status === "running" && elapsedMs >= 45_000 ? (
        <p className="mt-1 text-xs leading-5 text-blue-700">
          分析仍在进行，复杂 JD 可能需要更久。
        </p>
      ) : null}
    </section>
  );
}

function getRunningProgress(elapsedMs: number) {
  const elapsedSeconds = elapsedMs / 1000;

  if (elapsedSeconds < 10) {
    return {
      progress: interpolate(8, 45, elapsedSeconds / 10),
      label: "正在拆解 JD 要求",
    };
  }

  if (elapsedSeconds < 25) {
    return {
      progress: interpolate(45, 68, (elapsedSeconds - 10) / 15),
      label: "正在判断岗位筛选画像",
    };
  }

  if (elapsedSeconds < 45) {
    return {
      progress: interpolate(68, 82, (elapsedSeconds - 25) / 20),
      label: "正在匹配项目经历证据",
    };
  }

  return {
    progress: interpolate(82, 90, Math.min((elapsedSeconds - 45) / 60, 1)),
    label: "正在生成简历策略",
  };
}

function interpolate(start: number, end: number, ratio: number) {
  return Math.round(start + (end - start) * Math.min(Math.max(ratio, 0), 1));
}
