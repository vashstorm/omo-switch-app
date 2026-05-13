import { memo, useCallback, useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

const VIRTUAL_LIST_THRESHOLD = 80;

interface CategoryRowProps {
  id: string;
  config: Partial<CategoryConfig>;
  availableModels: string[];
  availableModelGroups?: ModelGroup[];
  collapsed: boolean;
  onCategoryChange: (id: string, updated: Partial<CategoryConfig>) => void;
  onModelChangeIntent?: (kind: "category", id: string, previousModel: string, nextModel: string) => void;
  onDeleteIntent: (id: string) => void;
  onToggleCollapse: (id: string) => void;
}

const CategoryRow = memo(function CategoryRow({
  id,
  config,
  availableModels,
  availableModelGroups,
  collapsed,
  onCategoryChange,
  onModelChangeIntent,
  onDeleteIntent,
  onToggleCollapse,
}: CategoryRowProps) {
  const handleChange = useCallback((updated: Partial<CategoryConfig>) => {
    onCategoryChange(id, updated);
  }, [id, onCategoryChange]);

  const handleModelChange = useMemo(() => (
    onModelChangeIntent
      ? (nextModel: string, prevModel: string) => onModelChangeIntent("category", id, prevModel, nextModel)
      : undefined
  ), [id, onModelChangeIntent]);

  const handleDelete = useCallback(() => {
    onDeleteIntent(id);
  }, [id, onDeleteIntent]);

  const handleToggleCollapse = useCallback(() => {
    onToggleCollapse(id);
  }, [id, onToggleCollapse]);

  return (
    <CategoryCard
      id={id}
      category={config}
      availableModels={availableModels}
      availableModelGroups={availableModelGroups}
      onChange={handleChange}
      onModelChange={handleModelChange}
      onDelete={handleDelete}
      collapsed={collapsed}
      onToggleCollapse={handleToggleCollapse}
    />
  );
});

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

  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleCategoryChange = useCallback((id: string, updated: Partial<CategoryConfig>) => {
    const nextCategories = { ...categoriesRef.current, [id]: updated };
    onChange(nextCategories);
    onDirty();
  }, [onChange, onDirty]);

  const handleDeleteIntent = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const handleDeleteConfirm = () => {
    if (pendingDeleteId) {
      const nextCategories = { ...categoriesRef.current, [pendingDeleteId]: null };
      onChange(nextCategories);
      onDirty();
      setPendingDeleteId(null);
    }
  };

  const handleDeleteCancel = () => {
    setPendingDeleteId(null);
  };

  const activeEntries = useMemo(() =>
    Object.entries(categories).filter((entry): entry is [string, Partial<CategoryConfig>] => entry[1] !== null),
    [categories]);
  const activeCategoryIndex = useMemo(() => {
    const index = new Map<string, number>();
    activeEntries.forEach(([id], idx) => index.set(id, idx));
    return index;
  }, [activeEntries]);
  const shouldVirtualize = activeEntries.length > VIRTUAL_LIST_THRESHOLD;
  const virtualParentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? activeEntries.length : 0,
    getScrollElement: () => virtualParentRef.current,
    estimateSize: () => 360,
    overscan: 6,
  });

  useEffect(() => {
    if (!expandTargetId || !shouldVirtualize) return;
    const index = activeCategoryIndex.get(expandTargetId);
    if (index !== undefined) {
      virtualizer.scrollToIndex(index, { align: "center" });
    }
  }, [activeCategoryIndex, expandTargetId, shouldVirtualize, virtualizer]);

  const renderRow = useCallback(([id, config]: [string, Partial<CategoryConfig>]) => (
    <CategoryRow
      key={id}
      id={id}
      config={config}
      availableModels={availableModels}
      availableModelGroups={availableModelGroups}
      onCategoryChange={handleCategoryChange}
      onModelChangeIntent={onModelChangeIntent}
      onDeleteIntent={handleDeleteIntent}
      collapsed={!!collapsedIds[id]}
      onToggleCollapse={handleToggleCollapse}
    />
  ), [
    availableModelGroups,
    availableModels,
    collapsedIds,
    handleCategoryChange,
    handleDeleteIntent,
    handleToggleCollapse,
    onModelChangeIntent,
  ]);

  return (
    <Box data-testid="category-editor">
      {shouldVirtualize ? (
        <Box
          ref={virtualParentRef}
          data-testid="category-list"
          sx={{
            maxHeight: "72vh",
            overflow: "auto",
            contain: "strict",
          }}
        >
          <Box
            sx={{
              height: virtualizer.getTotalSize(),
              position: "relative",
              width: "100%",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const entry = activeEntries[virtualItem.index];
              if (!entry) return null;

              return (
                <Box
                  key={entry[0]}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                    pb: 2,
                  }}
                >
                  {renderRow(entry)}
                </Box>
              );
            })}
          </Box>
        </Box>
      ) : (
        <Box
          data-testid="category-list"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {activeEntries.map(renderRow)}
        </Box>
      )}
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
