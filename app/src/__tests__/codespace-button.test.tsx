import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CodespaceButton } from "../components/codespace-button";

describe("CodespaceButton", () => {
  it("renders full variant by default", () => {
    render(<CodespaceButton owner="karpathy" repo="micrograd" />);
    expect(screen.getByTestId("codespace-container")).toBeDefined();
    expect(screen.getByText("Try it yourself")).toBeDefined();
  });

  it("renders Codespace and github.dev buttons", () => {
    render(<CodespaceButton owner="karpathy" repo="micrograd" />);
    expect(screen.getByTestId("codespace-btn")).toBeDefined();
    expect(screen.getByTestId("githubdev-btn")).toBeDefined();
  });

  it("has correct Codespace URL", () => {
    render(<CodespaceButton owner="karpathy" repo="micrograd" />);
    const btn = screen.getByTestId("codespace-btn");
    expect(btn.getAttribute("href")).toContain("codespaces.new/karpathy/micrograd");
  });

  it("has correct github.dev URL", () => {
    render(<CodespaceButton owner="karpathy" repo="micrograd" />);
    const btn = screen.getByTestId("githubdev-btn");
    expect(btn.getAttribute("href")).toContain("github.dev/karpathy/micrograd");
  });

  it("opens links in new tab", () => {
    render(<CodespaceButton owner="karpathy" repo="micrograd" />);
    const btn = screen.getByTestId("codespace-btn");
    expect(btn.getAttribute("target")).toBe("_blank");
    expect(btn.getAttribute("rel")).toContain("noopener");
  });

  it("shows free tier info", () => {
    render(<CodespaceButton owner="karpathy" repo="micrograd" />);
    expect(screen.getByTestId("free-info")).toBeDefined();
    expect(screen.getByText(/hours\/month free/)).toBeDefined();
  });

  it("shows tooltip on hover", () => {
    render(<CodespaceButton owner="karpathy" repo="micrograd" />);
    fireEvent.mouseEnter(screen.getByTestId("free-info"));
    expect(screen.getByTestId("tooltip")).toBeDefined();
  });

  it("hides tooltip on mouse leave", () => {
    render(<CodespaceButton owner="karpathy" repo="micrograd" />);
    fireEvent.mouseEnter(screen.getByTestId("free-info"));
    expect(screen.getByTestId("tooltip")).toBeDefined();
    fireEvent.mouseLeave(screen.getByTestId("free-info"));
    expect(screen.queryByTestId("tooltip")).toBeNull();
  });

  it("renders compact variant", () => {
    render(<CodespaceButton owner="karpathy" repo="micrograd" variant="compact" />);
    expect(screen.getByTestId("codespace-btn")).toBeDefined();
    expect(screen.getByText("Codespace")).toBeDefined();
    expect(screen.queryByTestId("codespace-container")).toBeNull();
  });

  it("uses custom branch", () => {
    render(<CodespaceButton owner="o" repo="r" branch="dev" />);
    const btn = screen.getByTestId("codespace-btn");
    expect(btn.getAttribute("href")).toContain("ref=dev");
  });
});
