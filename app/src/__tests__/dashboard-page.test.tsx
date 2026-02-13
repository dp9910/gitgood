import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard",
}));

// Default mock: user with active learning paths
const mockUseAuth = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
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
});

describe("DashboardPage", () => {
  it("shows stats row with 3 cards", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("stats-row")).toBeTruthy();
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

  it("shows heatmap", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("heatmap")).toBeTruthy();
    expect(screen.getByText("Learning Activity")).toBeTruthy();
  });

  it("shows continue learning section for active paths", () => {
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

  it("shows filter tabs", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("filter-tabs")).toBeTruthy();
    expect(screen.getByTestId("tab-active")).toBeTruthy();
    expect(screen.getByTestId("tab-completed")).toBeTruthy();
    expect(screen.getByTestId("tab-to_learn")).toBeTruthy();
  });

  it("shows start new path button", () => {
    render(<DashboardPage />);
    expect(screen.getByTestId("new-path-btn")).toBeTruthy();
    expect(screen.getByText("Start New Learning Path")).toBeTruthy();
  });

  it("shows heatmap legend", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Less")).toBeTruthy();
    expect(screen.getByText("More")).toBeTruthy();
  });

  it("navigates on continue button click", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByTestId("continue-btn"));
    expect(mockPush).toHaveBeenCalledWith("/learn/karpathy-micrograd");
  });

  it("navigates on new path button click", () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByTestId("new-path-btn"));
    expect(mockPush).toHaveBeenCalledWith("/browse");
  });

  it("switches filter tabs", () => {
    render(<DashboardPage />);
    // Default is "active" tab - should show micrograd
    expect(screen.getAllByText("karpathy/micrograd").length).toBeGreaterThanOrEqual(1);

    // Switch to "completed" tab
    fireEvent.click(screen.getByTestId("tab-completed"));
    expect(screen.getByText("trekhleb/javascript-algorithms")).toBeTruthy();
  });
});

describe("DashboardPage — empty state", () => {
  it("shows empty state when no learning paths", () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      userProfile: {
        ...defaultAuthState.userProfile,
        learningPaths: [],
      },
    });

    render(<DashboardPage />);
    expect(screen.getByTestId("empty-state")).toBeTruthy();
    expect(screen.getByText("Start your learning journey")).toBeTruthy();
    expect(screen.getByTestId("browse-btn")).toBeTruthy();
  });

  it("does not show continue section when no active paths", () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      userProfile: {
        ...defaultAuthState.userProfile,
        learningPaths: [],
      },
    });

    render(<DashboardPage />);
    expect(screen.queryByTestId("continue-section")).toBeNull();
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

describe("DashboardPage — zero stats", () => {
  it("shows zero values for new user", () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      userProfile: {
        ...defaultAuthState.userProfile,
        stats: {
          topicsCompleted: 0,
          hoursInvested: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActiveAt: null,
        },
        learningPaths: [],
      },
    });

    render(<DashboardPage />);
    expect(screen.getByTestId("stat-topics-completed").textContent).toBe("0");
    expect(screen.getByTestId("stat-learning-streak").textContent).toBe("0 days");
    expect(screen.getByTestId("stat-time-invested").textContent).toBe("0h");
  });
});
