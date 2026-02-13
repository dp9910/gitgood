/**
 * Centralized error handling utilities.
 * Provides user-friendly error messages, input sanitization,
 * and content moderation checks.
 */

// ---------- Error Types ----------

export type ErrorCode =
  | "invalid_url"
  | "private_repo"
  | "repo_not_found"
  | "no_readme"
  | "unsupported_language"
  | "repo_too_large"
  | "rate_limited"
  | "credits_depleted"
  | "ai_generation_failed"
  | "network_error"
  | "auth_required"
  | "invalid_input"
  | "content_flagged"
  | "unknown";

export interface AppError {
  code: ErrorCode;
  message: string;
  action?: string; // Suggested user action
  retryable: boolean;
}

// ---------- Error Messages ----------

const ERROR_MAP: Record<ErrorCode, Omit<AppError, "code">> = {
  invalid_url: {
    message: "Invalid URL format. Please paste a valid github.com/owner/repo link.",
    action: "Check the URL and try again.",
    retryable: false,
  },
  private_repo: {
    message: "This repository is private. Please use a public repo.",
    action: "Check repo visibility or try a different repo.",
    retryable: false,
  },
  repo_not_found: {
    message: "Repository not found. Check the URL and ensure the repo exists.",
    action: "Verify the owner and repo name.",
    retryable: false,
  },
  no_readme: {
    message: "No README detected. AI will analyze code directly, but explanations may be limited.",
    retryable: true,
  },
  unsupported_language: {
    message: "This language has limited AI support. We'll do our best to explain concepts.",
    retryable: true,
  },
  repo_too_large: {
    message: "This repository is too large to analyze. Try a smaller related project.",
    action: "Check the suggested alternatives.",
    retryable: false,
  },
  rate_limited: {
    message: "Too many requests. Please wait a moment.",
    action: "Try again in a few seconds.",
    retryable: true,
  },
  credits_depleted: {
    message: "You've used your daily credits. They reset at midnight UTC.",
    action: "Come back tomorrow or upgrade for unlimited access.",
    retryable: false,
  },
  ai_generation_failed: {
    message: "Unable to generate content. The AI service may be temporarily unavailable.",
    action: "Try again in a moment.",
    retryable: true,
  },
  network_error: {
    message: "Connection lost. Your progress is saved locally and will sync when reconnected.",
    action: "Check your internet connection.",
    retryable: true,
  },
  auth_required: {
    message: "Please sign in to continue.",
    action: "Sign in with GitHub to access this feature.",
    retryable: false,
  },
  invalid_input: {
    message: "Invalid input. Please check your submission.",
    retryable: false,
  },
  content_flagged: {
    message: "This repository contains potentially harmful content and cannot be used for learning.",
    retryable: false,
  },
  unknown: {
    message: "Something went wrong. Please try again.",
    retryable: true,
  },
};

export function getAppError(code: ErrorCode): AppError {
  const template = ERROR_MAP[code] ?? ERROR_MAP.unknown;
  return { code, ...template };
}

/**
 * Map an HTTP status code and error string to an AppError.
 */
export function mapApiError(
  status: number,
  errorCode?: string,
  message?: string
): AppError {
  if (status === 401) return getAppError("auth_required");
  if (status === 429) return getAppError("rate_limited");
  if (status === 404) return getAppError("repo_not_found");
  if (status === 422 && errorCode === "repo_too_large")
    return getAppError("repo_too_large");
  if (status === 413) return getAppError("invalid_input");

  if (errorCode && errorCode in ERROR_MAP) {
    return getAppError(errorCode as ErrorCode);
  }

  return {
    code: "unknown",
    message: message ?? ERROR_MAP.unknown.message,
    retryable: status >= 500,
  };
}

// ---------- Input Sanitization ----------

/**
 * Sanitize user text input — strip HTML tags, limit length.
 */
export function sanitizeInput(input: string, maxLength: number = 4000): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "") // Strip script tags + content
    .replace(/<style[\s\S]*?<\/style>/gi, "") // Strip style tags + content
    .replace(/<[^>]*>/g, "") // Strip remaining HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Strip control chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Validate a GitHub repo URL format.
 * Returns null if invalid, or { owner, repo } if valid.
 */
export function validateRepoUrl(
  url: string
): { owner: string; repo: string } | null {
  if (!url || typeof url !== "string") return null;

  const cleaned = url.trim();
  if (cleaned.length === 0 || cleaned.length > 500) return null;

  // Shorthand: owner/repo
  const shorthand = cleaned.match(
    /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/
  );
  if (shorthand) return { owner: shorthand[1], repo: shorthand[2] };

  // Full URL
  const full = cleaned.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/
  );
  if (!full) return null;

  return { owner: full[1], repo: full[2].replace(/\.git$/, "") };
}

// ---------- Content Moderation ----------

const FLAGGED_TERMS = [
  "malware",
  "exploit",
  "hack tool",
  "keylogger",
  "ransomware",
  "trojan",
  "botnet",
  "phishing kit",
  "ddos tool",
  "rat tool",
];

/**
 * Check if a repo description or name contains flagged content.
 * Returns true if the content is safe, false if flagged.
 */
export function isContentSafe(
  description: string | null,
  name?: string
): boolean {
  const text = `${name ?? ""} ${description ?? ""}`.toLowerCase();
  return !FLAGGED_TERMS.some((term) => text.includes(term));
}
