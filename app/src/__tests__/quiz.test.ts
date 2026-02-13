import { describe, it, expect, vi, beforeEach } from "vitest";

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

import {
  generateQuiz,
  generateChallenge,
  parseQuizResponse,
  parseChallengeResponse,
  scoreQuiz,
  MODEL,
  type Quiz,
} from "../lib/quiz";

// ---------- Fixtures ----------

const baseRequest = {
  topicName: "Backpropagation",
  categoryName: "Foundations",
  repoFullName: "karpathy/micrograd",
  level: "intermediate",
  type: "quiz" as const,
};

const validQuizJSON = JSON.stringify({
  questions: [
    {
      question: "What is backpropagation?",
      options: [
        { label: "A", text: "A learning algorithm" },
        { label: "B", text: "A data structure" },
        { label: "C", text: "A programming language" },
        { label: "D", text: "A database query" },
      ],
      correctLabel: "A",
      explanation: "Backpropagation is a learning algorithm.",
    },
    {
      question: "What does the chain rule compute?",
      options: [
        { label: "A", text: "Sums" },
        { label: "B", text: "Products" },
        { label: "C", text: "Derivatives" },
        { label: "D", text: "Integrals" },
      ],
      correctLabel: "C",
      explanation: "The chain rule computes derivatives of composed functions.",
    },
  ],
});

const validChallengeJSON = JSON.stringify({
  title: "Implement Forward Pass",
  description: "Write a function that computes the forward pass.",
  starterCode: "def forward(x):\n    # TODO",
  hint: "Think about matrix multiplication",
  solution: "def forward(x):\n    return x @ W + b",
  language: "python",
});

// ---------- Tests ----------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateQuiz", () => {
  it("returns parsed quiz from AI response", async () => {
    mockGenerateContent.mockResolvedValue({ text: validQuizJSON });

    const quiz = await generateQuiz(baseRequest);
    expect(quiz.topicName).toBe("Backpropagation");
    expect(quiz.questions).toHaveLength(2);
  });

  it("includes topic context in prompt", async () => {
    mockGenerateContent.mockResolvedValue({ text: validQuizJSON });

    await generateQuiz(baseRequest);
    const prompt = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain("karpathy/micrograd");
    expect(prompt).toContain("Backpropagation");
    expect(prompt).toContain("intermediate");
  });

  it("throws on empty response", async () => {
    mockGenerateContent.mockResolvedValue({ text: "" });
    await expect(generateQuiz(baseRequest)).rejects.toThrow("AI returned empty response");
  });

  it("uses correct model", async () => {
    mockGenerateContent.mockResolvedValue({ text: validQuizJSON });
    await generateQuiz(baseRequest);
    expect(mockGenerateContent.mock.calls[0][0].model).toBe(MODEL);
  });

  it("uses temperature 0.6", async () => {
    mockGenerateContent.mockResolvedValue({ text: validQuizJSON });
    await generateQuiz(baseRequest);
    expect(mockGenerateContent.mock.calls[0][0].config.temperature).toBe(0.6);
  });
});

describe("generateChallenge", () => {
  it("returns parsed challenge from AI response", async () => {
    mockGenerateContent.mockResolvedValue({ text: validChallengeJSON });

    const challenge = await generateChallenge({ ...baseRequest, type: "challenge" });
    expect(challenge.topicName).toBe("Backpropagation");
    expect(challenge.title).toBe("Implement Forward Pass");
  });

  it("throws on empty response", async () => {
    mockGenerateContent.mockResolvedValue({ text: "" });
    await expect(
      generateChallenge({ ...baseRequest, type: "challenge" })
    ).rejects.toThrow("AI returned empty response");
  });
});

describe("parseQuizResponse", () => {
  it("parses valid JSON", () => {
    const quiz = parseQuizResponse(validQuizJSON, "Test");
    expect(quiz.questions).toHaveLength(2);
    expect(quiz.topicName).toBe("Test");
  });

  it("strips markdown fences", () => {
    const wrapped = "```json\n" + validQuizJSON + "\n```";
    const quiz = parseQuizResponse(wrapped, "Test");
    expect(quiz.questions).toHaveLength(2);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseQuizResponse("not json", "Test")).toThrow(
      "Failed to parse quiz JSON"
    );
  });

  it("throws on empty questions array", () => {
    expect(() =>
      parseQuizResponse(JSON.stringify({ questions: [] }), "Test")
    ).toThrow("Quiz has no questions");
  });

  it("throws on missing question fields", () => {
    const invalid = JSON.stringify({
      questions: [{ question: "Q?" }],
    });
    expect(() => parseQuizResponse(invalid, "Test")).toThrow(
      "Quiz question missing required fields"
    );
  });

  it("throws on wrong number of options", () => {
    const invalid = JSON.stringify({
      questions: [
        {
          question: "Q?",
          options: [{ label: "A", text: "X" }],
          correctLabel: "A",
          explanation: "Because",
        },
      ],
    });
    expect(() => parseQuizResponse(invalid, "Test")).toThrow(
      "Each question must have exactly 4 options"
    );
  });

  it("throws on invalid correctLabel", () => {
    const invalid = JSON.stringify({
      questions: [
        {
          question: "Q?",
          options: [
            { label: "A", text: "X" },
            { label: "B", text: "Y" },
            { label: "C", text: "Z" },
            { label: "D", text: "W" },
          ],
          correctLabel: "E",
          explanation: "Because",
        },
      ],
    });
    expect(() => parseQuizResponse(invalid, "Test")).toThrow(
      "correctLabel must be A, B, C, or D"
    );
  });
});

describe("parseChallengeResponse", () => {
  it("parses valid JSON", () => {
    const challenge = parseChallengeResponse(validChallengeJSON, "Test");
    expect(challenge.title).toBe("Implement Forward Pass");
    expect(challenge.topicName).toBe("Test");
  });

  it("strips markdown fences", () => {
    const wrapped = "```json\n" + validChallengeJSON + "\n```";
    const challenge = parseChallengeResponse(wrapped, "Test");
    expect(challenge.title).toBe("Implement Forward Pass");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseChallengeResponse("not json", "Test")).toThrow(
      "Failed to parse challenge JSON"
    );
  });

  it("throws on missing required fields", () => {
    const invalid = JSON.stringify({ title: "T" });
    expect(() => parseChallengeResponse(invalid, "Test")).toThrow(
      "Challenge missing required fields"
    );
  });

  it("defaults language to python", () => {
    const noLang = JSON.stringify({
      title: "T",
      description: "D",
      starterCode: "code",
      hint: "H",
      solution: "S",
    });
    const challenge = parseChallengeResponse(noLang, "Test");
    expect(challenge.language).toBe("python");
  });
});

describe("scoreQuiz", () => {
  const quiz: Quiz = {
    topicName: "Test",
    questions: [
      {
        question: "Q1",
        options: [
          { label: "A", text: "X" },
          { label: "B", text: "Y" },
          { label: "C", text: "Z" },
          { label: "D", text: "W" },
        ],
        correctLabel: "A",
        explanation: "A is correct",
      },
      {
        question: "Q2",
        options: [
          { label: "A", text: "X" },
          { label: "B", text: "Y" },
          { label: "C", text: "Z" },
          { label: "D", text: "W" },
        ],
        correctLabel: "C",
        explanation: "C is correct",
      },
    ],
  };

  it("scores all correct", () => {
    const result = scoreQuiz(quiz, { 0: "A", 1: "C" });
    expect(result.score).toBe(2);
    expect(result.total).toBe(2);
    expect(result.answers.every((a) => a.correct)).toBe(true);
  });

  it("scores all wrong", () => {
    const result = scoreQuiz(quiz, { 0: "B", 1: "D" });
    expect(result.score).toBe(0);
    expect(result.answers.every((a) => !a.correct)).toBe(true);
  });

  it("scores partial", () => {
    const result = scoreQuiz(quiz, { 0: "A", 1: "D" });
    expect(result.score).toBe(1);
  });

  it("handles missing answers as wrong", () => {
    const result = scoreQuiz(quiz, {});
    expect(result.score).toBe(0);
  });

  it("includes completedAt timestamp", () => {
    const result = scoreQuiz(quiz, { 0: "A", 1: "C" });
    expect(result.completedAt).toBeDefined();
  });
});
