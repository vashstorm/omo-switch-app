import { describe, expect, test } from "vitest";
import { createMuiTheme } from "../../src/web/theme/muiTheme";

describe("MUI Theme Tokens", () => {
  test("creates light theme with correct palette", () => {
    const theme = createMuiTheme("light");

    expect(theme.palette.background.default).toBe("#faf9f5");
    expect(theme.palette.background.paper).toBe("#faf9f5");
    expect(theme.palette.text.primary).toBe("#141413");
    expect(theme.palette.text.secondary).toBe("#6c6a64");
    expect(theme.palette.primary.main).toBe("#cc785c");
    expect(theme.palette.error.main).toBe("#c64545");
    expect(theme.palette.success.main).toBe("#5db872");
    expect(theme.palette.warning.main).toBe("#d4a017");
  });

  test("creates dark theme with correct palette", () => {
    const theme = createMuiTheme("dark");

    expect(theme.palette.background.default).toBe("#181715");
    expect(theme.palette.background.paper).toBe("#1f1e1b");
    expect(theme.palette.text.primary).toBe("#faf9f5");
    expect(theme.palette.text.secondary).toBe("#a09d96");
    expect(theme.palette.primary.main).toBe("#cc785c");
    expect(theme.palette.error.main).toBe("#ff7a70");
    expect(theme.palette.success.main).toBe("#5db872");
    expect(theme.palette.warning.main).toBe("#e8a55a");
  });

  test("defines correct typography", () => {
    const theme = createMuiTheme("light");

    expect(theme.typography.fontFamily).toContain("Geist Sans");
    expect(theme.typography.h1?.fontFamily).toContain("Geist Sans");
    expect(theme.typography.fontSize).toBe(14);
    expect(theme.typography.h1?.fontSize).toBe("2rem");
    expect(theme.typography.h2?.fontSize).toBe("1.5rem");
    expect(theme.typography.button?.textTransform).toBe("none");
  });

  test("defines correct shape", () => {
    const theme = createMuiTheme("light");

    expect(theme.shape.borderRadius).toBe(8);
  });

  test("defines component overrides", () => {
    const theme = createMuiTheme("light");

    expect(theme.components?.MuiButton).toBeDefined();
    expect(theme.components?.MuiCard).toBeDefined();
    expect(theme.components?.MuiCssBaseline).toBeDefined();
  });
});
