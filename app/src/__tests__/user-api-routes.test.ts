import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Mocks ----------

vi.mock("../lib/auth-middleware", () => ({
  requireAuth: vi.fn(),
}));

const mockGetOrCreateProfile = vi.fn();
const mockGetProfile = vi.fn();
const mockUpdateProfile = vi.fn();
const mockAddLearningPath = vi.fn();
const mockUpdateLearningPath = vi.fn();
const mockGetUserGithubToken = vi.fn();
const mockStoreGithubToken = vi.fn();

vi.mock("../lib/user-profile", () => ({
  getOrCreateProfile: (...args: unknown[]) => mockGetOrCreateProfile(...args),
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  addLearningPath: (...args: unknown[]) => mockAddLearningPath(...args),
  updateLearningPath: (...args: unknown[]) => mockUpdateLearningPath(...args),
  getUserGithubToken: (...args: unknown[]) => mockGetUserGithubToken(...args),
  storeGithubToken: (...args: unknown[]) => mockStoreGithubToken(...args),
}));

const mockCreateRepo = vi.fn();
const mockGetUserOctokit = vi.fn();

vi.mock("../lib/github", () => ({
  getUserOctokit: (...args: unknown[]) => mockGetUserOctokit(...args),
  createRepo: (...args: unknown[]) => mockCreateRepo(...args),
}));

import { requireAuth } from "../lib/auth-middleware";
import { GET as getProfile, PATCH as patchProfile } from "../app/api/user/profile/route";
import { POST as postOnboarding } from "../app/api/user/onboarding/route";
import { GET as getPaths, POST as postPaths, PATCH as patchPaths } from "../app/api/user/learning-paths/route";

// ---------- Helpers ----------

const testUser = { uid: "user-1", email: "test@example.com", name: "testuser", picture: null };

function makeRequest(body: unknown, url = "http://localhost/api/user/test") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------- Tests ----------

beforeEach(() => {
  vi.clearAllMocks();
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: testUser });
});

// ===== Profile Routes =====

describe("GET /api/user/profile", () => {
  it("returns 401 when unauthenticated", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await getProfile();
    expect(res.status).toBe(401);
  });

  it("returns profile without encrypted token", async () => {
    mockGetOrCreateProfile.mockResolvedValue({
      uid: "user-1",
      email: "test@example.com",
      displayName: "Test",
      encryptedGithubToken: "encrypted:secret",
      onboardingComplete: false,
      learningPaths: [],
      stats: { topicsCompleted: 0 },
    });

    const res = await getProfile();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.uid).toBe("user-1");
    expect(body.encryptedGithubToken).toBeUndefined();
  });

  it("creates profile if missing", async () => {
    mockGetOrCreateProfile.mockResolvedValue({
      uid: "user-1",
      onboardingComplete: false,
    });
    await getProfile();
    expect(mockGetOrCreateProfile).toHaveBeenCalledWith("user-1", expect.any(Object));
  });
});

describe("PATCH /api/user/profile", () => {
  it("returns 401 when unauthenticated", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await patchProfile(makeRequest({ displayName: "New" }));
    expect(res.status).toBe(401);
  });

  it("updates allowed fields", async () => {
    const res = await patchProfile(makeRequest({ displayName: "Updated" }));
    expect(res.status).toBe(200);
    expect(mockUpdateProfile).toHaveBeenCalledWith("user-1", { displayName: "Updated" });
  });

  it("strips forbidden fields (uid, createdAt, encryptedGithubToken)", async () => {
    await patchProfile(
      makeRequest({ uid: "hacker", createdAt: "fake", encryptedGithubToken: "stolen", displayName: "OK" })
    );
    const updateArgs = mockUpdateProfile.mock.calls[0][1];
    expect(updateArgs.uid).toBeUndefined();
    expect(updateArgs.createdAt).toBeUndefined();
    expect(updateArgs.encryptedGithubToken).toBeUndefined();
    expect(updateArgs.displayName).toBe("OK");
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/user/profile", {
      method: "PATCH",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await patchProfile(req);
    expect(res.status).toBe(400);
  });
});

// ===== Onboarding Route =====

describe("POST /api/user/onboarding", () => {
  it("returns 401 when unauthenticated", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await postOnboarding(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("marks onboarding complete without repo", async () => {
    const res = await postOnboarding(makeRequest({ createRepo: false }));
    expect(res.status).toBe(200);
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ onboardingComplete: true })
    );
  });

  it("creates repo when requested", async () => {
    mockGetUserGithubToken.mockResolvedValue("gho_token123");
    mockGetUserOctokit.mockReturnValue("octokit-instance");
    mockCreateRepo.mockResolvedValue({ fullName: "testuser/gitgood-learning" });

    const res = await postOnboarding(makeRequest({ createRepo: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.learningRepoCreated).toBe(true);
    expect(body.learningRepoName).toBe("testuser/gitgood-learning");
    expect(mockCreateRepo).toHaveBeenCalledWith(
      "octokit-instance",
      "gitgood-learning",
      expect.objectContaining({ isPrivate: true })
    );
  });

  it("returns 400 when no GitHub token for repo creation", async () => {
    mockGetUserGithubToken.mockResolvedValue(null);
    const res = await postOnboarding(makeRequest({ createRepo: true }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("no_token");
  });

  it("handles repo already exists error", async () => {
    mockGetUserGithubToken.mockResolvedValue("gho_token123");
    mockGetUserOctokit.mockReturnValue("octokit-instance");
    mockCreateRepo.mockRejectedValue(new Error("name already exists on this account"));

    const res = await postOnboarding(makeRequest({ createRepo: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.learningRepoCreated).toBe(true);
  });

  it("returns 502 for other repo creation errors", async () => {
    mockGetUserGithubToken.mockResolvedValue("gho_token123");
    mockGetUserOctokit.mockReturnValue("octokit-instance");
    mockCreateRepo.mockRejectedValue(new Error("GitHub API rate limit exceeded"));

    const res = await postOnboarding(makeRequest({ createRepo: true }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("repo_creation_failed");
  });
});

// ===== Learning Paths Routes =====

describe("GET /api/user/learning-paths", () => {
  it("returns 401 when unauthenticated", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await getPaths();
    expect(res.status).toBe(401);
  });

  it("returns learning paths from profile", async () => {
    const paths = [{ repoOwner: "karpathy", repoName: "micrograd" }];
    mockGetProfile.mockResolvedValue({ learningPaths: paths });

    const res = await getPaths();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.learningPaths).toEqual(paths);
  });

  it("returns empty array when no profile", async () => {
    mockGetProfile.mockResolvedValue(null);
    const res = await getPaths();
    const body = await res.json();
    expect(body.learningPaths).toEqual([]);
  });
});

describe("POST /api/user/learning-paths", () => {
  const validEntry = {
    repoUrl: "https://github.com/karpathy/micrograd",
    repoOwner: "karpathy",
    repoName: "micrograd",
    language: "Python",
    level: "beginner",
    status: "to_learn",
    modulesCompleted: 0,
    modulesTotal: 12,
    lastModuleTitle: null,
    lastAccessedAt: new Date().toISOString(),
    addedAt: new Date().toISOString(),
  };

  it("adds a learning path", async () => {
    const res = await postPaths(makeRequest(validEntry));
    expect(res.status).toBe(200);
    expect(mockAddLearningPath).toHaveBeenCalledWith("user-1", validEntry);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await postPaths(makeRequest({ repoOwner: "karpathy" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when path already exists", async () => {
    mockAddLearningPath.mockRejectedValue(new Error("Learning path already exists"));
    const res = await postPaths(makeRequest(validEntry));
    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await postPaths(req);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/user/learning-paths", () => {
  it("updates a learning path", async () => {
    const res = await patchPaths(
      makeRequest({
        repoOwner: "karpathy",
        repoName: "micrograd",
        level: "beginner",
        updates: { modulesCompleted: 5, status: "active" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpdateLearningPath).toHaveBeenCalledWith(
      "user-1",
      "karpathy",
      "micrograd",
      "beginner",
      { modulesCompleted: 5, status: "active" }
    );
  });

  it("returns 400 for missing fields", async () => {
    const res = await patchPaths(makeRequest({ repoOwner: "karpathy" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on update failure", async () => {
    mockUpdateLearningPath.mockRejectedValue(new Error("User profile not found"));
    const res = await patchPaths(
      makeRequest({
        repoOwner: "karpathy",
        repoName: "micrograd",
        level: "beginner",
        updates: { status: "completed" },
      })
    );
    expect(res.status).toBe(500);
  });
});
