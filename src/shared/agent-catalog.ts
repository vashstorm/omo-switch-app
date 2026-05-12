export interface AgentRoleInfo {
  id: string;
  name: string;
  description: string;
}

const BUILTIN_AGENTS: Record<string, AgentRoleInfo> = {
  prometheus: {
    id: "prometheus",
    name: "Prometheus",
    description: "战略规划，创建详细作战计划",
  },
  atlas: {
    id: "atlas",
    name: "Atlas",
    description: "任务编排，完成所有待办事项",
  },
  sisyphus: {
    id: "sisyphus",
    name: "Sisyphus",
    description: "AI 编排器，智能委派任务",
  },
  "sisyphus-junior": {
    id: "sisyphus-junior",
    name: "Sisyphus Junior",
    description: "单任务执行的轻量级子智能体",
  },
  oracle: {
    id: "oracle",
    name: "Oracle",
    description: "高智商咨询，疑难问题诊断",
  },
  librarian: {
    id: "librarian",
    name: "Librarian",
    description: "代码库理解，多仓库分析",
  },
  explore: {
    id: "explore",
    name: "Explore",
    description: "上下文搜索，代码库检索",
  },
  metis: {
    id: "metis",
    name: "Metis",
    description: "预规划咨询，识别潜在风险",
  },
  momus: {
    id: "momus",
    name: "Momus",
    description: "计划审查，验证可执行性",
  },
  "multimodal-looker": {
    id: "multimodal-looker",
    name: "Multimodal Looker",
    description: "多模态分析，媒体文件解读",
  },
  hephaestus: {
    id: "hephaestus",
    name: "Hephaestus",
    description: "深度代码工匠，写代码前先并行探索",
  },
};

export const UNKNOWN_AGENT_DESCRIPTION = "自定义 Agent";

export function getAgentRoleInfo(agentId: string): AgentRoleInfo {
  const builtin = BUILTIN_AGENTS[agentId];
  if (builtin) {
    return builtin;
  }

  return {
    id: agentId,
    name: agentId,
    description: UNKNOWN_AGENT_DESCRIPTION,
  };
}

export function getAgentDescription(agentId: string): string {
  return getAgentRoleInfo(agentId).description;
}

export function isBuiltinAgent(agentId: string): boolean {
  return agentId in BUILTIN_AGENTS;
}

export function getAllBuiltinAgents(): AgentRoleInfo[] {
  return Object.values(BUILTIN_AGENTS);
}

export function getBuiltinAgentIds(): string[] {
  return Object.keys(BUILTIN_AGENTS);
}
