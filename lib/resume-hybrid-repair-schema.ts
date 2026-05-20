import type { ResumeData } from "@/lib/resume-schema";

export type HybridRepairLog = {
  repaired: boolean;
  recoveredEvidence: string[];
  restoredSkills: string[];
  restoredProjects: string[];
  restoredBullets: string[];
  removedWeakContent: string[];
  summary: string;
  fallbackReason?: string;
};

export type HybridRepairResult = {
  hybridResume: ResumeData;
  repairLog: HybridRepairLog;
};

export function createFallbackHybridRepairLog(
  reason = "Hybrid repair failed; the current tailored resume was kept.",
): HybridRepairLog {
  return {
    repaired: false,
    recoveredEvidence: [],
    restoredSkills: [],
    restoredProjects: [],
    restoredBullets: [],
    removedWeakContent: [],
    summary: reason,
    fallbackReason: reason,
  };
}

export function normalizeHybridRepairLog(
  value: Partial<HybridRepairLog> | undefined,
): HybridRepairLog {
  const recoveredEvidence = normalizeStringArray(value?.recoveredEvidence);
  const restoredSkills = normalizeStringArray(value?.restoredSkills);
  const restoredProjects = normalizeStringArray(value?.restoredProjects);
  const restoredBullets = normalizeStringArray(value?.restoredBullets);
  const removedWeakContent = normalizeStringArray(value?.removedWeakContent);
  const repaired =
    value?.repaired ??
    recoveredEvidence.length + restoredSkills.length + restoredProjects.length +
      restoredBullets.length >
      0;

  return {
    repaired,
    recoveredEvidence,
    restoredSkills,
    restoredProjects,
    restoredBullets,
    removedWeakContent,
    summary:
      typeof value?.summary === "string" && value.summary.trim()
        ? value.summary.trim()
        : repaired
          ? "Hybrid repair restored Master evidence that was weakened in the tailored resume."
          : "Hybrid repair made no changes.",
    fallbackReason:
      typeof value?.fallbackReason === "string" && value.fallbackReason.trim()
        ? value.fallbackReason.trim()
        : undefined,
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    ),
  );
}
