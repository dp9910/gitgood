import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { parseRepoParam } from "../app/learn/[repo]/page";

// ---------- Mock next/navigation ----------

const mockPush = vi.fn();
const mockUseParams = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push: mockPush }),
}));

// ---------- Tests for parseRepoParam ----------

describe("parseRepoParam", () => {
  it("parses owner-repo format", () => {
    expect(parseRepoParam("karpathy-micrograd")).toEqual({
      owner: "karpathy",
      repo: "micrograd",
    });
  });

  it("handles multi-word repo names", () => {
    expect(parseRepoParam("facebook-react")).toEqual({
      owner: "facebook",
      repo: "react",
    });
  });

  it("handles repos with dashes after first", () => {
    expect(parseRepoParam("vercel-next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it("returns null for string without dash", () => {
    expect(parseRepoParam("nodash")).toBeNull();
  });

  it("returns null for string starting with dash", () => {
    expect(parseRepoParam("-repo")).toBeNull();
  });

  it("returns null for string ending with dash", () => {
    expect(parseRepoParam("owner-")).toBeNull();
  });
});

// ---------- LearnPage component tests ----------

describe("LearnPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows error for invalid repo param", async () => {
    mockUseParams.mockReturnValue({ repo: "invalid" });

    // Dynamic import to ensure mocks are set up
    const { default: LearnPage } = await import("../app/learn/[repo]/page");
    render(<LearnPage />);

    expect(screen.getByText("Invalid Repository")).toBeTruthy();
  });

  it("navigates home when Go Home clicked on error", async () => {
    mockUseParams.mockReturnValue({ repo: "invalid" });

    const { default: LearnPage } = await import("../app/learn/[repo]/page");
    render(<LearnPage />);

    fireEvent.click(screen.getByText("Go Home"));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("shows loading state initially for valid repo", async () => {
    mockUseParams.mockReturnValue({ repo: "karpathy-micrograd" });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cached: false }),
    });

    const { default: LearnPage } = await import("../app/learn/[repo]/page");
    render(<LearnPage />);

    // Should show loading initially
    expect(
      screen.getByText("Checking for existing curriculum...")
    ).toBeTruthy();
  });

  it("shows proficiency modal after cache check", async () => {
    mockUseParams.mockReturnValue({ repo: "karpathy-micrograd" });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cached: false }),
    });

    const { default: LearnPage } = await import("../app/learn/[repo]/page");
    render(<LearnPage />);

    await waitFor(() => {
      expect(
        screen.getByText("What's your experience level?")
      ).toBeTruthy();
    });
  });

  it("shows header with repo name", async () => {
    mockUseParams.mockReturnValue({ repo: "karpathy-micrograd" });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cached: false }),
    });

    const { default: LearnPage } = await import("../app/learn/[repo]/page");
    render(<LearnPage />);

    expect(screen.getByText("karpathy/micrograd")).toBeTruthy();
    expect(screen.getByText("GitGood")).toBeTruthy();
  });
});
