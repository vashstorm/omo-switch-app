import { memo } from "react";
import {
  Card,
  CardContent,
  Box,
  Stack,
  Typography,
  TextField,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  IconButton,
  Collapse,
  SelectChangeEvent,
  ButtonBase,
  Tooltip,
  InputAdornment
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Trash2, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { CategoryConfig } from "../../hooks/useProfile";
import type { ModelGroup } from "../../../shared/config/types";
import { CATEGORY_MANAGED_FIELDS, filterEmptyFields } from "../../../shared/managed-fields";
import { TRANSITIONS, DURATIONS, EASING } from "../../theme/motionTokens";
import { lightTokens, darkTokens } from "../../theme/designTokens";
import { MONO_FONT } from "../../theme/typography";
import { GroupedModelPicker } from "../models/GroupedModelPicker";

const compactNumberFieldSx = {
  minWidth: 0,
  height: "40px",
  "& .MuiInputBase-root": { height: "40px" },
  "& .MuiInputBase-input": {
    boxSizing: "border-box",
    color: "text.primary",
    fontFamily: MONO_FONT,
    fontSize: "0.8rem",
    lineHeight: "20px",
    px: "14px",
    py: "8.5px",
    WebkitTextFillColor: "currentColor",
  },
  "& .MuiInputBase-inputAdornedEnd": {
    pr: "4px",
  },
  "& .MuiInputBase-adornedEnd": {
    pr: "6px",
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.75rem",
    lineHeight: "1.4375em",
  },
  "& .MuiInputLabel-root:not(.MuiInputLabel-shrink)": {
    top: "50%",
    transform: "translate(14px, -50%) scale(1)",
  },
};

interface NumberStepperProps {
  label: string;
  testId: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

function NumberStepper({ label, testId, onIncrement, onDecrement }: NumberStepperProps) {
  const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <InputAdornment position="end" sx={{ m: 0 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 32,
        }}
      >
        <IconButton
          aria-label={`Increase ${label}`}
          data-testid={`${testId}-increase`}
          size="small"
          tabIndex={-1}
          onMouseDown={handleMouseDown}
          onClick={onIncrement}
          sx={{ width: 22, height: 16, p: 0, borderRadius: 1 }}
        >
          <ChevronUp style={{ width: 16, height: 16 }} />
        </IconButton>
        <IconButton
          aria-label={`Decrease ${label}`}
          data-testid={`${testId}-decrease`}
          size="small"
          tabIndex={-1}
          onMouseDown={handleMouseDown}
          onClick={onDecrement}
          sx={{ width: 22, height: 16, p: 0, borderRadius: 1 }}
        >
          <ChevronDown style={{ width: 16, height: 16 }} />
        </IconButton>
      </Box>
    </InputAdornment>
  );
}

interface CategoryCardProps {
  id: string;
  category: Partial<CategoryConfig>;
  availableModels: string[];
  availableModelGroups?: ModelGroup[];
  onChange: (updated: Partial<CategoryConfig>) => void;
  onModelChange?: (newModel: string, previousModel: string) => void;
  onDelete: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function CategoryCardComponent({ id, category, availableModels, availableModelGroups, onChange, onModelChange, onDelete, collapsed = false, onToggleCollapse }: CategoryCardProps) {
  const handleChange = (field: keyof CategoryConfig, value: any) => {
    const newCategory = { ...category, [field]: value };
    const cleaned = filterEmptyFields(newCategory, CATEGORY_MANAGED_FIELDS) as Partial<CategoryConfig>;
    
    if (field === "temperature" && typeof value === "number" && isNaN(value)) {
      delete cleaned.temperature;
    }

    onChange(cleaned);
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      handleChange("temperature", undefined);
    } else {
      handleChange("temperature", parseFloat(val));
    }
  };

  const stepTemperature = (direction: 1 | -1) => {
    const current = typeof category.temperature === "number" && !Number.isNaN(category.temperature)
      ? category.temperature
      : 0;
    const next = Math.min(1, Math.max(0, Number((current + direction * 0.1).toFixed(1))));
    handleChange("temperature", next);
  };

  const handleModelPickerChange = (newValue: string | string[]) => {
    const modelId = newValue as string;
    if (onModelChange) {
      onModelChange(modelId, category.model || "");
      return;
    }
    handleChange("model", modelId);
  };

  const handleFallbackPickerChange = (newValue: string | string[]) => {
    handleChange("fallback_models", newValue as string[]);
  };

  const handleVariantChange = (e: SelectChangeEvent) => {
    handleChange("variant", e.target.value);
  };

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const dTokens = isDark ? darkTokens : lightTokens;
  const categoryColor = dTokens.colors.section.categoryPrimary;

  return (
    <Card
      data-testid={`category-card-${id}`}
      id={`category-${id}`}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        transition: TRANSITIONS.control,
        boxShadow: collapsed
          ? "none"
          : "0 2px 12px rgba(0, 0, 0, 0.06)",
        "&:hover": {
          boxShadow: collapsed
            ? "0 2px 8px rgba(0, 0, 0, 0.04)"
            : "0 4px 16px rgba(0, 0, 0, 0.08)",
        }
      }}
    >
      <Box
        sx={{
          height: 2,
          bgcolor: collapsed ? "transparent" : categoryColor,
          transition: TRANSITIONS.control,
          opacity: 0.85,
        }}
      />
      <Box
        sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 0.5,
        px: 1.5,
        bgcolor: collapsed ? "transparent" : alpha(categoryColor, 0.02),
        borderBottom: "1px solid",
        borderColor: collapsed ? "transparent" : alpha(theme.palette.divider, 0.4),
        transition: TRANSITIONS.control,
        }}
      >
        <ButtonBase
          data-testid={`toggle-category-${id}`}
          aria-expanded={!collapsed}
          aria-controls={`category-body-${id}`}
          onClick={onToggleCollapse}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderRadius: 1.5,
            padding: "6px 8px",
            flex: 1,
            justifyContent: "flex-start",
            "&:hover": {
              bgcolor: alpha(categoryColor, 0.06),
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
              borderRadius: 1.5,
              bgcolor: collapsed ? alpha(categoryColor, 0.08) : categoryColor,
              color: collapsed ? "text.secondary" : dTokens.colors.neutral.surface,
              transition: `all ${DURATIONS.NORMAL}ms ${EASING.EASE_OUT}`,
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
              fontWeight: 500,
              fontFamily: MONO_FONT,
              color: collapsed ? "text.primary" : categoryColor,
              fontSize: "0.8125rem",
              letterSpacing: "-0.01em",
              transition: TRANSITIONS.control,
            }}
          >
            {id}
          </Typography>
        </ButtonBase>
        <Tooltip title="Delete Category">
          <IconButton
            onClick={onDelete}
            data-testid={`delete-category-${id}`}
            aria-label="Delete category"
            size="small"
            sx={{
              color: "text.disabled",
              p: 0.5,
              "&:hover": { color: "error.main", bgcolor: alpha(theme.palette.error.main, 0.06) }
            }}
          >
            <Trash2 style={{ width: 16, height: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Collapse in={!collapsed} id={`category-body-${id}`} unmountOnExit>
        <CardContent sx={{ p: 2, pt: 1.5, "&:last-child": { pb: 2 } }}>
          <Stack spacing={2}>
            <Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr 1fr", sm: "2fr 1fr 1fr" },
                  gap: 2,
                  mb: 0.5,
                  alignItems: "start",
                }}
              >
                <GroupedModelPicker
                  containerSx={{ height: "40px" }}
                  groups={availableModelGroups ?? []}
                  value={category.model ?? null}
                  multiple={false}
                  onChange={handleModelPickerChange}
                  label="Model"
                  placeholder="None"
                  testId={`category-model-${id}`}
                  accentColor={categoryColor}
                />

                <FormControl
                  size="small"
                  sx={{
                    minWidth: 0,
                    height: "40px",
                    "& .MuiInputBase-root": { height: "40px" },
                    "& .MuiInputLabel-root": {
                      fontSize: "0.75rem",
                      lineHeight: "1.4375em",
                    },
                    "& .MuiInputLabel-root:not(.MuiInputLabel-shrink)": {
                      top: "50%",
                      transform: "translate(14px, -50%) scale(1)",
                    },
                  }}
                >
                  <InputLabel
                    id={`category-variant-label-${id}`}
                    sx={{ fontSize: "0.75rem", lineHeight: "1.4375em" }}
                  >
                    Variant
                  </InputLabel>
                  <Select
                    labelId={`category-variant-label-${id}`}
                    id={`category-variant-${id}`}
                    value={category.variant || ""}
                    onChange={handleVariantChange}
                    data-testid={`category-variant-${id}`}
                    label="Variant"
                    sx={{
                      "& .MuiSelect-select": {
                        fontSize: "0.8rem",
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        py: "8.5px",
                        px: "14px",
                      }
                    }}
                  >
                    <MenuItem value="" sx={{ fontSize: "0.8rem", fontStyle: "normal" }}>Default</MenuItem>
                    <MenuItem value="low" sx={{ fontSize: "0.8rem" }}>low</MenuItem>
                    <MenuItem value="medium" sx={{ fontSize: "0.8rem" }}>medium</MenuItem>
                    <MenuItem value="high" sx={{ fontSize: "0.8rem" }}>high</MenuItem>
                    <MenuItem value="xhigh" sx={{ fontSize: "0.8rem" }}>xhigh</MenuItem>
                    <MenuItem value="max" sx={{ fontSize: "0.8rem" }}>max</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  id={`category-temperature-${id}`}
                  label="Temperature"
                  type="text"
                  size="small"
                  value={typeof category.temperature === "number" && !Number.isNaN(category.temperature) ? String(category.temperature) : ""}
                  onChange={handleTemperatureChange}
                  sx={compactNumberFieldSx}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <NumberStepper
                          label="temperature"
                          testId={`category-temperature-${id}`}
                          onIncrement={() => stepTemperature(1)}
                          onDecrement={() => stepTemperature(-1)}
                        />
                      ),
                    },
                    htmlInput: { 
                      inputMode: "decimal",
                      pattern: "[0-9]*[.]?[0-9]*",
                      "data-testid": `category-temperature-${id}`,
                    },
                    inputLabel: { style: { fontSize: "0.75rem", lineHeight: "1.4375em" } }
                  }}
                />
              </Box>
            </Box>

            <Box>
              <Stack spacing={2}>
                <TextField
                  id={`category-description-${id}`}
                  label="Category Description"
                  multiline
                  minRows={1}
                  maxRows={3}
                  size="small"
                  value={category.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Purpose of this category..."
                  slotProps={{
                    input: { style: { fontSize: "0.8rem" } },
                    inputLabel: { style: { fontSize: "0.75rem", lineHeight: "1.4375em" } }
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      minHeight: "40px",
                      bgcolor: alpha(theme.palette.background.default, 0.4)
                    },
                    "& .MuiInputBase-inputMultiline": {
                      padding: 0,
                      lineHeight: "1.4375em",
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: "0.75rem",
                      lineHeight: "1.4375em",
                    },
                    "& .MuiInputLabel-root:not(.MuiInputLabel-shrink)": {
                      top: "50%",
                      transform: "translate(14px, -50%) scale(1)",
                    },
                  }}
                />

                <TextField
                  id={`category-prompt-${id}`}
                  label="Category Prompt Append"
                  multiline
                  minRows={1}
                  maxRows={15}
                  size="small"
                  value={category.prompt_append || ""}
                  onChange={(e) => handleChange("prompt_append", e.target.value)}
                  placeholder="Additional instructions..."
                  slotProps={{
                    input: { 
                      style: { 
                        fontSize: "0.8rem",
                      } 
                    },
                    inputLabel: { style: { fontSize: "0.75rem", lineHeight: "1.4375em" } }
                  }}
                  sx={{ 
                    "& .MuiOutlinedInput-root": { 
                      minHeight: "40px",
                      bgcolor: alpha(theme.palette.background.default, 0.4)
                    },
                    "& .MuiInputBase-inputMultiline": {
                      padding: 0,
                      lineHeight: "1.4375em",
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: "0.75rem",
                      lineHeight: "1.4375em",
                    },
                    "& .MuiInputLabel-root:not(.MuiInputLabel-shrink)": {
                      top: "50%",
                      transform: "translate(14px, -50%) scale(1)",
                    },
                  }}
                />
              </Stack>
            </Box>

            <Box>
              <GroupedModelPicker
                  containerSx={{ height: "100%" }}
                groups={availableModelGroups ?? []}
                value={category.fallback_models ?? []}
                multiple={true}
                onChange={handleFallbackPickerChange}
                label="Fallback Models"
                placeholder="None"
                testId={`category-fallback-${id}`}
                accentColor={categoryColor}
              />
            </Box>
          </Stack>
        </CardContent>
      </Collapse>
    </Card>
  );
}

export const CategoryCard = memo(CategoryCardComponent);
