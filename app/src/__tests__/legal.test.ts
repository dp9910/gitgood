import { describe, it, expect } from "vitest";
import {
  TOS_SECTIONS,
  TOS_LAST_UPDATED,
  PRIVACY_SECTIONS,
  PRIVACY_LAST_UPDATED,
  getSectionById,
  getTableOfContents,
  LegalSection,
} from "../lib/legal";

describe("TOS_SECTIONS", () => {
  it("has 11 sections", () => {
    expect(TOS_SECTIONS).toHaveLength(11);
  });

  it("has unique IDs", () => {
    const ids = TOS_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each section has non-empty content", () => {
    for (const section of TOS_SECTIONS) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.content.length).toBeGreaterThan(20);
    }
  });

  it("includes critical legal topics", () => {
    const ids = TOS_SECTIONS.map((s) => s.id);
    expect(ids).toContain("acceptance");
    expect(ids).toContain("liability");
    expect(ids).toContain("dmca");
    expect(ids).toContain("content-ownership");
    expect(ids).toContain("termination");
  });

  it("mentions age requirement in acceptance", () => {
    const acceptance = TOS_SECTIONS.find((s) => s.id === "acceptance");
    expect(acceptance?.content).toContain("13 years old");
  });

  it("includes AI disclaimer section", () => {
    const ai = TOS_SECTIONS.find((s) => s.id === "ai-disclaimer");
    expect(ai).toBeDefined();
    expect(ai?.content).toContain("artificial intelligence");
  });

  it("has a valid last updated date", () => {
    expect(TOS_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("PRIVACY_SECTIONS", () => {
  it("has 10 sections", () => {
    expect(PRIVACY_SECTIONS).toHaveLength(10);
  });

  it("has unique IDs", () => {
    const ids = PRIVACY_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each section has non-empty content", () => {
    for (const section of PRIVACY_SECTIONS) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.content.length).toBeGreaterThan(20);
    }
  });

  it("includes critical privacy topics", () => {
    const ids = PRIVACY_SECTIONS.map((s) => s.id);
    expect(ids).toContain("data-collected");
    expect(ids).toContain("data-use");
    expect(ids).toContain("cookies");
    expect(ids).toContain("user-rights");
    expect(ids).toContain("children");
  });

  it("mentions GDPR in user rights", () => {
    const rights = PRIVACY_SECTIONS.find((s) => s.id === "user-rights");
    expect(rights?.content).toContain("GDPR");
  });

  it("lists third-party services", () => {
    const thirdParties = PRIVACY_SECTIONS.find((s) => s.id === "third-parties");
    expect(thirdParties?.content).toContain("GitHub");
    expect(thirdParties?.content).toContain("Gemini");
    expect(thirdParties?.content).toContain("Firebase");
    expect(thirdParties?.content).toContain("Upstash");
    expect(thirdParties?.content).toContain("Vercel");
  });

  it("has a valid last updated date", () => {
    expect(PRIVACY_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getSectionById", () => {
  it("returns matching section", () => {
    const section = getSectionById(TOS_SECTIONS, "dmca");
    expect(section?.title).toContain("DMCA");
  });

  it("returns undefined for unknown id", () => {
    expect(getSectionById(TOS_SECTIONS, "nonexistent")).toBeUndefined();
  });
});

describe("getTableOfContents", () => {
  it("returns id and title pairs", () => {
    const toc = getTableOfContents(TOS_SECTIONS);
    expect(toc).toHaveLength(TOS_SECTIONS.length);
    expect(toc[0]).toHaveProperty("id");
    expect(toc[0]).toHaveProperty("title");
    expect(toc[0]).not.toHaveProperty("content");
  });

  it("preserves section order", () => {
    const toc = getTableOfContents(PRIVACY_SECTIONS);
    expect(toc[0].id).toBe("overview");
    expect(toc[toc.length - 1].id).toBe("changes");
  });
});
