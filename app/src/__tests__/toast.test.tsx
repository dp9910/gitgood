import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Toast from "../components/toast";
import type { SyncStatus } from "../hooks/use-progress";

describe("Toast", () => {
  const onRetry = vi.fn();
  const onDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderToast(status: SyncStatus) {
    return render(
      <Toast syncStatus={status} onRetry={onRetry} onDismiss={onDismiss} />
    );
  }

  it("renders nothing when idle", () => {
    const { container } = renderToast({ state: "idle" });
    expect(container.innerHTML).toBe("");
  });

  it("shows syncing state", () => {
    renderToast({ state: "syncing", message: "Saving progress..." });
    expect(screen.getByTestId("sync-toast")).toBeTruthy();
    expect(screen.getByText("Saving progress...")).toBeTruthy();
  });

  it("shows success state", () => {
    renderToast({ state: "success", message: "Progress saved!" });
    expect(screen.getByText("Progress saved!")).toBeTruthy();
  });

  it("shows error state with retry button", () => {
    renderToast({ state: "error", message: "Sync failed" });
    expect(screen.getByText("Sync failed")).toBeTruthy();
    expect(screen.getByTestId("toast-retry")).toBeTruthy();
  });

  it("calls onRetry when retry button clicked", () => {
    renderToast({ state: "error", message: "Sync failed" });
    fireEvent.click(screen.getByTestId("toast-retry"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("calls onDismiss when close button clicked", () => {
    renderToast({ state: "success", message: "Saved" });
    fireEvent.click(screen.getByLabelText("Dismiss notification"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("does not show dismiss button when syncing", () => {
    renderToast({ state: "syncing", message: "Saving..." });
    expect(screen.queryByLabelText("Dismiss notification")).toBeNull();
  });

  it("shows dismiss button on error state", () => {
    renderToast({ state: "error", message: "Failed" });
    expect(screen.getByLabelText("Dismiss notification")).toBeTruthy();
  });
});
