import { describe, it, expect } from "vitest";
import {
  OFFLINE_FEATURES,
  getAvailableFeatures,
  getUnavailableFeatures,
  getLimitedFeatures,
  isOnline,
} from "../lib/offline";

describe("OFFLINE_FEATURES", () => {
  it("has 9 features", () => {
    expect(OFFLINE_FEATURES).toHaveLength(9);
  });

  it("each feature has name, availability, and reason", () => {
    for (const f of OFFLINE_FEATURES) {
      expect(f.name.length).toBeGreaterThan(0);
      expect(["available", "limited", "unavailable"]).toContain(f.availability);
      expect(f.reason.length).toBeGreaterThan(5);
    }
  });

  it("notes and bookmarks are available offline", () => {
    const notes = OFFLINE_FEATURES.find((f) => f.name.includes("notes"));
    expect(notes?.availability).toBe("available");
  });

  it("AI chat is unavailable offline", () => {
    const chat = OFFLINE_FEATURES.find((f) => f.name.includes("AI tutor"));
    expect(chat?.availability).toBe("unavailable");
  });

  it("curriculum generation is unavailable offline", () => {
    const gen = OFFLINE_FEATURES.find((f) => f.name.includes("Generate new"));
    expect(gen?.availability).toBe("unavailable");
  });
});

describe("getAvailableFeatures", () => {
  it("returns only available features", () => {
    const available = getAvailableFeatures();
    expect(available.length).toBeGreaterThan(0);
    expect(available.every((f) => f.availability === "available")).toBe(true);
  });
});

describe("getUnavailableFeatures", () => {
  it("returns only unavailable features", () => {
    const unavailable = getUnavailableFeatures();
    expect(unavailable.length).toBeGreaterThan(0);
    expect(unavailable.every((f) => f.availability === "unavailable")).toBe(true);
  });
});

describe("getLimitedFeatures", () => {
  it("returns only limited features", () => {
    const limited = getLimitedFeatures();
    expect(limited.length).toBeGreaterThan(0);
    expect(limited.every((f) => f.availability === "limited")).toBe(true);
  });
});

describe("isOnline", () => {
  it("returns a boolean", () => {
    expect(typeof isOnline()).toBe("boolean");
  });
});

describe("feature count sanity", () => {
  it("all features are categorized", () => {
    const total =
      getAvailableFeatures().length +
      getUnavailableFeatures().length +
      getLimitedFeatures().length;
    expect(total).toBe(OFFLINE_FEATURES.length);
  });
});
