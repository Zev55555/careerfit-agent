"use client";

import type { CustomRoleInput as CustomRoleInputValue } from "@/lib/custom-role";

type CustomRoleInputProps = {
  value: CustomRoleInputValue;
  error?: string;
  onChange: (value: CustomRoleInputValue) => void;
};

export function CustomRoleInput({
  value,
  error,
  onChange,
}: CustomRoleInputProps) {
  return (
    <section className="liquid-section rounded-[20px] p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-950">自定义岗位方向</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          给非预设岗位使用，例如增长产品、商业化产品、数据分析、运营策略等。
        </p>
      </div>

      <div className="mt-3 grid gap-3">
        <Field
          label="目标岗位名称"
          placeholder="例如：增长产品经理 / 数据分析师 / 运营策略实习生"
          value={value.roleName}
          onChange={(roleName) => onChange({ ...value, roleName })}
        />
        <TextArea
          label="岗位侧重点"
          placeholder="例如：用户增长、转化率、漏斗分析、A/B Test、活动策略"
          value={value.focusAreas}
          onChange={(focusAreas) => onChange({ ...value, focusAreas })}
        />
        <TextArea
          label="希望突出哪些能力"
          placeholder="例如：数据分析、指标拆解、产品设计、业务理解、沟通协作"
          value={value.strengthsToHighlight}
          onChange={(strengthsToHighlight) =>
            onChange({ ...value, strengthsToHighlight })
          }
        />
        <TextArea
          label="不希望夸大的内容"
          placeholder="例如：不要写算法研发、不要写商业化上线、不要编造增长数据"
          value={value.avoidAreas}
          onChange={(avoidAreas) => onChange({ ...value, avoidAreas })}
        />
        <TextArea
          label="补充说明"
          placeholder="例如：我想投增长产品，希望简历突出数据分析和增长思维，不要太偏 AI 技术"
          value={value.rawText}
          onChange={(rawText) => onChange({ ...value, rawText })}
        />
      </div>

      {error ? (
        <p className="mt-3 rounded-[16px] border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-zinc-700">
      {label}
      <input
        className="h-10 rounded-[16px] border border-white/85 bg-white/70 px-3 text-sm font-normal text-zinc-950 outline-none transition focus:border-sky-300"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-zinc-700">
      {label}
      <textarea
        className="min-h-20 resize-y rounded-[16px] border border-white/85 bg-white/70 px-3 py-2 text-sm font-normal leading-6 text-zinc-950 outline-none transition focus:border-sky-300"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
