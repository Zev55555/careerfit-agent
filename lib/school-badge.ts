export const ucsdDisplayName = "加州大学圣地亚哥分校 UCSD";
export const ucsdSchoolBadge = "QS世界排名#66 | U.S. News全美#29";

export function inferSchoolBadge(schoolName: string): string {
  if (isUcsd(schoolName)) {
    return ucsdSchoolBadge;
  }

  return "";
}

export function normalizeSchoolNameForDisplay(schoolName: string) {
  if (isUcsd(schoolName)) {
    return ucsdDisplayName;
  }

  return schoolName;
}

export function applyInferredSchoolBadge(
  schoolName: string,
  currentBadge?: string,
) {
  const existing = currentBadge?.trim() ?? "";

  if (existing) {
    return existing;
  }

  return inferSchoolBadge(schoolName);
}

export function cleanEducationDetailItems(items: string[] = []) {
  return items
    .flatMap(splitPotentialCourseList)
    .map((item) =>
      item
        .replace(/^相关课程\s*[:：]\s*/, "")
        .replace(/^补充信息\s*[:：]\s*/, "")
        .trim(),
    )
    .filter((item) => item && !isEducationNoise(item));
}

function isUcsd(schoolName: string) {
  return /University of California,\s*San Diego|UC San Diego|UCSD|加利福尼亚大学圣地亚哥分校|加州大学圣地亚哥分校/i.test(
    schoolName,
  );
}

function splitPotentialCourseList(value: string) {
  const cleaned = value.trim();

  if (!cleaned) {
    return [];
  }

  if (/相关课程\s*[:：]/.test(cleaned)) {
    return cleaned.replace(/^相关课程\s*[:：]\s*/, "").split(/[、,，;；]/);
  }

  return [cleaned];
}

function isEducationNoise(value: string) {
  const normalized = value.replace(/\s+/g, "");
  const exactNoise = new Set(["大一", "大二", "大三", "大四", "本科", "GPA"]);

  return (
    exactNoise.has(normalized) ||
    /预计毕业时间|^GPA|^专业前\s*15%$|^专业前15%$|统计学专业\+?数据科学辅修|统计学专业＋数据科学辅修/.test(normalized)
  );
}
