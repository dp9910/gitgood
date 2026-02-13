import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

// Store original env
const originalEnv = { ...process.env };

// Full valid env for all required vars
const validServerEnv = {
  GEMINI_API_KEY: "test-gemini-key-123",
  GITHUB_PERSONAL_TOKEN: "ghp_test_token_456",
  FIREBASE_PROJECT_ID: "test-project-id",
  FIREBASE_CLIENT_EMAIL: "test@test-project.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----",
  KV_REST_API_URL: "https://test-kv.upstash.io",
  KV_REST_API_TOKEN: "test-kv-token",
  ENCRYPTION_KEY: "a".repeat(64),
};

const validClientEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyTest123",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test-project.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project-id",
};

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("getServerEnv", () => {
  it("returns validated env when all server vars are present", async () => {
    Object.assign(process.env, validServerEnv);
    const { getServerEnv } = await import("@/lib/env");
    const env = getServerEnv();
    expect(env.GEMINI_API_KEY).toBe("test-gemini-key-123");
    expect(env.GITHUB_PERSONAL_TOKEN).toBe("ghp_test_token_456");
    expect(env.FIREBASE_PROJECT_ID).toBe("test-project-id");
    expect(env.KV_REST_API_URL).toBe("https://test-kv.upstash.io");
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    const partial = { ...validServerEnv };
    delete (partial as Record<string, string | undefined>).GEMINI_API_KEY;
    Object.assign(process.env, partial);
    const { getServerEnv } = await import("@/lib/env");
    expect(() => getServerEnv()).toThrow("Missing or invalid server environment variables");
  });

  it("throws when GITHUB_PERSONAL_TOKEN is missing", async () => {
    const partial = { ...validServerEnv };
    delete (partial as Record<string, string | undefined>).GITHUB_PERSONAL_TOKEN;
    Object.assign(process.env, partial);
    const { getServerEnv } = await import("@/lib/env");
    expect(() => getServerEnv()).toThrow("Missing or invalid server environment variables");
  });

  it("succeeds when KV_REST_API_URL is missing (optional)", async () => {
    const partial = { ...validServerEnv };
    delete (partial as Record<string, string | undefined>).KV_REST_API_URL;
    Object.assign(process.env, partial);
    const { getServerEnv } = await import("@/lib/env");
    const env = getServerEnv();
    expect(env.KV_REST_API_URL).toBe("");
  });

  it("rejects empty string values", async () => {
    Object.assign(process.env, { ...validServerEnv, GEMINI_API_KEY: "" });
    const { getServerEnv } = await import("@/lib/env");
    expect(() => getServerEnv()).toThrow("Missing or invalid server environment variables");
  });

  it("rejects when all server vars are missing", async () => {
    // Don't assign any server vars
    const { getServerEnv } = await import("@/lib/env");
    expect(() => getServerEnv()).toThrow("Missing or invalid server environment variables");
  });
});

describe("getClientEnv", () => {
  it("returns validated env when all client vars are present", async () => {
    Object.assign(process.env, validClientEnv);
    const { getClientEnv } = await import("@/lib/env");
    const env = getClientEnv();
    expect(env.NEXT_PUBLIC_FIREBASE_API_KEY).toBe("AIzaSyTest123");
    expect(env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN).toBe("test-project.firebaseapp.com");
  });

  it("throws when NEXT_PUBLIC_FIREBASE_API_KEY is missing", async () => {
    const partial = { ...validClientEnv };
    delete (partial as Record<string, string | undefined>).NEXT_PUBLIC_FIREBASE_API_KEY;
    Object.assign(process.env, partial);
    const { getClientEnv } = await import("@/lib/env");
    expect(() => getClientEnv()).toThrow("Missing or invalid client environment variables");
  });

  it("rejects empty string for client vars", async () => {
    Object.assign(process.env, {
      ...validClientEnv,
      NEXT_PUBLIC_FIREBASE_API_KEY: "",
    });
    const { getClientEnv } = await import("@/lib/env");
    expect(() => getClientEnv()).toThrow("Missing or invalid client environment variables");
  });
});

describe("ALL_REQUIRED_KEYS", () => {
  it("contains all server and client keys", async () => {
    const { ALL_REQUIRED_KEYS } = await import("@/lib/env");
    expect(ALL_REQUIRED_KEYS).toContain("GEMINI_API_KEY");
    expect(ALL_REQUIRED_KEYS).toContain("GITHUB_PERSONAL_TOKEN");
    expect(ALL_REQUIRED_KEYS).toContain("FIREBASE_PROJECT_ID");
    expect(ALL_REQUIRED_KEYS).toContain("FIREBASE_CLIENT_EMAIL");
    expect(ALL_REQUIRED_KEYS).toContain("FIREBASE_PRIVATE_KEY");
    expect(ALL_REQUIRED_KEYS).toContain("KV_REST_API_URL");
    expect(ALL_REQUIRED_KEYS).toContain("KV_REST_API_TOKEN");
    expect(ALL_REQUIRED_KEYS).toContain("NEXT_PUBLIC_FIREBASE_API_KEY");
    expect(ALL_REQUIRED_KEYS).toContain("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
    expect(ALL_REQUIRED_KEYS).toContain("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  });

  it("matches .env.example keys", async () => {
    const { ALL_REQUIRED_KEYS } = await import("@/lib/env");
    const envExamplePath = path.resolve(__dirname, "../../.env.example");
    const content = fs.readFileSync(envExamplePath, "utf-8");

    // Extract all KEY= lines (non-comment, non-empty)
    const envKeys = content
      .split("\n")
      .filter((line) => /^[A-Z_]+=/.test(line.trim()))
      .map((line) => line.split("=")[0].trim());

    // Every key in ALL_REQUIRED_KEYS should exist in .env.example
    for (const key of ALL_REQUIRED_KEYS) {
      expect(envKeys).toContain(key);
    }

    // Every key in .env.example should exist in ALL_REQUIRED_KEYS
    for (const key of envKeys) {
      expect(ALL_REQUIRED_KEYS).toContain(key);
    }
  });
});

describe("security: server keys not in client schema", () => {
  it("client schema does not include any secret keys", async () => {
    const { ALL_REQUIRED_KEYS } = await import("@/lib/env");
    const clientKeys = ALL_REQUIRED_KEYS.filter((k) =>
      k.startsWith("NEXT_PUBLIC_")
    );
    const serverSecrets = [
      "GEMINI_API_KEY",
      "GITHUB_PERSONAL_TOKEN",
      "FIREBASE_PRIVATE_KEY",
      "FIREBASE_CLIENT_EMAIL",
      "KV_REST_API_URL",
      "KV_REST_API_TOKEN",
      "ENCRYPTION_KEY",
    ];
    for (const secret of serverSecrets) {
      expect(clientKeys).not.toContain(secret);
    }
  });
});
