import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AgentCard } from "../../src/web/components/agents/AgentCard";
import RawConfigDialog from "../../src/web/components/common/RawConfigDialog";
import type { ProfileConfigResult } from "../../src/web/hooks/useProfile";
import { ThemeProvider } from "../../src/web/theme/ThemeContext";

const tokens = {
  colors: {
    neutral: {
      background: "#ffffff",
      elevatedSurface: "#f8f8f8",
      textPrimary: "#111111",
      textSecondary: "#666666",
      divider: "#dddddd",
    },
    status: {
      success: "#008000",
    },
  },
};

const profile: ProfileConfigResult = {
  baseline: { agents: {}, categories: {}, misc: {} },
  editable: { agents: {}, categories: {}, misc: {} },
  effective: {
    agents: { build: { model: "openai/gpt-5" } },
    categories: {},
    misc: {},
  },
  readonlyTail: { version: 1 },
  rawMisc: {},
  availableModels: [],
  availableModelGroups: [],
  disabledProviders: [],
  providerCatalog: [],
  mtime: 1,
  errors: [],
};

describe("performance optimizations", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("raw config text is not stringified while the dialog is closed", () => {
    const stringifySpy = vi.spyOn(JSON, "stringify");

    render(
      <ThemeProvider initialTheme="light">
        <RawConfigDialog
          open={false}
          onClose={() => {}}
          profile={profile}
          isDark={false}
          tokens={tokens}
          onCopyError={() => {}}
        />
      </ThemeProvider>,
    );

    expect(stringifySpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("raw-config-modal")).not.toBeInTheDocument();
  });

  test("collapsed agent cards unmount their form body", () => {
    render(
      <ThemeProvider initialTheme="light">
        <AgentCard
          id="build"
          agent={{ model: "openai/gpt-5", variant: "high", temperature: 0.5 }}
          availableModels={["openai/gpt-5"]}
          availableModelGroups={[]}
          onChange={() => {}}
          onDelete={() => {}}
          collapsed
          onToggleCollapse={() => {}}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("agent-card-build")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-variant-build")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-temperature-build")).not.toBeInTheDocument();
  });
});
