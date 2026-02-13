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

const mockLookupMaterial = vi.fn();
const mockSaveMaterial = vi.fn();
const mockMarkLevelGenerated = vi.fn();
const mockIncrementAccess = vi.fn();
vi.mock("../lib/material-index", () => ({
  buildDocumentId: (lang: string, owner: string, name: string) =>
    `${lang}_${owner}_${name}`.toLowerCase(),
  lookupMaterial: (...args: unknown[]) => mockLookupMaterial(...args),
  saveMaterial: (...args: unknown[]) => mockSaveMaterial(...args),
  markLevelGenerated: (...args: unknown[]) => mockMarkLevelGenerated(...args),
  incrementAccess: (...args: unknown[]) => mockIncrementAccess(...args),
}));

const mockFetchCourse = vi.fn();
const mockSaveCourse = vi.fn();
const mockSaveMeta = vi.fn();
vi.mock("../lib/material-storage", () => ({
  fetchCourse: (...args: unknown[]) => mockFetchCourse(...args),
  saveCourse: (...args: unknown[]) => mockSaveCourse(...args),
  saveMeta: (...args: unknown[]) => mockSaveMeta(...args),
}));

const mockGenerateFullCourse = vi.fn();
vi.mock("../lib/course-generator", () => ({
  generateFullCourse: (...args: unknown[]) => mockGenerateFullCourse(...args),
}));

const mockFetchGistContent = vi.fn();
const mockFetchFileContent = vi.fn();
vi.mock("../lib/github", () => ({
  parseRepoUrl: (url: string) => {
    const match = url.match(
      /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/
    );
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  },
  parseGistUrl: (url: string) => {
    const match = url.match(
      /(?:https?:\/\/)?gist\.github\.com\/([a-zA-Z0-9_.-]+)\/([a-f0-9]+)/
    );
    if (!match) return null;
    return { owner: match[1], gistId: match[2] };
  },
  getCacheOctokit: () => ({}),
  fetchGistContent: (...args: unknown[]) => mockFetchGistContent(...args),
  fetchFileContent: (...args: unknown[]) => mockFetchFileContent(...args),
}));

vi.mock("../lib/env", () => ({
  getServerEnv: () => ({
    GEMINI_API_KEY: "test",
    GITHUB_PERSONAL_TOKEN: "test",
  }),
}));

// Import AFTER mocks
import { POST } from "../app/api/generate-material/route";

// ---------- Helpers ----------

const defaultRateLimitHeaders = {
  "X-RateLimit-Limit": "100",
  "X-RateLimit-Remaining": "99",
  "X-RateLimit-Reset": "2026-02-13T00:00:00.000Z",
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/generate-material", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const sampleCourse = {
  meta: {
    repoUrl: "https://gist.github.com/karpathy/abc123",
    language: "python",
    level: "beginner",
    title: "Test Course",
    description: "A test course",
    prerequisites: [],
    estimatedHours: 8,
    moduleCount: 2,
    generatedAt: "2026-01-01T00:00:00.000Z",
    aiModel: "gemini-2.0-flash",
  },
  modules: [],
  finalAssessment: { questions: [], passingScore: 70 },
};

const sampleFeasibility = {
  canLearn: true,
  complexity: "moderate",
  prerequisites: ["Basic Python"],
  estimatedHours: { beginner: 8, intermediate: 5, advanced: 3 },
  reason: null,
  language: "python",
  description: "A tiny autograd engine",
};

const sampleMaterialRecord = {
  repoUrl: "https://gist.github.com/karpathy/abc123",
  owner: "karpathy",
  name: "abc123",
  language: "python",
  type: "gist" as const,
  description: "A tiny autograd engine",
  levels: {
    beginner: { generated: true, generatedAt: "2026-01-01T00:00:00.000Z" },
    intermediate: { generated: false, generatedAt: null },
    advanced: { generated: false, generatedAt: null },
  },
  feasibility: sampleFeasibility,
  timesAccessed: 5,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// ---------- Tests ----------

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ user: { uid: "user1", email: "a@b.com" } });
  mockCheckRateLimit.mockResolvedValue({
    result: { allowed: true, remaining: 99 },
    headers: defaultRateLimitHeaders,
  });
  mockSaveMaterial.mockResolvedValue(undefined);
  mockMarkLevelGenerated.mockResolvedValue(undefined);
  mockIncrementAccess.mockResolvedValue(undefined);
  mockSaveCourse.mockResolvedValue(undefined);
  mockSaveMeta.mockResolvedValue(undefined);
});

describe("POST /api/generate-material", () => {
  // --- Auth & Validation ---

  it("returns 401 if not authenticated", async () => {
    mockRequireAuth.mockResolvedValue({
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(
      makeRequest({ url: "https://gist.github.com/karpathy/abc123", level: "beginner" })
    );
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
      headers: defaultRateLimitHeaders,
    });

    const res = await POST(
      makeRequest({ url: "https://gist.github.com/karpathy/abc123", level: "beginner" })
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("daily_limit_reached");
  });

  it("returns 400 for missing URL", async () => {
    const res = await POST(makeRequest({ level: "beginner" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
  });

  it("returns 400 for missing level", async () => {
    const res = await POST(
      makeRequest({ url: "https://gist.github.com/karpathy/abc123" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
    expect(body.message).toContain("level");
  });

  it("returns 400 for invalid level", async () => {
    const res = await POST(
      makeRequest({ url: "https://gist.github.com/karpathy/abc123", level: "expert" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid URL (neither repo nor gist)", async () => {
    const res = await POST(makeRequest({ url: "https://google.com", level: "beginner" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_url");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/generate-material", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_json");
  });

  // --- Cache Hit ---

  it("returns cached course on Firestore hit + GitHub fetch", async () => {
    mockLookupMaterial.mockResolvedValue(sampleMaterialRecord);
    mockFetchCourse.mockResolvedValue(sampleCourse);

    const res = await POST(
      makeRequest({ url: "https://gist.github.com/karpathy/abc123", level: "beginner" })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.source).toBe("cache");
    expect(body.course.meta.title).toBe("Test Course");
    expect(body.feasibility).toEqual(sampleMaterialRecord.feasibility);
  });

  it("increments access count on cache hit", async () => {
    mockLookupMaterial.mockResolvedValue(sampleMaterialRecord);
    mockFetchCourse.mockResolvedValue(sampleCourse);

    await POST(
      makeRequest({ url: "https://gist.github.com/karpathy/abc123", level: "beginner" })
    );

    // Allow microtask queue to flush
    await new Promise((r) => setTimeout(r, 10));
    expect(mockIncrementAccess).toHaveBeenCalled();
  });

  // --- Cache Miss (Gist) ---

  it("generates course for a gist URL on cache miss", async () => {
    mockLookupMaterial.mockResolvedValue(null);
    mockFetchGistContent.mockResolvedValue({
      owner: "karpathy",
      gistId: "abc123",
      description: "microGPT",
      files: [
        { filename: "microgpt.py", language: "Python", content: "import torch\n..." },
      ],
    });
    mockGenerateFullCourse.mockResolvedValue({
      course: sampleCourse,
      feasibility: sampleFeasibility,
      model: "gemini-2.0-flash",
    });

    const res = await POST(
      makeRequest({ url: "https://gist.github.com/karpathy/abc123", level: "beginner" })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.source).toBe("generated");
    expect(body.course.meta.title).toBe("Test Course");
    expect(body.model).toBe("gemini-2.0-flash");
  });

  // --- Cache Miss (Repo) ---

  it("generates course for a repo URL on cache miss", async () => {
    mockLookupMaterial.mockResolvedValue(null);
    mockFetchFileContent
      .mockResolvedValueOnce({ content: "# Micrograd\nA tiny autograd engine", truncated: false })
      .mockResolvedValueOnce({ content: "class Value:\n    pass", truncated: false });
    mockGenerateFullCourse.mockResolvedValue({
      course: sampleCourse,
      feasibility: sampleFeasibility,
      model: "gemini-2.0-flash",
    });

    const res = await POST(
      makeRequest({
        url: "https://github.com/karpathy/micrograd",
        level: "intermediate",
      })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.source).toBe("generated");
  });

  // --- Error Handling ---

  it("returns 502 when code fetch fails", async () => {
    mockLookupMaterial.mockResolvedValue(null);
    mockFetchGistContent.mockRejectedValue(new Error("Not Found"));

    const res = await POST(
      makeRequest({ url: "https://gist.github.com/karpathy/abc123", level: "beginner" })
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
  });

  it("returns 502 when generation fails", async () => {
    mockLookupMaterial.mockResolvedValue(null);
    mockFetchGistContent.mockResolvedValue({
      owner: "karpathy",
      gistId: "abc123",
      description: "test",
      files: [{ filename: "test.py", language: "Python", content: "x = 1" }],
    });
    mockGenerateFullCourse.mockRejectedValue(
      new Error("This code is not suitable for learning")
    );

    const res = await POST(
      makeRequest({ url: "https://gist.github.com/karpathy/abc123", level: "beginner" })
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("generation_failed");
  });

  // --- Saving ---

  it("saves to GitHub and Firestore after generation", async () => {
    mockLookupMaterial.mockResolvedValue(null);
    mockFetchGistContent.mockResolvedValue({
      owner: "karpathy",
      gistId: "abc123",
      description: "test",
      files: [{ filename: "test.py", language: "Python", content: "x = 1" }],
    });
    mockGenerateFullCourse.mockResolvedValue({
      course: sampleCourse,
      feasibility: sampleFeasibility,
      model: "gemini-2.0-flash",
    });

    await POST(
      makeRequest({ url: "https://gist.github.com/karpathy/abc123", level: "beginner" })
    );

    // Allow microtask queue to flush
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSaveCourse).toHaveBeenCalled();
    expect(mockSaveMeta).toHaveBeenCalled();
    expect(mockSaveMaterial).toHaveBeenCalled();
  });

  it("marks level generated for existing material record", async () => {
    // First lookup returns record without intermediate generated
    const existingRecord = {
      ...sampleMaterialRecord,
      levels: {
        beginner: { generated: true, generatedAt: "2026-01-01T00:00:00.000Z" },
        intermediate: { generated: false, generatedAt: null },
        advanced: { generated: false, generatedAt: null },
      },
    };
    mockLookupMaterial.mockResolvedValue(existingRecord);
    mockFetchCourse.mockResolvedValue(null); // GitHub fetch fails, triggers regeneration
    mockFetchGistContent.mockResolvedValue({
      owner: "karpathy",
      gistId: "abc123",
      description: "test",
      files: [{ filename: "test.py", language: "Python", content: "x = 1" }],
    });
    mockGenerateFullCourse.mockResolvedValue({
      course: sampleCourse,
      feasibility: sampleFeasibility,
      model: "gemini-2.0-flash",
    });

    await POST(
      makeRequest({
        url: "https://gist.github.com/karpathy/abc123",
        level: "intermediate",
      })
    );

    await new Promise((r) => setTimeout(r, 10));
    expect(mockMarkLevelGenerated).toHaveBeenCalled();
  });

  // --- Rate limit headers ---

  it("includes rate limit headers in all responses", async () => {
    mockLookupMaterial.mockResolvedValue(sampleMaterialRecord);
    mockFetchCourse.mockResolvedValue(sampleCourse);

    const res = await POST(
      makeRequest({ url: "https://gist.github.com/karpathy/abc123", level: "beginner" })
    );

    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("99");
  });
});
