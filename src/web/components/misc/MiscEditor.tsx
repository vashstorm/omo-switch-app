import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { 
  Card, Box, Typography, Collapse, 
  ButtonBase, Chip, Paper
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { ChevronRight, ChevronDown } from "lucide-react";
import { TRANSITIONS } from "../../theme/motionTokens";
import { radii } from "../../theme/designTokens";
import { MONO_FONT } from "../../theme/typography";

interface MiscEditorProps {
  miscData?: Record<string, unknown>;
  globalCollapseKey?: number;
  globalExpandKey?: number;
  expandTargetId?: string | null;
}

export function MiscEditor({ miscData, globalCollapseKey, globalExpandKey, expandTargetId }: MiscEditorProps) {
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

  const theme = useTheme();
  const miscColor = (theme as any).sectionColors?.misc ?? "#86868B";

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

  const renderPrimitiveValue = (sectionName: string, value: unknown): React.ReactNode => {
    const isBool = typeof value === "boolean";
    const isComplexValue = Array.isArray(value) || (typeof value === "object" && value !== null);

    return (
      <Box
        sx={{
          px: 2,
          py: isComplexValue ? 1.5 : 1,
          borderTop: "1px solid",
          borderColor: alpha(theme.palette.divider, 0.5),
          display: "flex",
          alignItems: isComplexValue ? "flex-start" : "center",
          gap: 2,
        }}
        data-testid={`misc-primitive-${sectionName}`}
      >
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontWeight: 500,
            color: "text.primary",
            minWidth: 120,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          value:
        </Typography>
        {isBool ? (
          renderBooleanValue(value as boolean)
        ) : (
          <Typography
            sx={{
              color: typeof value === "number" ? "text.primary" : "text.secondary",
              fontFamily: MONO_FONT,
              fontSize: "0.8rem",
              flex: 1,
              bgcolor: alpha(theme.palette.action.hover, 0.4),
              px: 1,
              py: 0.2,
              borderRadius: 1,
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
    const allPrimitives = value.every(v => typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null);

    return (
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: "1px solid",
          borderColor: alpha(theme.palette.divider, 0.5),
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
        data-testid={`misc-array-${sectionName}`}
      >
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontWeight: 500,
            color: "text.primary",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
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
              borderRadius: 1.5,
              px: 2,
              py: 1.5,
              bgcolor: alpha(theme.palette.background.default, 0.5),
            }}
          >
            <Typography
              component="pre"
              sx={{
                margin: 0,
                fontFamily: MONO_FONT,
                fontSize: "0.75rem",
                color: "text.secondary",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(value, null, 2)}
            </Typography>
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
        sx={{
          px: 2,
          py: isComplexValue ? 1.5 : 1,
          borderTop: rowIndex === 0 ? "none" : `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          display: "flex",
          alignItems: isComplexValue ? "flex-start" : "center",
          gap: 2,
          bgcolor: rowIndex % 2 === 0 ? "transparent" : alpha(miscColor, 0.02),
        }}
        data-testid={`misc-kv-${sectionName}-${fieldName}-readonly`}
      >
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontWeight: 500,
            color: "text.primary",
            minWidth: 160,
            fontSize: "0.75rem",
            letterSpacing: "0.02em",
            pt: isComplexValue ? 0.25 : 0,
          }}
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
                borderRadius: 1.5,
                px: 1.5,
                py: 1,
                bgcolor: alpha(theme.palette.background.default, 0.5),
              }}
            >
              <Typography
                component="pre"
                sx={{
                  margin: 0,
                  fontFamily: MONO_FONT,
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {JSON.stringify(value, null, 2)}
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    );
  };

  const renderField = (sectionName: string, fieldName: string, index: number): React.ReactNode => {
    const sectionData = getSectionData(sectionName);
    if (!sectionData) return null;
    const value = sectionData[fieldName];
    return renderReadonlyField(sectionName, fieldName, value, index);
  };

  const renderSectionContent = (sectionName: string): React.ReactNode => {
    const value = getSectionValue(sectionName);

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
        gap: 1,
        bgcolor: "background.paper",
        borderRadius: 3,
        p: 1.5,
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
              boxShadow: collapsed 
                ? "none" 
                : "0 2px 12px rgba(0, 0, 0, 0.06)",
              "&:hover": {
                boxShadow: collapsed 
                  ? "0 2px 8px rgba(0, 0, 0, 0.04)" 
                  : "0 4px 16px rgba(0, 0, 0, 0.08)",
              }
            }}
            data-testid={`misc-section-${sectionName}`}
            id={`misc-${sectionName}`}
          >
            <Box
              sx={{
                height: 2,
                bgcolor: collapsed ? "transparent" : miscColor,
                transition: TRANSITIONS.control,
                opacity: 0.85,
              }}
            />
            <Box
              sx={{
                py: 0.25,
                px: 1,
                bgcolor: collapsed ? "transparent" : alpha(miscColor, 0.02),
                display: "flex",
                alignItems: "center",
                gap: 0.5,
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
                  justifyContent: "flex-start",
                  borderRadius: 1.5,
                    p: "6px 8px",
                    "&:hover": { bgcolor: alpha(miscColor, 0.04) },
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
                    borderRadius: 1.5,
                    bgcolor: collapsed ? alpha(miscColor, 0.08) : miscColor,
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
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    fontFamily: MONO_FONT,
                    color: "text.primary",
                    letterSpacing: "-0.01em",
                    transition: TRANSITIONS.control,
                  }}
                >
                  {sectionName}
                </Typography>
              </ButtonBase>
            </Box>

            <Collapse in={!collapsed}>
               <Box 
                 id={`misc-body-${sectionName}`} 
                 sx={{ 
                    borderTop: `1px solid ${alpha(miscColor, 0.2)}`,
                   borderBottomLeftRadius: radii.card,
                   borderBottomRightRadius: radii.card,
                   bgcolor: alpha(miscColor, 0.01),
                 }}
               >
                 {renderSectionContent(sectionName)}
               </Box>
            </Collapse>
          </Card>
        );
      })}
    </Box>
  );
}
