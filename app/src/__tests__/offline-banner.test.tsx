import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OfflineBanner } from "../components/offline-banner";

// Mock navigator.onLine
let mockOnLine = true;

beforeEach(() => {
  mockOnLine = true;
  Object.defineProperty(navigator, "onLine", {
    get: () => mockOnLine,
    configurable: true,
  });
});

function setOffline() {
  mockOnLine = false;
  window.dispatchEvent(new Event("offline"));
}

function setOnline() {
  mockOnLine = true;
  window.dispatchEvent(new Event("online"));
}

describe("OfflineBanner", () => {
  it("renders nothing when online", () => {
    const { container } = render(<OfflineBanner />);
    expect(screen.queryByTestId("offline-banner")).toBeNull();
  });

  it("shows banner when offline", () => {
    mockOnLine = false;
    render(<OfflineBanner />);
    expect(screen.getByTestId("offline-banner")).toBeDefined();
  });

  it("displays offline message", () => {
    mockOnLine = false;
    render(<OfflineBanner />);
    expect(screen.getByText(/You're offline/)).toBeDefined();
  });

  it("has a show details button", () => {
    mockOnLine = false;
    render(<OfflineBanner />);
    expect(screen.getByTestId("show-details-btn")).toBeDefined();
    expect(screen.getByText("What works offline?")).toBeDefined();
  });

  it("shows details panel when clicked", () => {
    mockOnLine = false;
    render(<OfflineBanner />);
    fireEvent.click(screen.getByTestId("show-details-btn"));
    expect(screen.getByTestId("offline-details")).toBeDefined();
  });

  it("details panel shows available features", () => {
    mockOnLine = false;
    render(<OfflineBanner />);
    fireEvent.click(screen.getByTestId("show-details-btn"));
    expect(screen.getByText("Available")).toBeDefined();
    expect(screen.getByText("Limited")).toBeDefined();
    expect(screen.getByText("Unavailable")).toBeDefined();
  });

  it("shows feature names in details", () => {
    mockOnLine = false;
    render(<OfflineBanner />);
    fireEvent.click(screen.getByTestId("show-details-btn"));
    expect(screen.getByText("View cached curricula")).toBeDefined();
    expect(screen.getByText("AI tutor chat")).toBeDefined();
  });

  it("hides details on second click", () => {
    mockOnLine = false;
    render(<OfflineBanner />);
    fireEvent.click(screen.getByTestId("show-details-btn"));
    expect(screen.getByTestId("offline-details")).toBeDefined();
    fireEvent.click(screen.getByTestId("show-details-btn"));
    expect(screen.queryByTestId("offline-details")).toBeNull();
  });

  it("shows wifi_off icon when offline", () => {
    mockOnLine = false;
    render(<OfflineBanner />);
    expect(screen.getByText("wifi_off")).toBeDefined();
  });
});
