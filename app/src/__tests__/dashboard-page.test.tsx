import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import DashboardPage from "../app/dashboard/page";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders welcome message", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("welcome")).toBeTruthy();
    expect(screen.getByText(/Welcome back/)).toBeTruthy();
  });

  it("shows stats row with 3 cards", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("stats-row")).toBeTruthy();
    expect(screen.getByText("Topics Completed")).toBeTruthy();
    expect(screen.getByText("Learning Streak")).toBeTruthy();
    expect(screen.getByText("Time Invested")).toBeTruthy();
  });

  it("shows heatmap", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("heatmap")).toBeTruthy();
    expect(screen.getByText("Learning Activity")).toBeTruthy();
  });

  it("shows continue learning section", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("continue-section")).toBeTruthy();
    expect(screen.getByText("Pick up where you left off")).toBeTruthy();
  });

  it("shows continue button", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("continue-btn")).toBeTruthy();
    expect(screen.getByText("Continue Learning")).toBeTruthy();
  });

  it("shows learning paths section", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("learning-paths")).toBeTruthy();
    expect(screen.getByText("Your Learning Paths")).toBeTruthy();
  });

  it("shows repo cards in learning paths", () => {
    render(<DashboardPage />);
    // micrograd appears in both continue section and path cards
    expect(screen.getAllByText("karpathy/micrograd").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("trekhleb/javascript-algorithms").length).toBeGreaterThanOrEqual(1);
  });

  it("shows progress for learning paths", () => {
    render(<DashboardPage />);
    // "8 of 12 topics" may appear in both continue section and path card
    expect(screen.getAllByText("8 of 12 topics").length).toBeGreaterThanOrEqual(1);
  });

  it("shows start new path button", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("new-path-btn")).toBeTruthy();
    expect(screen.getByText("Start New Learning Path")).toBeTruthy();
  });

  it("shows GitGood logo", () => {
    render(<DashboardPage />);
    expect(screen.getByText("GitGood")).toBeTruthy();
  });

  it("shows Browse Repos nav link", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Browse Repos")).toBeTruthy();
  });

  it("shows heatmap legend", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Less")).toBeTruthy();
    expect(screen.getByText("More")).toBeTruthy();
  });
});
