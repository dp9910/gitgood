import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildFeasibilityPrompt,
  buildOutlinePrompt,
  buildLessonPrompt,
  buildAssessmentPrompt,
  parseJsonResponse,
  analyzeFeasibility,
  generateOutline,
  generateModuleContent,
  generateAssessments,
  generateFullCourse,
  _resetClient,
  MODEL,
  type FeasibilityResult,
  type CourseOutline,
} from "../lib/course-generator";

// ---------- Mocks ----------

vi.mock("../lib/env", () => ({
  getServerEnv: () => ({
    GEMINI_API_KEY: "test-api-key",
  }),
}));

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: (...args: unknown[]) => mockGenerateContent(...args),
      };
    },
    Type: {
      OBJECT: "OBJECT",
      STRING: "STRING",
      NUMBER: "NUMBER",
      BOOLEAN: "BOOLEAN",
      ARRAY: "ARRAY",
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  _resetClient();
});

// ---------- Fixtures ----------

const sampleFeasibility: FeasibilityResult = {
  canLearn: true,
  complexity: "moderate",
  prerequisites: ["Basic Python", "Variables and functions"],
  estimatedHours: { beginner: 8, intermediate: 5, advanced: 3 },
  reason: null,
  language: "python",
  description: "A tiny autograd engine with neural network training",
};

const sampleOutline: CourseOutline = {
  title: "Understanding Micrograd: Autograd from Scratch",
  description: "Learn how automatic differentiation works",
  prerequisites: ["Basic Python"],
  estimatedHours: 8,
  modules: [
    {
      id: 1,
      title: "Introduction to Autograd",
      description: "What is automatic differentiation?",
      estimatedMinutes: 45,
      objectives: ["Understand backpropagation", "Build a Value class"],
      lessonCount: 2,
    },
    {
      id: 2,
      title: "Building Neural Networks",
      description: "From neurons to layers",
      estimatedMinutes: 60,
      objectives: ["Implement a neuron", "Create layers"],
      lessonCount: 2,
    },
  ],
};

const sampleCode = `
class Value:
    def __init__(self, data, _children=(), _op=''):
        self.data = data
        self.grad = 0
        self._backward = lambda: None
        self._prev = set(_children)
        self._op = _op

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), '+')
        def _backward():
            self.grad += out.grad
            other.grad += out.grad
        out._backward = _backward
        return out
`;

// ---------- Prompt builders ----------

describe("buildFeasibilityPrompt", () => {
  it("includes code content, language, and source URL", () => {
    const prompt = buildFeasibilityPrompt(sampleCode, "python", "https://gist.github.com/test");
    expect(prompt).toContain("python");
    expect(prompt).toContain("https://gist.github.com/test");
    expect(prompt).toContain("class Value:");
    expect(prompt).toContain("educational");
  });

  it("truncates very long code", () => {
    const longCode = "x".repeat(20000);
    const prompt = buildFeasibilityPrompt(longCode, "python", "https://example.com");
    expect(prompt.length).toBeLessThan(20000 + 2000); // code + prompt template
  });
});

describe("buildOutlinePrompt", () => {
  it("includes level guidance and feasibility info", () => {
    const prompt = buildOutlinePrompt(
      sampleCode,
      "python",
      "beginner",
      sampleFeasibility,
      "https://example.com"
    );
    expect(prompt).toContain("Beginner");
    expect(prompt).toContain("moderate");
    expect(prompt).toContain("exactly 4-5 modules");
  });

  it("uses correct estimated hours for intermediate", () => {
    const prompt = buildOutlinePrompt(
      sampleCode,
      "python",
      "intermediate",
      sampleFeasibility,
      "https://example.com"
    );
    expect(prompt).toContain("Intermediate");
    expect(prompt).toContain("5");
  });

  it("uses correct estimated hours for advanced", () => {
    const prompt = buildOutlinePrompt(
      sampleCode,
      "python",
      "advanced",
      sampleFeasibility,
      "https://example.com"
    );
    expect(prompt).toContain("Advanced");
    expect(prompt).toContain("3");
  });
});

describe("buildLessonPrompt", () => {
  it("includes module info and cliffhanger instruction for non-final", () => {
    const prompt = buildLessonPrompt(
      sampleCode,
      "python",
      "beginner",
      sampleOutline.modules[0],
      "Test Course",
      0,
      2
    );
    expect(prompt).toContain("MODULE 1/2");
    expect(prompt).toContain("Introduction to Autograd");
    expect(prompt).toContain("Why does this matter");
    expect(prompt).toContain("cliffhanger");
  });

  it("includes celebration instruction for final module", () => {
    const prompt = buildLessonPrompt(
      sampleCode,
      "python",
      "beginner",
      sampleOutline.modules[1],
      "Test Course",
      1,
      2
    );
    expect(prompt).toContain("MODULE 2/2");
    expect(prompt).toContain("celebration");
    expect(prompt).not.toContain("cliffhanger");
  });
});

describe("buildAssessmentPrompt", () => {
  it("includes all module names and level guidance", () => {
    const prompt = buildAssessmentPrompt(
      sampleCode,
      "python",
      "beginner",
      sampleOutline
    );
    expect(prompt).toContain("Introduction to Autograd");
    expect(prompt).toContain("Building Neural Networks");
    expect(prompt).toContain("Beginner");
    expect(prompt).toContain("Encouraging");
  });

  it("includes design thinking for advanced level", () => {
    const prompt = buildAssessmentPrompt(
      sampleCode,
      "python",
      "advanced",
      sampleOutline
    );
    expect(prompt).toContain("design thinking");
  });
});

// ---------- JSON parsing ----------

describe("parseJsonResponse", () => {
  it("parses clean JSON", () => {
    const result = parseJsonResponse('{"key": "value"}');
    expect(result).toEqual({ key: "value" });
  });

  it("strips markdown code fences", () => {
    const result = parseJsonResponse('```json\n{"key": "value"}\n```');
    expect(result).toEqual({ key: "value" });
  });

  it("extracts JSON from surrounding text", () => {
    const result = parseJsonResponse('Here is the result:\n{"key": "value"}\nDone!');
    expect(result).toEqual({ key: "value" });
  });

  it("throws on completely invalid input", () => {
    expect(() => parseJsonResponse("not json at all")).toThrow();
  });

  it("handles nested JSON objects", () => {
    const nested = '{"outer": {"inner": [1, 2, 3]}}';
    const result = parseJsonResponse(nested);
    expect(result).toEqual({ outer: { inner: [1, 2, 3] } });
  });
});

// ---------- Generation steps ----------

describe("analyzeFeasibility", () => {
  it("returns parsed feasibility result", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleFeasibility),
    });

    const result = await analyzeFeasibility(sampleCode, "python", "https://example.com");

    expect(result.canLearn).toBe(true);
    expect(result.complexity).toBe("moderate");
    expect(result.prerequisites).toContain("Basic Python");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("retries on parse failure", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: "invalid json response" })
      .mockResolvedValueOnce({ text: JSON.stringify(sampleFeasibility) });

    const result = await analyzeFeasibility(sampleCode, "python", "https://example.com");

    expect(result.canLearn).toBe(true);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("throws after 2 failed attempts", async () => {
    mockGenerateContent.mockResolvedValue({ text: "not json" });

    await expect(
      analyzeFeasibility(sampleCode, "python", "https://example.com")
    ).rejects.toThrow("Failed to parse structured response");
  });

  it("uses lower temperature on retry", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: "bad" })
      .mockResolvedValueOnce({ text: JSON.stringify(sampleFeasibility) });

    await analyzeFeasibility(sampleCode, "python", "https://example.com");

    const firstCall = mockGenerateContent.mock.calls[0][0];
    const secondCall = mockGenerateContent.mock.calls[1][0];
    expect(firstCall.config.temperature).toBe(0.3);
    expect(secondCall.config.temperature).toBe(0.15); // 0.3 * 0.5
  });
});

describe("generateOutline", () => {
  it("returns parsed outline", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleOutline),
    });

    const result = await generateOutline(
      sampleCode,
      "python",
      "beginner",
      sampleFeasibility,
      "https://example.com"
    );

    expect(result.title).toBe("Understanding Micrograd: Autograd from Scratch");
    expect(result.modules).toHaveLength(2);
  });

  it("throws after 2 failed parse attempts", async () => {
    mockGenerateContent.mockResolvedValue({ text: "bad json" });

    await expect(
      generateOutline(sampleCode, "python", "beginner", sampleFeasibility, "https://example.com")
    ).rejects.toThrow("Failed to parse structured response");
  });
});

describe("generateModuleContent", () => {
  it("returns parsed lessons array", async () => {
    const lessons = [
      {
        id: 1,
        title: "What is Autograd?",
        content: "# Autograd\nAutomatic differentiation...",
        codeWalkthroughs: [{ code: "x = Value(2.0)", language: "python", explanation: "Creates a value" }],
        keyTakeaways: ["Autograd tracks computations"],
      },
    ];
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ lessons }),
    });

    const result = await generateModuleContent(
      sampleCode,
      "python",
      "beginner",
      sampleOutline.modules[0],
      "Test Course",
      0,
      2
    );

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("What is Autograd?");
    expect(result[0].codeWalkthroughs).toHaveLength(1);
  });
});

describe("generateAssessments", () => {
  it("returns module assessments and final assessment", async () => {
    const assessments = {
      moduleAssessments: [
        {
          moduleId: 1,
          quiz: {
            questions: [
              {
                type: "multiple_choice",
                question: "What is a gradient?",
                options: [
                  { label: "A", text: "A direction" },
                  { label: "B", text: "A value" },
                ],
                correctAnswer: "A",
                explanation: "A gradient indicates direction",
              },
            ],
          },
          challenge: {
            title: "Build a Value",
            description: "Implement the Value class",
            starterCode: "class Value:",
            hints: ["Start with __init__"],
            solution: "class Value:\n    def __init__(self, data):",
          },
        },
      ],
      finalAssessment: {
        questions: [
          {
            type: "multiple_choice",
            question: "Comprehensive Q",
            options: [
              { label: "A", text: "opt" },
              { label: "B", text: "opt" },
            ],
            correctAnswer: "A",
            explanation: "Because...",
          },
        ],
        passingScore: 70,
      },
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(assessments),
    });

    const result = await generateAssessments(
      sampleCode,
      "python",
      "beginner",
      sampleOutline
    );

    expect(result.moduleAssessments).toHaveLength(1);
    expect(result.moduleAssessments[0].quiz.questions).toHaveLength(1);
    expect(result.finalAssessment.passingScore).toBe(70);
  });
});

// ---------- Full pipeline ----------

describe("generateFullCourse", () => {
  it("runs all steps and assembles a complete course", async () => {
    // Step 1: Feasibility
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(sampleFeasibility),
    });

    // Step 2: Outline
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(sampleOutline),
    });

    // Step 3: Lessons for module 1
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        lessons: [
          {
            id: 1,
            title: "Lesson 1",
            content: "Content",
            codeWalkthroughs: [],
            keyTakeaways: ["takeaway"],
          },
        ],
      }),
    });

    // Step 3: Lessons for module 2
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        lessons: [
          {
            id: 1,
            title: "Lesson 2",
            content: "Content 2",
            codeWalkthroughs: [],
            keyTakeaways: ["takeaway 2"],
          },
        ],
      }),
    });

    // Step 4: Assessments
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        moduleAssessments: [
          {
            moduleId: 1,
            quiz: { questions: [] },
            challenge: {
              title: "Challenge 1",
              description: "Do something",
              starterCode: "",
              hints: [],
              solution: "",
            },
          },
          {
            moduleId: 2,
            quiz: { questions: [] },
            challenge: {
              title: "Challenge 2",
              description: "Do more",
              starterCode: "",
              hints: [],
              solution: "",
            },
          },
        ],
        finalAssessment: {
          questions: [],
          passingScore: 70,
        },
      }),
    });

    const result = await generateFullCourse({
      codeContent: sampleCode,
      language: "python",
      level: "beginner",
      sourceUrl: "https://gist.github.com/karpathy/test",
    });

    // Verify complete course structure
    expect(result.course.meta.level).toBe("beginner");
    expect(result.course.meta.language).toBe("python");
    expect(result.course.meta.title).toBe("Understanding Micrograd: Autograd from Scratch");
    expect(result.course.modules).toHaveLength(2);
    expect(result.course.modules[0].lessons).toHaveLength(1);
    expect(result.course.modules[1].lessons).toHaveLength(1);
    expect(result.course.finalAssessment.passingScore).toBe(70);
    expect(result.feasibility.canLearn).toBe(true);
    expect(result.model).toBe(MODEL);

    // 5 Gemini calls: feasibility + outline + 2 lessons + assessments
    expect(mockGenerateContent).toHaveBeenCalledTimes(5);
  });

  it("throws when feasibility says code is not learnable", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        ...sampleFeasibility,
        canLearn: false,
        reason: "This is just configuration data",
      }),
    });

    await expect(
      generateFullCourse({
        codeContent: "CONFIG = {}",
        language: "python",
        level: "beginner",
        sourceUrl: "https://example.com",
      })
    ).rejects.toThrow("not suitable for learning");
  });

  it("includes generatedAt timestamp in meta", async () => {
    const before = new Date().toISOString();

    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(sampleFeasibility) });
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ ...sampleOutline, modules: [] }),
    });
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        moduleAssessments: [],
        finalAssessment: { questions: [], passingScore: 70 },
      }),
    });

    const result = await generateFullCourse({
      codeContent: sampleCode,
      language: "python",
      level: "advanced",
      sourceUrl: "https://example.com",
    });

    const after = new Date().toISOString();
    expect(result.course.meta.generatedAt >= before).toBe(true);
    expect(result.course.meta.generatedAt <= after).toBe(true);
  });
});
