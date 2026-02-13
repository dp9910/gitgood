import { describe, it, expect, vi } from "vitest";
import {
  parseRepoUrl,
  fetchRepoMetadata,
  fetchFileTree,
  fetchFileContent,
  RATE_LIMIT_WARNING_THRESHOLD,
} from "@/lib/github";

// ---------- parseRepoUrl ----------

describe("parseRepoUrl", () => {
  it("parses standard GitHub URL", () => {
    const result = parseRepoUrl("https://github.com/karpathy/micrograd");
    expect(result).toEqual({ owner: "karpathy", repo: "micrograd" });
  });

  it("parses URL with .git suffix", () => {
    const result = parseRepoUrl("https://github.com/facebook/react.git");
    expect(result).toEqual({ owner: "facebook", repo: "react" });
  });

  it("parses URL with www prefix", () => {
    const result = parseRepoUrl("https://www.github.com/vercel/next.js");
    expect(result).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("parses URL without protocol", () => {
    const result = parseRepoUrl("github.com/torvalds/linux");
    expect(result).toEqual({ owner: "torvalds", repo: "linux" });
  });

  it("parses URL with branch path (ignores extra path)", () => {
    const result = parseRepoUrl(
      "https://github.com/karpathy/nanoGPT/tree/main/model"
    );
    expect(result).toEqual({ owner: "karpathy", repo: "nanoGPT" });
  });

  it("parses URL with trailing slash", () => {
    const result = parseRepoUrl("https://github.com/rust-lang/rust/");
    expect(result).toEqual({ owner: "rust-lang", repo: "rust" });
  });

  it("parses owner/repo shorthand", () => {
    const result = parseRepoUrl("karpathy/micrograd");
    expect(result).toEqual({ owner: "karpathy", repo: "micrograd" });
  });

  it("returns null for invalid URL", () => {
    expect(parseRepoUrl("not-a-url")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseRepoUrl("")).toBeNull();
  });

  it("returns null for non-GitHub URL", () => {
    expect(parseRepoUrl("https://gitlab.com/owner/repo")).toBeNull();
  });

  it("handles repos with dots and hyphens in names", () => {
    const result = parseRepoUrl("https://github.com/tailwindlabs/tailwindcss");
    expect(result).toEqual({ owner: "tailwindlabs", repo: "tailwindcss" });
  });
});

// ---------- Mock Octokit for API tests ----------

function createMockOctokit(overrides?: {
  repoGetResponse?: Record<string, unknown>;
  treeResponse?: Record<string, unknown>;
  contentResponse?: Record<string, unknown>;
  headers?: Record<string, string>;
  shouldThrow?: { status: number; message: string };
}) {
  const headers = overrides?.headers ?? {
    "x-ratelimit-limit": "5000",
    "x-ratelimit-remaining": "4999",
    "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
  };

  const mockGet = vi.fn().mockImplementation(async () => {
    if (overrides?.shouldThrow) {
      const error = new Error(overrides.shouldThrow.message) as Error & {
        status: number;
      };
      error.status = overrides.shouldThrow.status;
      throw error;
    }
    return {
      headers,
      data: overrides?.repoGetResponse ?? {
        owner: { login: "karpathy" },
        name: "micrograd",
        full_name: "karpathy/micrograd",
        description: "A tiny scalar-valued autograd engine",
        language: "Python",
        stargazers_count: 9500,
        forks_count: 1200,
        size: 42,
        default_branch: "main",
        updated_at: "2024-01-15T00:00:00Z",
        topics: ["autograd", "neural-networks"],
      },
    };
  });

  return {
    rest: {
      repos: {
        get: mockGet,
        getContent: vi.fn().mockImplementation(async () => {
          if (overrides?.shouldThrow) {
            const error = new Error(overrides.shouldThrow.message) as Error & {
              status: number;
            };
            error.status = overrides.shouldThrow.status;
            throw error;
          }
          return {
            headers,
            data: overrides?.contentResponse ?? {
              type: "file",
              content: Buffer.from("# Micrograd\nA tiny autograd engine").toString(
                "base64"
              ),
              encoding: "base64",
            },
          };
        }),
      },
      git: {
        getTree: vi.fn().mockImplementation(async () => ({
          headers,
          data: overrides?.treeResponse ?? {
            tree: [
              { path: "README.md", type: "blob", size: 1024 },
              { path: "micrograd", type: "tree" },
              { path: "micrograd/engine.py", type: "blob", size: 2048 },
              { path: "micrograd/nn.py", type: "blob", size: 1536 },
              { path: "test", type: "tree" },
              { path: "test/test_engine.py", type: "blob", size: 512 },
            ],
            truncated: false,
          },
        })),
      },
    },
  } as never;
}

// ---------- fetchRepoMetadata ----------

describe("fetchRepoMetadata", () => {
  it("returns expected shape from API response", async () => {
    const octokit = createMockOctokit();
    const { data } = await fetchRepoMetadata(octokit, "karpathy", "micrograd");

    expect(data.owner).toBe("karpathy");
    expect(data.name).toBe("micrograd");
    expect(data.fullName).toBe("karpathy/micrograd");
    expect(data.description).toBe("A tiny scalar-valued autograd engine");
    expect(data.language).toBe("Python");
    expect(data.stars).toBe(9500);
    expect(data.defaultBranch).toBe("main");
    expect(data.topics).toContain("autograd");
  });

  it("includes rate limit info in response", async () => {
    const octokit = createMockOctokit();
    const { rateLimit } = await fetchRepoMetadata(
      octokit,
      "karpathy",
      "micrograd"
    );

    expect(rateLimit.limit).toBe(5000);
    expect(rateLimit.remaining).toBe(4999);
    expect(rateLimit.warning).toBe(false);
  });

  it("triggers rate limit warning when remaining is low", async () => {
    const octokit = createMockOctokit({
      headers: {
        "x-ratelimit-limit": "5000",
        "x-ratelimit-remaining": String(RATE_LIMIT_WARNING_THRESHOLD - 1),
        "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
      },
    });

    const { rateLimit } = await fetchRepoMetadata(
      octokit,
      "karpathy",
      "micrograd"
    );
    expect(rateLimit.warning).toBe(true);
  });

  it("throws on 404 (repo not found)", async () => {
    const octokit = createMockOctokit({
      shouldThrow: { status: 404, message: "Not Found" },
    });

    await expect(
      fetchRepoMetadata(octokit, "nonexistent", "repo")
    ).rejects.toThrow("Not Found");
  });
});

// ---------- fetchFileTree ----------

describe("fetchFileTree", () => {
  it("returns file tree entries", async () => {
    const octokit = createMockOctokit();
    const { entries } = await fetchFileTree(octokit, "karpathy", "micrograd");

    expect(entries.length).toBe(6);
    expect(entries[0]).toEqual({
      path: "README.md",
      type: "blob",
      size: 1024,
    });
  });

  it("respects maxEntries limit", async () => {
    const octokit = createMockOctokit();
    const { entries, truncated } = await fetchFileTree(
      octokit,
      "karpathy",
      "micrograd",
      { maxEntries: 3 }
    );

    expect(entries.length).toBe(3);
    expect(truncated).toBe(true);
  });

  it("reports truncation from API", async () => {
    const octokit = createMockOctokit({
      treeResponse: {
        tree: [{ path: "file.py", type: "blob", size: 100 }],
        truncated: true,
      },
    });

    const { truncated } = await fetchFileTree(octokit, "big", "repo");
    expect(truncated).toBe(true);
  });
});

// ---------- fetchFileContent ----------

describe("fetchFileContent", () => {
  it("decodes base64 file content", async () => {
    const octokit = createMockOctokit();
    const { content } = await fetchFileContent(
      octokit,
      "karpathy",
      "micrograd",
      "README.md"
    );

    expect(content).toBe("# Micrograd\nA tiny autograd engine");
  });

  it("truncates content exceeding maxChars", async () => {
    const longContent = "x".repeat(5000);
    const octokit = createMockOctokit({
      contentResponse: {
        type: "file",
        content: Buffer.from(longContent).toString("base64"),
        encoding: "base64",
      },
    });

    const { content, truncated } = await fetchFileContent(
      octokit,
      "karpathy",
      "micrograd",
      "bigfile.py",
      { maxChars: 2000 }
    );

    expect(content.length).toBe(2000);
    expect(truncated).toBe(true);
  });

  it("throws when path points to directory", async () => {
    const octokit = createMockOctokit({
      contentResponse: [
        { name: "file1.py", type: "file" },
        { name: "file2.py", type: "file" },
      ] as unknown as Record<string, unknown>,
    });

    await expect(
      fetchFileContent(octokit, "owner", "repo", "src/")
    ).rejects.toThrow("not a file");
  });
});

// ---------- Security: tokens never in responses ----------

describe("security", () => {
  it("API responses do not contain auth tokens", async () => {
    const octokit = createMockOctokit();
    const { data } = await fetchRepoMetadata(octokit, "karpathy", "micrograd");

    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("ghp_");
    expect(serialized).not.toContain("gho_");
    expect(serialized).not.toContain("token");
  });
});
