import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Box } from "@mui/material";
import { CategoryConfig } from "../../hooks/useProfile";
import type { ModelGroup } from "../../../shared/config/types";
import { CategoryCard } from "./CategoryCard";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface CategoryEditorProps {
  categories: Record<string, Partial<CategoryConfig> | null>;
  availableModels: string[];
  availableModelGroups?: ModelGroup[];
  onChange: (categories: Record<string, Partial<CategoryConfig> | null>) => void;
  onDirty: () => void;
  onModelChangeIntent?: (kind: "category", id: string, previousModel: string, nextModel: string) => void;
  globalCollapseKey?: number;
  globalExpandKey?: number;
  expandTargetId?: string | null;
}

export function CategoryEditor({ categories, availableModels, availableModelGroups, onChange, onDirty, onModelChangeIntent, globalCollapseKey, globalExpandKey, expandTargetId }: CategoryEditorProps) {
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>(() => {
    const collapseKey = globalCollapseKey ?? 0;
    const expandKey = globalExpandKey ?? 0;
    if (collapseKey <= expandKey) {
      return {};
    }

    const all: Record<string, boolean> = {};
    Object.entries(categories).forEach(([id, cfg]) => {
      if (cfg !== null) {
        all[id] = true;
      }
    });
    return all;
  });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const categoriesRef = useRef(categories);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useLayoutEffect(() => {
    if (globalCollapseKey !== undefined && globalCollapseKey > 0) {
      const all: Record<string, boolean> = {};
      Object.entries(categoriesRef.current).forEach(([id, cfg]) => {
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

  const handleToggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCategoryChange = (id: string, updated: Partial<CategoryConfig>) => {
    const nextCategories = { ...categories, [id]: updated };
    onChange(nextCategories);
    onDirty();
  };

  const handleCategoryDelete = (id: string) => {
    const nextCategories = { ...categories, [id]: null };
    onChange(nextCategories);
    onDirty();
  };

  const handleDeleteConfirm = () => {
    if (pendingDeleteId) {
      const nextCategories = { ...categories, [pendingDeleteId]: null };
      onChange(nextCategories);
      onDirty();
      setPendingDeleteId(null);
    }
  };

  const handleDeleteCancel = () => {
    setPendingDeleteId(null);
  };

  const activeEntries = Object.entries(categories).filter(([_, config]) => config !== null);

  return (
    <Box data-testid="category-editor">
      <Box
        data-testid="category-list"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {activeEntries.map(([id, config]) => (
          <CategoryCard
            key={id}
            id={id}
            category={config as Partial<CategoryConfig>}
            availableModels={availableModels}
            availableModelGroups={availableModelGroups}
            onChange={(updated) => handleCategoryChange(id, updated)}
            onModelChange={onModelChangeIntent
              ? (nextModel, prevModel) => onModelChangeIntent("category", id, prevModel, nextModel)
              : undefined}
            onDelete={() => setPendingDeleteId(id)}
            collapsed={!!collapsedIds[id]}
            onToggleCollapse={() => handleToggleCollapse(id)}
          />
        ))}
      </Box>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete Category"
        description={`Are you sure you want to delete category "${pendingDeleteId}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        severity="category"
      />
    </Box>
  );
}
