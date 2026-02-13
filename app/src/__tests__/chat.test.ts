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

import { generateChatResponse, ACTION_PROMPTS, MODEL } from "../lib/chat";

// ---------- Fixtures ----------

const baseRequest = {
  message: "How does backpropagation work?",
  topicName: "Backpropagation",
  categoryName: "Foundations",
  repoFullName: "karpathy/micrograd",
  level: "intermediate",
};

// ---------- Tests ----------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("generateChatResponse", () => {
  it("returns AI response text", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "Backpropagation is the process of...",
    });

    const result = await generateChatResponse(baseRequest);
    expect(result).toBe("Backpropagation is the process of...");
  });

  it("includes topic context in prompt", async () => {
    mockGenerateContent.mockResolvedValue({ text: "Response" });

    await generateChatResponse(baseRequest);
    const prompt = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain("karpathy/micrograd");
    expect(prompt).toContain("Backpropagation");
    expect(prompt).toContain("intermediate");
  });

  it("includes user message in prompt", async () => {
    mockGenerateContent.mockResolvedValue({ text: "Response" });

    await generateChatResponse(baseRequest);
    const prompt = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain("How does backpropagation work?");
  });

  it("uses quiz action prompt when action is quiz", async () => {
    mockGenerateContent.mockResolvedValue({ text: "Quiz questions..." });

    await generateChatResponse({ ...baseRequest, action: "quiz" });
    const prompt = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain(ACTION_PROMPTS.quiz);
  });

  it("uses eli5 action prompt", async () => {
    mockGenerateContent.mockResolvedValue({ text: "Simple explanation..." });

    await generateChatResponse({ ...baseRequest, action: "eli5" });
    const prompt = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain("like I'm 5");
  });

  it("uses example action prompt", async () => {
    mockGenerateContent.mockResolvedValue({ text: "Code example..." });

    await generateChatResponse({ ...baseRequest, action: "example" });
    const prompt = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain("practical code example");
  });

  it("uses challenge action prompt", async () => {
    mockGenerateContent.mockResolvedValue({ text: "Challenge..." });

    await generateChatResponse({ ...baseRequest, action: "challenge" });
    const prompt = mockGenerateContent.mock.calls[0][0].contents;
    expect(prompt).toContain("coding challenge");
  });

  it("throws on empty response", async () => {
    mockGenerateContent.mockResolvedValue({ text: "" });

    await expect(generateChatResponse(baseRequest)).rejects.toThrow(
      "AI returned empty response"
    );
  });

  it("uses temperature 0.7", async () => {
    mockGenerateContent.mockResolvedValue({ text: "Response" });

    await generateChatResponse(baseRequest);
    expect(mockGenerateContent.mock.calls[0][0].config.temperature).toBe(0.7);
  });

  it("uses correct model", async () => {
    mockGenerateContent.mockResolvedValue({ text: "Response" });

    await generateChatResponse(baseRequest);
    expect(mockGenerateContent.mock.calls[0][0].model).toBe(MODEL);
  });
});
