import { describe, it, expect } from "vitest";
import {
  checkEnvironmentVars,
  checkSecurityConfig,
  checkFeatureCompleteness,
  runDeployAudit,
  REQUIRED_ENV_VARS,
} from "../lib/deploy-check";

// ---------- Helpers ----------

function makeEnv(overrides: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of REQUIRED_ENV_VARS) {
    env[key] = `valid_${key}_value`;
  }
  return { ...env, ...overrides };
}

describe("checkEnvironmentVars", () => {
  it("passes when all env vars are set", () => {
    const checks = checkEnvironmentVars(makeEnv());
    expect(checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("fails for missing env vars", () => {
    const env = makeEnv();
    delete env.GEMINI_API_KEY;
    const checks = checkEnvironmentVars(env);

    const gemini = checks.find((c) => c.name === "GEMINI_API_KEY");
    expect(gemini?.status).toBe("fail");
  });

  it("fails for empty env vars", () => {
    const checks = checkEnvironmentVars(makeEnv({ GITHUB_TOKEN: "" }));
    const gh = checks.find((c) => c.name === "GITHUB_TOKEN");
    expect(gh?.status).toBe("fail");
  });

  it("warns for placeholder values", () => {
    const checks = checkEnvironmentVars(makeEnv({ GITHUB_TOKEN: "your_token_here" }));
    const gh = checks.find((c) => c.name === "GITHUB_TOKEN");
    expect(gh?.status).toBe("warn");
  });

  it("checks all 10 required vars", () => {
    const checks = checkEnvironmentVars(makeEnv());
    expect(checks).toHaveLength(10);
  });

  it("categorizes as env checks", () => {
    const checks = checkEnvironmentVars(makeEnv());
    expect(checks.every((c) => c.category === "env")).toBe(true);
  });
});

describe("checkSecurityConfig", () => {
  it("returns security checks", () => {
    const checks = checkSecurityConfig();
    expect(checks.length).toBeGreaterThan(0);
    expect(checks.every((c) => c.category === "security")).toBe(true);
  });

  it("all security checks pass", () => {
    const checks = checkSecurityConfig();
    expect(checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("includes rate limiting check", () => {
    const checks = checkSecurityConfig();
    expect(checks.some((c) => c.name === "Rate Limiting")).toBe(true);
  });

  it("includes input sanitization check", () => {
    const checks = checkSecurityConfig();
    expect(checks.some((c) => c.name === "Input Sanitization")).toBe(true);
  });

  it("includes auth middleware check", () => {
    const checks = checkSecurityConfig();
    expect(checks.some((c) => c.name === "Auth Middleware")).toBe(true);
  });
});

describe("checkFeatureCompleteness", () => {
  it("returns feature checks for all tasks", () => {
    const checks = checkFeatureCompleteness();
    expect(checks.length).toBe(23); // Tasks #12-#34
  });

  it("all features are marked as done", () => {
    const checks = checkFeatureCompleteness();
    expect(checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("categorizes as feature checks", () => {
    const checks = checkFeatureCompleteness();
    expect(checks.every((c) => c.category === "feature")).toBe(true);
  });

  it("includes task numbers in names", () => {
    const checks = checkFeatureCompleteness();
    expect(checks[0].name).toContain("#12");
    expect(checks[checks.length - 1].name).toContain("#34");
  });
});

describe("runDeployAudit", () => {
  it("returns full report with all env vars set", () => {
    const report = runDeployAudit(makeEnv());
    expect(report.deployReady).toBe(true);
    expect(report.summary.fail).toBe(0);
    expect(report.summary.total).toBeGreaterThan(30);
  });

  it("reports not deploy-ready with missing env vars", () => {
    const report = runDeployAudit({});
    expect(report.deployReady).toBe(false);
    expect(report.summary.fail).toBeGreaterThan(0);
  });

  it("includes all check categories", () => {
    const report = runDeployAudit(makeEnv());
    const categories = new Set(report.checks.map((c) => c.category));
    expect(categories.has("env")).toBe(true);
    expect(categories.has("security")).toBe(true);
    expect(categories.has("feature")).toBe(true);
  });

  it("summary totals match check count", () => {
    const report = runDeployAudit(makeEnv());
    const { pass, warn, fail, total } = report.summary;
    expect(pass + warn + fail).toBe(total);
    expect(total).toBe(report.checks.length);
  });

  it("warns for placeholder env but still passes", () => {
    const report = runDeployAudit(makeEnv({ GITHUB_TOKEN: "your_token_here" }));
    expect(report.summary.warn).toBeGreaterThan(0);
    // Warnings don't block deploy
    expect(report.deployReady).toBe(true);
  });
});
