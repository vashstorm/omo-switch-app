import React from "react";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, afterEach } from "vitest";

describe("ReadonlyTailPanel", () => {
  afterEach(() => {
    cleanup();
  });

  test("raw config open button triggers onRawConfigOpen callback", async () => {
    const { AppShell } = await import("../../src/web/components/AppShell");
    const onRawConfigOpen = vi.fn();

    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
        onRawConfigOpen={onRawConfigOpen}
      />
    );

    const rawButton = screen.getByTestId("raw-config-open");
    expect(rawButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(rawButton);
    });

    expect(onRawConfigOpen).toHaveBeenCalledTimes(1);
  });

  test("readonly-tail-panel element is not present in the page (moved to modal)", async () => {
    const { AppShell } = await import("../../src/web/components/AppShell");

    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
      />
    );

    expect(screen.queryByTestId("readonly-tail-panel")).not.toBeInTheDocument();
  });
});

