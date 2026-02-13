import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportModal, ReportButton } from "../components/report-modal";
import { clearReports, submitReport } from "../lib/moderation";

beforeEach(() => {
  localStorage.clear();
});

describe("ReportButton", () => {
  it("renders a flag button", () => {
    render(<ReportButton onClick={() => {}} />);
    expect(screen.getByTestId("report-btn")).toBeDefined();
    expect(screen.getByText("Report")).toBeDefined();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<ReportButton onClick={onClick} />);
    fireEvent.click(screen.getByTestId("report-btn"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("ReportModal", () => {
  const defaultProps = {
    repoOwner: "test-owner",
    repoName: "test-repo",
    username: "testuser",
    onClose: vi.fn(),
  };

  it("renders the modal", () => {
    render(<ReportModal {...defaultProps} />);
    expect(screen.getByTestId("report-modal")).toBeDefined();
    expect(screen.getByText("Report Content")).toBeDefined();
  });

  it("displays repo name", () => {
    render(<ReportModal {...defaultProps} />);
    expect(screen.getByText("test-owner/test-repo")).toBeDefined();
  });

  it("shows all reason options", () => {
    render(<ReportModal {...defaultProps} />);
    expect(screen.getByTestId("reason-list")).toBeDefined();
    expect(screen.getByTestId("reason-harmful_content")).toBeDefined();
    expect(screen.getByTestId("reason-spam")).toBeDefined();
    expect(screen.getByTestId("reason-other")).toBeDefined();
  });

  it("shows error when submitting without reason", () => {
    render(<ReportModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("submit-btn"));
    expect(screen.getByTestId("error-msg").textContent).toContain("select a reason");
  });

  it("shows error when submitting without description", () => {
    render(<ReportModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("reason-harmful_content"));
    fireEvent.click(screen.getByTestId("submit-btn"));
    expect(screen.getByTestId("error-msg").textContent).toContain("description");
  });

  it("submits successfully with reason and description", () => {
    render(<ReportModal {...defaultProps} />);
    fireEvent.click(screen.getByTestId("reason-harmful_content"));
    fireEvent.change(screen.getByTestId("description-input"), {
      target: { value: "This repo has dangerous code" },
    });
    fireEvent.click(screen.getByTestId("submit-btn"));
    expect(screen.getByTestId("success-msg")).toBeDefined();
  });

  it("calls onClose when close button clicked on success", () => {
    const onClose = vi.fn();
    render(<ReportModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("reason-spam"));
    fireEvent.change(screen.getByTestId("description-input"), {
      target: { value: "Spam content" },
    });
    fireEvent.click(screen.getByTestId("submit-btn"));
    fireEvent.click(screen.getByTestId("close-btn"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows already reported state if user already reported", () => {
    submitReport("test-owner", "test-repo", "spam", "Already reported", "testuser");
    render(<ReportModal {...defaultProps} />);
    expect(screen.getByTestId("already-reported")).toBeDefined();
  });

  it("has a description character counter", () => {
    render(<ReportModal {...defaultProps} />);
    expect(screen.getByText("0/1000")).toBeDefined();
  });

  it("calls onClose on cancel close button", () => {
    const onClose = vi.fn();
    render(<ReportModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("close-btn"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
