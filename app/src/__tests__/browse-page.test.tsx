import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/browse",
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    userProfile: { displayName: "Test" },
    logout: vi.fn(),
  }),
}));

// Mock github.ts to avoid octokit import issues
vi.mock("@/lib/github", () => ({
  parseRepoUrl: (url: string) => {
    const m = url.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (m) return { owner: m[1], repo: m[2] };
    const u = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (u) return { owner: u[1], repo: u[2] };
    return null;
  },
}));

import BrowsePage from "../app/browse/page";

// ---------- Fixtures ----------

const mockReadyMaterials = [
  {
    owner: "testowner",
    name: "testrepo",
    language: "Python",
    description: "A test repo for learning",
    levels: { beginner: true, intermediate: true, advanced: false },
    estimatedHours: { beginner: 8, intermediate: 5, advanced: 3 },
    timesAccessed: 10,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  // Default: empty materials (no ready courses)
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ materials: [] }),
  });
});

describe("BrowsePage", () => {
  it("renders page heading", () => {
    render(<BrowsePage />);
    expect(screen.getByText("Available Courses")).toBeTruthy();
  });

  it("shows URL input section", () => {
    render(<BrowsePage />);
    expect(screen.getByTestId("repo-url-input")).toBeTruthy();
    expect(screen.getByText("Learn from any repo")).toBeTruthy();
  });

  it("shows search input", () => {
    render(<BrowsePage />);
    expect(screen.getByTestId("search-input")).toBeTruthy();
  });

  it("shows repo grid", () => {
    render(<BrowsePage />);
    expect(screen.getByTestId("repo-grid")).toBeTruthy();
  });

  it("shows repo cards with names", () => {
    render(<BrowsePage />);
    expect(screen.getByText("karpathy/micrograd")).toBeTruthy();
    expect(screen.getAllByText("karpathy/nanoGPT").length).toBeGreaterThanOrEqual(1);
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

  it("clears search from empty state", () => {
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
    // micrograd has 14700 stars → "14.7k"
    expect(screen.getAllByText("14.7k").length).toBeGreaterThan(0);
  });

  it("shows trending section", () => {
    render(<BrowsePage />);
    expect(screen.getByTestId("trending-section")).toBeTruthy();
    expect(screen.getByText("Trending This Week")).toBeTruthy();
  });

  it("hides trending during search", () => {
    render(<BrowsePage />);
    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "micrograd" } });

    expect(screen.queryByTestId("trending-section")).toBeNull();
  });

  it("validates URL input", () => {
    render(<BrowsePage />);
    const urlInput = screen.getByTestId("url-input");
    const goBtn = screen.getByTestId("url-go-btn");

    fireEvent.change(urlInput, { target: { value: "not-valid" } });
    fireEvent.click(goBtn);

    expect(screen.getByTestId("url-error")).toBeTruthy();
  });

  it("uses SidebarLayout", () => {
    render(<BrowsePage />);
    expect(screen.getByTestId("sidebar")).toBeTruthy();
  });
});

describe("BrowsePage — ready courses", () => {
  beforeEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ materials: mockReadyMaterials }),
    });
  });

  it("shows ready courses section when materials available", async () => {
    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("ready-courses")).toBeTruthy();
    });
    expect(screen.getByText("Ready to Learn")).toBeTruthy();
  });

  it("shows ready badge on cards", async () => {
    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("ready-card-testrepo")).toBeTruthy();
    });
    expect(screen.getAllByTestId("ready-badge").length).toBeGreaterThan(0);
  });

  it("shows level availability pills", async () => {
    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("level-beginner")).toBeTruthy();
    });
    expect(screen.getByTestId("level-intermediate")).toBeTruthy();
    expect(screen.queryByTestId("level-advanced")).toBeNull();
  });

  it("filters ready courses during search", async () => {
    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("ready-courses")).toBeTruthy();
    });

    const input = screen.getByTestId("search-input");
    fireEvent.change(input, { target: { value: "xyznonexistent" } });

    expect(screen.queryByTestId("ready-courses")).toBeNull();
  });

  it("marks curated repos as ready when matched", async () => {
    // Use a ready material that matches a curated repo
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () =>
        Promise.resolve({
          materials: [
            {
              owner: "karpathy",
              name: "micrograd",
              language: "Python",
              description: "A tiny autograd engine",
              levels: { beginner: true, intermediate: false, advanced: false },
              estimatedHours: { beginner: 8, intermediate: 5, advanced: 3 },
              timesAccessed: 10,
            },
          ],
        }),
    });

    render(<BrowsePage />);

    await waitFor(() => {
      expect(screen.getByTestId("repo-card-micrograd").querySelector("[data-testid='ready-dot']")).toBeTruthy();
    });
  });
});

describe("BrowsePage — no ready courses", () => {
  it("hides ready section when no materials", async () => {
    render(<BrowsePage />);

    // Wait for fetch to settle
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(screen.queryByTestId("ready-courses")).toBeNull();
  });
});
