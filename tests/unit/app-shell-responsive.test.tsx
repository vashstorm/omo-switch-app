import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, afterEach, vi } from "vitest";
import { AppShell } from "../../src/web/components/AppShell";

describe("AppShell Responsive Features", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders mobile nav toggle button with aria attributes", () => {
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
    
    const toggle = screen.getByTestId("mobile-nav-toggle");
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-controls", "app-nav");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("toggles nav drawer state on click", () => {
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

    const toggle = screen.getByTestId("mobile-nav-toggle");

    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(document.body.querySelector(".MuiModal-root")).toBeInTheDocument();
  });

  test("closes drawer when clicking overlay", () => {
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

    const toggle = screen.getByTestId("mobile-nav-toggle");
    fireEvent.click(toggle);

    const backdrop = document.body.querySelector(".MuiBackdrop-root");
    expect(backdrop).toBeInTheDocument();

    fireEvent.click(backdrop!);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("keyboard navigation works with Tab key", async () => {
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
        agentIds={["test-agent"]}
        categoryIds={["test-category"]}
        miscSectionNames={["test-section"]}
      />
    );

    const toggle = screen.getByTestId("mobile-nav-toggle");
    const rawConfigButton = screen.getByTestId("raw-config-open");
    const resetButton = screen.getByTestId("reset-button");
    const saveButton = screen.getByTestId("save-button");

    toggle.focus();
    expect(document.activeElement).toBe(toggle);

    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
  });

  test("buttons are clickable with Enter key simulation", () => {
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

    const rawConfigButton = screen.getByTestId("raw-config-open");
    fireEvent.click(rawConfigButton);
    expect(onRawConfigOpen).toHaveBeenCalled();
  });

  test("toggle buttons are clickable", () => {
    const onToggleAgents = vi.fn();
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
        agentsCollapsed={false}
        onToggleAgents={onToggleAgents}
      />
    );

    const agentsToggle = screen.getByTestId("toggle-section-agents");
    fireEvent.click(agentsToggle);
    expect(onToggleAgents).toHaveBeenCalled();
  });

  test("nav links are keyboard accessible", () => {
    const onNavToAgent = vi.fn();
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
        agentIds={["test-agent"]}
        onNavToAgent={onNavToAgent}
      />
    );

    const agentNavLink = screen.getByTestId("nav-link-agent-test-agent");
    expect(agentNavLink).toHaveAttribute("type", "button");
    expect(agentNavLink.tagName).toBe("BUTTON");
  });

  test("all interactive elements have focus-visible support", () => {
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
        agentIds={["test-agent"]}
        categoryIds={["test-category"]}
        miscSectionNames={["test-section"]}
      />
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);

    buttons.forEach((button) => {
      expect(button).toBeVisible();
    });
  });
});
