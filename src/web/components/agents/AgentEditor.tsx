import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { AgentConfig } from "../../hooks/useProfile";
import type { ModelGroup } from "../../../shared/config/types";
import { AgentCard } from "./AgentCard";
import { ConfirmDialog } from "../common/ConfirmDialog";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

interface AgentEditorProps {
  agents: Record<string, Partial<AgentConfig> | null>;
  availableModels: string[];
  availableModelGroups?: ModelGroup[];
  onChange: (agents: Record<string, Partial<AgentConfig> | null>) => void;
  onModelChangeIntent?: (kind: "agent", id: string, previousModel: string, nextModel: string) => void;
  globalCollapseKey?: number;
  globalExpandKey?: number;
  expandTargetId?: string | null;
  categoryIds?: string[];
}

export function AgentEditor({ agents, availableModels, availableModelGroups, onChange, onModelChangeIntent, globalCollapseKey, globalExpandKey, expandTargetId, categoryIds }: AgentEditorProps) {
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>(() => {
    const collapseKey = globalCollapseKey ?? 0;
    const expandKey = globalExpandKey ?? 0;
    if (collapseKey <= expandKey) {
      return {};
    }

    const all: Record<string, boolean> = {};
    Object.entries(agents).forEach(([id, cfg]) => {
      if (cfg !== null) {
        all[id] = true;
      }
    });
    return all;
  });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const agentsRef = useRef(agents);

  // Keep ref in sync without triggering re-renders
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useLayoutEffect(() => {
    if (globalCollapseKey !== undefined && globalCollapseKey > 0) {
      const all: Record<string, boolean> = {};
      Object.entries(agentsRef.current).forEach(([id, cfg]) => {
        if (cfg !== null) all[id] = true;
      });
      setCollapsedIds(all);
    }
  }, [globalCollapseKey]);

  useLayoutEffect(() => {
    if (globalExpandKey !== undefined && globalExpandKey > 0) {
      setCollapsedIds({});
    }
  }, [globalExpandKey]);

  useEffect(() => {
    if (expandTargetId) {
      setCollapsedIds((prev) => ({ ...prev, [expandTargetId]: false }));
    }
  }, [expandTargetId]);

  const activeAgents = Object.entries(agents).filter(([_, config]) => config !== null);

  const handleAgentChange = (id: string, updatedConfig: Partial<AgentConfig> | null) => {
    onChange({
      ...agents,
      [id]: updatedConfig
    });
  };

  const handleToggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeleteConfirm = () => {
    if (pendingDeleteId) {
      onChange({
        ...agents,
        [pendingDeleteId]: null
      });
      setPendingDeleteId(null);
    }
  };

  const handleDeleteCancel = () => {
    setPendingDeleteId(null);
  };

  return (
    <Box data-testid="agent-editor">
      <Stack
        data-testid="agent-list"
        spacing={2}
      >
        {activeAgents.map(([id, config]) => (
          <AgentCard
            key={id}
            id={id}
            agent={config!}
            availableModels={availableModels}
            availableModelGroups={availableModelGroups}
            onChange={(updated) => handleAgentChange(id, updated)}
            onModelChange={onModelChangeIntent
              ? (nextModel, prevModel) => onModelChangeIntent("agent", id, prevModel, nextModel)
              : undefined}
            onDelete={() => setPendingDeleteId(id)}
            collapsed={!!collapsedIds[id]}
            onToggleCollapse={() => handleToggleCollapse(id)}
            categoryIds={categoryIds}
          />
        ))}
      </Stack>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete Agent"
        description={`Are you sure you want to delete agent "${pendingDeleteId}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        severity="error"
      />
    </Box>
  );
}
