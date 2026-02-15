import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush }),
  usePathname: () => "/dashboard",
}));

// Default mock: user with active learning paths
const mockUseAuth = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
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

import DashboardPage from "../app/dashboard/page";

// ---------- Fixtures ----------

const activePath = {
  repoUrl: "https://github.com/karpathy/micrograd",
  repoOwner: "karpathy",
  repoName: "micrograd",
  language: "Python",
  level: "beginner",
  status: "active",
  modulesCompleted: 8,
  modulesTotal: 12,
  lastModuleTitle: "Understanding Backpropagation",
  lastAccessedAt: new Date().toISOString(),
  addedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
};

const completedPath = {
  repoUrl: "https://github.com/trekhleb/javascript-algorithms",
  repoOwner: "trekhleb",
  repoName: "javascript-algorithms",
  language: "JavaScript",
  level: "beginner",
  status: "completed",
  modulesCompleted: 35,
  modulesTotal: 35,
  lastModuleTitle: "Graph Algorithms",
  lastAccessedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  addedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
};

const defaultAuthState = {
  user: { uid: "user-1", displayName: "Test User", photoURL: null },
  loading: false,
  userProfile: {
    uid: "user-1",
    displayName: "Test User",
    photoURL: null,
    onboardingComplete: true,
    learningPaths: [activePath, completedPath],
    stats: {
      topicsCompleted: 47,
      hoursInvested: 18.5,
      currentStreak: 5,
      longestStreak: 12,
      lastActiveAt: new Date().toISOString(),
    },
  },
  profileLoading: false,
  isNewUser: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshProfile: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue(defaultAuthState);
  // Default: empty materials
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ materials: [] }),
  });
});

describe("DashboardPage — returning user", () => {
  it("shows stats strip", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("stats-strip")).toBeTruthy();
    expect(screen.getByText("Topics Completed")).toBeTruthy();
    expect(screen.getByText("Learning Streak")).toBeTruthy();
    expect(screen.getByText("Time Invested")).toBeTruthy();
  });

  it("shows real stats values", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("stat-topics-completed").textContent).toBe("47");
    expect(screen.getByTestId("stat-learning-streak").textContent).toBe("5 days");
    expect(screen.getByTestId("stat-time-invested").textContent).toBe("18.5h");
  });

  it("shows continue hero for active paths", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("continue-hero")).toBeTruthy();
    expect(screen.getAllByText("Continue Learning").length).toBeGreaterThan(0);
  });

  it("shows continue button", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("continue-btn")).toBeTruthy();
  });

  it("navigates on continue button click", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByTestId("continue-btn"));
    expect(mockPush).toHaveBeenCalledWith("/learn/karpathy-micrograd");
  });

  it("shows quick action cards", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("quick-actions")).toBeTruthy();
    expect(screen.getByTestId("action-browse")).toBeTruthy();
    expect(screen.getByTestId("action-learn")).toBeTruthy();
  });

  it("navigates to browse from quick action", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByTestId("action-browse"));
    expect(mockPush).toHaveBeenCalledWith("/browse");
  });

  it("navigates to learn from quick action", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByTestId("action-learn"));
    expect(mockPush).toHaveBeenCalledWith("/learn");
  });
});

describe("DashboardPage — new user (no paths)", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      userProfile: {
        ...defaultAuthState.userProfile,
        learningPaths: [],
        stats: {
          topicsCompleted: 0,
          hoursInvested: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActiveAt: null,
        },
      },
    });
  });

  it("shows welcome hero", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("welcome-hero")).toBeTruthy();
    expect(screen.getByText("Ready to start learning?")).toBeTruthy();
  });

  it("shows suggested courses", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("suggested-courses")).toBeTruthy();
  });

  it("shows quick start input", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("quick-start")).toBeTruthy();
    expect(screen.getByTestId("quick-start-input")).toBeTruthy();
  });

  it("does not show continue hero", () => {
    render(<DashboardPage />);
    expect(screen.queryByTestId("continue-hero")).toBeNull();
  });

  it("does not show stats strip", () => {
    render(<DashboardPage />);
    expect(screen.queryByTestId("stats-strip")).toBeNull();
  });

  it("navigates on valid URL submit", () => {
    render(<DashboardPage />);
    const input = screen.getByTestId("quick-start-input");
    fireEvent.change(input, { target: { value: "karpathy/nanoGPT" } });
    fireEvent.submit(input.closest("form")!);
    expect(mockPush).toHaveBeenCalledWith("/course/karpathy-nanoGPT");
  });

  it("shows URL error on invalid URL", () => {
    render(<DashboardPage />);
    const input = screen.getByTestId("quick-start-input");
    fireEvent.change(input, { target: { value: "not-a-valid-url" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByTestId("url-error")).toBeTruthy();
  });

  it("shows ready courses when available", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () =>
        Promise.resolve({
          materials: [
            {
              owner: "testowner",
              name: "testrepo",
              language: "Python",
              description: "Test repo",
              levels: { beginner: true, intermediate: false, advanced: false },
              estimatedHours: { beginner: 8, intermediate: 5, advanced: 3 },
              timesAccessed: 10,
            },
          ],
        }),
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Ready to Learn")).toBeTruthy();
    });
    expect(screen.getAllByTestId("ready-badge").length).toBeGreaterThan(0);
  });

  it("falls back to curated repos when no ready courses", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should show "Suggested Courses" heading (fallback)
    expect(screen.getByText("Suggested Courses")).toBeTruthy();
  });
});

describe("DashboardPage — loading state", () => {
  it("shows loading spinner when profile loading", () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      profileLoading: true,
    });

    render(<DashboardPage />);
    expect(screen.getByTestId("loading")).toBeTruthy();
  });
});
