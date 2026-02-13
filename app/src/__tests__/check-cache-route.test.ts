import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Mocks ----------

const mockCheckCache = vi.fn();
const mockIncrementCacheUsage = vi.fn();

vi.mock("../lib/curriculum-cache", () => ({
  checkCache: (...args: unknown[]) => mockCheckCache(...args),
  incrementCacheUsage: (...args: unknown[]) => mockIncrementCacheUsage(...args),
}));

vi.mock("../lib/github", () => ({
  parseRepoUrl: (url: string) => {
    const match = url.match(/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  },
}));

vi.mock("../lib/env", () => ({
  getServerEnv: () => ({
    GITHUB_PERSONAL_TOKEN: "test",
  }),
}));

// Import AFTER mocks
import { POST } from "../app/api/check-cache/route";

// ---------- Helpers ----------

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/check-cache", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

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
        {
          name: "Backprop",
          difficulty: "intermediate",
          estimatedMinutes: 45,
          prerequisites: ["Value Class"],
          subtopics: ["Chain rule"],
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
  mockIncrementCacheUsage.mockResolvedValue(undefined);
});

describe("POST /api/check-cache", () => {
  it("returns cached: true on cache hit", async () => {
    mockCheckCache.mockResolvedValue({
      hit: true,
      curriculum,
      metadata: cacheMetadata,
    });

    const res = await POST(makeRequest({ url: "karpathy/micrograd" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.cached).toBe(true);
    expect(body.metadata.timesUsed).toBe(5);
    expect(body.categoryCount).toBe(1);
    expect(body.topicCount).toBe(2);
  });

  it("returns cached: false on cache miss", async () => {
    mockCheckCache.mockResolvedValue({ hit: false });

    const res = await POST(makeRequest({ url: "karpathy/micrograd" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.cached).toBe(false);
  });

  it("increments usage counter on cache hit", async () => {
    mockCheckCache.mockResolvedValue({
      hit: true,
      curriculum,
      metadata: cacheMetadata,
    });

    await POST(makeRequest({ url: "karpathy/micrograd" }));

    // Allow microtask queue to flush
    await new Promise((r) => setTimeout(r, 10));
    expect(mockIncrementCacheUsage).toHaveBeenCalledWith(
      "karpathy",
      "micrograd",
      cacheMetadata
    );
  });

  it("does not increment usage on cache miss", async () => {
    mockCheckCache.mockResolvedValue({ hit: false });

    await POST(makeRequest({ url: "karpathy/micrograd" }));

    await new Promise((r) => setTimeout(r, 10));
    expect(mockIncrementCacheUsage).not.toHaveBeenCalled();
  });

  it("returns 400 for missing URL", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("invalid_input");
  });

  it("returns 400 for invalid URL", async () => {
    const res = await POST(makeRequest({ url: "not-a-url" }));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("invalid_url");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/check-cache", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("invalid_json");
  });

  it("does not expose full curriculum data", async () => {
    mockCheckCache.mockResolvedValue({
      hit: true,
      curriculum,
      metadata: cacheMetadata,
    });

    const res = await POST(makeRequest({ url: "karpathy/micrograd" }));
    const body = await res.json();

    // Should NOT include the full curriculum — just counts
    expect(body.curriculum).toBeUndefined();
    expect(body.categoryCount).toBeDefined();
    expect(body.topicCount).toBeDefined();
  });
});
