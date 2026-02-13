import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildCacheKey,
  checkCache,
  saveToCache,
  incrementCacheUsage,
  CACHE_REPO_OWNER,
  CACHE_REPO_NAME,
  type Curriculum,
  type CacheMetadata,
} from "../lib/curriculum-cache";

// ---------- Mocks ----------

vi.mock("../lib/env", () => ({
  getServerEnv: () => ({
    GITHUB_PERSONAL_TOKEN: "ghp_test_token",
  }),
}));

const mockFetchFileContent = vi.fn();
const mockCommitFile = vi.fn();
const mockGetContent = vi.fn();

vi.mock("../lib/github", () => ({
  getCacheOctokit: () => ({
    rest: {
      repos: {
        getContent: (...args: unknown[]) => mockGetContent(...args),
      },
    },
  }),
  fetchFileContent: (...args: unknown[]) => mockFetchFileContent(...args),
  commitFile: (...args: unknown[]) => mockCommitFile(...args),
}));

// ---------- Fixtures ----------

const sampleCurriculum: Curriculum = {
  repoOwner: "karpathy",
  repoName: "micrograd",
  categories: [
    {
      name: "Foundation",
      description: "Core concepts",
      topics: [
        {
          name: "Autograd basics",
          difficulty: "beginner",
          estimatedMinutes: 30,
          prerequisites: [],
          subtopics: ["Value class", "Operations"],
        },
      ],
    },
  ],
};

const sampleMetadata: CacheMetadata = {
  repoCommitSha: "abc123",
  createdAt: "2026-01-01T00:00:00.000Z",
  timesUsed: 42,
  averageRating: 4.5,
  aiModel: "gemini-2.0-flash",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- Tests ----------

describe("buildCacheKey", () => {
  it("formats owner-repo path", () => {
    expect(buildCacheKey("karpathy", "micrograd")).toBe(
      "repos/karpathy-micrograd"
    );
  });

  it("handles repos with special characters", () => {
    expect(buildCacheKey("some-org", "my.repo-name")).toBe(
      "repos/some-org-my.repo-name"
    );
  });
});

describe("checkCache", () => {
  it("returns hit with curriculum and metadata when cached", async () => {
    mockFetchFileContent
      .mockResolvedValueOnce({
        content: JSON.stringify(sampleCurriculum),
        truncated: false,
      })
      .mockResolvedValueOnce({
        content: JSON.stringify(sampleMetadata),
        truncated: false,
      });

    const result = await checkCache("karpathy", "micrograd");

    expect(result.hit).toBe(true);
    if (result.hit) {
      expect(result.curriculum.repoOwner).toBe("karpathy");
      expect(result.curriculum.categories).toHaveLength(1);
      expect(result.metadata.timesUsed).toBe(42);
    }
  });

  it("fetches from correct cache paths", async () => {
    mockFetchFileContent.mockRejectedValue(new Error("404"));

    await checkCache("facebook", "react");

    expect(mockFetchFileContent).toHaveBeenCalledWith(
      expect.anything(),
      CACHE_REPO_OWNER,
      CACHE_REPO_NAME,
      "repos/facebook-react/curriculum.json",
      { maxChars: 500_000 }
    );
  });

  it("returns miss when curriculum not found (404)", async () => {
    mockFetchFileContent.mockRejectedValue(new Error("Not Found"));

    const result = await checkCache("unknown", "repo");
    expect(result.hit).toBe(false);
  });

  it("returns miss when JSON is malformed", async () => {
    mockFetchFileContent
      .mockResolvedValueOnce({ content: "not valid json", truncated: false })
      .mockResolvedValueOnce({
        content: JSON.stringify(sampleMetadata),
        truncated: false,
      });

    const result = await checkCache("karpathy", "micrograd");
    expect(result.hit).toBe(false);
  });
});

describe("saveToCache", () => {
  it("commits curriculum.json and metadata.json to cache repo", async () => {
    mockCommitFile.mockResolvedValue({ sha: "new_sha" });

    await saveToCache(sampleCurriculum, "abc123", "gemini-2.0-flash");

    expect(mockCommitFile).toHaveBeenCalledTimes(2);

    // Check curriculum commit
    const curriculumCall = mockCommitFile.mock.calls.find(
      (c: unknown[]) => (c[3] as string).includes("curriculum.json")
    );
    expect(curriculumCall).toBeDefined();
    expect(curriculumCall![1]).toBe(CACHE_REPO_OWNER);
    expect(curriculumCall![2]).toBe(CACHE_REPO_NAME);
    expect(JSON.parse(curriculumCall![4] as string).repoOwner).toBe("karpathy");

    // Check metadata commit
    const metadataCall = mockCommitFile.mock.calls.find(
      (c: unknown[]) => (c[3] as string).includes("metadata.json")
    );
    expect(metadataCall).toBeDefined();
    expect(metadataCall![5]).toContain("Add metadata for karpathy/micrograd");
  });

  it("sets timesUsed to 1 for new cache entries", async () => {
    mockCommitFile.mockResolvedValue({ sha: "new_sha" });

    await saveToCache(sampleCurriculum, "abc123", "gemini-2.0-flash");

    const metadataCall = mockCommitFile.mock.calls.find((c) =>
      (c[3] as string).includes("metadata.json")
    );
    const metadata = JSON.parse(metadataCall![4] as string);
    expect(metadata.timesUsed).toBe(1);
    expect(metadata.averageRating).toBeNull();
  });
});

describe("incrementCacheUsage", () => {
  it("increments timesUsed and commits updated metadata", async () => {
    mockGetContent.mockResolvedValue({
      data: { sha: "existing_sha", type: "file" },
    });
    mockCommitFile.mockResolvedValue({ sha: "updated_sha" });

    await incrementCacheUsage("karpathy", "micrograd", sampleMetadata);

    const call = mockCommitFile.mock.calls[0];
    expect(call[1]).toBe(CACHE_REPO_OWNER);
    expect(call[2]).toBe(CACHE_REPO_NAME);
    expect(call[3]).toBe("repos/karpathy-micrograd/metadata.json");
    expect(JSON.parse(call[4] as string).timesUsed).toBe(43);
    expect(call[5]).toContain("Update usage count");
    expect(call[6]).toEqual({ sha: "existing_sha" });
  });

  it("does nothing if metadata file doesn't exist", async () => {
    mockGetContent.mockRejectedValue(new Error("404"));

    await incrementCacheUsage("unknown", "repo", sampleMetadata);

    expect(mockCommitFile).not.toHaveBeenCalled();
  });
});
