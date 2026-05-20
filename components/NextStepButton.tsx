"use client";

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { LiquidButton } from "@/components/LiquidButton";

type NextStepButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  helperText?: string;
  onClick: () => void;
};

export function NextStepButton({
  children,
  disabled = false,
  helperText,
  onClick,
}: NextStepButtonProps) {
  return (
    <div className="liquid-section rounded-[20px] p-4">
      <LiquidButton
        type="button"
        fullWidth
        disabled={disabled}
        onClick={onClick}
      >
        {children}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </LiquidButton>
      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
