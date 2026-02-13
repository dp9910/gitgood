import { describe, it, expect } from "vitest";
import {
  getAppError,
  mapApiError,
  sanitizeInput,
  validateRepoUrl,
  isContentSafe,
} from "../lib/errors";

describe("getAppError", () => {
  it("returns error for known code", () => {
    const err = getAppError("invalid_url");
    expect(err.code).toBe("invalid_url");
    expect(err.message).toContain("Invalid URL");
    expect(err.retryable).toBe(false);
  });

  it("returns unknown error for unrecognized code", () => {
    const err = getAppError("unknown");
    expect(err.message).toContain("Something went wrong");
    expect(err.retryable).toBe(true);
  });

  it("includes action for actionable errors", () => {
    const err = getAppError("rate_limited");
    expect(err.action).toBeTruthy();
  });

  it("returns all error codes without throwing", () => {
    const codes = [
      "invalid_url", "private_repo", "repo_not_found", "no_readme",
      "unsupported_language", "repo_too_large", "rate_limited",
      "credits_depleted", "ai_generation_failed", "network_error",
      "auth_required", "invalid_input", "content_flagged", "unknown",
    ] as const;
    for (const code of codes) {
      expect(() => getAppError(code)).not.toThrow();
    }
  });
});

describe("mapApiError", () => {
  it("maps 401 to auth_required", () => {
    expect(mapApiError(401).code).toBe("auth_required");
  });

  it("maps 429 to rate_limited", () => {
    expect(mapApiError(429).code).toBe("rate_limited");
  });

  it("maps 404 to repo_not_found", () => {
    expect(mapApiError(404).code).toBe("repo_not_found");
  });

  it("maps 422 repo_too_large", () => {
    expect(mapApiError(422, "repo_too_large").code).toBe("repo_too_large");
  });

  it("uses errorCode when matching known code", () => {
    expect(mapApiError(502, "ai_generation_failed").code).toBe("ai_generation_failed");
  });

  it("falls back to unknown for unrecognized", () => {
    expect(mapApiError(500).code).toBe("unknown");
  });

  it("marks 5xx as retryable", () => {
    expect(mapApiError(500).retryable).toBe(true);
    expect(mapApiError(502).retryable).toBe(true);
  });

  it("uses custom message when provided", () => {
    const err = mapApiError(500, undefined, "Custom error message");
    expect(err.message).toBe("Custom error message");
  });
});

describe("sanitizeInput", () => {
  it("strips HTML tags", () => {
    expect(sanitizeInput("<script>alert('xss')</script>Hello")).toBe("Hello");
  });

  it("strips control characters", () => {
    expect(sanitizeInput("hello\x00world")).toBe("helloworld");
  });

  it("trims whitespace", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });

  it("truncates to max length", () => {
    const long = "a".repeat(5000);
    expect(sanitizeInput(long, 100).length).toBe(100);
  });

  it("preserves normal text", () => {
    expect(sanitizeInput("Hello, world! 123")).toBe("Hello, world! 123");
  });

  it("handles empty input", () => {
    expect(sanitizeInput("")).toBe("");
  });

  it("uses default max length of 4000", () => {
    const long = "a".repeat(5000);
    expect(sanitizeInput(long).length).toBe(4000);
  });
});

describe("validateRepoUrl", () => {
  it("validates shorthand format", () => {
    expect(validateRepoUrl("karpathy/micrograd")).toEqual({
      owner: "karpathy",
      repo: "micrograd",
    });
  });

  it("validates full URL", () => {
    expect(validateRepoUrl("https://github.com/karpathy/micrograd")).toEqual({
      owner: "karpathy",
      repo: "micrograd",
    });
  });

  it("strips .git suffix", () => {
    expect(
      validateRepoUrl("https://github.com/karpathy/micrograd.git")
    ).toEqual({ owner: "karpathy", repo: "micrograd" });
  });

  it("returns null for empty input", () => {
    expect(validateRepoUrl("")).toBeNull();
  });

  it("returns null for invalid URL", () => {
    expect(validateRepoUrl("not a url")).toBeNull();
  });

  it("returns null for too-long input", () => {
    expect(validateRepoUrl("a".repeat(501))).toBeNull();
  });

  it("handles URL without https", () => {
    expect(validateRepoUrl("github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("handles URL with www", () => {
    expect(validateRepoUrl("https://www.github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });
});

describe("isContentSafe", () => {
  it("returns true for normal repos", () => {
    expect(isContentSafe("A machine learning library")).toBe(true);
  });

  it("returns false for malware", () => {
    expect(isContentSafe("A malware toolkit")).toBe(false);
  });

  it("returns false for exploit", () => {
    expect(isContentSafe("Collection of exploit tools")).toBe(false);
  });

  it("returns false for hack tool in name", () => {
    expect(isContentSafe(null, "my-hack tool")).toBe(false);
  });

  it("returns true for null description", () => {
    expect(isContentSafe(null)).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isContentSafe("MALWARE toolkit")).toBe(false);
  });

  it("returns false for ransomware", () => {
    expect(isContentSafe("A ransomware simulator")).toBe(false);
  });

  it("returns false for keylogger", () => {
    expect(isContentSafe("Simple keylogger in Python")).toBe(false);
  });
});
