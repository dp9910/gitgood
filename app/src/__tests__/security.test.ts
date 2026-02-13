import { describe, it, expect } from "vitest";
import {
  buildCSP,
  generateCSRFToken,
  validateCSRFToken,
  detectXSS,
  getSecurityHeaders,
  validateRateLimitConfig,
  containsSensitiveData,
  DEFAULT_CSP,
} from "../lib/security";

describe("buildCSP", () => {
  it("builds a valid CSP string", () => {
    const csp = buildCSP();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src");
    expect(csp).toContain("style-src");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("includes allowed external sources", () => {
    const csp = buildCSP();
    expect(csp).toContain("fonts.googleapis.com");
    expect(csp).toContain("api.github.com");
    expect(csp).toContain("generativelanguage.googleapis.com");
  });

  it("accepts overrides", () => {
    const csp = buildCSP({ frameSrc: ["'self'", "https://example.com"] });
    expect(csp).toContain("frame-src 'self' https://example.com");
  });

  it("uses semicolons to separate directives", () => {
    const csp = buildCSP();
    const parts = csp.split("; ");
    expect(parts.length).toBeGreaterThanOrEqual(8);
  });
});

describe("generateCSRFToken", () => {
  it("generates a 64-character hex string", () => {
    const token = generateCSRFToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens", () => {
    const t1 = generateCSRFToken();
    const t2 = generateCSRFToken();
    expect(t1).not.toBe(t2);
  });
});

describe("validateCSRFToken", () => {
  it("returns true for matching tokens", () => {
    const token = generateCSRFToken();
    expect(validateCSRFToken(token, token)).toBe(true);
  });

  it("returns false for different tokens", () => {
    expect(validateCSRFToken("aaa", "bbb")).toBe(false);
  });

  it("returns false for empty tokens", () => {
    expect(validateCSRFToken("", "abc")).toBe(false);
    expect(validateCSRFToken("abc", "")).toBe(false);
  });

  it("returns false for different-length tokens", () => {
    expect(validateCSRFToken("abc", "abcd")).toBe(false);
  });
});

describe("detectXSS", () => {
  it("detects script tags", () => {
    expect(detectXSS("<script>alert(1)</script>")).toBe(true);
  });

  it("detects javascript: protocol", () => {
    expect(detectXSS("javascript:alert(1)")).toBe(true);
  });

  it("detects event handlers", () => {
    expect(detectXSS('<img onerror="alert(1)">')).toBe(true);
    expect(detectXSS('<div onclick="hack()">')).toBe(true);
  });

  it("detects iframe tags", () => {
    expect(detectXSS("<iframe src='evil.com'></iframe>")).toBe(true);
  });

  it("detects HTML entities", () => {
    expect(detectXSS("&#x3C;script&#x3E;")).toBe(true);
  });

  it("detects data:text/html", () => {
    expect(detectXSS("data:text/html,<script>alert(1)</script>")).toBe(true);
  });

  it("returns false for normal text", () => {
    expect(detectXSS("Hello, world! This is a normal string.")).toBe(false);
  });

  it("returns false for code examples", () => {
    expect(detectXSS("const x = 5; return x + 10;")).toBe(false);
  });

  it("returns false for markdown", () => {
    expect(detectXSS("## Heading\n- item 1\n- item 2")).toBe(false);
  });
});

describe("getSecurityHeaders", () => {
  it("returns all required headers", () => {
    const headers = getSecurityHeaders();
    const keys = headers.map((h) => h.key);
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Strict-Transport-Security");
    expect(keys).toContain("Content-Security-Policy");
  });

  it("includes descriptions for each header", () => {
    const headers = getSecurityHeaders();
    for (const h of headers) {
      expect(h.description).toBeTruthy();
      expect(h.description.length).toBeGreaterThan(10);
    }
  });

  it("has HSTS with long max-age", () => {
    const headers = getSecurityHeaders();
    const hsts = headers.find((h) => h.key === "Strict-Transport-Security");
    expect(hsts?.value).toContain("max-age=63072000");
    expect(hsts?.value).toContain("includeSubDomains");
  });
});

describe("validateRateLimitConfig", () => {
  it("returns no issues for valid config", () => {
    const issues = validateRateLimitConfig({
      ipLimit: 500,
      userDailyLimit: 100,
      cooldownSeconds: 3,
      maxInputTokens: 4000,
    });
    expect(issues).toHaveLength(0);
  });

  it("warns about too-low IP limit", () => {
    const issues = validateRateLimitConfig({
      ipLimit: 50,
      userDailyLimit: 100,
      cooldownSeconds: 3,
      maxInputTokens: 4000,
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain("IP rate limit too low");
  });

  it("warns about too-high IP limit", () => {
    const issues = validateRateLimitConfig({
      ipLimit: 50000,
      userDailyLimit: 100,
      cooldownSeconds: 3,
      maxInputTokens: 4000,
    });
    expect(issues.some((i) => i.includes("too high"))).toBe(true);
  });

  it("warns about short cooldown", () => {
    const issues = validateRateLimitConfig({
      ipLimit: 500,
      userDailyLimit: 100,
      cooldownSeconds: 0,
      maxInputTokens: 4000,
    });
    expect(issues.some((i) => i.includes("Cooldown too short"))).toBe(true);
  });

  it("warns about excessive input tokens", () => {
    const issues = validateRateLimitConfig({
      ipLimit: 500,
      userDailyLimit: 100,
      cooldownSeconds: 3,
      maxInputTokens: 50000,
    });
    expect(issues.some((i) => i.includes("too high"))).toBe(true);
  });
});

describe("containsSensitiveData", () => {
  it("detects password", () => {
    expect(containsSensitiveData("my_password=secret123")).toBe(true);
  });

  it("detects API keys", () => {
    expect(containsSensitiveData("API_KEY=sk-abc123")).toBe(true);
  });

  it("detects private keys", () => {
    expect(containsSensitiveData("-----BEGIN PRIVATE KEY-----")).toBe(true);
    expect(containsSensitiveData("-----BEGIN RSA PRIVATE KEY-----")).toBe(true);
  });

  it("detects access tokens", () => {
    expect(containsSensitiveData("access_token=ghp_xxx")).toBe(true);
  });

  it("returns false for normal text", () => {
    expect(containsSensitiveData("This is a normal README")).toBe(false);
  });

  it("returns false for code that mentions variables conceptually", () => {
    // "return" doesn't match patterns
    expect(containsSensitiveData("const result = await fetch(url)")).toBe(false);
  });
});
