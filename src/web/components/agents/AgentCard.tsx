import { memo } from "react";
import { Trash2, ChevronDown, ChevronRight, ChevronUp, Plus, X, AlertCircle } from "lucide-react";
import { AgentConfig, UltraworkConfig } from "../../hooks/useProfile";
import { getAgentDescription } from "../../../shared/agent-catalog";
import { AGENT_MANAGED_FIELDS, ULTRAWORK_MANAGED_FIELDS, filterEmptyFields } from "../../../shared/managed-fields";
import type { ModelGroup } from "../../../shared/config/types";
import { 
  Card, CardContent, Box, Stack, Typography, TextField, 
  FormControl, InputLabel, Select, MenuItem, IconButton, 
  Collapse, ButtonBase, Chip,
  Tooltip, SelectChangeEvent, Button, InputAdornment
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { TRANSITIONS } from "../../theme/motionTokens";
import { radii } from "../../theme/designTokens";
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

interface AgentCardProps {
  id: string;
  agent: Partial<AgentConfig>;
  availableModels: string[];
  availableModelGroups?: ModelGroup[];
  onChange: (updated: Partial<AgentConfig>) => void;
  onModelChange?: (newModel: string, previousModel: string) => void;
  onDelete: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  categoryIds?: string[];
}

function AgentCardComponent({ id, agent, availableModels, availableModelGroups, onChange, onModelChange, onDelete, collapsed = false, onToggleCollapse, categoryIds }: AgentCardProps) {
  const roleNote = getAgentDescription(id);

  const handleChange = (field: keyof AgentConfig, value: any) => {
    const newAgent = { ...agent, [field]: value };
    const cleaned = filterEmptyFields(newAgent, AGENT_MANAGED_FIELDS) as Partial<AgentConfig>;
    
    if (field === "temperature" && typeof value === "number" && isNaN(value)) {
      delete cleaned.temperature;
    }

    onChange(cleaned);
  };

  const handleModelPickerChange = (newValue: string | string[]) => {
    const modelId = newValue as string;
    if (onModelChange) {
      onModelChange(modelId, agent.model || "");
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

  const handleCategoryChange = (e: SelectChangeEvent) => {
    handleChange("category", e.target.value);
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
    const current = typeof agent.temperature === "number" && !Number.isNaN(agent.temperature)
      ? agent.temperature
      : 0;
    const next = Math.min(1, Math.max(0, Number((current + direction * 0.1).toFixed(1))));
    handleChange("temperature", next);
  };

  const handlePromptAppendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange("prompt_append", e.target.value);
  };

  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      handleChange("maxTokens", undefined);
    } else {
      const num = parseInt(val, 10);
      handleChange("maxTokens", isNaN(num) ? undefined : num);
    }
  };

  const stepMaxTokens = (direction: 1 | -1) => {
    const current = typeof agent.maxTokens === "number" && !Number.isNaN(agent.maxTokens)
      ? agent.maxTokens
      : 0;
    const next = Math.max(1, current + direction * 1000);
    handleChange("maxTokens", next);
  };

  const handleUltraworkChange = (field: keyof UltraworkConfig, value: any) => {
    const currentUltrawork = agent.ultrawork || {};
    const newUltrawork = { ...currentUltrawork, [field]: value };
    const cleaned = filterEmptyFields(newUltrawork, ULTRAWORK_MANAGED_FIELDS) as Partial<UltraworkConfig>;
    
    handleChange("ultrawork", Object.keys(cleaned).length > 0 ? cleaned : undefined);
  };

  const handleUltraworkModelPickerChange = (newValue: string | string[]) => {
    handleUltraworkChange("model", newValue as string);
  };

  const handleUltraworkVariantChange = (e: SelectChangeEvent) => {
    handleUltraworkChange("variant", e.target.value);
  };

  const handleUltraworkPromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUltraworkChange("prompt_append", e.target.value);
  };

  const handleAddUltrawork = () => {
    handleChange("ultrawork", {});
  };

  const handleRemoveUltrawork = () => {
    onChange({ ...agent, ultrawork: null });
  };

  const theme = useTheme();
  const agentColor = (theme as any).sectionColors?.agent ?? "#0071e3";
  const hasUltrawork = agent.ultrawork != null;
  const isSisyphus = id === "sisyphus";
  const isSisyphusJunior = id === "sisyphus-junior";

  return (
    <Card
      data-testid={`agent-card-${id}`}
      id={`agent-${id}`}
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
          bgcolor: collapsed ? "transparent" : agentColor,
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
          bgcolor: collapsed ? "transparent" : alpha(agentColor, 0.02),
          borderBottom: "1px solid",
          borderColor: collapsed ? "transparent" : alpha(theme.palette.divider, 0.4),
          transition: TRANSITIONS.control,
        }}
      >
        <ButtonBase
          data-testid={`toggle-agent-${id}`}
          aria-expanded={!collapsed}
          aria-controls={`agent-body-${id}`}
          aria-label={`${collapsed ? "Expand" : "Collapse"} agent ${id}`}
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
              bgcolor: alpha(agentColor, 0.06),
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
              bgcolor: collapsed ? alpha(agentColor, 0.08) : agentColor,
              color: collapsed ? "text.secondary" : "common.white",
              transition: TRANSITIONS.control,
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
              color: collapsed ? "text.primary" : agentColor,
              fontSize: "0.8125rem",
              letterSpacing: "-0.01em",
              transition: TRANSITIONS.control,
            }}
          >
            {id}
          </Typography>
          {roleNote && (
            <Chip
              data-testid={`agent-role-${id}`}
              label={roleNote}
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: "0.6875rem",
                fontWeight: 500,
                borderColor: alpha(agentColor, 0.15),
                color: "text.secondary",
                borderRadius: 1,
                transition: TRANSITIONS.control,
              }}
            />
          )}
        </ButtonBase>
            <Tooltip title="Delete Agent">
              <IconButton
                onClick={onDelete}
                data-testid={`delete-agent-${id}`}
                aria-label="Delete agent"
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

          <Collapse in={!collapsed} id={`agent-body-${id}`} unmountOnExit>
            <CardContent sx={{ p: 2, pt: 1.5, "&:last-child": { pb: 2 } }}>
          <Stack
            spacing={1.5}
            sx={{
              "& .MuiInputBase-input": {
                textAlign: "left",
              },
              "& .MuiSelect-select": {
                textAlign: "left",
              },
              "& textarea": {
                textAlign: "left",
              },
            }}
          >
            <Box>
               <Box
                 sx={{
                   display: "grid",
                   gridTemplateColumns: {
                     xs: "1fr 1fr",
                     sm: isSisyphus
                       ? "minmax(0, 2.5fr) minmax(110px, 0.9fr) minmax(110px, 0.8fr) minmax(130px, 1fr)"
                       : isSisyphusJunior
                       ? "minmax(0, 2.5fr) minmax(110px, 0.9fr) minmax(110px, 0.8fr) minmax(130px, 1fr)"
                       : "minmax(0, 2.75fr) minmax(120px, 1fr) minmax(110px, 0.9fr)",
                   },
                   gap: 2,
                   mb: 0.5,
                   alignItems: "start",
                 }}
               >
                  <GroupedModelPicker
                    containerSx={{ height: "40px" }}
                    groups={availableModelGroups ?? []}
                    value={agent.model ?? null}
                    multiple={false}
                    onChange={handleModelPickerChange}
                    label="Model"
                    placeholder="None"
                    testId={`agent-model-${id}`}
                    accentColor={agentColor}
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
                      id={`agent-variant-label-${id}`}
                      sx={{ fontSize: "0.75rem", lineHeight: "1.4375em" }}
                    >
                      Variant
                    </InputLabel>
                    <Select
                      labelId={`agent-variant-label-${id}`}
                      id={`agent-variant-${id}`}
                      value={agent.variant || ""}
                      onChange={handleVariantChange}
                      data-testid={`agent-variant-${id}`}
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
                        <MenuItem value="low">low</MenuItem>
                        <MenuItem value="medium">medium</MenuItem>
                        <MenuItem value="high">high</MenuItem>
                        <MenuItem value="xhigh">xhigh</MenuItem>
                        <MenuItem value="max">max</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    id={`agent-temperature-${id}`}
                   label="Temperature"
                   type="text"
                   size="small"
                   value={typeof agent.temperature === "number" && !Number.isNaN(agent.temperature) ? String(agent.temperature) : ""}
                   onChange={handleTemperatureChange}
                    sx={compactNumberFieldSx}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <NumberStepper
                            label="temperature"
                            testId={`agent-temperature-${id}`}
                            onIncrement={() => stepTemperature(1)}
                            onDecrement={() => stepTemperature(-1)}
                          />
                        ),
                      },
                      htmlInput: {
                        inputMode: "decimal",
                        pattern: "[0-9]*[.]?[0-9]*",
                        "data-testid": `agent-temperature-${id}`,
                      },
                      inputLabel: { style: { fontSize: "0.75rem", lineHeight: "1.4375em" } },
                    }}
                  />

                 {isSisyphusJunior && (
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
                       id={`agent-category-label-${id}`}
                       sx={{ fontSize: "0.75rem", lineHeight: "1.4375em" }}
                     >
                       Category
                     </InputLabel>
                     <Select
                       labelId={`agent-category-label-${id}`}
                       id={`agent-category-${id}`}
                       value={agent.category || ""}
                       onChange={handleCategoryChange}
                       data-testid={`agent-category-${id}`}
                       label="Category"
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
                       <MenuItem value="" sx={{ fontSize: "0.8rem", fontStyle: "normal" }}>None</MenuItem>
                       {(categoryIds ?? []).map((catId) => (
                         <MenuItem key={catId} value={catId} sx={{ fontSize: "0.8rem" }}>{catId}</MenuItem>
                       ))}
                     </Select>
                   </FormControl>
                 )}

                 {isSisyphus && (
                   <TextField
                     id={`agent-maxTokens-${id}`}
                     label="Max Tokens"
                     type="text"
                     size="small"
                     value={agent.maxTokens === undefined ? "" : String(agent.maxTokens)}
                     onChange={handleMaxTokensChange}
                      sx={compactNumberFieldSx}
                       slotProps={{
                         input: {
                           endAdornment: (
                             <NumberStepper
                               label="max tokens"
                               testId={`agent-maxTokens-${id}`}
                               onIncrement={() => stepMaxTokens(1)}
                               onDecrement={() => stepMaxTokens(-1)}
                             />
                           ),
                         },
                         htmlInput: {
                           inputMode: "numeric",
                           pattern: "[0-9]*",
                           "data-testid": `agent-maxTokens-${id}`,
                         },
                        inputLabel: { style: { fontSize: "0.75rem", lineHeight: "1.4375em" } },
                       }}
                     />
                 )}
               </Box>
            </Box>

            <Box>
              <TextField
                id={`agent-prompt-${id}`}
                label="Prompt Append"
                multiline
                minRows={1}
                maxRows={15}
                size="small"
                fullWidth
                value={agent.prompt_append || ""}
                onChange={handlePromptAppendChange}
                placeholder="Additional instructions..."
                slotProps={{
                  htmlInput: {
                    "data-testid": `agent-prompt-${id}`,
                  },
                  input: {
                    style: {
                      fontSize: "0.8rem",
                      fontFamily: MONO_FONT,
                    },
                  },
                  inputLabel: {
                    style: { fontSize: "0.75rem", lineHeight: "1.4375em" },
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    minHeight: "40px",
                    bgcolor: alpha(theme.palette.background.default, 0.3)
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
            </Box>

            <Box>
              <GroupedModelPicker
                   containerSx={{ height: "100%" }}
                groups={availableModelGroups ?? []}
                value={agent.fallback_models ?? []}
                multiple={true}
                onChange={handleFallbackPickerChange}
                label="Fallback Models"
                placeholder="None"
                testId={`agent-fallback-${id}`}
                accentColor={agentColor}
              />
            </Box>

            {isSisyphus && (
               <Box 
                sx={{ 
                  mt: 1, 
                  pt: 2, 
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  bgcolor: alpha(agentColor, 0.03),
                  mx: -2,
                  px: 2,
                  pb: 1.5,
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <AlertCircle style={{ width: 14, height: 14, color: theme.palette.warning.main }} />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontWeight: 700, 
                        textTransform: "uppercase", 
                        letterSpacing: "0.05em",
                        color: "text.secondary",
                        fontSize: "0.7rem"
                      }}
                    >
                      Ultrawork Capability
                    </Typography>
                  </Box>
                  {hasUltrawork ? (
                    <Tooltip title="Disable Ultrawork">
                      <IconButton
                        onClick={handleRemoveUltrawork}
                        size="small"
                        color="error"
                        sx={{
                          borderRadius: radii.control,
                          width: 26,
                          height: 26
                        }}
                      >
                        <X size={14} />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Enable Ultrawork">
                      <IconButton
                        onClick={handleAddUltrawork}
                        size="small"
                        sx={{
                          borderRadius: radii.control,
                          width: 26,
                          height: 26,
                          bgcolor: agentColor,
                          color: "white",
                          "&:hover": { bgcolor: alpha(agentColor, 0.85) }
                        }}
                      >
                        <Plus size={14} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                {hasUltrawork && (
                  <Stack 
                    spacing={1.5} 
                    sx={{ 
                      p: 1.5, 
                      borderRadius: 1, 
                      bgcolor: "background.paper",
                      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      boxShadow: "none"
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1.5fr 1fr" },
                        gap: 1,
                        alignItems: "start",
                      }}
                    >
                      <GroupedModelPicker
                        containerSx={{ height: "40px" }}
                        groups={availableModelGroups ?? []}
                        value={agent.ultrawork?.model ?? null}
                        multiple={false}
                        onChange={handleUltraworkModelPickerChange}
                        label="Ultrawork Model"
                        placeholder="None"
                        testId={`ultrawork-model-${id}`}
                        accentColor={agentColor}
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
                          id={`ultrawork-variant-label-${id}`}
                          sx={{ fontSize: "0.75rem", lineHeight: "1.4375em" }}
                        >
                          Variant
                        </InputLabel>
                        <Select
                          labelId={`ultrawork-variant-label-${id}`}
                          id={`ultrawork-variant-${id}`}
                          value={agent.ultrawork?.variant || ""}
                          onChange={handleUltraworkVariantChange}
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
                    </Box>

                    <TextField
                      id={`ultrawork-prompt-${id}`}
                      label="Ultrawork Prompt Append"
                      multiline
                      minRows={1}
                      maxRows={15}
                      size="small"
                      placeholder="Special instructions for Ultrawork mode..."
                      value={agent.ultrawork?.prompt_append || ""}
                      onChange={handleUltraworkPromptChange}
                      slotProps={{
                        input: { style: { fontSize: "0.8rem" } },
                        inputLabel: { style: { fontSize: "0.75rem", lineHeight: "1.4375em" } }
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          minHeight: "40px",
                          bgcolor: alpha(theme.palette.background.default, 0.3)
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
                )}
              </Box>
            )}
          </Stack>
        </CardContent>
      </Collapse>
    </Card>
  );
}

export const AgentCard = memo(AgentCardComponent);
