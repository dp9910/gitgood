import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/learn",
}));

const mockUseAuth = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

import MyLearningPage from "../app/learn/page";

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

const toLearnPath = {
  repoUrl: "https://github.com/karpathy/nanoGPT",
  repoOwner: "karpathy",
  repoName: "nanoGPT",
  language: "Python",
  level: "intermediate",
  status: "to_learn",
  modulesCompleted: 0,
  modulesTotal: 18,
  lastModuleTitle: null,
  lastAccessedAt: new Date(Date.now() - 86400000).toISOString(),
  addedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
};

const defaultAuthState = {
  user: { uid: "user-1", displayName: "Test User", photoURL: null },
  loading: false,
  userProfile: {
    uid: "user-1",
    displayName: "Test User",
    photoURL: null,
    onboardingComplete: true,
    learningPaths: [activePath, completedPath, toLearnPath],
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

describe("MyLearningPage", () => {
  it("renders page title", () => {
    render(<MyLearningPage />);
    expect(screen.getAllByText("My Learning").length).toBeGreaterThan(0);
  });

  it("shows filter tabs", () => {
    render(<MyLearningPage />);
    expect(screen.getByTestId("filter-tabs")).toBeTruthy();
    expect(screen.getByTestId("tab-active")).toBeTruthy();
    expect(screen.getByTestId("tab-completed")).toBeTruthy();
    expect(screen.getByTestId("tab-to_learn")).toBeTruthy();
  });

  it("shows active paths by default", () => {
    render(<MyLearningPage />);
    expect(screen.getByTestId("path-card-micrograd")).toBeTruthy();
    expect(screen.queryByTestId("path-card-javascript-algorithms")).toBeNull();
  });

  it("switches to completed tab", () => {
    render(<MyLearningPage />);
    fireEvent.click(screen.getByTestId("tab-completed"));
    expect(screen.getByTestId("path-card-javascript-algorithms")).toBeTruthy();
    expect(screen.queryByTestId("path-card-micrograd")).toBeNull();
  });

  it("switches to to_learn tab", () => {
    render(<MyLearningPage />);
    fireEvent.click(screen.getByTestId("tab-to_learn"));
    expect(screen.getByTestId("path-card-nanoGPT")).toBeTruthy();
  });

  it("shows path card with progress", () => {
    render(<MyLearningPage />);
    expect(screen.getByText("karpathy/micrograd")).toBeTruthy();
    expect(screen.getByText("8/12 modules")).toBeTruthy();
    expect(screen.getByText("67%")).toBeTruthy();
  });

  it("shows continue button for active path", () => {
    render(<MyLearningPage />);
    expect(screen.getByText("Continue")).toBeTruthy();
  });

  it("shows start button for to_learn path", () => {
    render(<MyLearningPage />);
    fireEvent.click(screen.getByTestId("tab-to_learn"));
    expect(screen.getByText("Start")).toBeTruthy();
  });

  it("navigates on continue click", () => {
    render(<MyLearningPage />);
    const pathCard = screen.getByTestId("path-card-micrograd");
    const continueBtn = pathCard.querySelector("button");
    if (continueBtn) fireEvent.click(continueBtn);
    expect(mockPush).toHaveBeenCalledWith("/learn/karpathy-micrograd");
  });

  it("shows add path card", () => {
    render(<MyLearningPage />);
    expect(screen.getByTestId("add-path-btn")).toBeTruthy();
  });

  it("navigates to browse on add path click", () => {
    render(<MyLearningPage />);
    fireEvent.click(screen.getByTestId("add-path-btn"));
    expect(mockPush).toHaveBeenCalledWith("/browse");
  });

  it("shows filter tab counts", () => {
    render(<MyLearningPage />);
    expect(screen.getByTestId("tab-active").textContent).toContain("(1)");
    expect(screen.getByTestId("tab-completed").textContent).toContain("(1)");
    expect(screen.getByTestId("tab-to_learn").textContent).toContain("(1)");
  });
});

describe("MyLearningPage — empty state", () => {
  it("shows empty state when no paths", () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      userProfile: {
        ...defaultAuthState.userProfile,
        learningPaths: [],
      },
    });

    render(<MyLearningPage />);
    expect(screen.getByTestId("empty-state")).toBeTruthy();
    expect(screen.getByText("No learning paths yet")).toBeTruthy();
  });
});

describe("MyLearningPage — loading state", () => {
  it("shows loading spinner", () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      profileLoading: true,
    });

    render(<MyLearningPage />);
    expect(screen.getByTestId("loading")).toBeTruthy();
  });
});

describe("MyLearningPage — unauthenticated", () => {
  it("redirects unauthenticated users", () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      user: null,
      loading: false,
    });

    render(<MyLearningPage />);
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});
