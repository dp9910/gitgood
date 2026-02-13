import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNextLevel, _resetClient } from "../lib/topic-content";

// ---------- Mocks ----------

vi.mock("../lib/env", () => ({
  getServerEnv: () => ({ GEMINI_API_KEY: "test-key" }),
}));

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: (...args: unknown[]) => mockGenerateContent(...args),
      };
    },
  };
});

import { getTopicContent } from "../lib/topic-content";

// ---------- Fixtures ----------

const request = {
  repoOwner: "karpathy",
  repoName: "micrograd",
  topicName: "Value Class",
  categoryName: "Foundations",
  subtopics: ["Wrapping scalars", "Operator overloading"],
  level: "intermediate",
  repoLanguage: "Python",
};

// ---------- Tests ----------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTopicContent", () => {
  it("returns generated content string", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "## Introduction\n\nThe Value class wraps scalars...",
    });

    const result = await getTopicContent(request);
    expect(result).toContain("Value class");
    expect(typeof result).toBe("string");
  });

  it("includes repo name in prompt", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "Content here",
    });

    await getTopicContent(request);
    const prompt = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain("karpathy/micrograd");
    expect(prompt).toContain("Value Class");
    expect(prompt).toContain("Python");
    expect(prompt).toContain("intermediate");
  });

  it("adjusts prompt for beginner level", async () => {
    mockGenerateContent.mockResolvedValue({ text: "Simple content" });

    await getTopicContent({ ...request, level: "beginner" });
    const prompt = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain("simple language");
    expect(prompt).toContain("analogies");
  });

  it("adjusts prompt for expert level", async () => {
    mockGenerateContent.mockResolvedValue({ text: "Advanced content" });

    await getTopicContent({ ...request, level: "expert" });
    const prompt = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain("implementation details");
    expect(prompt).toContain("performance");
  });

  it("throws on empty response", async () => {
    mockGenerateContent.mockResolvedValue({ text: "" });

    await expect(getTopicContent(request)).rejects.toThrow(
      "AI returned empty content"
    );
  });

  it("throws on null response", async () => {
    mockGenerateContent.mockResolvedValue({ text: null });

    await expect(getTopicContent(request)).rejects.toThrow(
      "AI returned empty content"
    );
  });

  it("uses temperature 0.5", async () => {
    mockGenerateContent.mockResolvedValue({ text: "Content" });

    await getTopicContent(request);
    expect(mockGenerateContent.mock.calls[0][0].config.temperature).toBe(0.5);
  });
});

describe("getNextLevel", () => {
  it("beginner -> intermediate", () => {
    expect(getNextLevel("beginner")).toBe("intermediate");
  });

  it("intermediate -> expert", () => {
    expect(getNextLevel("intermediate")).toBe("expert");
  });

  it("expert -> null (no next level)", () => {
    expect(getNextLevel("expert")).toBeNull();
  });
});
