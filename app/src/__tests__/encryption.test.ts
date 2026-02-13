import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const TEST_KEY = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv, ENCRYPTION_KEY: TEST_KEY };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("encryption", () => {
  it("encrypts and decrypts a string round-trip", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const plaintext = "gho_myGitHubTokenValue123";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertexts for same input (random IV)", async () => {
    const { encrypt } = await import("@/lib/encryption");
    const plaintext = "same-input";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it("returns format iv:ciphertext:tag (3 base64 parts)", async () => {
    const { encrypt } = await import("@/lib/encryption");
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    expect(parts.length).toBe(3);
    // Each part should be valid base64
    for (const part of parts) {
      expect(() => Buffer.from(part, "base64")).not.toThrow();
    }
  });

  it("throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const encrypted = encrypt("original");
    const parts = encrypted.split(":");
    // Tamper with ciphertext portion
    parts[1] = Buffer.from("tampered-data-here").toString("base64");
    expect(() => decrypt(parts.join(":"))).toThrow();
  });

  it("throws on tampered auth tag", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const encrypted = encrypt("original");
    const parts = encrypted.split(":");
    // Tamper with auth tag (must be 16 bytes)
    parts[2] = Buffer.from("0".repeat(16)).toString("base64");
    expect(() => decrypt(parts.join(":"))).toThrow();
  });

  it("throws on invalid format (too few parts)", async () => {
    const { decrypt } = await import("@/lib/encryption");
    expect(() => decrypt("only-one-part")).toThrow("Invalid encrypted format");
  });

  it("throws on invalid format (too many parts)", async () => {
    const { decrypt } = await import("@/lib/encryption");
    expect(() => decrypt("a:b:c:d")).toThrow("Invalid encrypted format");
  });

  it("throws when ENCRYPTION_KEY is missing", async () => {
    delete process.env.ENCRYPTION_KEY;
    const { encrypt } = await import("@/lib/encryption");
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be a 64-character hex string");
  });

  it("throws when ENCRYPTION_KEY is wrong length", async () => {
    process.env.ENCRYPTION_KEY = "abcdef";
    const { encrypt } = await import("@/lib/encryption");
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be a 64-character hex string");
  });

  it("handles empty string", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const encrypted = encrypt("");
    expect(decrypt(encrypted)).toBe("");
  });

  it("handles unicode content", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const plaintext = "Hello 🌍 World! ñ é ü";
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("decryption fails with different key", async () => {
    const { encrypt } = await import("@/lib/encryption");
    const encrypted = encrypt("secret");

    // Re-import with different key
    vi.resetModules();
    process.env.ENCRYPTION_KEY = "b".repeat(64);
    const { decrypt } = await import("@/lib/encryption");
    expect(() => decrypt(encrypted)).toThrow();
  });
});
