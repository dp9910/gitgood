import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetOrGenerateSummary = vi.fn();

vi.mock("../lib/course-summary", () => ({
  getOrGenerateSummary: (...args: unknown[]) =>
    mockGetOrGenerateSummary(...args),
}));

import { POST } from "../app/api/course-summary/route";

// ---------- Fixtures ----------

const sampleSummaryRecord = {
  owner: "karpathy",
  name: "micrograd",
  repoUrl: "https://github.com/karpathy/micrograd",
  summary: {
    tagline: "A tiny autograd engine",
    about: "Micrograd is a minimalist autograd engine.",
    whyLearn: "Learn how neural networks work under the hood.",
    youWillLearn: ["Backpropagation", "Computational graphs"],
    prerequisites: ["Basic Python"],
    difficulty: "beginner",
    language: "Python",
    estimatedMinutes: 480,
  },
  generatedAt: "2026-01-01T00:00:00.000Z",
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/course-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/course-summary", () => {
  it("returns 200 with summary for valid input", async () => {
    mockGetOrGenerateSummary.mockResolvedValue({
      summary: sampleSummaryRecord,
      source: "cache",
    });

    const res = await POST(makeRequest({ owner: "karpathy", name: "micrograd" }) as never);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.owner).toBe("karpathy");
    expect(data.summary.name).toBe("micrograd");
  });

  it("returns source field", async () => {
    mockGetOrGenerateSummary.mockResolvedValue({
      summary: sampleSummaryRecord,
      source: "generated",
    });

    const res = await POST(makeRequest({ owner: "karpathy", name: "micrograd" }) as never);
    const data = await res.json();

    expect(data.source).toBe("generated");
  });

  it("passes correct owner and name", async () => {
    mockGetOrGenerateSummary.mockResolvedValue({
      summary: sampleSummaryRecord,
      source: "cache",
    });

    await POST(makeRequest({ owner: "trekhleb", name: "javascript-algorithms" }) as never);

    expect(mockGetOrGenerateSummary).toHaveBeenCalledWith(
      "trekhleb",
      "javascript-algorithms"
    );
  });

  it("returns 400 for missing owner", async () => {
    const res = await POST(makeRequest({ name: "micrograd" }) as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid_input");
  });

  it("returns 400 for missing name", async () => {
    const res = await POST(makeRequest({ owner: "karpathy" }) as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid_input");
  });

  it("returns 400 for non-string owner", async () => {
    const res = await POST(makeRequest({ owner: 123, name: "repo" }) as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid_input");
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/course-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const res = await POST(req as never);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid_json");
  });

  it("returns 502 when generation fails", async () => {
    mockGetOrGenerateSummary.mockRejectedValue(new Error("Gemini error"));

    const res = await POST(makeRequest({ owner: "karpathy", name: "micrograd" }) as never);
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toBe("generation_failed");
    // Unsafe error messages are replaced with a generic user-friendly message
    expect(data.message).toContain("Could not generate summary");
  });

  it("passes through safe error messages", async () => {
    mockGetOrGenerateSummary.mockRejectedValue(
      new Error("Could not fetch content for owner/repo. The repository may be private.")
    );

    const res = await POST(makeRequest({ owner: "owner", name: "repo" }) as never);
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.message).toContain("Could not fetch content");
  });

  it("sanitizes upstream API error messages", async () => {
    mockGetOrGenerateSummary.mockRejectedValue(
      new Error("Not Found - https://docs.github.com/rest/repos/repos#get-a-repository")
    );

    const res = await POST(makeRequest({ owner: "owner", name: "repo" }) as never);
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.message).not.toContain("docs.github.com");
    expect(data.message).toContain("Could not generate summary");
  });
});
