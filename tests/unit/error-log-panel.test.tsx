import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { ErrorLogPanel } from "../../src/web/components/common/ErrorLogPanel";
import type { ErrorLogEntry } from "../../src/web/error-log/types";

const lightTheme = createTheme({
  palette: { mode: "light" },
  typography: { fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" },
});

function renderWithTheme(
  ui: React.ReactElement
) {
  return render(
    <ThemeProvider theme={lightTheme}>
      {ui}
    </ThemeProvider>
  );
}

const mockEntries: ErrorLogEntry[] = [
  {
    id: "entry-1",
    source: "frontend-runtime",
    message: "TypeError: Cannot read property 'foo' of undefined",
    detail: "TypeError: Cannot read property 'foo' of undefined\n    at App.tsx:42:15\n    at renderComponent (react-dom.js:123:45)",
    timestamp: Date.now() - 120000,
    module: null,
    occurrences: 1,
  },
  {
    id: "entry-2",
    source: "frontend-request",
    message: "Network error: Failed to fetch /api/users",
    detail: "FetchError: network timeout at /api/users",
    timestamp: Date.now() - 300000,
    module: null,
    occurrences: 3,
  },
  {
    id: "entry-3",
    source: "backend-log",
    message: "Database connection timeout after 30s",
    detail: "TimeoutError: connection pool exhausted",
    timestamp: Date.now() - 600000,
    module: "db-connector",
    occurrences: 1,
  },
  {
    id: "entry-4",
    source: "frontend-startup",
    message: "Failed to initialize feature flag service",
    detail: null,
    timestamp: Date.now() - 1800000,
    module: null,
    occurrences: 1,
  },
];

describe("ErrorLogPanel", () => {
  describe("Collapsed state", () => {
    it("does not render toggle when there are no entries", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={[]}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={false}
        />
      );

      expect(screen.queryByTestId("error-log-toggle")).not.toBeInTheDocument();
    });

    it("shows unread count badge when hasUnread is true", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={true}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={false}
        />
      );

      const toggle = screen.getByTestId("error-log-toggle");
      expect(toggle).toBeInTheDocument();
      expect(toggle.textContent).toContain("4");
    });

    it("does not show unread badge when hasUnread is false", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={false}
        />
      );

      expect(screen.getByTestId("error-log-toggle")).toBeInTheDocument();
    });

    it("calls onToggle and onMarkSeen when clicked with unread", () => {
      const onToggle = vi.fn();
      const onMarkSeen = vi.fn();

      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={true}
          onRefresh={vi.fn()}
          onMarkSeen={onMarkSeen}
          onToggle={onToggle}
          isExpanded={false}
        />
      );

      fireEvent.click(screen.getByTestId("error-log-toggle"));
      expect(onToggle).toHaveBeenCalled();
      expect(onMarkSeen).toHaveBeenCalled();
    });

    it("calls only onToggle when clicked without unread", () => {
      const onToggle = vi.fn();
      const onMarkSeen = vi.fn();

      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={onMarkSeen}
          onToggle={onToggle}
          isExpanded={false}
        />
      );

      fireEvent.click(screen.getByTestId("error-log-toggle"));
      expect(onToggle).toHaveBeenCalled();
      expect(onMarkSeen).not.toHaveBeenCalled();
    });
  });

  describe("Expanded state", () => {
    it("renders panel with entries", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      expect(screen.getByTestId("error-log-panel")).toBeInTheDocument();
      expect(screen.getByText("Error Log")).toBeInTheDocument();
    });

    it("renders source badges for each entry", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      expect(screen.getByText("Runtime")).toBeInTheDocument();
      expect(screen.getByText("Request")).toBeInTheDocument();
      expect(screen.getByText("Backend")).toBeInTheDocument();
      expect(screen.getByText("Startup")).toBeInTheDocument();
    });

    it("renders each entry with correct data-testid", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      const entries = screen.getAllByTestId(/error-log-entry-\d+/);
      expect(entries).toHaveLength(4);
    });

    it("shows message for each entry", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      const entry0 = screen.getAllByTestId("error-log-entry-0")[0];
      expect(within(entry0).getByText("TypeError: Cannot read property 'foo' of undefined")).toBeInTheDocument();

      const entry1 = screen.getAllByTestId("error-log-entry-1")[0];
      expect(within(entry1).getByText(/Failed to fetch \/api\/users/)).toBeInTheDocument();

      const entry2 = screen.getAllByTestId("error-log-entry-2")[0];
      expect(within(entry2).getByText("Database connection timeout after 30s")).toBeInTheDocument();

      const entry3 = screen.getAllByTestId("error-log-entry-3")[0];
      expect(within(entry3).getByText("Failed to initialize feature flag service")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("renders nothing when no entries", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={[]}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      expect(screen.queryByTestId("error-log-panel")).not.toBeInTheDocument();
      expect(screen.queryByTestId("error-log-empty")).not.toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("renders error state with readError message", () => {
      const errorMsg = "Failed to read log file: Permission denied";
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={errorMsg}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      expect(screen.getByTestId("error-log-error-state")).toBeInTheDocument();
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });

    it("renders refresh button in error state", () => {
      const onRefresh = vi.fn();
      renderWithTheme(
        <ErrorLogPanel
          entries={[]}
          loading={false}
          readError="Some error"
          hasUnread={false}
          onRefresh={onRefresh}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      const refreshButton = screen.getByTestId("error-log-refresh");
      expect(refreshButton).toBeInTheDocument();
      fireEvent.click(refreshButton);
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe("Occurrences display", () => {
    it("shows occurrence count when greater than 1", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      expect(screen.getByText("x3")).toBeInTheDocument();
    });

    it("does not show occurrence count when equal to 1", () => {
      const singleEntries: ErrorLogEntry[] = [
        {
          id: "single-1",
          source: "frontend-runtime",
          message: "Single error",
          detail: null,
          timestamp: Date.now() - 60000,
          module: null,
          occurrences: 1,
        },
      ];

      renderWithTheme(
        <ErrorLogPanel
          entries={singleEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      expect(screen.queryByText("x1")).not.toBeInTheDocument();
    });
  });

  describe("Detail/stack expandable section", () => {
    it("expands detail section when clicked", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      const firstEntry = screen.getAllByTestId("error-log-entry-0")[0];
      const showDetailsButton = within(firstEntry).getByText("Show details");
      expect(showDetailsButton).toBeInTheDocument();

      fireEvent.click(showDetailsButton);

      expect(within(firstEntry).getByText("Hide details")).toBeInTheDocument();
      expect(
        within(firstEntry).getByText(/at App\.tsx:42:15/)
      ).toBeInTheDocument();
    });

    it("collapses detail section when clicked again", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      const firstEntry = screen.getAllByTestId("error-log-entry-0")[0];

      fireEvent.click(within(firstEntry).getByText("Show details"));
      expect(within(firstEntry).getByText("Hide details")).toBeInTheDocument();

      fireEvent.click(within(firstEntry).getByText("Hide details"));
      expect(within(firstEntry).getByText("Show details")).toBeInTheDocument();
    });

    it("does not show detail toggle for entries without detail", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      const entryWithoutDetail = screen.getAllByTestId("error-log-entry-3")[0];
      expect(
        within(entryWithoutDetail).queryByText("Show details")
      ).not.toBeInTheDocument();
    });
  });

  describe("Refresh and close buttons", () => {
    it("calls onRefresh when refresh button clicked", () => {
      const onRefresh = vi.fn();
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={onRefresh}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      const refreshButton = screen.getByTestId("error-log-refresh");
      fireEvent.click(refreshButton);
      expect(onRefresh).toHaveBeenCalled();
    });

    it("calls onToggle when close button clicked", () => {
      const onToggle = vi.fn();
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={onToggle}
          isExpanded={true}
        />
      );

      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons[closeButtons.length - 1];
      fireEvent.click(closeButton);
      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe("Module display for backend-log entries", () => {
    it("shows module name for backend-log entries", () => {
      renderWithTheme(
        <ErrorLogPanel
          entries={mockEntries}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      expect(screen.getByText("db-connector")).toBeInTheDocument();
    });

    it("does not show module for entries without module", () => {
      const entriesWithoutModule: ErrorLogEntry[] = [
        {
          id: "no-module-1",
          source: "frontend-runtime",
          message: "Error without module",
          detail: null,
          timestamp: Date.now() - 60000,
          module: null,
          occurrences: 1,
        },
      ];

      renderWithTheme(
        <ErrorLogPanel
          entries={entriesWithoutModule}
          loading={false}
          readError={null}
          hasUnread={false}
          onRefresh={vi.fn()}
          onMarkSeen={vi.fn()}
          onToggle={vi.fn()}
          isExpanded={true}
        />
      );

      const entryWithoutModule = screen.getAllByTestId("error-log-entry-0")[0];
      expect(within(entryWithoutModule).queryByText(/db-connector/)).not.toBeInTheDocument();
    });
  });
});
