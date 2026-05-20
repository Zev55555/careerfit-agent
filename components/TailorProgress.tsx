"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TailorProgressProps = {
  status: "idle" | "running" | "success" | "error";
};

export function TailorProgress({ status }: TailorProgressProps) {
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
      return { progress: 100, label: "定制完成" };
    }

    if (status === "error") {
      return { progress: 100, label: "生成失败，可重试" };
    }

    return getRunningProgress(elapsedMs);
  }, [elapsedMs, status]);

  if (status === "idle") {
    return null;
  }

  return (
    <section className="liquid-section rounded-[20px] p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-950">定制简历进度</p>
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
          AI 正在压缩内容并检查风险，请稍等。
        </p>
      ) : null}
    </section>
  );
}

function getRunningProgress(elapsedMs: number) {
  const elapsedSeconds = elapsedMs / 1000;

  if (elapsedSeconds < 8) {
    return {
      progress: interpolate(8, 20, elapsedSeconds / 8),
      label: "正在读取岗位策略",
    };
  }

  if (elapsedSeconds < 18) {
    return {
      progress: interpolate(20, 45, (elapsedSeconds - 8) / 10),
      label: "正在匹配简历项目",
    };
  }

  if (elapsedSeconds < 35) {
    return {
      progress: interpolate(45, 70, (elapsedSeconds - 18) / 17),
      label: "正在改写技能和项目 bullet",
    };
  }

  return {
    progress: interpolate(70, 90, Math.min((elapsedSeconds - 35) / 70, 1)),
    label: "正在进行真实性检查和一页预算",
  };
}

function interpolate(start: number, end: number, ratio: number) {
  return Math.round(start + (end - start) * Math.min(Math.max(ratio, 0), 1));
}
