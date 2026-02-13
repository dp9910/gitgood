import type { Redis } from "@upstash/redis";

const DAILY_USER_LIMIT = 100;
const DAILY_IP_LIMIT = 500;
const COOLDOWN_MS = 3000;
const MAX_INPUT_TOKENS = 4000;
const SECONDS_IN_DAY = 86400;

export interface RateLimitResult {
  allowed: boolean;
  status?: number;
  error?: string;
  message?: string;
  resetAt?: string;
  waitSeconds?: number;
  remaining?: number;
}

export interface RateLimitHeaders {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
}

/**
 * Get the UTC date string for today (used as part of Redis key).
 */
function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get the start of tomorrow UTC in ISO string (for resetAt).
 */
function tomorrowResetTime(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Seconds remaining until midnight UTC.
 */
function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCDate(midnight.getUTCDate() + 1);
  midnight.setUTCHours(0, 0, 0, 0);
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

/**
 * Estimate token count from text (~4 chars per token).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Validate that prompt input doesn't exceed token limits.
 */
export function validatePromptSize(text: string): RateLimitResult {
  const tokens = estimateTokens(text);
  if (tokens > MAX_INPUT_TOKENS) {
    return {
      allowed: false,
      status: 413,
      error: "prompt_too_large",
      message: `Prompt too long. Maximum ${MAX_INPUT_TOKENS} tokens (~${MAX_INPUT_TOKENS * 4} characters). Your prompt: ~${tokens} tokens.`,
    };
  }
  return { allowed: true };
}

/**
 * Check per-user daily credit limit.
 * Returns remaining credits after increment.
 */
async function checkUserLimit(
  redis: Redis,
  userId: string
): Promise<RateLimitResult & { used: number }> {
  const key = `rate:user:${userId}:${todayKey()}`;
  const current = ((await redis.get<number>(key)) ?? 0);

  if (current >= DAILY_USER_LIMIT) {
    return {
      allowed: false,
      used: current,
      status: 429,
      error: "daily_limit_reached",
      message: `Daily limit of ${DAILY_USER_LIMIT} AI requests reached.`,
      resetAt: tomorrowResetTime(),
      remaining: 0,
    };
  }

  // Increment and set expiry if first request of the day
  const newCount = await redis.incr(key);
  if (newCount === 1) {
    await redis.expire(key, secondsUntilMidnight());
  }

  return {
    allowed: true,
    used: newCount,
    remaining: DAILY_USER_LIMIT - newCount,
  };
}

/**
 * Check per-IP daily limit (prevents multi-account abuse).
 */
async function checkIpLimit(
  redis: Redis,
  ip: string
): Promise<RateLimitResult> {
  const key = `rate:ip:${ip}:${todayKey()}`;
  const current = ((await redis.get<number>(key)) ?? 0);

  if (current >= DAILY_IP_LIMIT) {
    return {
      allowed: false,
      status: 429,
      error: "ip_limit_reached",
      message: "Too many requests from this IP. Try again tomorrow.",
      resetAt: tomorrowResetTime(),
    };
  }

  const newCount = await redis.incr(key);
  if (newCount === 1) {
    await redis.expire(key, secondsUntilMidnight());
  }

  return { allowed: true };
}

/**
 * Check per-user cooldown (3 seconds between requests).
 */
async function checkCooldown(
  redis: Redis,
  userId: string
): Promise<RateLimitResult> {
  const key = `cooldown:${userId}`;
  const lastRequest = await redis.get<number>(key);

  if (lastRequest) {
    const elapsed = Date.now() - lastRequest;
    if (elapsed < COOLDOWN_MS) {
      const waitMs = COOLDOWN_MS - elapsed;
      return {
        allowed: false,
        status: 429,
        error: "cooldown",
        message: "Too fast! Please wait between requests.",
        waitSeconds: Math.ceil(waitMs / 1000),
      };
    }
  }

  await redis.set(key, Date.now(), { ex: 10 });
  return { allowed: true };
}

/**
 * Full rate limit check. Runs all three layers in order:
 * 1. IP limit (cheapest check, blocks abuse early)
 * 2. User cooldown (prevents spam)
 * 3. User daily limit (credit tracking)
 *
 * Returns rate limit headers on success for the client to display.
 */
export async function checkRateLimit(
  redis: Redis,
  userId: string,
  ip: string
): Promise<{
  result: RateLimitResult;
  headers: RateLimitHeaders;
}> {
  // Layer 1: IP limit
  const ipCheck = await checkIpLimit(redis, ip);
  if (!ipCheck.allowed) {
    return {
      result: ipCheck,
      headers: buildHeaders(0, tomorrowResetTime()),
    };
  }

  // Layer 2: Cooldown
  const cooldownCheck = await checkCooldown(redis, userId);
  if (!cooldownCheck.allowed) {
    return {
      result: cooldownCheck,
      headers: buildHeaders(0, new Date(Date.now() + COOLDOWN_MS).toISOString()),
    };
  }

  // Layer 3: User daily limit
  const userCheck = await checkUserLimit(redis, userId);
  const remaining = userCheck.remaining ?? 0;

  return {
    result: userCheck,
    headers: buildHeaders(remaining, tomorrowResetTime()),
  };
}

function buildHeaders(remaining: number, resetAt: string): RateLimitHeaders {
  return {
    "X-RateLimit-Limit": String(DAILY_USER_LIMIT),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": resetAt,
  };
}

/**
 * Get current credit usage for a user (for display purposes).
 */
export async function getUserCredits(
  redis: Redis,
  userId: string
): Promise<{ used: number; limit: number; remaining: number }> {
  const key = `rate:user:${userId}:${todayKey()}`;
  const used = ((await redis.get<number>(key)) ?? 0);
  return {
    used,
    limit: DAILY_USER_LIMIT,
    remaining: Math.max(0, DAILY_USER_LIMIT - used),
  };
}

export {
  DAILY_USER_LIMIT,
  DAILY_IP_LIMIT,
  COOLDOWN_MS,
  MAX_INPUT_TOKENS,
};
