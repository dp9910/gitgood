import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import BrowsePage from "../app/browse/page";

describe("BrowsePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page heading", () => {
    render(<BrowsePage />);
    expect(screen.getByText("Curated Learning Paths")).toBeTruthy();
  });

  it("shows subheading", () => {
    render(<BrowsePage />);
    expect(
      screen.getByText("Expertly reviewed courses from the best GitHub repos")
    ).toBeTruthy();
  });

  it("shows search input", () => {
    render(<BrowsePage />);
    expect(screen.getByTestId("search-input")).toBeTruthy();
  });

  it("shows filter chips", () => {
    render(<BrowsePage />);
    const chips = screen.getByTestId("filter-chips");
    expect(chips).toBeTruthy();
    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getByText("Machine Learning")).toBeTruthy();
    expect(screen.getByText("Web Dev")).toBeTruthy();
  });

  it("shows repo grid", () => {
    render(<BrowsePage />);
    expect(screen.getByTestId("repo-grid")).toBeTruthy();
  });

  it("shows repo cards with names", () => {
    render(<BrowsePage />);
    expect(screen.getByText("karpathy/micrograd")).toBeTruthy();
    expect(screen.getByText("karpathy/nanoGPT")).toBeTruthy();
  });

  it("shows curated badge", () => {
    render(<BrowsePage />);
    const badges = screen.getAllByText("Curated");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("filters repos by category", () => {
    render(<BrowsePage />);
    fireEvent.click(screen.getByText("Algorithms"));

    // Should show algorithm repos
    expect(
      screen.getByText("trekhleb/javascript-algorithms")
    ).toBeTruthy();

    // Should not show ML repos
    expect(screen.queryByText("karpathy/micrograd")).toBeNull();
  });

  it("filters repos by search", () => {
    render(<BrowsePage />);
    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "micrograd" } });

    expect(screen.getByText("karpathy/micrograd")).toBeTruthy();
    expect(screen.queryByText("karpathy/nanoGPT")).toBeNull();
  });

  it("shows empty state when no results", () => {
    render(<BrowsePage />);
    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "xyznonexistent123" } });

    expect(screen.getByTestId("empty-state")).toBeTruthy();
    expect(screen.getByText("No repos found")).toBeTruthy();
  });

  it("clears filters from empty state", () => {
    render(<BrowsePage />);
    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "xyznonexistent123" } });

    fireEvent.click(screen.getByTestId("clear-filters"));
    expect(screen.getByTestId("repo-grid")).toBeTruthy();
  });

  it("shows difficulty badges", () => {
    render(<BrowsePage />);
    expect(screen.getAllByText("Beginner").length).toBeGreaterThan(0);
  });

  it("shows star counts", () => {
    render(<BrowsePage />);
    // micrograd has 10200 stars → "10.2k"
    expect(screen.getByText("10.2k")).toBeTruthy();
  });

  it("shows topic count", () => {
    render(<BrowsePage />);
    expect(screen.getByText("12 topics")).toBeTruthy();
  });

  it("shows GitGood logo", () => {
    render(<BrowsePage />);
    expect(screen.getByText("GitGood")).toBeTruthy();
  });
});
