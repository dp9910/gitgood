import { describe, it, expect } from "vitest";
import {
  SHORTCUTS,
  CONTEXT_LABELS,
  getShortcutsByContext,
  formatKeys,
  getAllContexts,
} from "../lib/keyboard-shortcuts";

describe("SHORTCUTS", () => {
  it("has shortcuts defined", () => {
    expect(SHORTCUTS.length).toBeGreaterThan(10);
  });

  it("each shortcut has keys, description, and context", () => {
    for (const s of SHORTCUTS) {
      expect(s.keys.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(5);
      expect(["global", "learning", "chat", "navigation"]).toContain(s.context);
    }
  });

  it("includes ? for help", () => {
    const help = SHORTCUTS.find((s) => s.keys.includes("?"));
    expect(help).toBeDefined();
    expect(help?.description).toContain("keyboard shortcuts");
  });

  it("includes arrow keys for navigation", () => {
    const left = SHORTCUTS.find((s) => s.keys.includes("\u2190"));
    const right = SHORTCUTS.find((s) => s.keys.includes("\u2192"));
    expect(left).toBeDefined();
    expect(right).toBeDefined();
  });
});

describe("CONTEXT_LABELS", () => {
  it("has labels for all contexts", () => {
    expect(CONTEXT_LABELS.global).toBe("Global");
    expect(CONTEXT_LABELS.learning).toBe("Learning Interface");
    expect(CONTEXT_LABELS.chat).toBe("AI Tutor Chat");
    expect(CONTEXT_LABELS.navigation).toBe("Navigation");
  });
});

describe("getShortcutsByContext", () => {
  it("filters by global context", () => {
    const global = getShortcutsByContext("global");
    expect(global.length).toBeGreaterThan(0);
    expect(global.every((s) => s.context === "global")).toBe(true);
  });

  it("filters by learning context", () => {
    const learning = getShortcutsByContext("learning");
    expect(learning.length).toBeGreaterThan(0);
    expect(learning.every((s) => s.context === "learning")).toBe(true);
  });

  it("filters by chat context", () => {
    const chat = getShortcutsByContext("chat");
    expect(chat.length).toBeGreaterThan(0);
  });
});

describe("formatKeys", () => {
  it("joins single key", () => {
    expect(formatKeys(["?"]) ).toBe("?");
  });

  it("joins multiple keys with +", () => {
    expect(formatKeys(["Shift", "Enter"])).toBe("Shift + Enter");
  });
});

describe("getAllContexts", () => {
  it("returns all 4 contexts in order", () => {
    const contexts = getAllContexts();
    expect(contexts).toEqual(["global", "navigation", "learning", "chat"]);
  });
});
