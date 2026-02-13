import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShortcutsModal } from "../components/shortcuts-modal";

describe("ShortcutsModal", () => {
  it("renders the modal", () => {
    render(<ShortcutsModal onClose={() => {}} />);
    expect(screen.getByTestId("shortcuts-modal")).toBeDefined();
    expect(screen.getByText("Keyboard Shortcuts")).toBeDefined();
  });

  it("shows all context groups", () => {
    render(<ShortcutsModal onClose={() => {}} />);
    expect(screen.getByTestId("context-global")).toBeDefined();
    expect(screen.getByTestId("context-navigation")).toBeDefined();
    expect(screen.getByTestId("context-learning")).toBeDefined();
    expect(screen.getByTestId("context-chat")).toBeDefined();
  });

  it("displays context labels", () => {
    render(<ShortcutsModal onClose={() => {}} />);
    expect(screen.getByText("Global")).toBeDefined();
    expect(screen.getByText("Learning Interface")).toBeDefined();
    expect(screen.getByText("AI Tutor Chat")).toBeDefined();
    expect(screen.getByText("Navigation")).toBeDefined();
  });

  it("shows shortcut descriptions", () => {
    render(<ShortcutsModal onClose={() => {}} />);
    expect(screen.getByText("Open keyboard shortcuts help")).toBeDefined();
    expect(screen.getByText("Previous topic")).toBeDefined();
    expect(screen.getByText("Send message")).toBeDefined();
  });

  it("renders kbd elements for keys", () => {
    render(<ShortcutsModal onClose={() => {}} />);
    const kbds = document.querySelectorAll("kbd");
    expect(kbds.length).toBeGreaterThan(10);
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<ShortcutsModal onClose={onClose} />);
    fireEvent.click(screen.getByTestId("close-btn"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(<ShortcutsModal onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when clicking backdrop", () => {
    const onClose = vi.fn();
    render(<ShortcutsModal onClose={onClose} />);
    fireEvent.click(screen.getByTestId("shortcuts-modal"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows footer hint about ? key", () => {
    render(<ShortcutsModal onClose={() => {}} />);
    expect(screen.getByText(/anywhere to open this panel/)).toBeDefined();
  });

  it("has a shortcuts list container", () => {
    render(<ShortcutsModal onClose={() => {}} />);
    expect(screen.getByTestId("shortcuts-list")).toBeDefined();
  });
});
