import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------- Mocks ----------

const mockRequireAuth = vi.fn();
vi.mock("../lib/auth-middleware", () => ({
  requireAuth: () => mockRequireAuth(),
}));

const mockCheckRateLimit = vi.fn();
vi.mock("../lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("../lib/redis", () => ({
  getRedis: () => ({}),
}));

const mockCheckCache = vi.fn();
const mockSaveToCache = vi.fn();
const mockCloneToUserRepo = vi.fn();
vi.mock("../lib/curriculum-cache", () => ({
  checkCache: (...args: unknown[]) => mockCheckCache(...args),
  saveToCache: (...args: unknown[]) => mockSaveToCache(...args),
  cloneToUserRepo: (...args: unknown[]) => mockCloneToUserRepo(...args),
}));

const mockAnalyzeRepo = vi.fn();
vi.mock("../lib/repo-analysis", () => ({
  analyzeRepo: (...args: unknown[]) => mockAnalyzeRepo(...args),
}));

const mockGenerateCurriculum = vi.fn();
vi.mock("../lib/gemini", () => ({
  generateCurriculum: (...args: unknown[]) => mockGenerateCurriculum(...args),
}));

vi.mock("../lib/github", () => ({
  parseRepoUrl: (url: string) => {
    const match = url.match(/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  },
  getUserOctokit: () => ({}),
}));

vi.mock("../lib/env", () => ({
  getServerEnv: () => ({
    GEMINI_API_KEY: "test",
    GITHUB_PERSONAL_TOKEN: "test",
  }),
}));

// Import AFTER mocks
import { POST } from "../app/api/analyze-repo/route";

// ---------- Helpers ----------

const defaultHeaders = {
  "X-RateLimit-Limit": "100",
  "X-RateLimit-Remaining": "99",
  "X-RateLimit-Reset": "2026-02-13T00:00:00.000Z",
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/analyze-repo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPreferences = {
  level: "intermediate",
  goal: "understand",
  timeCommitment: "moderate",
};

const curriculum = {
  repoOwner: "karpathy",
  repoName: "micrograd",
  categories: [
    {
      name: "Foundations",
      description: "Core concepts",
      topics: [
        {
          name: "Value Class",
          difficulty: "beginner",
          estimatedMinutes: 20,
          prerequisites: [],
          subtopics: ["Wrapping scalars"],
        },
      ],
    },
  ],
};

const cacheMetadata = {
  repoCommitSha: "abc123",
  createdAt: "2026-01-01T00:00:00Z",
  timesUsed: 5,
  averageRating: null,
  aiModel: "gemini-2.0-flash",
};

// ---------- Tests ----------

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ user: { uid: "user1", email: "a@b.com" } });
  mockCheckRateLimit.mockResolvedValue({
    result: { allowed: true, remaining: 99 },
    headers: defaultHeaders,
  });
  mockSaveToCache.mockResolvedValue(undefined);
  mockCloneToUserRepo.mockResolvedValue(undefined);
});

describe("POST /api/analyze-repo", () => {
  it("returns 401 if not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    });

    const res = await POST(makeRequest({ url: "karpathy/micrograd", preferences: validPreferences }));
    expect(res.status).toBe(401);
  });

  it("returns 429 if rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({
      result: {
        allowed: false,
        status: 429,
        error: "daily_limit_reached",
        message: "Daily limit reached",
        resetAt: "2026-02-13T00:00:00Z",
      },
      headers: defaultHeaders,
    });

    const res = await POST(makeRequest({ url: "karpathy/micrograd", preferences: validPreferences }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("daily_limit_reached");
  });

  it("returns 400 for missing URL", async () => {
    const res = await POST(makeRequest({ preferences: validPreferences }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
  });

  it("returns 400 for missing preferences", async () => {
    const res = await POST(makeRequest({ url: "karpathy/micrograd" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
  });

  it("returns 400 for invalid URL", async () => {
    const res = await POST(makeRequest({ url: "not-a-url", preferences: validPreferences }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_url");
  });

  it("returns cached curriculum on cache hit", async () => {
    mockCheckCache.mockResolvedValue({
      hit: true,
      curriculum,
      metadata: cacheMetadata,
    });

    const res = await POST(
      makeRequest({ url: "karpathy/micrograd", preferences: validPreferences })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.source).toBe("cache");
    expect(body.curriculum.repoOwner).toBe("karpathy");
    expect(body.metadata.timesUsed).toBe(5);
  });

  it("generates curriculum on cache miss", async () => {
    mockCheckCache.mockResolvedValue({ hit: false });
    mockAnalyzeRepo.mockResolvedValue({
      metadata: {
        owner: "karpathy",
        name: "micrograd",
        fullName: "karpathy/micrograd",
        description: "A tiny autograd engine",
        language: "Python",
        stars: 6800,
        defaultBranch: "main",
        topics: [],
      },
      classification: {
        size: "small",
        fileCount: 10,
        estimatedLOC: 500,
        blocked: false,
        message: "Perfect size",
      },
      repoType: "tutorial",
      selectedFiles: { fetch: [], totalCodeFiles: 10, estimatedLOC: 500 },
      alternatives: [],
      fileContents: new Map([["README.md", "# Micrograd"]]),
    });
    mockGenerateCurriculum.mockResolvedValue({
      curriculum,
      model: "gemini-2.0-flash",
    });

    const res = await POST(
      makeRequest({ url: "karpathy/micrograd", preferences: validPreferences })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.source).toBe("generated");
    expect(body.curriculum.repoOwner).toBe("karpathy");
    expect(body.model).toBe("gemini-2.0-flash");
  });

  it("returns 422 when repo is too large", async () => {
    mockCheckCache.mockResolvedValue({ hit: false });
    mockAnalyzeRepo.mockResolvedValue({
      metadata: {
        owner: "facebook",
        name: "react",
        fullName: "facebook/react",
        description: "React",
        language: "JavaScript",
        stars: 215000,
        defaultBranch: "main",
        topics: [],
      },
      classification: {
        size: "massive",
        fileCount: 5000,
        estimatedLOC: 500000,
        blocked: true,
        message: "Too large",
      },
      repoType: "library",
      selectedFiles: { fetch: [], totalCodeFiles: 5000, estimatedLOC: 500000 },
      alternatives: [
        { fullName: "preactjs/preact", description: "Small React alternative", stars: 36000, language: "JavaScript" },
      ],
      fileContents: new Map(),
    });

    const res = await POST(
      makeRequest({ url: "facebook/react", preferences: validPreferences })
    );
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.error).toBe("repo_too_large");
    expect(body.alternatives).toHaveLength(1);
  });

  it("returns 502 when repo analysis fails", async () => {
    mockCheckCache.mockResolvedValue({ hit: false });
    mockAnalyzeRepo.mockRejectedValue(new Error("Not Found"));

    const res = await POST(
      makeRequest({ url: "karpathy/micrograd", preferences: validPreferences })
    );
    expect(res.status).toBe(502);

    const body = await res.json();
    expect(body.error).toBe("analysis_failed");
    expect(body.message).toBe("Not Found");
  });

  it("returns 502 when AI generation fails", async () => {
    mockCheckCache.mockResolvedValue({ hit: false });
    mockAnalyzeRepo.mockResolvedValue({
      metadata: {
        owner: "karpathy",
        name: "micrograd",
        fullName: "karpathy/micrograd",
        description: "test",
        language: "Python",
        stars: 1,
        defaultBranch: "main",
        topics: [],
      },
      classification: {
        size: "small",
        fileCount: 5,
        estimatedLOC: 200,
        blocked: false,
        message: "Good",
      },
      repoType: "tutorial",
      selectedFiles: { fetch: [], totalCodeFiles: 5, estimatedLOC: 200 },
      alternatives: [],
      fileContents: new Map(),
    });
    mockGenerateCurriculum.mockRejectedValue(
      new Error("Failed to generate valid curriculum after 2 attempts")
    );

    const res = await POST(
      makeRequest({ url: "karpathy/micrograd", preferences: validPreferences })
    );
    expect(res.status).toBe(502);

    const body = await res.json();
    expect(body.error).toBe("generation_failed");
  });

  it("saves to cache in background after generation", async () => {
    mockCheckCache.mockResolvedValue({ hit: false });
    mockAnalyzeRepo.mockResolvedValue({
      metadata: {
        owner: "karpathy",
        name: "micrograd",
        fullName: "karpathy/micrograd",
        description: "test",
        language: "Python",
        stars: 1,
        defaultBranch: "main",
        topics: [],
      },
      classification: {
        size: "small",
        fileCount: 5,
        estimatedLOC: 200,
        blocked: false,
        message: "Good",
      },
      repoType: "tutorial",
      selectedFiles: { fetch: [], totalCodeFiles: 5, estimatedLOC: 200 },
      alternatives: [],
      fileContents: new Map([["README.md", "# test"]]),
    });
    mockGenerateCurriculum.mockResolvedValue({
      curriculum,
      model: "gemini-2.0-flash",
    });

    await POST(makeRequest({ url: "karpathy/micrograd", preferences: validPreferences }));

    // saveToCache should be called (fire-and-forget)
    // Allow microtask queue to flush
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSaveToCache).toHaveBeenCalledWith(curriculum, "main", "gemini-2.0-flash");
  });

  it("includes rate limit headers in response", async () => {
    mockCheckCache.mockResolvedValue({
      hit: true,
      curriculum,
      metadata: cacheMetadata,
    });

    const res = await POST(
      makeRequest({ url: "karpathy/micrograd", preferences: validPreferences })
    );

    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("99");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/analyze-repo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_json");
  });
});
