export interface AgentRoleInfo {
  id: string;
  name: string;
  description: string;
}

const BUILTIN_AGENTS: Record<string, AgentRoleInfo> = {
  prometheus: {
    id: "prometheus",
    name: "Prometheus",
    description: "Strategic planning, creating detailed operation plans.",
  },
  atlas: {
    id: "atlas",
    name: "Atlas",
    description: "Task orchestration, completing all to-do items.",
  },
  sisyphus: {
    id: "sisyphus",
    name: "Sisyphus",
    description: "AI orchestrator, intelligently delegating tasks.",
  },
  "sisyphus-junior": {
    id: "sisyphus-junior",
    name: "Sisyphus Junior",
    description: "Lightweight sub-agent for single-task execution.",
  },
  oracle: {
    id: "oracle",
    name: "Oracle",
    description: "High-IQ consultation, diagnosing difficult problems.",
  },
  librarian: {
    id: "librarian",
    name: "Librarian",
    description: "Codebase understanding, multi-repository analysis.",
  },
  explore: {
    id: "explore",
    name: "Explore",
    description: "Contextual search, codebase retrieval.",
  },
  metis: {
    id: "metis",
    name: "Metis",
    description: "Pre-planning consultation, identifying potential risks.",
  },
  momus: {
    id: "momus",
    name: "Momus",
    description: "Plan review, verifying executability.",
  },
  "multimodal-looker": {
    id: "multimodal-looker",
    name: "Multimodal Looker",
    description: "Multimodal analysis, media file interpretation.",
  },
  hephaestus: {
    id: "hephaestus",
    name: "Hephaestus",
    description: "Deep code craftsman, parallel exploration before coding.",
  },
};

export const UNKNOWN_AGENT_DESCRIPTION = "Custom Agent";

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
