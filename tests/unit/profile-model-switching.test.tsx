import { render, screen, cleanup, waitFor, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

import { groupModelsByProvider } from "../../src/shared/model-catalog";
import { App } from "../../src/web/index";
import { ThemeProvider } from "../../src/web/theme/ThemeContext";

vi.mock("../../src/web/api/client", () => ({
  listProfiles: vi.fn(),
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  copyProfile: vi.fn(),
  updateDisabledProviders: vi.fn(),
  getGlobalConfig: vi.fn(),
  updateGlobalConfig: vi.fn(),
  getErrorLogs: vi.fn(),
}));

import { listProfiles, getProfile, getGlobalConfig, getErrorLogs } from "../../src/web/api/client";

const mockListProfiles = vi.mocked(listProfiles);
const mockGetProfile = vi.mocked(getProfile);
const mockGetGlobalConfig = vi.mocked(getGlobalConfig);
const mockGetErrorLogs = vi.mocked(getErrorLogs);

function buildProfileDetail(model: string, availableModels: string[], mtime: number) {
  return {
    baseline: {
      agents: {
        planner: { model },
      },
      categories: {},
      misc: {},
    },
    editable: {
      agents: {
        planner: { model },
      },
      categories: {},
      misc: {},
    },
    effective: {
      agents: {
        planner: { model },
      },
      categories: {},
      misc: {},
    },
    readonlyTail: {},
    rawMisc: {},
    mtime,
    errors: [],
    availableModels,
    availableModelGroups: groupModelsByProvider(availableModels),
    disabledProviders: [],
    providerCatalog: [],
  };
}

function setupProfileSwitchMock() {
  let resolveProfileB: (() => void) | null = null;

  const profileBPromise = new Promise<void>((resolve) => {
    resolveProfileB = resolve;
  });

  mockListProfiles.mockResolvedValue({
    profiles: [
      { id: "profile-a", label: "Profile A" },
      { id: "profile-b", label: "Profile B" },
    ],
  });

  mockGetProfile.mockImplementation((id: string) => {
    if (id === "profile-a") {
      return Promise.resolve(
        buildProfileDetail(
          "profile-a/model-a",
          ["global/model-global", "profile-a/model-a"],
          1000,
        ),
      );
    }
    if (id === "profile-b") {
      return profileBPromise.then(() =>
        buildProfileDetail(
          "profile-b/model-b",
          ["global/model-global", "profile-b/model-b"],
          2000,
        ),
      );
    }
    return Promise.reject(new Error(`Unexpected profile: ${id}`));
  });

  mockGetGlobalConfig.mockResolvedValue({ syncReplaceEnabled: false, appZoomPercent: 100, defaultProfile: null });
  mockGetErrorLogs.mockResolvedValue({ entries: [], sourceFile: "", truncated: false });

  return {
    resolveProfileB: () => {
      if (!resolveProfileB) {
        throw new Error("Profile B resolver is not initialized");
      }
      resolveProfileB();
    },
  };
}

describe("Profile model dropdown switching", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("clears Profile A models before loading Profile B models", async () => {
    const { resolveProfileB } = setupProfileSwitchMock();

    render(
      <ThemeProvider initialTheme="light">
        <App />
      </ThemeProvider>,
    );

    await screen.findByTestId("agent-editor");

    expect(screen.getByTestId("agent-model-planner")).toHaveTextContent("model-a");

    const profileSelector = within(screen.getByTestId("profile-selector")).getByRole("combobox");
    fireEvent.mouseDown(profileSelector);
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("option", { name: "Profile B" }));

    await waitFor(() => {
      expect(screen.queryByTestId("agent-editor")).not.toBeInTheDocument();
      expect(screen.getByTestId("loading-agents")).toBeInTheDocument();
    });

    resolveProfileB();

    await screen.findByTestId("agent-editor");

    const modelSelectAfterSwitch = screen.getByTestId("agent-model-planner");
    expect(modelSelectAfterSwitch).toHaveTextContent("model-b");
    expect(modelSelectAfterSwitch).not.toHaveTextContent("model-a");
  });
});
