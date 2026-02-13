/**
 * User settings and preferences management.
 * Persists to localStorage with sensible defaults.
 */

// ---------- Types ----------

export type ExperienceLevel = "junior" | "mid" | "senior";
export type LearningMode = "standard" | "quickstart";

export interface UserSettings {
  displayName: string;
  bio: string;
  experienceLevel: ExperienceLevel;
  learningMode: LearningMode;
}

export interface CreditsInfo {
  remaining: number;
  total: number;
  plan: "free" | "pro";
  resetsAt: string; // ISO date string
}

// ---------- Constants ----------

const SETTINGS_KEY = "gitgood_user_settings";

const DEFAULT_SETTINGS: UserSettings = {
  displayName: "",
  bio: "",
  experienceLevel: "mid",
  learningMode: "standard",
};

const BIO_MAX_LENGTH = 300;

// ---------- Settings CRUD ----------

export function getSettings(): UserSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Partial<UserSettings>): UserSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };

  // Enforce bio max length
  if (updated.bio.length > BIO_MAX_LENGTH) {
    updated.bio = updated.bio.slice(0, BIO_MAX_LENGTH);
  }

  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

export function resetSettings(): UserSettings {
  localStorage.removeItem(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS };
}

// ---------- Credits ----------

export function getCreditsInfo(): CreditsInfo {
  // In a real app this would come from the API.
  // For now, return mock data.
  return {
    remaining: 500,
    total: 1000,
    plan: "free",
    resetsAt: getNextMidnightUTC(),
  };
}

function getNextMidnightUTC(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

// ---------- Validation ----------

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "Display name is required.";
  if (trimmed.length > 50) return "Display name must be 50 characters or less.";
  return null;
}

export function validateBio(bio: string): string | null {
  if (bio.length > BIO_MAX_LENGTH) {
    return `Bio must be ${BIO_MAX_LENGTH} characters or less.`;
  }
  return null;
}

export {
  SETTINGS_KEY,
  DEFAULT_SETTINGS,
  BIO_MAX_LENGTH,
};
