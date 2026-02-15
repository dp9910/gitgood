import { describe, it, expect } from "vitest";
import {
  CURATED_REPOS,
  CATEGORIES,
  filterRepos,
  formatStars,
} from "../lib/curated-repos";

describe("CURATED_REPOS", () => {
  it("has at least 10 repos", () => {
    expect(CURATED_REPOS.length).toBeGreaterThanOrEqual(10);
  });

  it("all repos have required fields", () => {
    for (const repo of CURATED_REPOS) {
      expect(repo.owner).toBeTruthy();
      expect(repo.name).toBeTruthy();
      expect(repo.fullName).toBe(`${repo.owner}/${repo.name}`);
      expect(repo.description).toBeTruthy();
      expect(repo.stars).toBeGreaterThan(0);
      expect(repo.language).toBeTruthy();
      expect(repo.topics.length).toBeGreaterThan(0);
      expect(repo.category).toBeTruthy();
      expect(["beginner", "intermediate", "advanced"]).toContain(repo.difficulty);
    }
  });

  it("categories cover all repo categories", () => {
    const repoCategories = new Set(CURATED_REPOS.map((r) => r.category));
    for (const cat of repoCategories) {
      expect(CATEGORIES).toContain(cat);
    }
  });
});

describe("filterRepos", () => {
  it("returns all repos with no filter", () => {
    const result = filterRepos(CURATED_REPOS, "", "All");
    expect(result).toEqual(CURATED_REPOS);
  });

  it("filters by category", () => {
    const result = filterRepos(CURATED_REPOS, "", "GPT");
    expect(result.every((r) => r.category === "GPT")).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters by search query (name)", () => {
    const result = filterRepos(CURATED_REPOS, "micrograd", "All");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("micrograd");
  });

  it("filters by search query (language)", () => {
    const result = filterRepos(CURATED_REPOS, "Python", "All");
    expect(result.every((r) => r.language === "Python")).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters by search query (topic)", () => {
    const result = filterRepos(CURATED_REPOS, "transformers", "All");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].topics).toContain("transformers");
  });

  it("combines category and search filters", () => {
    const result = filterRepos(CURATED_REPOS, "Python", "GPT");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.category === "GPT")).toBe(true);
  });

  it("returns empty for no match", () => {
    const result = filterRepos(CURATED_REPOS, "xyznonexistent", "All");
    expect(result).toEqual([]);
  });

  it("is case insensitive", () => {
    const result = filterRepos(CURATED_REPOS, "MICROGRAD", "All");
    expect(result.length).toBe(1);
  });
});

describe("formatStars", () => {
  it("formats thousands as k", () => {
    expect(formatStars(10200)).toBe("10.2k");
  });

  it("omits .0 for round thousands", () => {
    expect(formatStars(130000)).toBe("130k");
  });

  it("keeps small numbers as-is", () => {
    expect(formatStars(500)).toBe("500");
  });

  it("formats exactly 1000 as 1k", () => {
    expect(formatStars(1000)).toBe("1k");
  });
});
