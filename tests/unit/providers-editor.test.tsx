import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, afterEach } from "vitest";
import { ProvidersEditor } from "../../src/web/components/providers/ProvidersEditor";
import type { ProviderEntry } from "../../src/web/hooks/useProviders";

describe("ProvidersEditor", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const createMockProviders = (): ProviderEntry[] => [
    {
      name: "openai",
      models: [
        { name: "gpt-4", config: { maxTokens: 8192 } },
        { name: "gpt-3.5-turbo", config: { maxTokens: 4096 } },
      ],
    },
    {
      name: "anthropic",
      models: [
        { name: "claude-3-opus", config: { maxTokens: 4096 } },
      ],
    },
  ];

  const defaultMockProps = {
    providersList: createMockProviders(),
    loading: false,
    error: null,
    onCreateProvider: vi.fn(),
    onCreateModel: vi.fn(),
    onUpdateModel: vi.fn(),
    onDeleteModel: vi.fn(),
    onDeleteProvider: vi.fn(),
    onReload: vi.fn(),
  };

  const typeInField = (testId: string, value: string) => {
    const input = screen.getByTestId(testId);
    fireEvent.input(input, { target: { value } });
  };

  test("renders providers editor", () => {
    render(<ProvidersEditor {...defaultMockProps} />);
    expect(screen.getByTestId("providers-editor")).toBeInTheDocument();
  });

  test("renders provider sections sorted alphabetically", () => {
    render(<ProvidersEditor {...defaultMockProps} />);
    const anthropicSection = screen.getByTestId("provider-section-anthropic");
    const openaiSection = screen.getByTestId("provider-section-openai");
    expect(anthropicSection).toBeInTheDocument();
    expect(openaiSection).toBeInTheDocument();
  });

  test("shows loading state", () => {
    render(<ProvidersEditor {...defaultMockProps} providersList={[]} loading={true} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  test("shows error state", () => {
    render(<ProvidersEditor {...defaultMockProps} error="Failed to load providers" />);
    expect(screen.getByText("Failed to load providers")).toBeInTheDocument();
  });

  test("creates provider with valid name", async () => {
    const props = { ...defaultMockProps };
    render(<ProvidersEditor {...props} />);

    typeInField("provider-create-input", "my-provider");
    fireEvent.click(screen.getByTestId("provider-create-submit"));

    await waitFor(() => {
      expect(props.onCreateProvider).toHaveBeenCalledWith("my-provider");
    });
  });

  test("validates provider name - rejects empty", async () => {
    const props = { ...defaultMockProps };
    render(<ProvidersEditor {...props} />);

    const submit = screen.getByTestId("provider-create-submit");
    expect(submit).toBeDisabled();
  });

  test("validates provider name - rejects uppercase", async () => {
    const props = { ...defaultMockProps };
    render(<ProvidersEditor {...props} />);

    typeInField("provider-create-input", "My-Provider");
    fireEvent.click(screen.getByTestId("provider-create-submit"));

    await waitFor(() => {
      expect(props.onCreateProvider).not.toHaveBeenCalled();
    });
    expect(screen.getByText(/Invalid provider name/)).toBeInTheDocument();
  });

  test("creates model with valid name", async () => {
    const props = { ...defaultMockProps };
    render(<ProvidersEditor {...props} />);

    fireEvent.click(screen.getByTestId("toggle-provider-openai"));

    typeInField("model-create-input-openai", "gpt-4o");
    fireEvent.click(screen.getByTestId("model-create-submit-openai"));

    await waitFor(() => {
      expect(props.onCreateModel).toHaveBeenCalledWith("openai", {
        name: "gpt-4o",
      });
    });
  });

  test("validates model name - rejects name with slash", async () => {
    const props = { ...defaultMockProps };
    render(<ProvidersEditor {...props} />);

    fireEvent.click(screen.getByTestId("toggle-provider-openai"));

    typeInField("model-create-input-openai", "invalid/name");
    fireEvent.click(screen.getByTestId("model-create-submit-openai"));

    await waitFor(() => {
      expect(props.onCreateModel).not.toHaveBeenCalled();
    });
  });

  test("deletes model with confirmation", async () => {
    const props = { ...defaultMockProps };
    render(<ProvidersEditor {...props} />);

    fireEvent.click(screen.getByTestId("toggle-provider-openai"));

    fireEvent.click(screen.getByTestId("model-delete-openai-gpt-3.5-turbo"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-dialog-confirm")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => {
      expect(props.onDeleteModel).toHaveBeenCalledWith("openai", "gpt-3.5-turbo");
    });
  });

  test("deletes provider with confirmation", async () => {
    const props = { ...defaultMockProps };
    render(<ProvidersEditor {...props} />);

    fireEvent.click(screen.getByTestId("provider-delete-anthropic"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-dialog-confirm")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));

    await waitFor(() => {
      expect(props.onDeleteProvider).toHaveBeenCalledWith("anthropic");
    });
  });

  test("cancels delete on dialog cancel", async () => {
    const props = { ...defaultMockProps };
    render(<ProvidersEditor {...props} />);

    fireEvent.click(screen.getByTestId("provider-delete-anthropic"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-dialog-cancel")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirm-dialog-cancel"));

    await waitFor(() => {
      expect(props.onDeleteProvider).not.toHaveBeenCalled();
    });
  });
});
