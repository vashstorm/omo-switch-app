import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, afterEach } from "vitest";
import { AppShell } from "../../src/web/components/AppShell";
import { ProfileSelector } from "../../src/web/components/ProfileSelector";

describe("AppShell Layout", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders all required data-testid containers", () => {
    const onSave = vi.fn();
    const onReset = vi.fn();

    render(
      <AppShell
        profileSelector={
          <ProfileSelector profiles={[]} selectedId={null} onChange={() => {}} />
        }
        loading={false}
        error={null}
        isDirty={false}
        onSave={onSave}
        onReset={onReset}
      />
    );

    expect(screen.getByTestId("profile-selector")).toBeInTheDocument();
    expect(screen.getByTestId("save-button")).toBeInTheDocument();
    expect(screen.getByTestId("reset-button")).toBeInTheDocument();
    expect(screen.getByTestId("agents-section")).toBeInTheDocument();
    expect(screen.getByTestId("categories-section")).toBeInTheDocument();
    expect(screen.getByTestId("misc-section")).toBeInTheDocument();
    expect(screen.queryByTestId("status-bar")).not.toBeInTheDocument();
    expect(screen.getByTestId("nav-link-agents")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-categories")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-misc")).toBeInTheDocument();
    expect(screen.queryByTestId("readonly-tail-panel")).not.toBeInTheDocument();
  });

  test("shows unsaved warning only when dirty", () => {
    const { rerender } = render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
      />
    );

    expect(screen.queryByTestId("unsaved-warning")).not.toBeInTheDocument();

    rerender(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={true}
        onSave={() => {}}
        onReset={() => {}}
      />
    );

    expect(screen.getByTestId("unsaved-warning")).toBeInTheDocument();
  });

  test("disables buttons when loading or not dirty", () => {
    const { rerender } = render(
      <AppShell
        profileSelector={<div />}
        loading={true}
        error={null}
        isDirty={true}
        onSave={() => {}}
        onReset={() => {}}
      />
    );

    expect(screen.getByTestId("save-button")).toBeDisabled();
    expect(screen.getByTestId("reset-button")).toBeDisabled();

    rerender(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
      />
    );

    expect(screen.getByTestId("save-button")).toBeDisabled();
    expect(screen.getByTestId("reset-button")).toBeDisabled();

    rerender(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={true}
        onSave={() => {}}
        onReset={() => {}}
      />
    );

    expect(screen.getByTestId("save-button")).not.toBeDisabled();
    expect(screen.getByTestId("reset-button")).not.toBeDisabled();
  });

  test("renders nav sub-items for provided agent/category IDs", () => {
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
        agentIds={["build", "oracle"]}
        categoryIds={["deep", "quick"]}
        miscSectionNames={["tmux"]}
      />
    );

    expect(screen.getByTestId("nav-link-agent-build")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-agent-oracle")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-category-deep")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-category-quick")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-misc-tmux")).toBeInTheDocument();
  });
});

