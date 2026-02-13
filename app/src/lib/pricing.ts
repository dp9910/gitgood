/**
 * Pricing tiers and feature comparison data.
 */

export interface PricingFeature {
  name: string;
  free: string | boolean;
  pro: string | boolean;
}

export interface PricingTier {
  name: string;
  price: string;
  priceNote: string;
  description: string;
  highlighted: boolean;
  cta: string;
  ctaHref: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export const TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    priceNote: "forever",
    description: "Perfect for casual learners exploring open source.",
    highlighted: false,
    cta: "Get Started",
    ctaHref: "/",
  },
  {
    name: "Pro",
    price: "$5",
    priceNote: "/month",
    description: "For serious learners who want unlimited access.",
    highlighted: true,
    cta: "Upgrade to Pro",
    ctaHref: "/settings",
  },
];

export const FEATURES: PricingFeature[] = [
  { name: "AI-generated curricula", free: "3 active paths", pro: "Unlimited" },
  { name: "AI requests per day", free: "100", pro: "Unlimited" },
  { name: "AI tutor chat", free: true, pro: true },
  { name: "Quizzes & challenges", free: true, pro: true },
  { name: "Progress tracking", free: true, pro: true },
  { name: "Notes & bookmarks", free: true, pro: true },
  { name: "GitHub sync", free: true, pro: true },
  { name: "Data export", free: true, pro: true },
  { name: "AI model", free: "Gemini Flash", pro: "Claude Sonnet" },
  { name: "Priority support", free: false, pro: true },
  { name: "Early access to features", free: false, pro: true },
];

export const FAQS: FAQ[] = [
  {
    question: "Can I use GitGood for free?",
    answer:
      "Yes! The free tier includes 100 AI requests per day, 3 active learning paths, and full access to quizzes, challenges, notes, and progress tracking. Most learners never need to upgrade.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards, debit cards, and PayPal through our payment processor Stripe. All payments are securely processed.",
  },
  {
    question: "Can I cancel my Pro subscription?",
    answer:
      "Yes, you can cancel anytime from your Settings page. Your Pro features will remain active until the end of your billing period. Your learning progress is never deleted.",
  },
  {
    question: "What happens to my data if I downgrade?",
    answer:
      "All your learning progress, notes, and bookmarks are stored in your own GitHub repositories and localStorage. They remain accessible on the Free tier. You only lose access to unlimited AI requests and the upgraded AI model.",
  },
  {
    question: "Do you offer student or team discounts?",
    answer:
      "We offer a 50% discount for students with a valid .edu email address. For team pricing (5+ seats), please contact us at team@gitgood.dev.",
  },
  {
    question: "What AI model do Pro users get?",
    answer:
      "Pro users get access to Claude Sonnet for higher quality explanations, more nuanced quiz generation, and more detailed code analysis. Free users get Google Gemini Flash, which is still excellent for learning.",
  },
];

export function getFeatureValue(feature: PricingFeature, tier: "free" | "pro"): string {
  const val = feature[tier];
  if (typeof val === "boolean") return val ? "Included" : "Not included";
  return val;
}

export function isFeatureIncluded(feature: PricingFeature, tier: "free" | "pro"): boolean {
  const val = feature[tier];
  return val === true || typeof val === "string";
}
