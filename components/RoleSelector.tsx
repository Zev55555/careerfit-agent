"use client";

import { Check } from "lucide-react";
import type { RoleDirection } from "@/lib/resume-schema";
import { roleOptions } from "@/lib/role-strategy";

type RoleSelectorProps = {
  value: RoleDirection;
  customRoleLabel?: string;
  onChange: (value: RoleDirection) => void;
};

const compactDescriptions: Record<RoleDirection, string> = {
  ai_product_manager: "业务问题 / 产品方案 / 用户场景 / 指标验证",
  ai_agent_application: "Workflow / Tool Calling / 结构化输出 / 可复查结果",
  llm_application: "Prompt / LLM 场景 / 输出评估 / 可用性",
  auto_detect_role: "AI 根据 JD 自动判断岗位方向",
  custom_role: "适合预设外岗位，可补充偏好",
};

export function RoleSelector({
  value,
  customRoleLabel,
  onChange,
}: RoleSelectorProps) {
  return (
    <section className="liquid-section rounded-[20px] p-4">
      <h2 className="text-sm font-semibold text-zinc-950">岗位方向</h2>
      <div className="mt-3 grid gap-2">
        {roleOptions.map((option) => {
          const active = option.value === value;
          const label =
            option.value === "custom_role" && customRoleLabel
              ? customRoleLabel
              : option.label;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              className={`group flex min-h-[58px] w-full items-center gap-3 rounded-[16px] border px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                active
                  ? "border-sky-200/90 bg-sky-50/70 text-slate-950 shadow-[0_8px_22px_rgba(56,189,248,0.12),inset_0_1px_0_rgba(255,255,255,0.92)]"
                  : "border-white/70 bg-white/42 text-slate-800 hover:border-sky-100/90 hover:bg-white/64 hover:shadow-[0_8px_20px_rgba(24,39,75,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]"
              }`}
              onClick={() => onChange(option.value)}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  active
                    ? "border-sky-400 bg-white/70 text-sky-600"
                    : "border-slate-300/80 bg-white/35 text-transparent"
                }`}
              >
                {active ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {label}
                </span>
                <span className="mt-0.5 block truncate text-xs leading-4 text-slate-500">
                  {compactDescriptions[option.value]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
