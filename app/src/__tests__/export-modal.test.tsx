import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportModal } from "../components/export-modal";

// Mock download functions to prevent DOM manipulation in tests
vi.mock("../lib/data-export", async () => {
  const actual = await vi.importActual("../lib/data-export");
  return {
    ...actual,
    downloadProgress: vi.fn(),
    downloadNotes: vi.fn(),
    downloadBookmarks: vi.fn(),
    downloadAllData: vi.fn(),
  };
});

import {
  downloadProgress,
  downloadNotes,
  downloadBookmarks,
  downloadAllData,
} from "../lib/data-export";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ExportModal", () => {
  const defaultProps = {
    repoOwner: "test-owner",
    repoName: "test-repo",
    onClose: vi.fn(),
  };

  it("renders the modal", () => {
    render(<ExportModal {...defaultProps} />);
    expect(screen.getByTestId("export-modal")).toBeDefined();
    expect(screen.getByText("Export Data")).toBeDefined();
  });

  it("shows all export options", () => {
    render(<ExportModal {...defaultProps} />);
    expect(screen.getByTestId("export-progress")).toBeDefined();
    expect(screen.getByTestId("export-notes")).toBeDefined();
    expect(screen.getByTestId("export-bookmarks")).toBeDefined();
    expect(screen.getByTestId("export-all")).toBeDefined();
  });

  it("calls downloadProgress when progress clicked", () => {
    render(<ExportModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("export-progress"));
    expect(downloadProgress).toHaveBeenCalledOnce();
  });

  it("calls downloadNotes when notes clicked", () => {
    render(<ExportModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("export-notes"));
    expect(downloadNotes).toHaveBeenCalledWith("test-owner", "test-repo");
  });

  it("calls downloadBookmarks when bookmarks clicked", () => {
    render(<ExportModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("export-bookmarks"));
    expect(downloadBookmarks).toHaveBeenCalledWith("test-owner", "test-repo");
  });

  it("calls downloadAllData when all clicked", () => {
    render(<ExportModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("export-all"));
    expect(downloadAllData).toHaveBeenCalledWith("test-owner", "test-repo");
  });

  it("shows downloaded badge after export", () => {
    render(<ExportModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("export-progress"));
    expect(screen.getByTestId("exported-badge")).toBeDefined();
  });

  it("disables repo-specific options when no repo", () => {
    render(<ExportModal onClose={vi.fn()} />);
    const notesBtn = screen.getByTestId("export-notes");
    expect(notesBtn.hasAttribute("disabled")).toBe(true);
  });

  it("progress export works without repo", () => {
    render(<ExportModal onClose={vi.fn()} />);
    const progressBtn = screen.getByTestId("export-progress");
    expect(progressBtn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(progressBtn);
    expect(downloadProgress).toHaveBeenCalledOnce();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<ExportModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("close-btn"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
