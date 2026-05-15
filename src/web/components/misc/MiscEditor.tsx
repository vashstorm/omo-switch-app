import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Card, CardContent, Box, Typography, Collapse,
  ButtonBase, Chip, Paper, Checkbox, TextField,
  Button, IconButton, Tooltip, Alert, ToggleButton, ToggleButtonGroup,
  Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { ChevronRight, ChevronDown, Plus, Trash2 } from "lucide-react";
import { TRANSITIONS } from "../../theme/motionTokens";
import { radii, lightTokens, darkTokens } from "../../theme/designTokens";
import { MONO_FONT } from "../../theme/typography";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { JsonCodeBlock } from "../common/JsonCodeBlock";

interface MiscEditorProps {
  miscData?: Record<string, unknown>;
  onChange?: (nextMiscData: Record<string, unknown>) => void;
  onDirty?: () => void;
  globalCollapseKey?: number;
  globalExpandKey?: number;
  expandTargetId?: string | null;
}

export interface MiscEditorHandle {
  openCreateDialog: () => void;
  validateDrafts: () => { valid: boolean; nextMiscData: Record<string, unknown> };
}

function MiscEditorComponent(
  { miscData, onChange, onDirty, globalCollapseKey, globalExpandKey, expandTargetId }: MiscEditorProps,
  ref: React.Ref<MiscEditorHandle>,
) {
  const editable = typeof onChange === "function";
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createValue, setCreateValue] = useState("{\n  \"enabled\": true\n}");
  const [createTemplate, setCreateTemplate] = useState("object");
  const [createError, setCreateError] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const collapseKey = globalCollapseKey ?? 0;
    const expandKey = globalExpandKey ?? 0;
    if (collapseKey <= expandKey || !miscData) {
      return {};
    }

    const all: Record<string, boolean> = {};
    Object.keys(miscData).forEach((name) => {
      all[name] = true;
    });
    return all;
  });

  const sectionNames = useMemo(() => {
    if (!miscData) return [];
    return Object.keys(miscData).sort();
  }, [miscData]);

  const sectionNamesRef = useRef(sectionNames);

  useEffect(() => {
    sectionNamesRef.current = sectionNames;
  }, [sectionNames]);

  useLayoutEffect(() => {
    if (globalCollapseKey !== undefined && globalCollapseKey > 0) {
      const all: Record<string, boolean> = {};
      sectionNamesRef.current.forEach((name) => {
        all[name] = true;
      });
      setCollapsedSections(all);
    }
  }, [globalCollapseKey]);

  useLayoutEffect(() => {
    if (globalExpandKey !== undefined && globalExpandKey > 0) {
      setCollapsedSections({});
    }
  }, [globalExpandKey]);

  useEffect(() => {
    if (expandTargetId) {
      setCollapsedSections((prev: Record<string, boolean>) => ({ ...prev, [expandTargetId]: false }));
    }
  }, [expandTargetId]);

  const handleToggleSection = (sectionName: string) => {
    setCollapsedSections((prev: Record<string, boolean>) => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const clearSectionDrafts = (sectionName: string) => {
    const shouldRemove = (draftKey: string) =>
      draftKey === `section:${sectionName}` || draftKey.startsWith(`field:${sectionName}:`);

    setDraftValues((prev) => {
      const next = { ...prev };
      for (const draftKey of Object.keys(next)) {
        if (shouldRemove(draftKey)) delete next[draftKey];
      }
      return next;
    });

    setDraftErrors((prev) => {
      const next = { ...prev };
      for (const draftKey of Object.keys(next)) {
        if (shouldRemove(draftKey)) delete next[draftKey];
      }
      return next;
    });
  };

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const tokens = isDark ? darkTokens : lightTokens;
  const miscColor = (theme as any).sectionColors?.misc ?? tokens.colors.section.miscPrimary;

  const isPrimitiveValue = (value: unknown): boolean => {
    return (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    );
  };

  const isArrayValue = (value: unknown): boolean => {
    return Array.isArray(value);
  };

  const getSectionValue = (sectionName: string): unknown => {
    if (!miscData) return undefined;
    return miscData[sectionName];
  };

  const getSectionData = (sectionName: string): Record<string, unknown> | undefined => {
    const value = getSectionValue(sectionName);
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return value as Record<string, unknown>;
  };

  const updateSection = (sectionName: string, nextValue: unknown) => {
    if (!onChange) return;
    onChange({
      ...(miscData ?? {}),
      [sectionName]: nextValue,
    });
  };

  const resetCreateDialog = () => {
    setCreateName("");
    setCreateTemplate("object");
    setCreateValue("{\n  \"enabled\": true\n}");
    setCreateError(null);
  };

  const applyCreateTemplate = (template: string) => {
    setCreateTemplate(template);
    setCreateError(null);
    if (template === "object") {
      setCreateValue("{\n  \"enabled\": true\n}");
      return;
    }
    if (template === "array") {
      setCreateValue("[\n  \"item\"\n]");
      return;
    }
    if (template === "boolean") {
      setCreateValue("true");
      return;
    }
    if (template === "string") {
      setCreateValue("\"value\"");
    }
  };

  const handleOpenCreateDialog = () => {
    resetCreateDialog();
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    resetCreateDialog();
  };

  const handleCreateSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!onChange) return;

    const sectionName = createName.trim();
    if (!sectionName) {
      setCreateError("Section name is required.");
      return;
    }

    if (!/^[A-Za-z0-9_.-]+$/.test(sectionName)) {
      setCreateError("Use letters, numbers, underscore, dash, or dot.");
      return;
    }

    if (Object.hasOwn(miscData ?? {}, sectionName)) {
      setCreateError(`"${sectionName}" already exists.`);
      return;
    }

    let nextValue: unknown;
    try {
      nextValue = JSON.parse(createValue);
    } catch {
      setCreateError("Initial value must be valid JSON.");
      return;
    }

    onChange({
      ...(miscData ?? {}),
      [sectionName]: nextValue,
    });
    onDirty?.();
    setCollapsedSections((prev) => ({ ...prev, [sectionName]: false }));
    setCreateDialogOpen(false);
    resetCreateDialog();
  };

  const handleDeleteIntent = (sectionName: string) => {
    setPendingDeleteName(sectionName);
  };

  const handleDeleteCancel = () => {
    setPendingDeleteName(null);
  };

  const handleDeleteConfirm = () => {
    if (!onChange || !pendingDeleteName) return;

    clearSectionDrafts(pendingDeleteName);
    onChange({
      ...(miscData ?? {}),
      [pendingDeleteName]: null,
    });
    onDirty?.();
    setCollapsedSections((prev) => {
      const next = { ...prev };
      delete next[pendingDeleteName];
      return next;
    });
    setPendingDeleteName(null);
  };

  const updateField = (sectionName: string, fieldName: string, nextValue: unknown) => {
    const sectionData = getSectionData(sectionName) ?? {};
    updateSection(sectionName, {
      ...sectionData,
      [fieldName]: nextValue,
    });
  };

  const getDraftValue = (draftKey: string, value: unknown) => {
    if (Object.hasOwn(draftValues, draftKey)) {
      return draftValues[draftKey];
    }
    if (typeof value === "string") return value;
    return JSON.stringify(value, null, 2);
  };

  const setDraftValue = (draftKey: string, value: string) => {
    onDirty?.();
    setDraftValues((prev) => ({ ...prev, [draftKey]: value }));
    setDraftErrors((prev) => {
      if (!prev[draftKey]) return prev;
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  };

  const clearDraftValue = (draftKey: string) => {
    setDraftValues((prev) => {
      if (!Object.hasOwn(prev, draftKey)) return prev;
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
    setDraftErrors((prev) => {
      if (!Object.hasOwn(prev, draftKey)) return prev;
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  };

  const getDraftSourceValue = (draftKey: string): unknown => {
    const [kind, sectionName, fieldName] = draftKey.split(":");
    if (kind === "section" && sectionName) {
      return getSectionValue(sectionName);
    }
    if (kind === "field" && sectionName && fieldName) {
      return getSectionData(sectionName)?.[fieldName];
    }
    return undefined;
  };

  const applyDraftValue = (
    currentMiscData: Record<string, unknown>,
    draftKey: string,
    parsedValue: unknown,
  ): Record<string, unknown> => {
    const [kind, sectionName, fieldName] = draftKey.split(":");
    if (kind === "section" && sectionName) {
      return {
        ...currentMiscData,
        [sectionName]: parsedValue,
      };
    }

    if (kind === "field" && sectionName && fieldName) {
      const sectionData = currentMiscData[sectionName];
      const nextSectionData =
        sectionData && typeof sectionData === "object" && !Array.isArray(sectionData)
          ? { ...(sectionData as Record<string, unknown>) }
          : {};
      nextSectionData[fieldName] = parsedValue;
      return {
        ...currentMiscData,
        [sectionName]: nextSectionData,
      };
    }

    return currentMiscData;
  };

  useImperativeHandle(ref, () => ({
    openCreateDialog: handleOpenCreateDialog,
    validateDrafts: () => {
      let nextMiscData = { ...(miscData ?? {}) };
      const nextErrors: Record<string, string> = {};

      for (const [draftKey, rawValue] of Object.entries(draftValues)) {
        const sourceValue = getDraftSourceValue(draftKey);
        const trimmed = rawValue.trim();

        if (typeof sourceValue === "number") {
          if (trimmed === "") {
            nextErrors[draftKey] = "Number is required";
            continue;
          }

          const nextValue = Number(trimmed);
          if (!Number.isFinite(nextValue)) {
            nextErrors[draftKey] = "Invalid number";
            continue;
          }

          nextMiscData = applyDraftValue(nextMiscData, draftKey, nextValue);
          continue;
        }

        try {
          nextMiscData = applyDraftValue(nextMiscData, draftKey, JSON.parse(rawValue));
        } catch {
          nextErrors[draftKey] = "Invalid JSON";
        }
      }

      setDraftErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) {
        const erroredSectionNames = Object.keys(nextErrors)
          .map((draftKey) => draftKey.split(":")[1])
          .filter((sectionName): sectionName is string => !!sectionName);
        setCollapsedSections((prev) => {
          if (erroredSectionNames.length === 0) return prev;
          const next = { ...prev };
          erroredSectionNames.forEach((sectionName) => {
            next[sectionName] = false;
          });
          return next;
        });
        return { valid: false, nextMiscData };
      }

      setDraftValues({});
      return { valid: true, nextMiscData };
    },
  }), [draftValues, miscData]);

  const commitNumberDraft = (draftKey: string, rawValue: string, commit: (nextValue: number) => void) => {
    const trimmed = rawValue.trim();
    if (trimmed === "") {
      setDraftErrors((prev) => ({ ...prev, [draftKey]: "Number is required" }));
      return;
    }

    const nextValue = Number(trimmed);
    if (!Number.isFinite(nextValue)) {
      setDraftErrors((prev) => ({ ...prev, [draftKey]: "Invalid number" }));
      return;
    }

    commit(nextValue);
    clearDraftValue(draftKey);
  };

  const commitJsonDraft = (draftKey: string, rawValue: string, commit: (nextValue: unknown) => void) => {
    try {
      const nextValue = JSON.parse(rawValue);
      commit(nextValue);
      clearDraftValue(draftKey);
    } catch {
      setDraftErrors((prev) => ({ ...prev, [draftKey]: "Invalid JSON" }));
    }
  };

  const textFieldSx = {
    flex: 1,
    minWidth: 0,
    "& .MuiOutlinedInput-root": {
      bgcolor: tokens.colors.neutral.surface,
      borderRadius: `${tokens.radii.control}px`,
      transition: TRANSITIONS.control,
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: alpha(miscColor, 0.32),
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: miscColor,
        borderWidth: 1,
      },
    },
    "& .MuiInputBase-input": {
      fontFamily: MONO_FONT,
      fontSize: "0.8rem",
    },
    "& .MuiFormHelperText-root": {
      ml: 0,
      minHeight: 18,
    },
  };

  const fieldRowSx = (rowIndex = 0, isComplexValue = false, fullWidth = false) => ({
    px: { xs: 1.5, sm: 2 },
    py: isComplexValue ? 1.5 : 1.15,
    borderTop: rowIndex === 0 ? "none" : `1px solid ${alpha(theme.palette.divider, 0.55)}`,
    display: "grid",
    gridTemplateColumns: fullWidth
      ? "minmax(0, 1fr)"
      : { xs: "minmax(0, 1fr)", sm: "minmax(130px, 0.34fr) minmax(0, 1fr)" },
    alignItems: isComplexValue ? "flex-start" : "center",
    gap: fullWidth ? 0 : { xs: 0.75, sm: 2 },
    bgcolor: rowIndex % 2 === 0 ? "transparent" : alpha(miscColor, isDark ? 0.035 : 0.025),
  });

  const fieldLabelSx = (isComplexValue = false) => ({
    fontFamily: MONO_FONT,
    fontWeight: 600,
    color: "text.primary",
    minWidth: 0,
    fontSize: "0.75rem",
    letterSpacing: 0,
    pt: { xs: 0, sm: isComplexValue ? 0.75 : 0 },
    overflowWrap: "anywhere",
  });

  const renderBooleanValue = (value: boolean): React.ReactNode => (
    <Typography
      sx={{
        color: "text.secondary",
        fontFamily: MONO_FONT,
        fontSize: "0.8rem",
        textAlign: "left",
        wordBreak: "break-word",
      }}
    >
      {value ? "true" : "false"}
    </Typography>
  );

  const renderEditableControl = (
    draftKey: string,
    testId: string,
    value: unknown,
    commit: (nextValue: unknown) => void,
  ): React.ReactNode => {
    if (typeof value === "boolean") {
      return (
        <Checkbox
          checked={value}
          onChange={(event) => commit(event.target.checked)}
          size="small"
          inputProps={{ "data-testid": `${testId}-checkbox` } as React.InputHTMLAttributes<HTMLInputElement>}
          sx={{
            p: 0.25,
            color: alpha(miscColor, 0.55),
            "&.Mui-checked": { color: miscColor },
          }}
        />
      );
    }

    if (typeof value === "string") {
      return (
        <TextField
          value={value}
          onChange={(event) => commit(event.target.value)}
          size="small"
          fullWidth
          inputProps={{ "data-testid": testId }}
          sx={textFieldSx}
        />
      );
    }

    if (typeof value === "number") {
      const draftValue = getDraftValue(draftKey, value);
      return (
        <TextField
          value={draftValue}
          onChange={(event) => setDraftValue(draftKey, event.target.value)}
          onBlur={() => commitNumberDraft(draftKey, draftValue, commit as (nextValue: number) => void)}
          type="number"
          size="small"
          fullWidth
          error={!!draftErrors[draftKey]}
          helperText={draftErrors[draftKey] ?? " "}
          inputProps={{ "data-testid": testId }}
          sx={textFieldSx}
        />
      );
    }

    const draftValue = getDraftValue(draftKey, value);
    return (
      <TextField
        value={draftValue}
        onChange={(event) => setDraftValue(draftKey, event.target.value)}
        onBlur={() => commitJsonDraft(draftKey, draftValue, commit)}
        size="small"
        fullWidth
        multiline
        minRows={3}
        error={!!draftErrors[draftKey]}
        helperText={draftErrors[draftKey] ?? " "}
        inputProps={{ "data-testid": `${testId}-json` }}
        sx={textFieldSx}
      />
    );
  };

  const renderEditablePrimitiveValue = (sectionName: string, value: unknown): React.ReactNode => {
    const isComplexValue = Array.isArray(value) || (typeof value === "object" && value !== null);
    return (
      <Box
        sx={fieldRowSx(0, isComplexValue, isComplexValue)}
        data-testid={`misc-primitive-${sectionName}`}
      >
        {!isComplexValue && <Typography sx={fieldLabelSx(isComplexValue)}>value:</Typography>}
        {renderEditableControl(
          `section:${sectionName}`,
          `misc-${sectionName}-value`,
          value,
          (nextValue) => updateSection(sectionName, nextValue),
        )}
      </Box>
    );
  };

  const renderPrimitiveValue = (sectionName: string, value: unknown): React.ReactNode => {
    if (editable) {
      return renderEditablePrimitiveValue(sectionName, value);
    }

    const isBool = typeof value === "boolean";
    const isComplexValue = Array.isArray(value) || (typeof value === "object" && value !== null);

    return (
      <Box
        sx={fieldRowSx(0, isComplexValue, isComplexValue)}
        data-testid={`misc-primitive-${sectionName}`}
      >
        {!isComplexValue && <Typography sx={fieldLabelSx(isComplexValue)}>value:</Typography>}
        {isBool ? (
          renderBooleanValue(value as boolean)
        ) : (
          <Typography
            sx={{
              color: typeof value === "number" ? "text.primary" : "text.secondary",
              fontFamily: MONO_FONT,
              fontSize: "0.8rem",
              flex: 1,
              bgcolor: alpha(theme.palette.action.hover, isDark ? 0.22 : 0.35),
              border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
              px: 1,
              py: 0.45,
              borderRadius: `${tokens.radii.control - 2}px`,
              wordBreak: "break-word",
            }}
          >
            {value === null ? "null" : String(value)}
          </Typography>
        )}
      </Box>
    );
  };

  const renderArrayValue = (sectionName: string, value: unknown[]): React.ReactNode => {
    if (editable) {
      return renderEditablePrimitiveValue(sectionName, value);
    }

    const allPrimitives = value.every(v => typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null);

    return (
      <Box
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 1.5,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
        data-testid={`misc-array-${sectionName}`}
      >
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontWeight: 600,
            color: "text.primary",
            fontSize: "0.75rem",
            letterSpacing: 0,
          }}
        >
          value: Array ({value.length})
        </Typography>
        {allPrimitives ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {value.map((item) => (
              <Chip
                key={`arr-${String(item).slice(0, 20)}`}
                label={item === null ? "null" : typeof item === "string" ? `"${item}"` : String(item)}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: "0.7rem",
                  fontFamily: MONO_FONT,
                  borderColor: alpha(miscColor, 0.2),
                  color: "text.secondary",
                }}
              />
            ))}
          </Box>
        ) : (
          <Paper
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              borderRadius: `${tokens.radii.control}px`,
              px: 2,
              py: 1.5,
              bgcolor: alpha(theme.palette.background.default, 0.5),
            }}
          >
            <JsonCodeBlock
              data={value}
              isDark={isDark}
              fontSize="0.75rem"
            />
          </Paper>
        )}
      </Box>
    );
  };

  const renderArrItem = (item: unknown): React.ReactNode => {
    const isItemBool = typeof item === "boolean";
    const isItemPrimitive = typeof item === "string" || typeof item === "number" || item === null;

    if (isItemBool) {
      return renderBooleanValue(item);
    }
    if (isItemPrimitive) {
      return (
        <Chip
          label={item === null ? "null" : String(item)}
          size="small"
          variant="outlined"
          sx={{
            fontSize: "0.75rem",
            fontFamily: MONO_FONT,
            borderColor: alpha(miscColor, 0.15),
            color: "text.secondary",
          }}
        />
      );
    }
    return (
      <Typography
        component="span"
        sx={{
          fontFamily: MONO_FONT,
          fontSize: "0.75rem",
          color: "text.secondary",
          bgcolor: alpha(theme.palette.action.hover, 0.3),
          px: 0.75,
          py: 0.15,
          borderRadius: 0.75,
        }}
      >
        {JSON.stringify(item)}
      </Typography>
    );
  };

  const renderReadonlyField = (sectionName: string, fieldName: string, value: unknown, rowIndex: number): React.ReactNode => {
    const isBool = typeof value === "boolean";
    const isNum = typeof value === "number";
    const isStr = typeof value === "string";
    const isArr = Array.isArray(value);
    const isObj = typeof value === "object" && value !== null && !Array.isArray(value);
    const isComplexValue = isArr || isObj;

    return (
      <Box
        key={fieldName}
        sx={fieldRowSx(rowIndex, isComplexValue)}
        data-testid={`misc-kv-${sectionName}-${fieldName}-readonly`}
      >
        <Typography
          sx={fieldLabelSx(isComplexValue)}
        >
          {fieldName}:
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {isBool && renderBooleanValue(value as boolean)}
          {(isStr || isNum) && (
            <Typography
              sx={{
                color: isNum ? "text.primary" : "text.secondary",
                fontFamily: MONO_FONT,
                fontSize: "0.8rem",
                textAlign: "left",
                wordBreak: "break-word",
              }}
            >
              {String(value)}
            </Typography>
          )}
          {isArr && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {value.map((item) => (
                <React.Fragment key={`kv-${String(item).slice(0, 20)}`}>
                  {renderArrItem(item)}
                </React.Fragment>
              ))}
            </Box>
          )}
          {isObj && (
            <Paper
              sx={{
                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                borderRadius: `${tokens.radii.control}px`,
                px: 1.5,
                py: 1,
                bgcolor: alpha(theme.palette.background.default, 0.5),
              }}
            >
              <JsonCodeBlock
                data={value}
                isDark={isDark}
                fontSize="0.75rem"
              />
            </Paper>
          )}
        </Box>
      </Box>
    );
  };

  const renderEditableField = (sectionName: string, fieldName: string, value: unknown, rowIndex: number): React.ReactNode => {
    const isComplexValue = Array.isArray(value) || (typeof value === "object" && value !== null);

    return (
      <Box
        key={fieldName}
        sx={fieldRowSx(rowIndex, isComplexValue)}
        data-testid={`misc-kv-${sectionName}-${fieldName}`}
      >
        <Typography
          component="label"
          htmlFor={`misc-${sectionName}-${fieldName}`}
          sx={fieldLabelSx(isComplexValue)}
        >
          {fieldName}:
        </Typography>
        {renderEditableControl(
          `field:${sectionName}:${fieldName}`,
          `misc-${sectionName}-${fieldName}`,
          value,
          (nextValue) => updateField(sectionName, fieldName, nextValue),
        )}
      </Box>
    );
  };

  const renderField = (sectionName: string, fieldName: string, index: number): React.ReactNode => {
    const sectionData = getSectionData(sectionName);
    if (!sectionData) return null;
    const value = sectionData[fieldName];
    if (editable) {
      return renderEditableField(sectionName, fieldName, value, index);
    }
    return renderReadonlyField(sectionName, fieldName, value, index);
  };

  const renderSectionContent = (sectionName: string): React.ReactNode => {
    const value = getSectionValue(sectionName);

    if (editable) {
      return renderEditablePrimitiveValue(sectionName, value);
    }

    if (isPrimitiveValue(value)) {
      return renderPrimitiveValue(sectionName, value);
    }

    if (isArrayValue(value)) {
      return renderArrayValue(sectionName, value as unknown[]);
    }

    const sectionData = getSectionData(sectionName) || {};
    const keys = Object.keys(sectionData);
    return keys.map((fieldName, index) => renderField(sectionName, fieldName, index));
  };

  return (
    <Box
      data-testid="misc-editor"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        bgcolor: "transparent",
        borderRadius: `${tokens.radii.card}px`,
        p: 0,
        transition: TRANSITIONS.control,
      }}
    >
      {sectionNames.map((sectionName) => {
        const collapsed = !!collapsedSections[sectionName];
        return (
          <Card
            key={sectionName}
            sx={{
              overflow: "hidden",
              transition: TRANSITIONS.control,
              bgcolor: isDark ? tokens.colors.neutral.elevatedSurface : "#f7f3ed",
              borderColor: collapsed ? tokens.colors.neutral.divider : alpha(miscColor, 0.22),
              boxShadow: isDark ? "none" : "0 10px 28px rgba(20, 20, 19, 0.035)",
              "&:hover": {
                borderColor: alpha(miscColor, 0.38),
                bgcolor: isDark ? alpha(miscColor, 0.035) : "#f5efe7",
                boxShadow: isDark ? "none" : "0 14px 34px rgba(20, 20, 19, 0.05)",
              }
            }}
            data-testid={`misc-section-${sectionName}`}
            id={`misc-${sectionName}`}
          >
            <Box
              sx={{
                height: 2,
                mx: 2,
                borderRadius: "0 0 999px 999px",
                bgcolor: collapsed ? "transparent" : alpha(miscColor, isDark ? 0.68 : 0.5),
                transition: TRANSITIONS.control,
                opacity: collapsed ? 0 : 1,
              }}
            />
            <Box
              sx={{
                minHeight: 58,
                py: 0.9,
                px: 1.5,
                bgcolor: collapsed ? "transparent" : alpha(miscColor, isDark ? 0.08 : 0.045),
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                borderBottom: "1px solid",
                borderColor: collapsed ? "transparent" : alpha(theme.palette.divider, isDark ? 0.46 : 0.7),
                transition: TRANSITIONS.control,
              }}
            >
                <ButtonBase
                  onClick={() => handleToggleSection(sectionName)}
                  data-testid={`toggle-misc-${sectionName}`}
                  aria-expanded={!collapsed}
                  aria-controls={`misc-body-${sectionName}`}
                  aria-label={`${collapsed ? "Expand" : "Collapse"} misc section ${sectionName}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    flex: 1,
                    minWidth: 0,
                    justifyContent: "flex-start",
                    borderRadius: `${tokens.radii.control}px`,
                    p: "6px 8px",
                    "&:hover": { bgcolor: alpha(miscColor, isDark ? 0.14 : 0.08) },
                    "&:focus-visible": {
                      outline: `2px solid ${alpha(miscColor, 0.5)}`,
                      outlineOffset: 1,
                    }
                  }}
                >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: `${tokens.radii.control - 2}px`,
                    bgcolor: collapsed ? alpha(miscColor, 0.12) : miscColor,
                    color: collapsed ? "text.secondary" : tokens.colors.neutral.surface,
                    transition: TRANSITIONS.control,
                    flexShrink: 0,
                  }}
                >
                  {collapsed ? (
                    <ChevronRight style={{ width: 16, height: 16 }} />
                  ) : (
                    <ChevronDown style={{ width: 16, height: 16 }} />
                  )}
                </Box>
                <Typography
                  component="h4"
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    fontFamily: MONO_FONT,
                    color: collapsed ? "text.primary" : miscColor,
                    letterSpacing: 0,
                    transition: TRANSITIONS.control,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sectionName}
                </Typography>
              </ButtonBase>
              {editable && (
                <Tooltip title="Delete setting">
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteIntent(sectionName)}
                    data-testid={`delete-misc-${sectionName}`}
                    aria-label={`Delete misc section ${sectionName}`}
                    sx={{
                      color: "text.disabled",
                      p: 0.5,
                      flexShrink: 0,
                      "&:hover": {
                        color: "error.main",
                        bgcolor: alpha(theme.palette.error.main, 0.08),
                      },
                    }}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Collapse in={!collapsed} unmountOnExit>
              <CardContent
                id={`misc-body-${sectionName}`}
                sx={{
                  p: 0,
                  borderBottomLeftRadius: radii.card,
                  borderBottomRightRadius: radii.card,
                  bgcolor: isDark ? alpha(theme.palette.common.white, 0.015) : "#fbfaf7",
                  "&:last-child": { pb: 0 },
                }}
              >
                {renderSectionContent(sectionName)}
              </CardContent>
            </Collapse>
          </Card>
        );
      })}

      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        data-testid="misc-create-dialog"
        aria-labelledby="create-misc-title"
        maxWidth="xs"
        fullWidth
      >
        <Box component="form" onSubmit={handleCreateSubmit}>
          <DialogTitle id="create-misc-title">Create New Setting</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75, pt: 0.5 }}>
              {createError && (
                <Alert severity="error" data-testid="misc-create-error">
                  {createError}
                </Alert>
              )}
              <TextField
                label="Setting ID"
                value={createName}
                onChange={(event) => {
                  setCreateName(event.target.value);
                  setCreateError(null);
                }}
                placeholder="e.g. tmux"
                fullWidth
                autoFocus
                margin="dense"
                inputProps={{ "data-testid": "misc-create-name" }}
              />
              <ToggleButtonGroup
                exclusive
                size="small"
                value={createTemplate}
                onChange={(_, value) => {
                  if (value) applyCreateTemplate(value);
                }}
                aria-label="Initial value template"
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
                  gap: 0.75,
                  "& .MuiToggleButtonGroup-grouped": {
                    border: `1px solid ${alpha(miscColor, 0.22)} !important`,
                    borderRadius: `${tokens.radii.control}px !important`,
                    mx: "0 !important",
                    color: "text.secondary",
                    textTransform: "none",
                    fontFamily: MONO_FONT,
                    fontSize: "0.75rem",
                    "&.Mui-selected": {
                      color: miscColor,
                      bgcolor: alpha(miscColor, isDark ? 0.16 : 0.1),
                    },
                    "&.Mui-selected:hover": {
                      bgcolor: alpha(miscColor, isDark ? 0.2 : 0.14),
                    },
                  },
                }}
              >
                <ToggleButton value="object" data-testid="misc-template-object">Object</ToggleButton>
                <ToggleButton value="array" data-testid="misc-template-array">Array</ToggleButton>
                <ToggleButton value="boolean" data-testid="misc-template-boolean">Boolean</ToggleButton>
                <ToggleButton value="string" data-testid="misc-template-string">String</ToggleButton>
              </ToggleButtonGroup>
              <TextField
                label="JSON Value"
                value={createValue}
                onChange={(event) => {
                  setCreateValue(event.target.value);
                  setCreateError(null);
                }}
                fullWidth
                multiline
                minRows={5}
                error={createError === "Initial value must be valid JSON."}
                inputProps={{ "data-testid": "misc-create-value-json" }}
                sx={{
                  "& .MuiInputBase-input": {
                    fontFamily: MONO_FONT,
                    fontSize: "0.8rem",
                  },
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCreateDialog}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!createName.trim()}
              data-testid="misc-create-submit"
              startIcon={<Plus size={16} />}
              sx={{
                bgcolor: miscColor,
                "&:hover": {
                  bgcolor: alpha(miscColor, 0.86),
                },
              }}
            >
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteName !== null}
        title="Delete Misc Setting"
        description={`Are you sure you want to delete misc setting "${pendingDeleteName}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        severity="error"
      />
    </Box>
  );
}

export const MiscEditor = memo(forwardRef(MiscEditorComponent));
