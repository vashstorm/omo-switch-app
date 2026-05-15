import { tokenizeJson, getRenderedTokens, jsonColorThemes } from "../../utils/jsonHighlighter";
import { MONO_FONT } from "../../theme/typography";

interface JsonCodeBlockProps {
  data: unknown;
  isDark?: boolean;
  fontSize?: string;
  dataTestId?: string;
}

export function JsonCodeBlock({
  data,
  isDark = false,
  fontSize = "0.75rem",
  dataTestId,
}: JsonCodeBlockProps) {
  const jsonString = JSON.stringify(data, null, 2);
  const tokens = tokenizeJson(jsonString);
  const theme = isDark ? jsonColorThemes.dark : jsonColorThemes.light;
  const renderedTokens = getRenderedTokens(tokens, theme);

  return (
    <pre
      data-testid={dataTestId}
      style={{
        margin: 0,
        fontFamily: MONO_FONT,
        fontSize,
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {renderedTokens.map((token, i) => (
        <span key={i} style={{ color: token.color }}>
          {token.value}
        </span>
      ))}
    </pre>
  );
}
