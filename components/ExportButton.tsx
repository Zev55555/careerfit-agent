"use client";

import { Download } from "lucide-react";
import { LiquidButton } from "@/components/LiquidButton";

type ExportButtonProps = {
  isExporting: boolean;
  error: string;
  onExport: () => void;
  compact?: boolean;
};

export function ExportButton({
  isExporting,
  error,
  onExport,
  compact = false,
}: ExportButtonProps) {
  return (
    <section className="grid gap-2">
      <LiquidButton
        className={compact ? "" : "w-full"}
        type="button"
        size={compact ? "sm" : "lg"}
        fullWidth={!compact}
        loading={isExporting}
        disabled={isExporting}
        onClick={onExport}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {isExporting ? "导出中..." : "导出 PDF"}
      </LiquidButton>
      {error ? (
        <p className="rounded-[16px] border border-blue-200/80 bg-blue-50/75 px-3 py-2 text-sm text-blue-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}

