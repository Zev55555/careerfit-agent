export type CustomRoleInput = {
  roleName: string;
  focusAreas: string;
  strengthsToHighlight: string;
  avoidAreas: string;
  rawText: string;
};

export const emptyCustomRoleInput: CustomRoleInput = {
  roleName: "",
  focusAreas: "",
  strengthsToHighlight: "",
  avoidAreas: "",
  rawText: "",
};

export function normalizeCustomRoleInput(
  value: Partial<CustomRoleInput> | null | undefined,
): CustomRoleInput {
  return {
    roleName: normalizeField(value?.roleName),
    focusAreas: normalizeField(value?.focusAreas),
    strengthsToHighlight: normalizeField(value?.strengthsToHighlight),
    avoidAreas: normalizeField(value?.avoidAreas),
    rawText: normalizeField(value?.rawText),
  };
}

export function hasCustomRoleIntent(value: Partial<CustomRoleInput> | null | undefined) {
  const input = normalizeCustomRoleInput(value);

  return Boolean(input.roleName || input.rawText);
}

export function getCustomRoleLabel(value: Partial<CustomRoleInput> | null | undefined) {
  const input = normalizeCustomRoleInput(value);

  return input.roleName ? `自定义：${input.roleName}` : "自定义岗位方向";
}

function normalizeField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
