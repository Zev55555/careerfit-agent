export const A4_RESUME_RULES = {
  page: "A4",
  mayChangeTemplate: false,
  mayShrinkTypography: false,
  overflowPolicy:
    "When content exceeds one A4 page, compress or remove lower-relevance JSON content instead of changing template CSS.",
} as const;

export type PageFitStatus = {
  fitsOnePage: boolean;
  scrollHeight: number;
  clientHeight: number;
  overflowPx: number;
  tolerancePx: number;
};

export const PAGE_FIT_TOLERANCE_PX = 4;

export function calculatePageFit(
  scrollHeight: number,
  clientHeight: number,
  tolerancePx = PAGE_FIT_TOLERANCE_PX,
): PageFitStatus {
  const overflowPx = Math.max(0, scrollHeight - clientHeight);

  return {
    fitsOnePage: overflowPx <= tolerancePx,
    scrollHeight,
    clientHeight,
    overflowPx,
    tolerancePx,
  };
}
