import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = vi.fn();
const mockUseParams = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/course/karpathy-micrograd",
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    userProfile: { displayName: "Test" },
    logout: vi.fn(),
  }),
}));

import CoursePreviewPage, {
  parseRepoParam,
} from "../app/course/[repo]/page";

// ---------- Fixtures ----------

const sampleSummary = {
  tagline: "A tiny autograd engine for learning backpropagation",
  about: "Micrograd is a minimalist autograd engine that implements backpropagation.",
  whyLearn: "Studying micrograd teaches you the core of neural networks.",
  youWillLearn: [
    "Automatic differentiation",
    "Backpropagation algorithm",
    "Computational graphs",
    "Neural network training",
  ],
  prerequisites: ["Basic Python syntax", "High school calculus"],
  difficulty: "beginner" as const,
  language: "Python",
  estimatedMinutes: 480,
};

const sampleRecord = {
  owner: "karpathy",
  name: "micrograd",
  repoUrl: "https://github.com/karpathy/micrograd",
  summary: sampleSummary,
  generatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseParams.mockReturnValue({ repo: "karpathy-micrograd" });

  // Default mocks: successful summary, no ready materials
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url === "/api/course-summary") {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ summary: sampleRecord, source: "cache" }),
      });
    }
    if (url === "/api/materials") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ materials: [] }),
      });
    }
    return Promise.resolve({ ok: false });
  });
});

// ---------- parseRepoParam ----------

describe("parseRepoParam", () => {
  it("parses valid owner-repo format", () => {
    expect(parseRepoParam("karpathy-micrograd")).toEqual({
      owner: "karpathy",
      repo: "micrograd",
    });
  });

  it("handles dashes in repo name", () => {
    expect(parseRepoParam("vercel-next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
    });
  });

  it("preserves multi-dash repo names", () => {
    expect(parseRepoParam("owner-my-cool-repo")).toEqual({
      owner: "owner",
      repo: "my-cool-repo",
    });
  });

  it("returns null for no dash", () => {
    expect(parseRepoParam("nodash")).toBeNull();
  });

  it("returns null for leading dash", () => {
    expect(parseRepoParam("-repo")).toBeNull();
  });

  it("returns null for trailing dash", () => {
    expect(parseRepoParam("owner-")).toBeNull();
  });
});

// ---------- Loading state ----------

describe("CoursePreviewPage — loading", () => {
  it("shows loading spinner initially", () => {
    render(<CoursePreviewPage />);
    expect(screen.getByTestId("course-preview-loading")).toBeTruthy();
  });

  it("shows loading text", () => {
    render(<CoursePreviewPage />);
    expect(screen.getByText("Loading course details...")).toBeTruthy();
  });
});

// ---------- Ready state ----------

describe("CoursePreviewPage — ready", () => {
  it("shows summary content", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("course-preview-ready")).toBeTruthy();
    });
  });

  it("displays tagline", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("summary-tagline")).toBeTruthy();
    });
    expect(screen.getByTestId("summary-tagline").textContent).toContain(
      "A tiny autograd engine"
    );
  });

  it("displays about section", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("summary-about")).toBeTruthy();
    });
    expect(screen.getByTestId("summary-about").textContent).toContain(
      "Micrograd is a minimalist"
    );
  });

  it("displays why learn section", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("summary-why-learn")).toBeTruthy();
    });
    expect(screen.getByTestId("summary-why-learn").textContent).toContain(
      "core of neural networks"
    );
  });

  it("displays what you will learn list", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("summary-you-will-learn")).toBeTruthy();
    });
    expect(screen.getByText("Automatic differentiation")).toBeTruthy();
    expect(screen.getByText("Backpropagation algorithm")).toBeTruthy();
    expect(screen.getByText("Computational graphs")).toBeTruthy();
    expect(screen.getByText("Neural network training")).toBeTruthy();
  });

  it("displays prerequisites", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("summary-prerequisites")).toBeTruthy();
    });
    expect(screen.getByText("Basic Python syntax")).toBeTruthy();
    expect(screen.getByText("High school calculus")).toBeTruthy();
  });

  it("displays language badge", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("language-badge")).toBeTruthy();
    });
    expect(screen.getByTestId("language-badge").textContent).toBe("Python");
  });

  it("displays difficulty badge", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("difficulty-badge")).toBeTruthy();
    });
    expect(screen.getByTestId("difficulty-badge").textContent).toBe(
      "beginner"
    );
  });

  it("displays estimated time", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("estimated-time")).toBeTruthy();
    });
    expect(screen.getByTestId("estimated-time").textContent).toContain(
      "~8 hours"
    );
  });

  it("shows Start Learning button", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("start-learning-btn")).toBeTruthy();
    });
  });

  it("navigates to /learn/ on Start Learning click", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("start-learning-btn")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("start-learning-btn"));
    expect(mockPush).toHaveBeenCalledWith("/learn/karpathy-micrograd");
  });

  it("shows repo name in header", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByText("karpathy/micrograd")).toBeTruthy();
    });
  });

  it("shows GitHub link pointing to the repo", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      const link = screen.getByTestId("github-link");
      expect(link).toBeTruthy();
      expect(link.getAttribute("href")).toBe(
        "https://github.com/karpathy/micrograd"
      );
      expect(link.getAttribute("target")).toBe("_blank");
    });
  });
});

// ---------- Ready badge ----------

describe("CoursePreviewPage — ready badge", () => {
  it("shows ready badge when learning material exists", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/api/course-summary") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ summary: sampleRecord, source: "cache" }),
          });
        }
        if (url === "/api/materials") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                materials: [
                  { owner: "karpathy", name: "micrograd", language: "Python" },
                ],
              }),
          });
        }
        return Promise.resolve({ ok: false });
      }
    );

    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("ready-badge")).toBeTruthy();
    });
  });

  it("hides ready badge when no learning material", async () => {
    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("course-preview-ready")).toBeTruthy();
    });

    expect(screen.queryByTestId("ready-badge")).toBeNull();
  });
});

// ---------- Error state ----------

describe("CoursePreviewPage — error", () => {
  it("shows error for invalid repo param", () => {
    mockUseParams.mockReturnValue({ repo: "nodash" });

    render(<CoursePreviewPage />);

    // Should show error immediately (no loading)
    expect(screen.getByTestId("course-preview-error")).toBeTruthy();
  });

  it("shows error message on API failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url === "/api/course-summary") {
          return Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({ message: "Generation failed" }),
          });
        }
        if (url === "/api/materials") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ materials: [] }),
          });
        }
        return Promise.resolve({ ok: false });
      }
    );

    render(<CoursePreviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId("course-preview-error")).toBeTruthy();
    });
    expect(screen.getByText("Generation failed")).toBeTruthy();
  });

  it("shows back button on error", async () => {
    mockUseParams.mockReturnValue({ repo: "nodash" });

    render(<CoursePreviewPage />);

    expect(screen.getByTestId("back-btn")).toBeTruthy();
    fireEvent.click(screen.getByTestId("back-btn"));
    expect(mockPush).toHaveBeenCalledWith("/browse");
  });
});

// ---------- SidebarLayout ----------

describe("CoursePreviewPage — layout", () => {
  it("uses SidebarLayout", () => {
    render(<CoursePreviewPage />);
    expect(screen.getByTestId("sidebar")).toBeTruthy();
  });
});
