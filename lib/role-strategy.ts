import type { RoleDirection } from "@/lib/resume-schema";

export const roleLabels: Record<RoleDirection, string> = {
  ai_product_manager: "AI 产品经理",
  ai_agent_application: "AI Agent 应用",
  llm_application: "大模型应用 / 大模型应用产品",
  auto_detect_role: "自动识别岗位",
  custom_role: "自定义岗位方向",
};

export const roleDescriptions: Record<RoleDirection, string> = {
  ai_product_manager:
    "优先强调业务问题、产品方案、AI 工作流、用户场景、能力边界、评估指标与落地验证。",
  ai_agent_application:
    "优先强调 Agent Workflow、任务拆解、Tool Calling、结构化输出、人工兜底和可复查结果。",
  llm_application:
    "优先强调 LLM 应用场景、Prompt Engineering、模型输出评估、Badcase 分析和业务可用性。",
  auto_detect_role:
    "适合朋友或非预设岗位使用，AI 会根据 JD 自动判断岗位类型。",
  custom_role:
    "给非预设岗位使用，例如增长产品、商业化产品、数据分析、运营策略等。",
};

export const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({
  value: value as RoleDirection,
  label,
  description: roleDescriptions[value as RoleDirection],
}));
