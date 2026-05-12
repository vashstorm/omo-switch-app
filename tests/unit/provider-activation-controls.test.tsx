import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, afterEach } from "vitest";
import { ProviderActivationMenu } from "../../src/web/components/providers/ProviderActivationMenu";

describe("ProviderActivationMenu", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test("renders provider catalog items excluding None", async () => {
    const mockUpdate = vi.fn();
    const providerCatalog = ["openai", "anthropic", "None", "google"];
    const disabledProviders: string[] = [];

    render(
      <ProviderActivationMenu
        providerCatalog={providerCatalog}
        disabledProviders={disabledProviders}
        profileId="test-profile"
        updateDisabledProviders={mockUpdate}
      />
    );

    const button = screen.getByTestId("provider-activation-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("provider-activation-item-openai")).toBeInTheDocument();
      expect(screen.getByTestId("provider-activation-item-anthropic")).toBeInTheDocument();
      expect(screen.getByTestId("provider-activation-item-google")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("provider-activation-item-None")).not.toBeInTheDocument();
    expect(screen.queryByTestId("provider-activation-item-none")).not.toBeInTheDocument();
  });

  test("shows correct enabled/disabled state", async () => {
    const mockUpdate = vi.fn();
    const providerCatalog = ["openai", "anthropic", "google"];
    const disabledProviders = ["anthropic"];

    render(
      <ProviderActivationMenu
        providerCatalog={providerCatalog}
        disabledProviders={disabledProviders}
        profileId="test-profile"
        updateDisabledProviders={mockUpdate}
      />
    );

    const button = screen.getByTestId("provider-activation-button");
    fireEvent.click(button);

    await waitFor(() => {
      const switches = screen.getAllByRole("switch");
      expect(switches).toHaveLength(3);
    });

    const switches = screen.getAllByRole("switch");
    // Providers are sorted alphabetically: anthropic, google, openai
    expect(switches[0]).not.toBeChecked(); // anthropic (disabled)
    expect(switches[1]).toBeChecked(); // google (enabled)
    expect(switches[2]).toBeChecked(); // openai (enabled)
  });

  test("calls updateDisabledProviders on toggle to disable", async () => {
    const mockUpdate = vi.fn();
    const providerCatalog = ["openai", "anthropic", "google"];
    const disabledProviders: string[] = [];

    render(
      <ProviderActivationMenu
        providerCatalog={providerCatalog}
        disabledProviders={disabledProviders}
        profileId="test-profile"
        updateDisabledProviders={mockUpdate}
      />
    );

    const button = screen.getByTestId("provider-activation-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("provider-activation-item-openai")).toBeInTheDocument();
    });

    const switches = screen.getAllByRole("switch");
    // Providers are sorted: anthropic, google, openai
    expect(switches[0]).toBeChecked(); // anthropic (enabled)

    fireEvent.click(switches[0]);

    expect(mockUpdate).toHaveBeenCalledWith("test-profile", ["anthropic"]);
  });

  test("calls updateDisabledProviders on toggle to re-enable", async () => {
    const mockUpdate = vi.fn();
    const providerCatalog = ["openai", "anthropic", "google"];
    const disabledProviders = ["openai", "anthropic"];

    render(
      <ProviderActivationMenu
        providerCatalog={providerCatalog}
        disabledProviders={disabledProviders}
        profileId="test-profile"
        updateDisabledProviders={mockUpdate}
      />
    );

    const button = screen.getByTestId("provider-activation-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("provider-activation-item-openai")).toBeInTheDocument();
    });

    const switches = screen.getAllByRole("switch");
    // Providers are sorted: anthropic, google, openai
    expect(switches[0]).not.toBeChecked(); // anthropic (disabled)

    fireEvent.click(switches[0]);

    // Re-enable anthropic -> remove from disabled list, leaving only openai
    expect(mockUpdate).toHaveBeenCalledWith("test-profile", ["openai"]);
  });

  test("excludes None provider case-insensitively", async () => {
    const mockUpdate = vi.fn();
    const providerCatalog = ["openai", "NONE", "none", "None", "google"];
    const disabledProviders: string[] = [];

    render(
      <ProviderActivationMenu
        providerCatalog={providerCatalog}
        disabledProviders={disabledProviders}
        profileId="test-profile"
        updateDisabledProviders={mockUpdate}
      />
    );

    const button = screen.getByTestId("provider-activation-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("provider-activation-item-openai")).toBeInTheDocument();
      expect(screen.getByTestId("provider-activation-item-google")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("provider-activation-item-NONE")).not.toBeInTheDocument();
    expect(screen.queryByTestId("provider-activation-item-none")).not.toBeInTheDocument();
    expect(screen.queryByTestId("provider-activation-item-None")).not.toBeInTheDocument();

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(2);
  });

  test("empty catalog renders nothing", async () => {
    const mockUpdate = vi.fn();
    const providerCatalog: string[] = [];
    const disabledProviders: string[] = [];

    render(
      <ProviderActivationMenu
        providerCatalog={providerCatalog}
        disabledProviders={disabledProviders}
        profileId="test-profile"
        updateDisabledProviders={mockUpdate}
      />
    );

    const button = screen.getByTestId("provider-activation-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Providers")).toBeInTheDocument();
    });

    expect(screen.queryByTestId(/provider-activation-item-/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
  });

  test("popover opens on button click", async () => {
    const mockUpdate = vi.fn();
    const providerCatalog = ["openai", "anthropic"];
    const disabledProviders: string[] = [];

    render(
      <ProviderActivationMenu
        providerCatalog={providerCatalog}
        disabledProviders={disabledProviders}
        profileId="test-profile"
        updateDisabledProviders={mockUpdate}
      />
    );

    expect(screen.queryByText("Providers")).not.toBeInTheDocument();

    const button = screen.getByTestId("provider-activation-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Providers")).toBeInTheDocument();
    });
  });
});
