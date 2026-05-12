import { describe, expect, test } from "vitest";
import { createMuiTheme } from "../../src/web/theme/muiTheme";

describe("MUI Theme Tokens", () => {
  test("creates light theme with correct palette", () => {
    const theme = createMuiTheme("light");

    expect(theme.palette.background.default).toBe("#f5f5f7");
    expect(theme.palette.background.paper).toBe("#ffffff");
    expect(theme.palette.text.primary).toBe("#1d1d1f");
    expect(theme.palette.text.secondary).toBe("rgba(0, 0, 0, 0.8)");
    expect(theme.palette.primary.main).toBe("#0071e3");
    expect(theme.palette.error.main).toBe("#D86868");
    expect(theme.palette.success.main).toBe("#34A57E");
    expect(theme.palette.warning.main).toBe("#D49842");
  });

  test("creates dark theme with correct palette", () => {
    const theme = createMuiTheme("dark");

    expect(theme.palette.background.default).toBe("#000000");
    expect(theme.palette.background.paper).toBe("#1c1c1e");
    expect(theme.palette.text.primary).toBe("#f5f5f7");
    expect(theme.palette.text.secondary).toBe("rgba(255, 255, 255, 0.7)");
    expect(theme.palette.primary.main).toBe("#2997ff");
    expect(theme.palette.error.main).toBe("#FF453A");
    expect(theme.palette.success.main).toBe("#30D158");
    expect(theme.palette.warning.main).toBe("#FFD60A");
  });

  test("defines correct typography", () => {
    const theme = createMuiTheme("light");

    expect(theme.typography.fontFamily).toContain("SF Pro Text");
    expect(theme.typography.h1?.fontFamily).toContain("SF Pro Display");
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
