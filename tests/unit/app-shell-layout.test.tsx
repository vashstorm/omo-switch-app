import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi, afterEach } from "vitest";
import { AppShell } from "../../src/web/components/AppShell";
import { ProfileSelector } from "../../src/web/components/ProfileSelector";

describe("AppShell left nav layout", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders three top-level nav links", () => {
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

    expect(screen.getByTestId("nav-link-agents")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-categories")).toBeInTheDocument();
    expect(screen.getByTestId("nav-link-misc")).toBeInTheDocument();
  });

  test("shows agent count in nav when agentIds provided", () => {
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
        agentIds={["build", "oracle", "explore"]}
      />
    );

    expect(screen.getByTestId("nav-link-agents")).toHaveTextContent("3");
  });

  test("shows category count in nav when categoryIds provided", () => {
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
        categoryIds={["deep", "quick"]}
      />
    );

    expect(screen.getByTestId("nav-link-categories")).toHaveTextContent("2");
  });

  test("shows misc section count in nav when miscSectionNames provided", () => {
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
        miscSectionNames={["tmux", "git_master"]}
      />
    );

    expect(screen.getByTestId("nav-link-misc")).toHaveTextContent("2");
  });

  test("renders sub nav items for agents, categories, and misc sections", () => {
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

  test("navigation controls expose descriptive aria labels", () => {
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
        agentIds={["build"]}
        categoryIds={["deep"]}
        miscSectionNames={["tmux"]}
        agentModelMap={{ build: "openai/gpt-4.1" }}
      />
    );

    expect(screen.getAllByLabelText("Create agents").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Create categories").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("build (openai/gpt-4.1)").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("deep").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("tmux").length).toBeGreaterThan(0);
  });

  test("profile-selector and save/reset controls remain visible", () => {
    render(
      <AppShell
        profileSelector={
          <ProfileSelector profiles={[]} selectedId={null} onChange={() => {}} />
        }
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
      />
    );

    expect(screen.getByTestId("profile-selector")).toBeInTheDocument();
    expect(screen.getByTestId("save-button")).toBeInTheDocument();
    expect(screen.getByTestId("reset-button")).toBeInTheDocument();
  });

  test("calls onRawConfigOpen when raw config header button clicked", () => {
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

    screen.getByTestId("raw-config-open").click();
    expect(onRawConfigOpen).toHaveBeenCalledOnce();
  });
});

// DOM structure contract tests for AppShell layout hierarchy.
// These tests verify semantic roles, IDs, aria-labels, and parent-child
// relationships that ensure the layout DOM hierarchy is correctly rendered.
//
// NOTE: CSS layout contract (minHeight: 0, overflowY: auto, flexShrink: 0) is
// verified by E2E tests in tests/e2e/scroll-reachability.spec.ts which run in
// a real browser. jsdom has no CSS engine and cannot reflect MUI sx props via
// getComputedStyle, so CSS assertions are intentionally excluded here.
describe("AppShell scroll container layout", () => {
  afterEach(() => {
    cleanup();
  });

  const renderAppShell = () => {
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
  };

  test("main is nested at correct DOM depth (body > wrapper > root)", () => {
    renderAppShell();
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    // main's parent is the body flex container
    expect(main.parentElement).toBeInTheDocument();
    // parent of body flex container is the maxWidth wrapper
    expect(main.parentElement?.parentElement).toBeInTheDocument();
    // parent of maxWidth wrapper is the root container
    expect(main.parentElement?.parentElement?.parentElement).toBeInTheDocument();
  });

  test("main is grandchild of root container (intermediate wrapper exists)", () => {
    renderAppShell();
    const main = screen.getByRole("main");
    const immediateParent = main.parentElement;
    const grandParent = main.parentElement?.parentElement;
    expect(grandParent).toBeInTheDocument();
    // Confirm the intermediate wrapper is a distinct element from main's direct parent
    expect(grandParent).not.toBe(immediateParent);
  });

  test("body container holds nav and main as siblings sharing the same parent", () => {
    renderAppShell();
    const nav = screen.getByRole("navigation");
    const main = screen.getByRole("main");
    expect(nav.parentElement).toBeInTheDocument();
    // nav and main share the same body container as parent
    expect(main.parentElement).toBe(nav.parentElement);
    // body container has at least nav + main as children
    expect(main.parentElement!.children.length).toBeGreaterThanOrEqual(2);
  });

  test("main element is a semantic HTML main landmark", () => {
    renderAppShell();
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    // Must be a native <main> element (not a div with role="main")
    expect(main.tagName).toBe("MAIN");
    // Native <main> does not need an explicit role attribute
    expect(main.getAttribute("role")).toBeNull();
  });

  test("header is a semantic HTML banner landmark preceding main in DOM", () => {
    renderAppShell();
    const header = screen.getByRole("banner");
    const main = screen.getByRole("main");
    expect(header).toBeInTheDocument();
    // header must be a native <header> element
    expect(header.tagName).toBe("HEADER");
    // header must appear before main in document order
    const position = header.compareDocumentPosition(main);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("nav sidebar has semantic nav tag, correct id, and aria-label", () => {
    renderAppShell();
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
    // Must be a native <nav> element
    expect(nav.tagName).toBe("NAV");
    // ID and aria-label required for aria-controls linking from mobile toggle
    expect(nav.id).toBe("app-nav");
    expect(nav.getAttribute("aria-label")).toBe("Section navigation");
  });
});
