import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Mocks ----------

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();

const mockDoc = vi.fn().mockReturnValue({
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
});

const mockCollection = vi.fn().mockReturnValue({
  doc: mockDoc,
});

vi.mock("../lib/firebase-admin", () => ({
  getAdminFirestore: () => ({
    collection: (...args: unknown[]) => mockCollection(...args),
  }),
}));

vi.mock("../lib/encryption", () => ({
  encrypt: vi.fn((text: string) => `encrypted:${text}`),
  decrypt: vi.fn((text: string) => text.replace("encrypted:", "")),
}));

import {
  getOrCreateProfile,
  getProfile,
  updateProfile,
  addLearningPath,
  updateLearningPath,
  getUserGithubToken,
  storeGithubToken,
  incrementStats,
  USERS_COLLECTION,
  type LearningPathEntry,
  type UserProfile,
} from "../lib/user-profile";

// ---------- Fixtures ----------

function makePath(overrides?: Partial<LearningPathEntry>): LearningPathEntry {
  return {
    repoUrl: "https://github.com/karpathy/micrograd",
    repoOwner: "karpathy",
    repoName: "micrograd",
    language: "Python",
    level: "beginner",
    status: "active",
    modulesCompleted: 3,
    modulesTotal: 12,
    lastModuleTitle: "Backpropagation",
    lastAccessedAt: new Date().toISOString(),
    addedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    uid: "user-1",
    email: "test@example.com",
    displayName: "Test User",
    photoURL: null,
    githubUsername: "testuser",
    encryptedGithubToken: null,
    onboardingComplete: false,
    learningRepoCreated: false,
    learningRepoName: null,
    learningPaths: [],
    stats: {
      topicsCompleted: 0,
      hoursInvested: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveAt: null,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------- Tests ----------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOrCreateProfile", () => {
  it("uses users collection", async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => makeProfile() });
    await getOrCreateProfile("user-1");
    expect(mockCollection).toHaveBeenCalledWith(USERS_COLLECTION);
  });

  it("returns existing profile if found", async () => {
    const existing = makeProfile({ displayName: "Existing User" });
    mockGet.mockResolvedValue({ exists: true, data: () => existing });

    const result = await getOrCreateProfile("user-1");
    expect(result.displayName).toBe("Existing User");
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("creates new profile if not found", async () => {
    mockGet.mockResolvedValue({ exists: false });

    const result = await getOrCreateProfile("user-1", {
      email: "new@example.com",
      displayName: "New User",
    });

    expect(mockSet).toHaveBeenCalledOnce();
    expect(result.uid).toBe("user-1");
    expect(result.email).toBe("new@example.com");
    expect(result.displayName).toBe("New User");
    expect(result.onboardingComplete).toBe(false);
    expect(result.learningPaths).toEqual([]);
  });

  it("is idempotent — second call returns existing", async () => {
    const existing = makeProfile();
    mockGet.mockResolvedValue({ exists: true, data: () => existing });

    await getOrCreateProfile("user-1");
    await getOrCreateProfile("user-1");

    expect(mockSet).not.toHaveBeenCalled();
  });

  it("seeds profile with optional fields", async () => {
    mockGet.mockResolvedValue({ exists: false });

    const result = await getOrCreateProfile("user-1", {
      githubUsername: "gh_user",
      photoURL: "https://avatar.com/pic.jpg",
      encryptedGithubToken: "encrypted:token123",
    });

    expect(result.githubUsername).toBe("gh_user");
    expect(result.photoURL).toBe("https://avatar.com/pic.jpg");
    expect(result.encryptedGithubToken).toBe("encrypted:token123");
  });
});

describe("getProfile", () => {
  it("returns profile when found", async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => makeProfile() });
    const result = await getProfile("user-1");
    expect(result).not.toBeNull();
    expect(result!.uid).toBe("user-1");
  });

  it("returns null when not found", async () => {
    mockGet.mockResolvedValue({ exists: false });
    const result = await getProfile("user-1");
    expect(result).toBeNull();
  });
});

describe("updateProfile", () => {
  it("updates specified fields", async () => {
    await updateProfile("user-1", { onboardingComplete: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingComplete: true, updatedAt: expect.any(String) })
    );
  });

  it("always sets updatedAt timestamp", async () => {
    await updateProfile("user-1", { displayName: "New Name" });
    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.updatedAt).toBeDefined();
    expect(typeof updateArgs.updatedAt).toBe("string");
  });
});

describe("addLearningPath", () => {
  it("adds a new learning path", async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => makeProfile() });
    const path = makePath();
    await addLearningPath("user-1", path);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        learningPaths: [path],
      })
    );
  });

  it("throws if path already exists (same owner+name+level)", async () => {
    const existingPath = makePath();
    mockGet.mockResolvedValue({
      exists: true,
      data: () => makeProfile({ learningPaths: [existingPath] }),
    });

    await expect(addLearningPath("user-1", existingPath)).rejects.toThrow(
      "Learning path already exists"
    );
  });

  it("allows same repo with different level", async () => {
    const existingPath = makePath({ level: "beginner" });
    mockGet.mockResolvedValue({
      exists: true,
      data: () => makeProfile({ learningPaths: [existingPath] }),
    });

    const newPath = makePath({ level: "advanced" });
    await addLearningPath("user-1", newPath);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("throws if profile not found", async () => {
    mockGet.mockResolvedValue({ exists: false });
    await expect(addLearningPath("user-1", makePath())).rejects.toThrow(
      "User profile not found"
    );
  });
});

describe("updateLearningPath", () => {
  it("updates matching path", async () => {
    const path = makePath();
    mockGet.mockResolvedValue({
      exists: true,
      data: () => makeProfile({ learningPaths: [path] }),
    });

    await updateLearningPath("user-1", "karpathy", "micrograd", "beginner", {
      modulesCompleted: 5,
      status: "active",
    });

    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.learningPaths[0].modulesCompleted).toBe(5);
  });

  it("does not modify non-matching paths", async () => {
    const path1 = makePath({ repoName: "micrograd" });
    const path2 = makePath({ repoOwner: "other", repoName: "other-repo" });
    mockGet.mockResolvedValue({
      exists: true,
      data: () => makeProfile({ learningPaths: [path1, path2] }),
    });

    await updateLearningPath("user-1", "karpathy", "micrograd", "beginner", {
      modulesCompleted: 10,
    });

    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.learningPaths[1].modulesCompleted).toBe(3);
  });

  it("throws if profile not found", async () => {
    mockGet.mockResolvedValue({ exists: false });
    await expect(
      updateLearningPath("user-1", "karpathy", "micrograd", "beginner", {})
    ).rejects.toThrow("User profile not found");
  });
});

describe("getUserGithubToken", () => {
  it("returns decrypted token", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => makeProfile({ encryptedGithubToken: "encrypted:gho_realtoken" }),
    });
    const token = await getUserGithubToken("user-1");
    expect(token).toBe("gho_realtoken");
  });

  it("returns null when no token stored", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => makeProfile({ encryptedGithubToken: null }),
    });
    const token = await getUserGithubToken("user-1");
    expect(token).toBeNull();
  });

  it("returns null when profile not found", async () => {
    mockGet.mockResolvedValue({ exists: false });
    const token = await getUserGithubToken("user-1");
    expect(token).toBeNull();
  });
});

describe("storeGithubToken", () => {
  it("encrypts and stores token", async () => {
    await storeGithubToken("user-1", "gho_mytoken");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptedGithubToken: "encrypted:gho_mytoken",
      })
    );
  });
});

describe("incrementStats", () => {
  it("increments topics and hours", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => makeProfile({
        stats: {
          topicsCompleted: 5,
          hoursInvested: 2,
          currentStreak: 1,
          longestStreak: 3,
          lastActiveAt: new Date().toISOString(),
        },
      }),
    });

    await incrementStats("user-1", 3, 1.5);
    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.stats.topicsCompleted).toBe(8);
    expect(updateArgs.stats.hoursInvested).toBe(3.5);
  });

  it("starts streak at 1 when no prior activity", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => makeProfile({
        stats: {
          topicsCompleted: 0,
          hoursInvested: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActiveAt: null,
        },
      }),
    });

    await incrementStats("user-1", 1, 0.5);
    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.stats.currentStreak).toBe(1);
  });

  it("throws if profile not found", async () => {
    mockGet.mockResolvedValue({ exists: false });
    await expect(incrementStats("user-1", 1, 0.5)).rejects.toThrow(
      "User profile not found"
    );
  });
});
