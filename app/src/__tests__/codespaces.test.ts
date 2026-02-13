import { describe, it, expect } from "vitest";
import {
  getCodespaceUrl,
  getGithubDevUrl,
  getGithubUrl,
  estimateFreeHours,
  isCodespacesSupported,
} from "../lib/codespaces";

describe("getCodespaceUrl", () => {
  it("generates correct URL with defaults", () => {
    const url = getCodespaceUrl({ owner: "karpathy", repo: "micrograd" });
    expect(url).toContain("codespaces.new/karpathy/micrograd");
    expect(url).toContain("quickstart=1");
    expect(url).toContain("ref=main");
  });

  it("uses custom branch", () => {
    const url = getCodespaceUrl({ owner: "o", repo: "r", branch: "dev" });
    expect(url).toContain("ref=dev");
  });
});

describe("getGithubDevUrl", () => {
  it("generates correct URL", () => {
    const url = getGithubDevUrl({ owner: "karpathy", repo: "micrograd" });
    expect(url).toBe("https://github.dev/karpathy/micrograd/tree/main");
  });

  it("includes file path", () => {
    const url = getGithubDevUrl({
      owner: "karpathy",
      repo: "micrograd",
      filePath: "micrograd/engine.py",
    });
    expect(url).toBe("https://github.dev/karpathy/micrograd/blob/main/micrograd/engine.py");
  });

  it("uses custom branch", () => {
    const url = getGithubDevUrl({ owner: "o", repo: "r", branch: "dev" });
    expect(url).toContain("/tree/dev");
  });
});

describe("getGithubUrl", () => {
  it("generates correct URL", () => {
    expect(getGithubUrl("karpathy", "micrograd")).toBe("https://github.com/karpathy/micrograd");
  });
});

describe("estimateFreeHours", () => {
  it("returns 30 hours for free plan", () => {
    const info = estimateFreeHours("free");
    expect(info.totalHours).toBe(30);
    expect(info.machineType).toBe("2-core");
  });

  it("returns 60 hours for pro plan", () => {
    const info = estimateFreeHours("pro");
    expect(info.totalHours).toBe(60);
  });

  it("defaults to free plan", () => {
    const info = estimateFreeHours();
    expect(info.totalHours).toBe(30);
  });

  it("includes description", () => {
    const info = estimateFreeHours("free");
    expect(info.description).toContain("30 hours");
    expect(info.description).toContain("Free");
  });
});

describe("isCodespacesSupported", () => {
  it("returns true for public repos", () => {
    expect(isCodespacesSupported(true)).toBe(true);
  });

  it("returns false for private repos", () => {
    expect(isCodespacesSupported(false)).toBe(false);
  });
});
