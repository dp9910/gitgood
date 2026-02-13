import { describe, it, expect } from "vitest";
import {
  TIERS,
  FEATURES,
  FAQS,
  getFeatureValue,
  isFeatureIncluded,
} from "../lib/pricing";

describe("TIERS", () => {
  it("has Free and Pro tiers", () => {
    expect(TIERS).toHaveLength(2);
    expect(TIERS[0].name).toBe("Free");
    expect(TIERS[1].name).toBe("Pro");
  });

  it("Free tier is $0", () => {
    expect(TIERS[0].price).toBe("$0");
    expect(TIERS[0].priceNote).toBe("forever");
  });

  it("Pro tier is $5/month", () => {
    expect(TIERS[1].price).toBe("$5");
    expect(TIERS[1].priceNote).toBe("/month");
  });

  it("Pro tier is highlighted", () => {
    expect(TIERS[0].highlighted).toBe(false);
    expect(TIERS[1].highlighted).toBe(true);
  });

  it("each tier has CTA and href", () => {
    for (const tier of TIERS) {
      expect(tier.cta.length).toBeGreaterThan(0);
      expect(tier.ctaHref).toContain("/");
    }
  });
});

describe("FEATURES", () => {
  it("has 11 features", () => {
    expect(FEATURES).toHaveLength(11);
  });

  it("each feature has name, free, and pro values", () => {
    for (const f of FEATURES) {
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.free !== undefined).toBe(true);
      expect(f.pro !== undefined).toBe(true);
    }
  });

  it("free tier has limits on AI requests", () => {
    const ai = FEATURES.find((f) => f.name === "AI requests per day");
    expect(ai?.free).toBe("100");
    expect(ai?.pro).toBe("Unlimited");
  });

  it("free tier limits active paths", () => {
    const paths = FEATURES.find((f) => f.name === "AI-generated curricula");
    expect(paths?.free).toContain("3");
    expect(paths?.pro).toBe("Unlimited");
  });
});

describe("FAQS", () => {
  it("has 6 FAQs", () => {
    expect(FAQS).toHaveLength(6);
  });

  it("each FAQ has question and answer", () => {
    for (const faq of FAQS) {
      expect(faq.question.endsWith("?")).toBe(true);
      expect(faq.answer.length).toBeGreaterThan(20);
    }
  });
});

describe("getFeatureValue", () => {
  it("returns string for string values", () => {
    const feature = FEATURES.find((f) => f.name === "AI requests per day")!;
    expect(getFeatureValue(feature, "free")).toBe("100");
    expect(getFeatureValue(feature, "pro")).toBe("Unlimited");
  });

  it("returns 'Included' for true", () => {
    const feature = FEATURES.find((f) => f.name === "AI tutor chat")!;
    expect(getFeatureValue(feature, "free")).toBe("Included");
  });

  it("returns 'Not included' for false", () => {
    const feature = FEATURES.find((f) => f.name === "Priority support")!;
    expect(getFeatureValue(feature, "free")).toBe("Not included");
  });
});

describe("isFeatureIncluded", () => {
  it("returns true for boolean true", () => {
    const feature = FEATURES.find((f) => f.name === "AI tutor chat")!;
    expect(isFeatureIncluded(feature, "free")).toBe(true);
  });

  it("returns true for string values", () => {
    const feature = FEATURES.find((f) => f.name === "AI requests per day")!;
    expect(isFeatureIncluded(feature, "free")).toBe(true);
  });

  it("returns false for boolean false", () => {
    const feature = FEATURES.find((f) => f.name === "Priority support")!;
    expect(isFeatureIncluded(feature, "free")).toBe(false);
  });
});
