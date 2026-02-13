import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  classifyRepoSize,
  detectRepoType,
  selectFilesToFetch,
  findAlternatives,
  type AlternativeRepo,
} from "../lib/repo-analysis";
import type { RepoMetadata, FileTreeEntry } from "../lib/github";

// ---------- Fixtures ----------

function makeMetadata(overrides: Partial<RepoMetadata> = {}): RepoMetadata {
  return {
    owner: "test",
    name: "repo",
    fullName: "test/repo",
    description: "A test repository",
    language: "Python",
    stars: 1000,
    forks: 100,
    size: 500,
    defaultBranch: "main",
    updatedAt: "2026-01-01T00:00:00Z",
    topics: [],
    ...overrides,
  };
}

function makeEntries(paths: string[]): FileTreeEntry[] {
  return paths.map((p) => ({
    path: p,
    type: "blob" as const,
    size: 2048, // ~2KB each
  }));
}

// ---------- classifyRepoSize ----------

describe("classifyRepoSize", () => {
  it("classifies small repos (<50 files, <5k LOC)", () => {
    const result = classifyRepoSize(20, 2000);
    expect(result.size).toBe("small");
    expect(result.blocked).toBe(false);
  });

  it("classifies medium repos (50-200 files)", () => {
    const result = classifyRepoSize(100, 10000);
    expect(result.size).toBe("medium");
    expect(result.blocked).toBe(false);
  });

  it("classifies large repos (200-500 files)", () => {
    const result = classifyRepoSize(300, 30000);
    expect(result.size).toBe("large");
    expect(result.blocked).toBe(false);
    expect(result.message).toContain("large project");
  });

  it("classifies massive repos (>500 files) and blocks them", () => {
    const result = classifyRepoSize(600, 60000);
    expect(result.size).toBe("massive");
    expect(result.blocked).toBe(true);
    expect(result.message).toContain("too large");
  });

  it("blocks on LOC alone even if file count is low", () => {
    const result = classifyRepoSize(100, 60000);
    expect(result.size).toBe("massive");
    expect(result.blocked).toBe(true);
  });

  it("blocks on file count alone even if LOC is low", () => {
    const result = classifyRepoSize(600, 1000);
    expect(result.size).toBe("massive");
    expect(result.blocked).toBe(true);
  });

  it("classifies boundary: 50 files as medium", () => {
    const result = classifyRepoSize(51, 3000);
    expect(result.size).toBe("medium");
  });

  it("classifies boundary: 200 files as large", () => {
    const result = classifyRepoSize(201, 10000);
    expect(result.size).toBe("large");
  });
});

// ---------- detectRepoType ----------

describe("detectRepoType", () => {
  it("detects tutorial from description", () => {
    const meta = makeMetadata({ description: "A tutorial for learning Python" });
    expect(detectRepoType(meta, [])).toBe("tutorial");
  });

  it("detects tutorial from topics", () => {
    const meta = makeMetadata({ topics: ["tutorial", "python"] });
    expect(detectRepoType(meta, [])).toBe("tutorial");
  });

  it("detects research from description", () => {
    const meta = makeMetadata({ description: "Implementation of arxiv paper 2024.1234" });
    expect(detectRepoType(meta, [])).toBe("research");
  });

  it("detects tool from CLI indicators", () => {
    const meta = makeMetadata({ description: "A CLI tool for formatting code" });
    expect(detectRepoType(meta, [])).toBe("tool");
  });

  it("detects tool from bin/ directory", () => {
    const meta = makeMetadata({ description: "Code formatter" });
    const entries = makeEntries(["bin/main.js", "lib/format.js"]);
    expect(detectRepoType(meta, entries)).toBe("tool");
  });

  it("detects application from routes directory", () => {
    const meta = makeMetadata({ description: "A web app" });
    const entries = makeEntries(["routes/index.ts", "routes/api.ts", "models/user.ts"]);
    expect(detectRepoType(meta, entries)).toBe("application");
  });

  it("detects application from pages directory", () => {
    const meta = makeMetadata({ description: "Next.js project" });
    const entries = makeEntries(["pages/index.tsx", "pages/about.tsx"]);
    expect(detectRepoType(meta, entries)).toBe("application");
  });

  it("defaults to library when no signals match", () => {
    const meta = makeMetadata({ description: "Useful utilities for data processing" });
    expect(detectRepoType(meta, [])).toBe("library");
  });
});

// ---------- selectFilesToFetch ----------

describe("selectFilesToFetch", () => {
  it("always includes priority files (README, package.json)", () => {
    const entries = makeEntries([
      "README.md",
      "package.json",
      "src/index.ts",
      "src/utils.ts",
    ]);
    const result = selectFilesToFetch(entries, "small");
    expect(result.fetch).toContain("README.md");
    expect(result.fetch).toContain("package.json");
  });

  it("fetches all files for small repos", () => {
    const entries = makeEntries([
      "README.md",
      "src/main.py",
      "src/model.py",
      "tests/test_main.py",
    ]);
    const result = selectFilesToFetch(entries, "small");
    expect(result.fetch).toHaveLength(4);
  });

  it("ignores node_modules and dotfiles", () => {
    const entries = makeEntries([
      "README.md",
      "node_modules/lodash/index.js",
      ".gitignore",
      ".eslintrc",
      "src/main.ts",
    ]);
    const result = selectFilesToFetch(entries, "small");
    expect(result.fetch).not.toContain("node_modules/lodash/index.js");
    expect(result.fetch).not.toContain(".gitignore");
    expect(result.fetch).not.toContain(".eslintrc");
  });

  it("ignores lock files", () => {
    const entries = makeEntries([
      "README.md",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
    ]);
    const result = selectFilesToFetch(entries, "small");
    expect(result.fetch).not.toContain("package-lock.json");
    expect(result.fetch).not.toContain("yarn.lock");
    expect(result.fetch).not.toContain("pnpm-lock.yaml");
  });

  it("samples files per directory for medium repos", () => {
    const paths: string[] = ["README.md"];
    for (let i = 0; i < 10; i++) paths.push(`src/file${i}.ts`);
    for (let i = 0; i < 10; i++) paths.push(`lib/file${i}.ts`);
    const entries = makeEntries(paths);

    const result = selectFilesToFetch(entries, "medium");
    // Should have README + 2 from src + 2 from lib = ~5
    expect(result.fetch.length).toBeLessThanOrEqual(10);
    expect(result.fetch.length).toBeGreaterThanOrEqual(3);
  });

  it("focuses on src/lib for large repos", () => {
    const paths: string[] = [
      "README.md",
      "src/core/a.ts",
      "src/core/b.ts",
      "src/utils/c.ts",
      "tests/test_a.ts",
      "docs/guide.md",
      "examples/demo.ts",
    ];
    const entries = makeEntries(paths);

    const result = selectFilesToFetch(entries, "large");
    expect(result.fetch).toContain("README.md");
    expect(result.fetch).toContain("src/core/a.ts");
    expect(result.fetch).not.toContain("tests/test_a.ts");
    expect(result.fetch).not.toContain("docs/guide.md");
  });

  it("caps at 80 files maximum", () => {
    const paths: string[] = [];
    for (let i = 0; i < 100; i++) paths.push(`file${i}.ts`);
    const entries = makeEntries(paths);

    const result = selectFilesToFetch(entries, "small");
    expect(result.fetch.length).toBeLessThanOrEqual(80);
  });

  it("estimates LOC from file sizes", () => {
    // Each file is 2048 bytes = 2KB → ~50 LOC each
    const entries = makeEntries(["a.ts", "b.ts"]);
    const result = selectFilesToFetch(entries, "small");
    expect(result.estimatedLOC).toBeGreaterThan(0);
    expect(result.totalCodeFiles).toBe(2);
  });
});

// ---------- findAlternatives ----------

describe("findAlternatives", () => {
  it("searches by topics and language", async () => {
    const mockSearch = vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            full_name: "alt/repo1",
            description: "Alternative 1",
            stargazers_count: 500,
            language: "Python",
          },
          {
            full_name: "alt/repo2",
            description: "Alternative 2",
            stargazers_count: 300,
            language: "Python",
          },
        ],
      },
    });

    const mockOctokit = {
      rest: { search: { repos: mockSearch } },
    } as unknown as import("octokit").Octokit;

    const meta = makeMetadata({
      topics: ["machine-learning", "neural-network"],
      language: "Python",
    });

    const results = await findAlternatives(mockOctokit, meta);

    expect(results).toHaveLength(2);
    expect(results[0].fullName).toBe("alt/repo1");
    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: "stars",
        order: "desc",
        per_page: 5,
      })
    );
  });

  it("excludes the original repo from results", async () => {
    const mockSearch = vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            full_name: "test/repo",
            description: "The original",
            stargazers_count: 1000,
            language: "Python",
          },
          {
            full_name: "alt/other",
            description: "Different repo",
            stargazers_count: 500,
            language: "Python",
          },
        ],
      },
    });

    const mockOctokit = {
      rest: { search: { repos: mockSearch } },
    } as unknown as import("octokit").Octokit;

    const meta = makeMetadata({ fullName: "test/repo" });
    const results = await findAlternatives(mockOctokit, meta);

    expect(results).toHaveLength(1);
    expect(results[0].fullName).toBe("alt/other");
  });

  it("returns empty array on API error", async () => {
    const mockSearch = vi.fn().mockRejectedValue(new Error("API error"));
    const mockOctokit = {
      rest: { search: { repos: mockSearch } },
    } as unknown as import("octokit").Octokit;

    const meta = makeMetadata();
    const results = await findAlternatives(mockOctokit, meta);
    expect(results).toEqual([]);
  });
});
