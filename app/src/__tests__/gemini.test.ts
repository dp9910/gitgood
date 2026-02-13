import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateCurriculum,
  curriculumResponseSchema,
  MODEL,
  _resetClient,
} from "../lib/gemini";
import type { RepoMetadata } from "../lib/github";
import type { UserPreferences } from "../components/proficiency-modal";

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

// ---------- Fixtures ----------

const metadata: RepoMetadata = {
  owner: "karpathy",
  name: "micrograd",
  fullName: "karpathy/micrograd",
  description: "A tiny autograd engine",
  language: "Python",
  stars: 6800,
  forks: 800,
  size: 50,
  defaultBranch: "main",
  updatedAt: "2026-01-01",
  topics: ["machine-learning", "autograd"],
};

const preferences: UserPreferences = {
  level: "intermediate",
  goal: "understand",
  timeCommitment: "moderate",
};

const validResponse = {
  categories: [
    {
      name: "Foundations",
      description: "Core autograd concepts",
      topics: [
        {
          name: "Value Class",
          difficulty: "beginner",
          estimatedMinutes: 20,
          prerequisites: [],
          subtopics: ["Wrapping scalars", "Operator overloading"],
        },
        {
          name: "Backpropagation",
          difficulty: "intermediate",
          estimatedMinutes: 45,
          prerequisites: ["Value Class"],
          subtopics: ["Chain rule", "Topological sort", "Gradient computation"],
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- Schema validation ----------

describe("curriculumResponseSchema", () => {
  it("accepts valid curriculum JSON", () => {
    const result = curriculumResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it("rejects missing categories", () => {
    const result = curriculumResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid difficulty values", () => {
    const bad = {
      categories: [
        {
          name: "Test",
          description: "Test",
          topics: [
            {
              name: "Bad",
              difficulty: "hard", // not in enum
              estimatedMinutes: 10,
              prerequisites: [],
              subtopics: [],
            },
          ],
        },
      ],
    };
    const result = curriculumResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects non-number estimatedMinutes", () => {
    const bad = {
      categories: [
        {
          name: "Test",
          description: "Test",
          topics: [
            {
              name: "Bad",
              difficulty: "beginner",
              estimatedMinutes: "thirty",
              prerequisites: [],
              subtopics: [],
            },
          ],
        },
      ],
    };
    const result = curriculumResponseSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

// ---------- generateCurriculum ----------

describe("generateCurriculum", () => {
  it("returns parsed curriculum on valid AI response", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(validResponse),
    });

    const result = await generateCurriculum(
      metadata,
      "library",
      "# micrograd\nA tiny autograd engine",
      new Map([["engine.py", "class Value:"]]),
      preferences
    );

    expect(result.curriculum.repoOwner).toBe("karpathy");
    expect(result.curriculum.repoName).toBe("micrograd");
    expect(result.curriculum.categories).toHaveLength(1);
    expect(result.curriculum.categories[0].topics).toHaveLength(2);
    expect(result.model).toBe(MODEL);
  });

  it("strips markdown code fences from AI response", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "```json\n" + JSON.stringify(validResponse) + "\n```",
    });

    const result = await generateCurriculum(
      metadata,
      "library",
      "readme",
      new Map(),
      preferences
    );

    expect(result.curriculum.categories).toHaveLength(1);
  });

  it("retries once on malformed JSON", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: "not valid json {{{" })
      .mockResolvedValueOnce({ text: JSON.stringify(validResponse) });

    const result = await generateCurriculum(
      metadata,
      "library",
      "readme",
      new Map(),
      preferences
    );

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(result.curriculum.categories).toHaveLength(1);
  });

  it("uses lower temperature on retry", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: "broken" })
      .mockResolvedValueOnce({ text: JSON.stringify(validResponse) });

    await generateCurriculum(
      metadata,
      "library",
      "readme",
      new Map(),
      preferences
    );

    // First call: temp 0.7
    expect(mockGenerateContent.mock.calls[0][0].config.temperature).toBe(0.7);
    // Retry: temp 0.3
    expect(mockGenerateContent.mock.calls[1][0].config.temperature).toBe(0.3);
  });

  it("throws after 2 failed attempts", async () => {
    mockGenerateContent.mockResolvedValue({ text: "not json" });

    await expect(
      generateCurriculum(
        metadata,
        "library",
        "readme",
        new Map(),
        preferences
      )
    ).rejects.toThrow("Failed to generate valid curriculum after 2 attempts");

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("throws when schema validation fails (valid JSON but wrong shape)", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ categories: "not an array" }),
    });

    await expect(
      generateCurriculum(
        metadata,
        "library",
        "readme",
        new Map(),
        preferences
      )
    ).rejects.toThrow("Failed to generate valid curriculum");
  });

  it("passes repo metadata in prompt", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(validResponse),
    });

    await generateCurriculum(
      metadata,
      "tutorial",
      "readme text",
      new Map([["main.py", "print('hello')"]]),
      preferences
    );

    const prompt = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain("karpathy/micrograd");
    expect(prompt).toContain("Python");
    expect(prompt).toContain("tutorial");
    expect(prompt).toContain("intermediate");
    expect(prompt).toContain("understand");
  });

  it("handles empty text response", async () => {
    mockGenerateContent.mockResolvedValue({ text: "" });

    await expect(
      generateCurriculum(metadata, "library", "readme", new Map(), preferences)
    ).rejects.toThrow("Failed to generate valid curriculum");
  });

  it("handles null text response", async () => {
    mockGenerateContent.mockResolvedValue({ text: null });

    await expect(
      generateCurriculum(metadata, "library", "readme", new Map(), preferences)
    ).rejects.toThrow("Failed to generate valid curriculum");
  });
});
