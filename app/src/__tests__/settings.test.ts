import { describe, it, expect, beforeEach } from "vitest";
import {
  getSettings,
  saveSettings,
  resetSettings,
  getCreditsInfo,
  validateDisplayName,
  validateBio,
  SETTINGS_KEY,
  DEFAULT_SETTINGS,
  BIO_MAX_LENGTH,
} from "../lib/settings";

// ---------- localStorage mock ----------

const storage: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];

  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    },
    writable: true,
    configurable: true,
  });
});

describe("getSettings", () => {
  it("returns defaults when no settings saved", () => {
    const s = getSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it("returns stored settings", () => {
    storage[SETTINGS_KEY] = JSON.stringify({ displayName: "Alice", bio: "Dev" });
    const s = getSettings();
    expect(s.displayName).toBe("Alice");
    expect(s.bio).toBe("Dev");
    // Defaults fill in missing fields
    expect(s.experienceLevel).toBe("mid");
  });

  it("handles invalid JSON gracefully", () => {
    storage[SETTINGS_KEY] = "not json";
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe("saveSettings", () => {
  it("saves partial settings and preserves defaults", () => {
    const result = saveSettings({ displayName: "Bob" });
    expect(result.displayName).toBe("Bob");
    expect(result.experienceLevel).toBe("mid");

    const stored = JSON.parse(storage[SETTINGS_KEY]);
    expect(stored.displayName).toBe("Bob");
  });

  it("enforces bio max length", () => {
    const longBio = "a".repeat(500);
    const result = saveSettings({ bio: longBio });
    expect(result.bio.length).toBe(BIO_MAX_LENGTH);
  });

  it("overwrites previous settings", () => {
    saveSettings({ displayName: "Alice" });
    saveSettings({ displayName: "Bob" });
    expect(getSettings().displayName).toBe("Bob");
  });

  it("saves experience level", () => {
    saveSettings({ experienceLevel: "senior" });
    expect(getSettings().experienceLevel).toBe("senior");
  });

  it("saves learning mode", () => {
    saveSettings({ learningMode: "quickstart" });
    expect(getSettings().learningMode).toBe("quickstart");
  });
});

describe("resetSettings", () => {
  it("clears settings and returns defaults", () => {
    saveSettings({ displayName: "Alice" });
    const result = resetSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
    expect(storage[SETTINGS_KEY]).toBeUndefined();
  });
});

describe("getCreditsInfo", () => {
  it("returns credits info with expected fields", () => {
    const info = getCreditsInfo();
    expect(info.remaining).toBeGreaterThan(0);
    expect(info.total).toBeGreaterThan(0);
    expect(info.plan).toBeTruthy();
    expect(info.resetsAt).toBeTruthy();
  });

  it("returns valid ISO date for resetsAt", () => {
    const info = getCreditsInfo();
    const date = new Date(info.resetsAt);
    expect(date.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("validateDisplayName", () => {
  it("returns null for valid name", () => {
    expect(validateDisplayName("Alice")).toBeNull();
  });

  it("returns error for empty name", () => {
    expect(validateDisplayName("")).not.toBeNull();
    expect(validateDisplayName("   ")).not.toBeNull();
  });

  it("returns error for too-long name", () => {
    expect(validateDisplayName("a".repeat(51))).not.toBeNull();
  });
});

describe("validateBio", () => {
  it("returns null for valid bio", () => {
    expect(validateBio("I am a developer")).toBeNull();
  });

  it("returns error for too-long bio", () => {
    expect(validateBio("a".repeat(301))).not.toBeNull();
  });

  it("returns null for empty bio", () => {
    expect(validateBio("")).toBeNull();
  });
});
