import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildSummaryDocId,
  lookupSummary,
  saveSummary,
  fetchReadme,
  fetchCodeContext,
  fetchGistContext,
  isGistId,
  generateSummary,
  getOrGenerateSummary,
  buildSummaryPrompt,
  buildCodeSummaryPrompt,
  findCuratedRepo,
  buildSummaryFromCurated,
  COLLECTION,
  SUMMARY_VERSION,
  type SummaryRecord,
  type CourseSummary,
} from "../lib/course-summary";

// ---------- Mocks ----------

const mockGet = vi.fn();
const mockSet = vi.fn();

const mockDoc = vi.fn().mockReturnValue({
  get: mockGet,
  set: mockSet,
});

const mockCollection = vi.fn().mockReturnValue({
  doc: mockDoc,
});

vi.mock("../lib/firebase-admin", () => ({
  getAdminFirestore: () => ({
    collection: (...args: unknown[]) => mockCollection(...args),
  }),
}));

vi.mock("../lib/env", () => ({
  getServerEnv: () => ({
    GEMINI_API_KEY: "test-api-key",
    GITHUB_PERSONAL_TOKEN: "test-github-token",
  }),
}));

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => ({
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
}));

// ---------- Fixtures ----------

const sampleSummary: CourseSummary = {
  tagline: "A tiny autograd engine for learning backpropagation",
  about:
    "Micrograd is a minimalist autograd engine. It implements backpropagation over a dynamically built DAG.",
  whyLearn:
    "Studying micrograd teaches you the core of how neural networks learn. You will understand gradients from first principles.",
  youWillLearn: [
    "Automatic differentiation",
    "Backpropagation algorithm",
    "Computational graphs",
    "Neural network training",
  ],
  prerequisites: ["Basic Python syntax", "High school calculus"],
  difficulty: "beginner",
  language: "Python",
  estimatedMinutes: 480,
};

const sampleRecord: SummaryRecord = {
  owner: "karpathy",
  name: "micrograd",
  repoUrl: "https://github.com/karpathy/micrograd",
  summary: sampleSummary,
  generatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue({ get: mockGet, set: mockSet });
  mockCollection.mockReturnValue({ doc: mockDoc });
});

// ---------- Tests ----------

describe("buildSummaryDocId", () => {
  it("builds ID from owner and name", () => {
    expect(buildSummaryDocId("karpathy", "micrograd")).toBe(
      "karpathy_micrograd"
    );
  });

  it("sanitizes special characters", () => {
    expect(buildSummaryDocId("Some-User", "my.repo-name")).toBe(
      "some_user_my_repo_name"
    );
  });

  it("handles uppercase", () => {
    expect(buildSummaryDocId("Facebook", "React")).toBe("facebook_react");
  });

  it("removes leading/trailing underscores", () => {
    expect(buildSummaryDocId("--user--", "repo")).toBe("user_repo");
  });

  it("collapses consecutive special chars", () => {
    expect(buildSummaryDocId("user---name", "repo...name")).toBe(
      "user_name_repo_name"
    );
  });
});

describe("lookupSummary", () => {
  it("returns SummaryRecord when document exists", async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => sampleRecord });

    const result = await lookupSummary("karpathy_micrograd");

    expect(mockCollection).toHaveBeenCalledWith(COLLECTION);
    expect(mockDoc).toHaveBeenCalledWith("karpathy_micrograd");
    expect(result).toEqual(sampleRecord);
  });

  it("returns null when document does not exist", async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => undefined });

    const result = await lookupSummary("nonexistent");
    expect(result).toBeNull();
  });

  it("uses the summaries collection", async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => undefined });

    await lookupSummary("test_id");
    expect(mockCollection).toHaveBeenCalledWith("summaries");
  });
});

describe("saveSummary", () => {
  it("saves record to correct collection and doc", async () => {
    mockSet.mockResolvedValue(undefined);

    await saveSummary("karpathy_micrograd", sampleRecord);

    expect(mockCollection).toHaveBeenCalledWith(COLLECTION);
    expect(mockDoc).toHaveBeenCalledWith("karpathy_micrograd");
    expect(mockSet).toHaveBeenCalledWith(sampleRecord);
  });

  it("passes the full record to Firestore set", async () => {
    mockSet.mockResolvedValue(undefined);

    await saveSummary("test_id", sampleRecord);
    expect(mockSet).toHaveBeenCalledWith(sampleRecord);
  });
});

describe("fetchReadme", () => {
  it("returns content for successful fetch", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("# Hello World\nSome content"),
    });

    const result = await fetchReadme("karpathy", "micrograd");
    expect(result).toBe("# Hello World\nSome content");
  });

  it("returns null for 404 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await fetchReadme("private", "repo");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await fetchReadme("karpathy", "micrograd");
    expect(result).toBeNull();
  });

  it("truncates content over 6000 chars", async () => {
    const longContent = "x".repeat(10000);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(longContent),
    });

    const result = await fetchReadme("owner", "repo");
    expect(result).toHaveLength(6000);
  });
});

describe("fetchCodeContext", () => {
  it("returns context with repo metadata and code", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/repos/karpathy/micrograd") && !url.includes("/contents")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              description: "A tiny autograd engine",
              language: "Python",
              topics: ["autograd", "neural-networks"],
            }),
        });
      }
      if (url.includes("/contents/")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                name: "micrograd.py",
                type: "file",
                size: 500,
                download_url: "https://raw.githubusercontent.com/karpathy/micrograd/HEAD/micrograd.py",
              },
              {
                name: "setup.py",
                type: "file",
                size: 200,
                download_url: "https://raw.githubusercontent.com/karpathy/micrograd/HEAD/setup.py",
              },
            ]),
        });
      }
      if (url.includes("raw.githubusercontent.com")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve("class Value:\n    def __init__(self): pass"),
        });
      }
      return Promise.resolve({ ok: false });
    });

    const result = await fetchCodeContext("karpathy", "micrograd");

    expect(result).toContain("A tiny autograd engine");
    expect(result).toContain("Python");
    expect(result).toContain("class Value:");
  });

  it("returns null when contents API fails", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/repos/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ description: "", language: "" }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    const result = await fetchCodeContext("private", "repo");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await fetchCodeContext("karpathy", "micrograd");
    expect(result).toBeNull();
  });

  it("includes only code file extensions", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/repos/") && !url.includes("/contents")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ description: "test", language: "Python" }),
        });
      }
      if (url.includes("/contents/")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { name: "image.png", type: "file", size: 1000, download_url: "http://x/image.png" },
              { name: "data.csv", type: "file", size: 500, download_url: "http://x/data.csv" },
              { name: "main.py", type: "file", size: 300, download_url: "http://x/main.py" },
            ]),
        });
      }
      if (url === "http://x/main.py") {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve("print('hello')"),
        });
      }
      return Promise.resolve({ ok: false });
    });

    const result = await fetchCodeContext("owner", "repo");

    expect(result).toContain("main.py");
    expect(result).toContain("print('hello')");
    expect(result).not.toContain("image.png");
    expect(result).not.toContain("data.csv");
  });
});

describe("isGistId", () => {
  it("detects hex gist IDs", () => {
    expect(isGistId("8627fe009c40f57531cb18360106ce95")).toBe(true);
  });

  it("rejects short strings", () => {
    expect(isGistId("abcdef")).toBe(false);
  });

  it("rejects normal repo names", () => {
    expect(isGistId("micrograd")).toBe(false);
    expect(isGistId("next.js")).toBe(false);
    expect(isGistId("my-cool-repo")).toBe(false);
  });

  it("handles uppercase hex", () => {
    expect(isGistId("8627FE009C40F57531CB18360106CE95")).toBe(true);
  });
});

describe("fetchGistContext", () => {
  it("returns gist description and code content", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          description: "A Python training script",
          files: {
            "train.py": {
              filename: "train.py",
              language: "Python",
              content: "import torch\ndef train(): pass",
              size: 100,
            },
          },
        }),
    });

    const result = await fetchGistContext("abc123def456abc123def456abc123de");

    expect(result).toContain("A Python training script");
    expect(result).toContain("Python");
    expect(result).toContain("import torch");
    expect(result).toContain("train.py");
  });

  it("returns null when gist not found", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    const result = await fetchGistContext("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await fetchGistContext("abc123");
    expect(result).toBeNull();
  });

  it("handles gist with no description", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          description: null,
          files: {
            "main.py": {
              filename: "main.py",
              language: "Python",
              content: "print('hello')",
              size: 20,
            },
          },
        }),
    });

    const result = await fetchGistContext("abc123def456abc123def456abc123de");
    expect(result).toContain("main.py");
    expect(result).toContain("print('hello')");
    expect(result).not.toContain("Description");
  });

  it("limits to 5 files sorted by size", async () => {
    const files: Record<string, { filename: string; language: string; content: string; size: number }> = {};
    for (let i = 0; i < 8; i++) {
      files[`file${i}.py`] = {
        filename: `file${i}.py`,
        language: "Python",
        content: `# file ${i}`,
        size: (8 - i) * 100,
      };
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ description: "test", files }),
    });

    const result = await fetchGistContext("abc123def456abc123def456abc123de");
    // Should include the 5 smallest files
    expect(result).toContain("file7.py");
    expect(result).toContain("file6.py");
    expect(result).toContain("file5.py");
    expect(result).toContain("file4.py");
    expect(result).toContain("file3.py");
  });
});

describe("buildSummaryPrompt", () => {
  it("includes repo owner and name", () => {
    const prompt = buildSummaryPrompt("readme", "karpathy", "micrograd");
    expect(prompt).toContain("karpathy/micrograd");
  });

  it("includes README content", () => {
    const prompt = buildSummaryPrompt("# My README content", "owner", "repo");
    expect(prompt).toContain("# My README content");
  });

  it("includes example output for better quality", () => {
    const prompt = buildSummaryPrompt("readme", "owner", "repo");
    expect(prompt).toContain("EXAMPLE OUTPUT");
    expect(prompt).toContain("micrograd");
  });
});

describe("buildCodeSummaryPrompt", () => {
  it("includes repo owner and name", () => {
    const prompt = buildCodeSummaryPrompt("code here", "karpathy", "micrograd");
    expect(prompt).toContain("karpathy/micrograd");
  });

  it("includes code context", () => {
    const prompt = buildCodeSummaryPrompt(
      "class Value:\n    pass",
      "owner",
      "repo"
    );
    expect(prompt).toContain("class Value:");
  });

  it("mentions no README", () => {
    const prompt = buildCodeSummaryPrompt("code", "owner", "repo");
    expect(prompt).toContain("no README");
  });

  it("includes example output for better quality", () => {
    const prompt = buildCodeSummaryPrompt("code", "owner", "repo");
    expect(prompt).toContain("EXAMPLE OUTPUT");
    expect(prompt).toContain("HTTP server");
  });
});

describe("findCuratedRepo", () => {
  it("finds a known curated repo", () => {
    const repo = findCuratedRepo("karpathy", "micrograd");
    expect(repo).not.toBeNull();
    expect(repo!.owner).toBe("karpathy");
    expect(repo!.name).toBe("micrograd");
  });

  it("is case-insensitive", () => {
    const repo = findCuratedRepo("Karpathy", "MicroGrad");
    expect(repo).not.toBeNull();
    expect(repo!.owner).toBe("karpathy");
  });

  it("returns null for unknown repo", () => {
    expect(findCuratedRepo("random", "repo")).toBeNull();
  });

  it("finds all 11 curated repos", () => {
    const pairs = [
      ["karpathy", "micrograd"],
      ["karpathy", "makemore"],
      ["jaymody", "picoGPT"],
      ["karpathy", "minGPT"],
      ["karpathy", "nanoGPT"],
      ["karpathy", "llama2.c"],
      ["likejazz", "llama3.np"],
      ["naklecha", "llama3-from-scratch"],
      ["karpathy", "minbpe"],
      ["karpathy", "llm.c"],
      ["srush", "GPU-Puzzles"],
    ];
    for (const [owner, name] of pairs) {
      expect(findCuratedRepo(owner, name)).not.toBeNull();
    }
  });
});

describe("buildSummaryFromCurated", () => {
  const micrograd = findCuratedRepo("karpathy", "micrograd")!;
  const llmc = findCuratedRepo("karpathy", "llm.c")!;
  const nanoGPT = findCuratedRepo("karpathy", "nanoGPT")!;

  it("uses description as tagline", () => {
    const summary = buildSummaryFromCurated(micrograd);
    expect(summary.tagline).toBe(micrograd.description);
  });

  it("sets correct difficulty", () => {
    expect(buildSummaryFromCurated(micrograd).difficulty).toBe("beginner");
    expect(buildSummaryFromCurated(nanoGPT).difficulty).toBe("intermediate");
    expect(buildSummaryFromCurated(llmc).difficulty).toBe("advanced");
  });

  it("sets correct language", () => {
    expect(buildSummaryFromCurated(micrograd).language).toBe("Python");
    expect(buildSummaryFromCurated(llmc).language).toBe("C");
  });

  it("converts estimatedHours to minutes", () => {
    expect(buildSummaryFromCurated(micrograd).estimatedMinutes).toBe(480);
    expect(buildSummaryFromCurated(llmc).estimatedMinutes).toBe(1200);
  });

  it("generates 4-6 youWillLearn items", () => {
    const summary = buildSummaryFromCurated(micrograd);
    expect(summary.youWillLearn.length).toBeGreaterThanOrEqual(4);
    expect(summary.youWillLearn.length).toBeLessThanOrEqual(6);
  });

  it("includes topics in youWillLearn", () => {
    const summary = buildSummaryFromCurated(micrograd);
    expect(summary.youWillLearn[0]).toContain("Autograd");
  });

  it("adds more prerequisites for advanced difficulty", () => {
    const beginner = buildSummaryFromCurated(micrograd);
    const advanced = buildSummaryFromCurated(llmc);
    expect(advanced.prerequisites.length).toBeGreaterThan(
      beginner.prerequisites.length
    );
  });

  it("includes star count in whyLearn", () => {
    const summary = buildSummaryFromCurated(llmc);
    expect(summary.whyLearn).toContain("28.9k");
  });

  it("formats stars correctly for repos under 100k", () => {
    const summary = buildSummaryFromCurated(micrograd);
    expect(summary.whyLearn).toContain("14.7k");
  });

  it("includes about text with description and topic count", () => {
    const summary = buildSummaryFromCurated(micrograd);
    expect(summary.about).toContain(micrograd.description);
    expect(summary.about).toContain("12 topics");
  });

  it("returns all required fields", () => {
    const summary = buildSummaryFromCurated(micrograd);
    expect(summary.tagline).toBeTruthy();
    expect(summary.about).toBeTruthy();
    expect(summary.whyLearn).toBeTruthy();
    expect(summary.youWillLearn.length).toBeGreaterThan(0);
    expect(summary.prerequisites.length).toBeGreaterThan(0);
    expect(summary.difficulty).toBeTruthy();
    expect(summary.language).toBeTruthy();
    expect(summary.estimatedMinutes).toBeGreaterThan(0);
  });
});

describe("generateSummary", () => {
  it("calls Gemini with correct model", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleSummary),
    });

    await generateSummary("karpathy", "micrograd", "# README", "readme");

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.0-flash",
      })
    );
  });

  it("uses README prompt when contentType is readme", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleSummary),
    });

    await generateSummary("karpathy", "micrograd", "# README content", "readme");

    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.contents).toContain("# README content");
    expect(call.contents).toContain("README");
  });

  it("uses code prompt when contentType is code", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleSummary),
    });

    await generateSummary("karpathy", "micrograd", "class Value: pass", "code");

    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.contents).toContain("class Value: pass");
    expect(call.contents).toContain("no README");
  });

  it("throws when content is null", async () => {
    await expect(
      generateSummary("karpathy", "micrograd", null, "code")
    ).rejects.toThrow("Could not fetch content");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("returns parsed CourseSummary object", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleSummary),
    });

    const result = await generateSummary("karpathy", "micrograd", "# README", "readme");
    expect(result.tagline).toBe(sampleSummary.tagline);
    expect(result.youWillLearn).toEqual(sampleSummary.youWillLearn);
    expect(result.difficulty).toBe("beginner");
  });
});

describe("getOrGenerateSummary", () => {
  it("returns cached summary when version is current", async () => {
    const versionedRecord = { ...sampleRecord, version: SUMMARY_VERSION };
    mockGet.mockResolvedValue({ exists: true, data: () => versionedRecord });

    const result = await getOrGenerateSummary("someuser", "somerepo");

    expect(result.source).toBe("cache");
    expect(result.summary).toEqual(versionedRecord);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("regenerates when cached version is outdated", async () => {
    const staleRecord = { ...sampleRecord, version: 1 };
    mockGet.mockResolvedValue({ exists: true, data: () => staleRecord });
    mockSet.mockResolvedValue(undefined);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("# Updated README"),
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleSummary),
    });

    const result = await getOrGenerateSummary("someuser", "somerepo");

    expect(result.source).toBe("generated");
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it("regenerates when cached record has no version", async () => {
    // Old records from before versioning was added
    mockGet.mockResolvedValue({ exists: true, data: () => sampleRecord });
    mockSet.mockResolvedValue(undefined);

    // This is a curated repo, so it bypasses Gemini
    const result = await getOrGenerateSummary("karpathy", "micrograd");

    expect(result.source).toBe("curated");
    expect(result.summary.version).toBe(SUMMARY_VERSION);
  });

  it("uses curated shortcut for known repos (no Gemini)", async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => undefined });
    mockSet.mockResolvedValue(undefined);

    const result = await getOrGenerateSummary("karpathy", "micrograd");

    expect(result.source).toBe("curated");
    expect(result.summary.summary.language).toBe("Python");
    expect(result.summary.summary.difficulty).toBe("beginner");
    expect(result.summary.summary.tagline).toContain("autograd");
    expect(mockGenerateContent).not.toHaveBeenCalled();
    // Should still save to Firestore for future cache hits
    expect(mockSet).toHaveBeenCalled();
  });

  it("generates with README when available (non-curated repo)", async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => undefined });
    mockSet.mockResolvedValue(undefined);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("# README"),
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleSummary),
    });

    const result = await getOrGenerateSummary("someuser", "somerepo");

    expect(result.source).toBe("generated");
    expect(result.summary.summary).toEqual(sampleSummary);
    // Should use README prompt
    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.contents).toContain("# README");
  });

  it("uses gist API for gist-style repo names", async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => undefined });
    mockSet.mockResolvedValue(undefined);

    global.fetch = vi.fn().mockImplementation((url: string) => {
      // README fetch → 404
      if (url.includes("raw.githubusercontent.com")) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      // Gist API → success
      if (url.includes("api.github.com/gists/")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              description: "A training script for neural networks",
              files: {
                "train.py": {
                  filename: "train.py",
                  language: "Python",
                  content: "import torch\nmodel = torch.nn.Linear(10, 1)",
                  size: 50,
                },
              },
            }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleSummary),
    });

    const result = await getOrGenerateSummary(
      "karpathy",
      "8627fe009c40f57531cb18360106ce95"
    );

    expect(result.source).toBe("generated");
    // Should use code prompt with gist content
    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.contents).toContain("A training script");
    expect(call.contents).toContain("import torch");
  });

  it("falls back to code context when no README", async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => undefined });
    mockSet.mockResolvedValue(undefined);

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      // First call: README fetch → 404
      if (url.includes("raw.githubusercontent.com") && url.includes("README")) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      // GitHub API: repo metadata
      if (url.includes("api.github.com/repos/") && !url.includes("/contents")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              description: "A cool project",
              language: "Python",
              topics: ["ml"],
            }),
        });
      }
      // GitHub API: contents listing
      if (url.includes("/contents/")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                name: "main.py",
                type: "file",
                size: 200,
                download_url: "https://raw.githubusercontent.com/o/r/HEAD/main.py",
              },
            ]),
        });
      }
      // Code file fetch
      if (url.includes("main.py")) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve("def train(): pass"),
        });
      }
      return Promise.resolve({ ok: false });
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleSummary),
    });

    const result = await getOrGenerateSummary("owner", "repo");

    expect(result.source).toBe("generated");
    // Should use code prompt (mentions "no README")
    const call = mockGenerateContent.mock.calls[0][0];
    expect(call.contents).toContain("no README");
    expect(call.contents).toContain("A cool project");
  });

  it("saves to Firestore after generation", async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => undefined });
    mockSet.mockResolvedValue(undefined);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("# README"),
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleSummary),
    });

    await getOrGenerateSummary("karpathy", "micrograd");

    expect(mockCollection).toHaveBeenCalledWith(COLLECTION);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "karpathy",
        name: "micrograd",
        repoUrl: "https://github.com/karpathy/micrograd",
      })
    );
  });

  it("returns valid SummaryRecord structure", async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => undefined });
    mockSet.mockResolvedValue(undefined);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("# README"),
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(sampleSummary),
    });

    const result = await getOrGenerateSummary("karpathy", "micrograd");

    expect(result.summary.owner).toBe("karpathy");
    expect(result.summary.name).toBe("micrograd");
    expect(result.summary.repoUrl).toBe(
      "https://github.com/karpathy/micrograd"
    );
    expect(result.summary.summary).toBeDefined();
    expect(result.summary.generatedAt).toBeDefined();
  });
});
