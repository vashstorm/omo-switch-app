import { useCallback, useEffect, useRef } from "react";
import Editor from "react-simple-code-editor";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { tokenizeJson, getRenderedTokens, jsonColorThemes } from "../../utils/jsonHighlighter";
import { MONO_FONT } from "../../theme/typography";
import { radii } from "../../theme/designTokens";

interface JsonCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  isDark?: boolean;
  fontSize?: string;
  minRows?: number;
  error?: boolean;
  helperText?: string;
  dataTestId?: string;
  focusColor?: string;
}

export function JsonCodeEditor({
  value,
  onChange,
  onBlur,
  isDark = false,
  fontSize = "0.8rem",
  minRows = 3,
  error = false,
  helperText,
  dataTestId,
  focusColor,
}: JsonCodeEditorProps) {
  const theme = useTheme();
  const activeFocusColor = focusColor ?? theme.palette.primary.main;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dataTestId && containerRef.current) {
      const textarea = containerRef.current.querySelector("textarea");
      if (textarea) {
        textarea.setAttribute("data-testid", dataTestId);
      }
    }
  }, [dataTestId]);

  const highlight = useCallback(
    (code: string) => {
      const tokens = tokenizeJson(code);
      const colorTheme = isDark ? jsonColorThemes.dark : jsonColorThemes.light;
      const rendered = getRenderedTokens(tokens, colorTheme);
      return rendered.map((token, i) => (
        <span key={i} style={{ color: token.color }}>
          {token.value}
        </span>
      ));
    },
    [isDark]
  );

  return (
    <Box sx={{ width: "100%" }} ref={containerRef}>
      <Box
        sx={{
          border: `1px solid ${
            error
              ? theme.palette.error.main
              : alpha(theme.palette.divider, 0.5)
          }`,
          borderRadius: `${radii.control}px`,
          bgcolor: isDark
            ? alpha(theme.palette.common.white, 0.02)
            : alpha(theme.palette.background.default, 0.5),
          transition: "border-color 0.2s",
          "&:hover": {
            borderColor: error
              ? theme.palette.error.main
              : alpha(activeFocusColor, 0.32),
          },
          "&:focus-within": {
            borderColor: error ? theme.palette.error.main : activeFocusColor,
            borderWidth: 1,
          },
        }}
      >
        <Editor
          value={value}
          onValueChange={onChange}
          onBlur={onBlur ? () => onBlur() : undefined}
          highlight={highlight}
          padding={12}
          style={{
            fontFamily: MONO_FONT,
            fontSize,
            lineHeight: 1.6,
            minHeight: `${minRows * 1.6 * 16 * parseFloat(fontSize)}px`,
          }}
          textareaClassName="json-code-editor-textarea"
        />
      </Box>
      {helperText !== undefined && (
        <Typography
          variant="caption"
          sx={{
            color: error ? theme.palette.error.main : "text.secondary",
            ml: 0,
            minHeight: 18,
            fontSize: "0.75rem",
            mt: 0.5,
            display: "block",
          }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
