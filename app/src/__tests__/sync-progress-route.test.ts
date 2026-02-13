import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Mocks ----------

vi.mock("../lib/auth-middleware", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("../lib/redis", () => ({
  getRedis: () => ({}),
}));

vi.mock("../lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

const mockCommitFile = vi.fn();
const mockFetchFileContent = vi.fn();
const mockGetContent = vi.fn();
const mockGetUserOctokit = vi.fn();

vi.mock("../lib/github", () => ({
  getUserOctokit: (...args: unknown[]) => mockGetUserOctokit(...args),
  commitFile: (...args: unknown[]) => mockCommitFile(...args),
  fetchFileContent: (...args: unknown[]) => mockFetchFileContent(...args),
}));

import { POST } from "../app/api/sync-progress/route";
import { requireAuth } from "../lib/auth-middleware";
import { checkRateLimit } from "../lib/rate-limit";
import { NextRequest } from "next/server";

// ---------- Helpers ----------

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/sync-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------- Tests ----------

beforeEach(() => {
  vi.clearAllMocks();

  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { uid: "user123", name: "testuser", email: "test@example.com" },
  });

  (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
    result: { allowed: true, remaining: 99 },
    headers: new Headers(),
  });

  mockGetUserOctokit.mockReturnValue({
    rest: {
      repos: {
        getContent: (...args: unknown[]) => mockGetContent(...args),
      },
    },
  });

  mockCommitFile.mockResolvedValue({ sha: "abc123", rateLimit: { remaining: 4999 } });
});

describe("POST /api/sync-progress", () => {
  it("returns 401 when not authenticated", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      result: { allowed: false, error: "rate_limited", message: "Too many requests", status: 429 },
      headers: new Headers(),
    });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(429);
  });

  it("returns 400 for missing fields", async () => {
    const res = await POST(makeRequest({ repoOwner: "karpathy" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("invalid_input");
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/sync-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("invalid_json");
  });

  it("creates new progress file when none exists", async () => {
    mockFetchFileContent.mockRejectedValue(new Error("Not found"));

    const res = await POST(
      makeRequest({
        repoOwner: "karpathy",
        repoName: "micrograd",
        progress: { "Backprop": { status: "completed" } },
        commitMessage: "Completed: Backprop",
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockCommitFile).toHaveBeenCalledWith(
      expect.anything(),
      "testuser",
      "learning-tracker",
      "karpathy-micrograd/progress.json",
      expect.stringContaining("Backprop"),
      "Completed: Backprop",
      expect.objectContaining({ sha: undefined })
    );
  });

  it("merges with existing progress on update", async () => {
    mockFetchFileContent.mockResolvedValue({
      content: JSON.stringify({ "Forward Pass": { status: "completed" } }),
    });
    mockGetContent.mockResolvedValue({
      data: { sha: "existing-sha-123", type: "file" },
    });

    const res = await POST(
      makeRequest({
        repoOwner: "karpathy",
        repoName: "micrograd",
        progress: { "Backprop": { status: "completed" } },
        commitMessage: "Completed: Backprop",
      })
    );

    expect(res.status).toBe(200);

    // Should have merged progress (both Forward Pass and Backprop)
    const commitArgs = mockCommitFile.mock.calls[0];
    const committedContent = JSON.parse(commitArgs[4]);
    expect(committedContent["Forward Pass"]).toBeDefined();
    expect(committedContent["Backprop"]).toBeDefined();
    expect(commitArgs[6]).toEqual({ sha: "existing-sha-123" });
  });

  it("returns 502 on commit failure", async () => {
    mockFetchFileContent.mockRejectedValue(new Error("Not found"));
    mockCommitFile.mockRejectedValue(new Error("GitHub API error"));

    const res = await POST(
      makeRequest({
        repoOwner: "karpathy",
        repoName: "micrograd",
        progress: { "Backprop": { status: "completed" } },
      })
    );

    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe("sync_failed");
  });

  it("uses default commit message when not provided", async () => {
    mockFetchFileContent.mockRejectedValue(new Error("Not found"));

    await POST(
      makeRequest({
        repoOwner: "karpathy",
        repoName: "micrograd",
        progress: { "Backprop": { status: "completed" } },
      })
    );

    const commitArgs = mockCommitFile.mock.calls[0];
    expect(commitArgs[5]).toBe("Learning session update");
  });

  it("returns success response with message", async () => {
    mockFetchFileContent.mockRejectedValue(new Error("Not found"));

    const res = await POST(
      makeRequest({
        repoOwner: "karpathy",
        repoName: "micrograd",
        progress: { "Backprop": { status: "completed" } },
      })
    );

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe("Progress synced");
  });
});
