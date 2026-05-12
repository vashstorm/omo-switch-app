import { useState, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { alpha } from "@mui/material/styles";
import JsonView from "react18-json-view";
import "react18-json-view/src/style.css";
import { ListTree, FileCode, X, ChevronDown, ChevronRight } from "lucide-react";
import { MONO_FONT } from "../../theme/typography";
import {
  filterJsonPreviewData,
  renderJsonWithLineNumbers,
  type FilterResult,
} from "./jsonPreviewUtils";

export interface JsonPreviewViewerProps {
  data: unknown;
  emptyText?: string;
  maxHeight?: string | number;
  compact?: boolean;
  defaultMode?: "tree" | "code";
  defaultCollapsedDepth?: number;
  allowLineNumbers?: boolean;
  searchPlaceholder?: string;
  dataTestId?: string;
  isDark?: boolean;
  tokens: {
    colors: {
      neutral: {
        background: string;
        surface: string;
        elevatedSurface: string;
        textPrimary: string;
        textSecondary: string;
        divider: string;
      };
      brand: {
        main: string;
      };
      accent: {
        teal: {
          main: string;
        };
      };
      status: {
        success: string;
        warning: string;
      };
    };
  };
}

export function JsonPreviewViewer({
  data,
  emptyText = "No data to display",
  maxHeight = "60vh",
  compact = false,
  defaultMode = "tree",
  defaultCollapsedDepth = 2,
  allowLineNumbers = true,
  searchPlaceholder = "Search keys or values...",
  dataTestId = "json-preview-viewer",
  isDark = false,
  tokens,
}: JsonPreviewViewerProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"tree" | "code">(defaultMode);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [collapsedDepth, setCollapsedDepth] = useState(defaultCollapsedDepth);

  const filterResult: FilterResult = useMemo(() => {
    return filterJsonPreviewData(data, query);
  }, [data, query]);

  const displayData = filterResult.data;
  const hasData = data !== null && data !== undefined && Object.keys(data as object).length > 0;

  const handleModeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newMode: "tree" | "code" | null) => {
      if (newMode !== null) {
        setMode(newMode);
      }
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setQuery("");
  }, []);

  const handleCollapseAll = useCallback(() => {
    setCollapsedDepth(0);
  }, []);

  const handleExpandAll = useCallback(() => {
    setCollapsedDepth(999);
  }, []);

  const lineNumbersData = useMemo(() => {
    return renderJsonWithLineNumbers(displayData);
  }, [displayData]);

  const jsonViewTheme = isDark
    ? {
        background: "transparent",
        string: "#7ee787",
        number: "#79c0ff",
        boolean: "#ff7b72",
        null: "#ff7b72",
        key: "#e6edf3",
        punctuation: "#8b949e",
      }
    : {
        background: "transparent",
        string: "#0f1a2b",
        number: "#0969da",
        boolean: "#cf222e",
        null: "#cf222e",
        key: "#0f1a2b",
        punctuation: "#6e7781",
      };

  if (!hasData) {
    return (
      <Box
        data-testid={dataTestId}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: compact ? 100 : 200,
          bgcolor: isDark
            ? alpha(tokens.colors.neutral.elevatedSurface, 0.6)
            : alpha(tokens.colors.neutral.background, 0.8),
          borderRadius: 2,
          border: `1px solid ${tokens.colors.neutral.divider}`,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: tokens.colors.neutral.textSecondary,
            fontStyle: "italic",
          }}
        >
          {emptyText}
        </Typography>
      </Box>
    );
  }

  return (
    <Box data-testid={dataTestId} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: compact ? "column" : "row",
          gap: 1.5,
          alignItems: compact ? "stretch" : "center",
          flexWrap: "wrap",
        }}
      >
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid={`${dataTestId}-search-input`}
          sx={{
            flex: compact ? undefined : 1,
            minWidth: compact ? undefined : 200,
            "& .MuiInputBase-root": {
              fontFamily: MONO_FONT,
              fontSize: "0.875rem",
            },
          }}
          InputProps={{
            endAdornment: query && (
              <IconButton size="small" onClick={handleClearSearch} edge="end">
                <X size={14} />
              </IconButton>
            ),
          }}
        />

        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          size="small"
          data-testid={`${dataTestId}-mode-toggle`}
        >
          <ToggleButton value="tree" aria-label="Tree view">
            <ListTree size={16} style={{ marginRight: 4 }} />
            Tree
          </ToggleButton>
          <ToggleButton value="code" aria-label="Code view">
            <FileCode size={16} style={{ marginRight: 4 }} />
            Code
          </ToggleButton>
        </ToggleButtonGroup>

        {mode === "code" && allowLineNumbers && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showLineNumbers}
                onChange={(e) => setShowLineNumbers(e.target.checked)}
                data-testid={`${dataTestId}-line-numbers-toggle`}
              />
            }
            label="Line numbers"
            sx={{
              "& .MuiFormControlLabel-label": {
                fontSize: "0.875rem",
                color: tokens.colors.neutral.textSecondary,
              },
            }}
          />
        )}

        {query && (
          <Typography
            variant="caption"
            sx={{
              color:
                filterResult.matchCount > 0
                  ? tokens.colors.status.success
                  : tokens.colors.status.warning,
              fontFamily: MONO_FONT,
            }}
            data-testid={`${dataTestId}-match-count`}
          >
            {filterResult.matchCount} match{filterResult.matchCount !== 1 ? "es" : ""}
          </Typography>
        )}

        {mode === "tree" && !compact && (
          <Box sx={{ display: "flex", gap: 0.5, ml: "auto" }}>
            <Tooltip title="Collapse all">
              <IconButton
                size="small"
                onClick={handleCollapseAll}
                data-testid={`${dataTestId}-collapse-all`}
              >
                <ChevronRight size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Expand all">
              <IconButton
                size="small"
                onClick={handleExpandAll}
                data-testid={`${dataTestId}-expand-all`}
              >
                <ChevronDown size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          bgcolor: isDark
            ? alpha(tokens.colors.neutral.elevatedSurface, 0.6)
            : alpha(tokens.colors.neutral.background, 0.8),
          borderRadius: 2,
          border: `1px solid ${tokens.colors.neutral.divider}`,
          overflow: "auto",
          maxHeight,
        }}
        data-testid={`${dataTestId}-content`}
      >
        {mode === "tree" ? (
          <Box sx={{ p: 2 }}>
            <JsonView
              src={displayData}
              theme={isDark ? "vscode" : "default"}
              collapsed={collapsedDepth}
              displaySize
              enableClipboard
              matchesURL={false}
              dark={isDark}
            />
          </Box>
        ) : (
          <Box sx={{ display: "flex" }}>
            {showLineNumbers && (
              <Box
                sx={{
                  py: 2,
                  pl: 2,
                  pr: 1.5,
                  borderRight: `1px solid ${tokens.colors.neutral.divider}`,
                  bgcolor: isDark
                    ? alpha(tokens.colors.neutral.surface, 0.5)
                    : alpha(tokens.colors.neutral.elevatedSurface, 0.5),
                  userSelect: "none",
                }}
              >
                {lineNumbersData.map(({ lineNumber }) => (
                  <Typography
                    key={`line-num-${lineNumber}`}
                    variant="caption"
                    sx={{
                      display: "block",
                      fontFamily: MONO_FONT,
                      fontSize: "0.75rem",
                      lineHeight: "1.6",
                      color: tokens.colors.neutral.textSecondary,
                      textAlign: "right",
                      minWidth: "2ch",
                    }}
                  >
                    {lineNumber}
                  </Typography>
                ))}
              </Box>
            )}

            <Box
              component="pre"
              sx={{
                flex: 1,
                m: 0,
                p: 2,
                fontFamily: MONO_FONT,
                fontSize: "0.8125rem",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: tokens.colors.neutral.textPrimary,
              }}
            >
              {lineNumbersData.map(({ content, lineNumber }) => (
                <span key={`line-${lineNumber}`}>
                  {content}
                  {lineNumber < lineNumbersData.length && "\n"}
                </span>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
