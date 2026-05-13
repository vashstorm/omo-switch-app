import { memo, useState, useRef, useCallback, useId, useMemo } from "react";
import { Box, Popover, List, ListItem, ListItemText, Chip, Typography, alpha, useTheme, InputLabel } from "@mui/material";
import { X } from "lucide-react";
import type { ModelGroup } from "../../../shared/config/types";
import { MONO_FONT } from "../../theme/typography";

interface GroupedModelPickerProps {
  groups: ModelGroup[];
  value: string | string[] | null;
  multiple: boolean;
  onChange: (value: string | string[]) => void;
  label: string;
  placeholder?: string;
  testId: string;
  disabled?: boolean;
  accentColor?: string;
  containerSx?: object;
}

function getSelectedIds(value: string | string[] | null, multiple: boolean): string[] {
  if (value === null) return [];
  if (multiple) return Array.isArray(value) ? value : [value];
  return typeof value === "string" ? [value] : [];
}

function getModelLabel(modelId: string): string {
  return modelId;
}

function GroupedModelPickerComponent({
  groups,
  value,
  multiple,
  onChange,
  label,
  placeholder,
  testId,
  disabled = false,
  accentColor,
  containerSx,
}: GroupedModelPickerProps) {
  const theme = useTheme();
  const popoverId = useId();
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [modelPopoverAnchorEl, setModelPopoverAnchorEl] = useState<HTMLElement | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(groups[0]?.provider ?? null);
  const [focusedProviderIndex, setFocusedProviderIndex] = useState(-1);
  const [focusedModelIndex, setFocusedModelIndex] = useState(-1);

  const providerPaneRef = useRef<HTMLDivElement>(null);
  const modelPaneRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedIds = getSelectedIds(value, multiple);
  const accent = accentColor ?? theme.palette.primary.main;

  const activeModels = activeProvider
    ? (groups.find((g) => g.provider === activeProvider)?.models ?? [])
    : [];

  const providerPaneWidth = useMemo(() => {
    if (groups.length === 0) return 160;
    const longestLabel = groups.reduce((max, group) =>
      group.label.length > max.length ? group.label : max, groups[0].label);
    const estimatedWidth = longestLabel.length * 12;
    return Math.max(160, Math.min(estimatedWidth, 320));
  }, [groups]);

  const handleTriggerClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || groups.length === 0) return;
      setAnchorEl(e.currentTarget);
      setOpen(true);
      setFocusedProviderIndex(-1);
      setFocusedModelIndex(-1);
      setModelPopoverAnchorEl(null);
    },
    [disabled, groups.length],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setAnchorEl(null);
    setModelPopoverAnchorEl(null);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  }, []);

  const handleModelSelect = useCallback(
    (modelId: string) => {
      if (multiple) {
        const current = Array.isArray(value) ? value : [];
        const next = current.includes(modelId)
          ? current.filter((id) => id !== modelId)
          : [...current, modelId];
        onChange(next);
      } else {
        onChange(modelId);
        handleClose();
      }
    },
    [multiple, value, onChange, handleClose],
  );

  const handleClearSelection = useCallback(() => {
    if (multiple) return;
    onChange("");
    handleClose();
  }, [multiple, onChange, handleClose]);

  const handleChipDelete = useCallback(
    (modelId: string) => {
      if (multiple) {
        const current = Array.isArray(value) ? value : [];
        const next = current.filter((id) => id !== modelId);
        onChange(next);
      }
    },
    [multiple, value, onChange],
  );

  const handleProviderMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>, provider: string) => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setActiveProvider(provider);
      setModelPopoverAnchorEl(e.currentTarget);
      setFocusedModelIndex(-1);
    },
    []
  );

  const handleProviderMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setModelPopoverAnchorEl(null);
    }, 150);
  }, []);

  const handleModelPaneMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  }, []);

  const handleModelPaneMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setModelPopoverAnchorEl(null);
    }, 150);
  }, []);

  const handleProviderPaneKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedProviderIndex((prev) => {
          const next = Math.min(prev + 1, groups.length - 1);
          if (groups[next]) {
            setActiveProvider(groups[next].provider);
            if (modelPopoverAnchorEl) {
              setTimeout(() => {
                const el = document.getElementById(`${testId}-provider-${groups[next].provider}`);
                if (el) setModelPopoverAnchorEl(el);
              }, 0);
            }
          }
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedProviderIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          if (groups[next]) {
            setActiveProvider(groups[next].provider);
            if (modelPopoverAnchorEl) {
              setTimeout(() => {
                const el = document.getElementById(`${testId}-provider-${groups[next].provider}`);
                if (el) setModelPopoverAnchorEl(el);
              }, 0);
            }
          }
          return next;
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (!modelPopoverAnchorEl && activeProvider) {
          const el = document.getElementById(`${testId}-provider-${activeProvider}`);
          if (el) setModelPopoverAnchorEl(el);
        }
        setTimeout(() => modelPaneRef.current?.focus(), 0);
      }
    },
    [groups, activeProvider, modelPopoverAnchorEl, testId],
  );

  const handleModelPaneKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedModelIndex((prev) => Math.min(prev + 1, activeModels.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedModelIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setModelPopoverAnchorEl(null);
        providerPaneRef.current?.focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedModelIndex >= 0 && activeModels[focusedModelIndex]) {
          handleModelSelect(activeModels[focusedModelIndex].id);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    },
    [activeModels, focusedModelIndex, handleModelSelect, handleClose],
  );

  const handlePopoverKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    },
    [handleClose],
  );

  const renderTrigger = () => {
    const hasSingleValue = !multiple && typeof value === "string" && value;
    const hasMultiValue = multiple && Array.isArray(value) && value.length > 0;
    const hasValue = hasSingleValue || hasMultiValue;
    const isEmptyState = groups.length === 0;

    return (
      <button
        type="button"
        data-testid={isEmptyState && !hasValue ? `${testId}-empty-state` : `${testId}-trigger`}
        aria-expanded={open ? "true" : "false"}
        aria-controls={open ? popoverId : undefined}
        onClick={handleTriggerClick}
        disabled={disabled || isEmptyState}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          flexWrap: "wrap",
          gap: 4,
          
          
          width: "100%",
          height: "100%",
          padding: "8.5px 14px",
          border: "none",
          borderRadius: 8,
          background: "transparent",
          cursor: (disabled || isEmptyState) ? "not-allowed" : "pointer",
          fontFamily: MONO_FONT,
          fontSize: "0.8rem",
          lineHeight: "1.4375em",
          color: theme.palette.text.primary,
          textAlign: "left",
          opacity: disabled ? 0.5 : (isEmptyState && hasValue ? 0.7 : 1),
          boxSizing: "border-box",
        }}
      >
        {isEmptyState && !hasValue ? (
          <span
            style={{
              color: theme.palette.text.secondary,
              lineHeight: "1.4375em",
              display: "inline-flex",
              alignItems: "center",
              minHeight: "1.4375em",
            }}
          >
            No enabled providers for this profile
          </span>
        ) : hasSingleValue ? (
          <span style={{ lineHeight: "1.4375em" }}>{getModelLabel(value as string)}</span>
        ) : hasMultiValue ? (
          (value as string[]).map((id) => (
            <Chip
              key={id}
              label={getModelLabel(id)}
              size="small"
              onDelete={() => handleChipDelete(id)}
              deleteIcon={
                <X
                  style={{
                    width: 12,
                    height: 12,
                  }}
                />
              }
              sx={{
                bgcolor: alpha(accent, 0.1),
                color: accent,
                fontFamily: MONO_FONT,
                fontWeight: 400,
                fontSize: "0.7rem",
                height: 22,
                borderRadius: 1,
                "& .MuiChip-deleteIcon": {
                  color: theme.palette.error.main,
                  opacity: 0.85,
                  marginRight: "2px",
                  padding: "2px",
                  borderRadius: "50%",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    opacity: 1,
                    bgcolor: alpha(theme.palette.error.main, 0.15),
                    transform: "scale(1.1)",
                  },
                },
              }}
            />
          ))
        ) : (
          <span
            style={{
              color: theme.palette.text.secondary,
              lineHeight: "1.4375em",
              display: "inline-flex",
              alignItems: "center",
              minHeight: "1.4375em",
            }}
          >
            {placeholder ?? label}
          </span>
        )}
      </button>
    );
  };

  return (
    <Box
      data-testid={testId}
      sx={{
        ...(containerSx || {}),
        width: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        minHeight: multiple ? 40 : undefined,
      }}
    >
      <Box
        component="fieldset"
        sx={{
          position: "absolute",
          top: -5,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 0,
          padding: "0 8px",
          pointerEvents: "none",
          borderRadius: 1,
          borderStyle: "solid",
          borderWidth: open ? 2 : 1,
          borderColor: open ? theme.palette.primary.main : theme.palette.divider,
          transition: "border-color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          minWidth: "0%",
        }}
      >
        {label && (
          <Box
            component="legend"
            sx={{
              float: "unset",
              width: "auto",
              overflow: "hidden",
              display: "block",
              padding: 0,
              height: 11,
              visibility: "hidden",
              maxWidth: "100%",
              whiteSpace: "nowrap",
              fontFamily: MONO_FONT,
              lineHeight: "11px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                paddingLeft: 5,
                paddingRight: 5,
                fontSize: "0.5625rem",
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </span>
          </Box>
        )}
      </Box>
      {label && (
        <InputLabel
          shrink
          sx={{
            position: "absolute",
            top: -7,
            left: 14,
            fontSize: "0.75rem",
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: open ? "primary.main" : "text.secondary",
            zIndex: 1,
            pointerEvents: "none",
            fontFamily: MONO_FONT,
            lineHeight: 1,
            backgroundColor: "transparent",
            transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {label}
        </InputLabel>
      )}
      {renderTrigger()}

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            maxHeight: 400,
            overflow: "hidden",
          } as object,
        }}
      >
        <Box
          data-testid={`${testId}-popover`}
          id={popoverId}
          onKeyDown={handlePopoverKeyDown}
          onMouseLeave={handleProviderMouseLeave}
          sx={{ display: "flex", minWidth: 160 }}
        >
          <Box
            ref={providerPaneRef}
            data-testid={`${testId}-provider-pane`}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleProviderPaneKeyDown}
            sx={{
              width: providerPaneWidth,
              overflowY: "auto",
              maxHeight: 400,
              outline: "none",
            }}
          >
            {!multiple && (
              <Box
                sx={{
                  px: 1,
                  pt: 1,
                  pb: 0.5,
                }}
              >
                <Box
                  component="button"
                  type="button"
                  data-testid={`${testId}-none-option`}
                  onClick={handleClearSelection}
                  style={{
                    width: "100%",
                    border: "none",
                    background: selectedIds.length === 0 ? alpha(accent, 0.1) : "transparent",
                    color: theme.palette.text.primary,
                    borderRadius: 8,
                    cursor: "pointer",
                    padding: "8px 12px",
                    textAlign: "left",
                    fontFamily: MONO_FONT,
                    fontSize: "0.8rem",
                     fontWeight: 400,
                  }}
                >
                  None
                </Box>
              </Box>
            )}
            <List dense disablePadding>
              {groups.map((group, idx) => {
                const isActive = group.provider === activeProvider;
                const isFocused = focusedProviderIndex === idx;
                return (
                  <ListItem
                    key={group.provider}
                    id={`${testId}-provider-${group.provider}`}
                    data-testid={`${testId}-provider-${group.provider}`}
                    role="option"
                    aria-selected={isFocused ? "true" : "false"}
                    onMouseEnter={(e) => handleProviderMouseEnter(e, group.provider)}
                    sx={{
                      cursor: "pointer",
                      py: 0.25,
                      px: 1.5,
                      bgcolor: isActive
                        ? alpha(accent, 0.08)
                        : isFocused
                          ? alpha(theme.palette.action.hover, 0.5)
                          : "transparent",
                      "&:hover": { bgcolor: alpha(accent, 0.06) },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          sx={{
                            fontSize: "0.8rem",
                            fontFamily: MONO_FONT,
                            fontWeight: isActive ? 600 : 400,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={group.label}
                        >
                          {group.label}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        </Box>
      </Popover>

      <Popover
        open={Boolean(modelPopoverAnchorEl)}
        anchorEl={modelPopoverAnchorEl}
        onClose={() => setModelPopoverAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        sx={{ pointerEvents: "none" }}
        PaperProps={{
          onMouseEnter: handleModelPaneMouseEnter,
          onMouseLeave: handleModelPaneMouseLeave,
          sx: {
            pointerEvents: "auto",
            borderRadius: 2,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            maxHeight: 400,
            overflow: "hidden",
            ml: 0.5,
            minWidth: 260,
          } as object,
        }}
      >
        <Box
          ref={modelPaneRef}
          data-testid={`${testId}-model-pane`}
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleModelPaneKeyDown}
          sx={{
            flex: 1,
            overflowY: "auto",
            maxHeight: 400,
            outline: "none",
          }}
        >
          <List dense disablePadding>
            {activeModels.map((model, idx) => {
              const isSelected = selectedIds.includes(model.id);
              const isFocused = focusedModelIndex === idx;
              return (
                <ListItem
                  key={model.id}
                  data-testid={`${testId}-model-${model.id}`}
                  role="option"
                  aria-selected={isSelected || isFocused ? "true" : "false"}
                  onClick={() => handleModelSelect(model.id)}
                  sx={{
                    cursor: "pointer",
                    py: 0.25,
                    px: 1.5,
                    bgcolor: isSelected
                      ? alpha(accent, 0.1)
                      : isFocused
                        ? alpha(theme.palette.action.hover, 0.5)
                        : "transparent",
                    "&:hover": { bgcolor: alpha(accent, 0.06) },
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: "0.8rem", fontFamily: MONO_FONT, fontWeight: 400 }}>
                        {model.label}
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Popover>
    </Box>
  );
}

export const GroupedModelPicker = memo(GroupedModelPickerComponent);
