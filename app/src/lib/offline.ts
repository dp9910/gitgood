/**
 * Offline mode detection and feature availability.
 */

export type FeatureAvailability = "available" | "limited" | "unavailable";

export interface OfflineFeature {
  name: string;
  availability: FeatureAvailability;
  reason: string;
}

/**
 * Features and their offline availability.
 */
export const OFFLINE_FEATURES: OfflineFeature[] = [
  {
    name: "View cached curricula",
    availability: "available",
    reason: "Cached in localStorage",
  },
  {
    name: "Read notes & bookmarks",
    availability: "available",
    reason: "Stored in localStorage",
  },
  {
    name: "Continue learning (cached topics)",
    availability: "limited",
    reason: "Only previously loaded content is available",
  },
  {
    name: "Track progress locally",
    availability: "available",
    reason: "Progress queued in localStorage, synced when online",
  },
  {
    name: "Generate new curriculum",
    availability: "unavailable",
    reason: "Requires GitHub API and AI generation",
  },
  {
    name: "AI tutor chat",
    availability: "unavailable",
    reason: "Requires Gemini API connection",
  },
  {
    name: "Generate quizzes",
    availability: "unavailable",
    reason: "Requires AI generation",
  },
  {
    name: "Sync progress to GitHub",
    availability: "unavailable",
    reason: "Requires GitHub API — will sync when reconnected",
  },
  {
    name: "Browse curated repos",
    availability: "limited",
    reason: "Curated list is static, but repo metadata may be stale",
  },
];

export function getAvailableFeatures(): OfflineFeature[] {
  return OFFLINE_FEATURES.filter((f) => f.availability === "available");
}

export function getUnavailableFeatures(): OfflineFeature[] {
  return OFFLINE_FEATURES.filter((f) => f.availability === "unavailable");
}

export function getLimitedFeatures(): OfflineFeature[] {
  return OFFLINE_FEATURES.filter((f) => f.availability === "limited");
}

/**
 * Check if the browser is online.
 * Returns true on the server (SSR).
 */
export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}
