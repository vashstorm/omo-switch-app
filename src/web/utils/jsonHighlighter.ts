export type JsonTokenType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "key"
  | "punctuation"
  | "whitespace";

export interface JsonToken {
  type: JsonTokenType;
  value: string;
}

const WHITESPACE_RE = /^\s+/;
const STRING_RE = /^"(?:\\.|[^"\\])*"/;
const NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const PUNCTUATION_RE = /^[{}[\]:,]/;
const LITERAL_RE = /^(?:true|false|null)\b/;

export function tokenizeJson(input: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let pos = 0;

  while (pos < input.length) {
    const remaining = input.slice(pos);
    let match: RegExpMatchArray | null = null;
    let type: JsonTokenType = "string";

    if ((match = remaining.match(WHITESPACE_RE))) {
      type = "whitespace";
    } else if ((match = remaining.match(STRING_RE))) {
      type = "string";
    } else if ((match = remaining.match(NUMBER_RE))) {
      type = "number";
    } else if ((match = remaining.match(PUNCTUATION_RE))) {
      type = "punctuation";
    } else if ((match = remaining.match(LITERAL_RE))) {
      const val = match[0];
      type = val === "null" ? "null" : "boolean";
    } else {
      tokens.push({ type: "string", value: remaining[0] });
      pos++;
      continue;
    }

    tokens.push({ type, value: match[0] });
    pos += match[0].length;
  }

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "string") continue;

    let nextIdx = i + 1;
    while (nextIdx < tokens.length && tokens[nextIdx].type === "whitespace") {
      nextIdx++;
    }

    let prevIdx = i - 1;
    while (prevIdx >= 0 && tokens[prevIdx].type === "whitespace") {
      prevIdx--;
    }

    if (
      nextIdx < tokens.length &&
      tokens[nextIdx].type === "punctuation" &&
      tokens[nextIdx].value === ":" &&
      prevIdx >= 0 &&
      tokens[prevIdx].type === "punctuation" &&
      (tokens[prevIdx].value === "{" || tokens[prevIdx].value === ",")
    ) {
      tokens[i].type = "key";
    }
  }

  return tokens;
}

export interface JsonColorTheme {
  string: string;
  number: string;
  boolean: string;
  null: string;
  key: string;
  punctuation: string;
}

export const jsonColorThemes = {
  dark: {
    string: "#7ee787",
    number: "#79c0ff",
    boolean: "#ff7b72",
    null: "#ff7b72",
    key: "#e6edf3",
    punctuation: "#8b949e",
  },
  light: {
    string: "#0f1a2b",
    number: "#0969da",
    boolean: "#cf222e",
    null: "#cf222e",
    key: "#0f1a2b",
    punctuation: "#6e7781",
  },
};

export interface RenderedToken {
  type: JsonTokenType;
  value: string;
  color: string;
}

export function getRenderedTokens(
  tokens: JsonToken[],
  theme: JsonColorTheme
): RenderedToken[] {
  return tokens.map((token) => ({
    type: token.type,
    value: token.value,
    color: token.type === "whitespace" ? "inherit" : theme[token.type],
  }));
}
