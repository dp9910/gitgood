import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkRateLimit,
  validatePromptSize,
  estimateTokens,
  getUserCredits,
  DAILY_USER_LIMIT,
  DAILY_IP_LIMIT,
  MAX_INPUT_TOKENS,
} from "@/lib/rate-limit";

// In-memory Redis mock
function createMockRedis() {
  const store = new Map<string, { value: unknown; expiresAt?: number }>();

  return {
    store,
    get: vi.fn(async <T>(key: string): Promise<T | null> => {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    }),
    set: vi.fn(async (key: string, value: unknown, opts?: { ex?: number }) => {
      const expiresAt = opts?.ex
        ? Date.now() + opts.ex * 1000
        : undefined;
      store.set(key, { value, expiresAt });
      return "OK";
    }),
    incr: vi.fn(async (key: string) => {
      const entry = store.get(key);
      const current = entry ? (entry.value as number) : 0;
      const next = current + 1;
      store.set(key, { value: next, expiresAt: entry?.expiresAt });
      return next;
    }),
    expire: vi.fn(async (_key: string, _seconds: number) => {
      // Just track the call
      return 1;
    }),
  };
}

type MockRedis = ReturnType<typeof createMockRedis>;
let redis: MockRedis;

beforeEach(() => {
  redis = createMockRedis();
  vi.clearAllMocks();
});

describe("checkRateLimit - user daily limit", () => {
  it("allows requests under the daily limit", async () => {
    const { result, headers } = await checkRateLimit(
      redis as never,
      "user-1",
      "127.0.0.1"
    );

    expect(result.allowed).toBe(true);
    expect(headers["X-RateLimit-Limit"]).toBe(String(DAILY_USER_LIMIT));
    expect(Number(headers["X-RateLimit-Remaining"])).toBe(DAILY_USER_LIMIT - 1);
  });

  it("blocks user after reaching daily limit", async () => {
    // Simulate user already at limit
    const today = new Date().toISOString().split("T")[0];
    redis.store.set(`rate:user:user-1:${today}`, {
      value: DAILY_USER_LIMIT,
    });

    const { result } = await checkRateLimit(
      redis as never,
      "user-1",
      "127.0.0.1"
    );

    expect(result.allowed).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error).toBe("daily_limit_reached");
    expect(result.resetAt).toBeDefined();
    expect(result.remaining).toBe(0);
  });

  it("tracks usage incrementally", async () => {
    // Make 3 requests
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(redis as never, "user-2", "10.0.0.1");
      // Clear cooldown between requests
      redis.store.delete("cooldown:user-2");
    }

    const credits = await getUserCredits(redis as never, "user-2");
    expect(credits.used).toBe(3);
    expect(credits.remaining).toBe(DAILY_USER_LIMIT - 3);
  });

  it("returns rate limit headers on every response", async () => {
    const { headers } = await checkRateLimit(
      redis as never,
      "user-1",
      "127.0.0.1"
    );

    expect(headers).toHaveProperty("X-RateLimit-Limit");
    expect(headers).toHaveProperty("X-RateLimit-Remaining");
    expect(headers).toHaveProperty("X-RateLimit-Reset");
  });
});

describe("checkRateLimit - IP limit", () => {
  it("blocks IP after reaching daily limit", async () => {
    const today = new Date().toISOString().split("T")[0];
    redis.store.set(`rate:ip:10.0.0.99:${today}`, {
      value: DAILY_IP_LIMIT,
    });

    const { result } = await checkRateLimit(
      redis as never,
      "user-1",
      "10.0.0.99"
    );

    expect(result.allowed).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error).toBe("ip_limit_reached");
  });

  it("IP limit is checked before user limit", async () => {
    const today = new Date().toISOString().split("T")[0];
    // Both limits hit
    redis.store.set(`rate:ip:10.0.0.50:${today}`, {
      value: DAILY_IP_LIMIT,
    });
    redis.store.set(`rate:user:user-5:${today}`, {
      value: DAILY_USER_LIMIT,
    });

    const { result } = await checkRateLimit(
      redis as never,
      "user-5",
      "10.0.0.50"
    );

    // IP check runs first
    expect(result.error).toBe("ip_limit_reached");
  });
});

describe("checkRateLimit - cooldown", () => {
  it("blocks requests within cooldown period", async () => {
    // Set cooldown to "just happened"
    redis.store.set("cooldown:user-3", {
      value: Date.now(),
      expiresAt: Date.now() + 10000,
    });

    const { result } = await checkRateLimit(
      redis as never,
      "user-3",
      "127.0.0.1"
    );

    expect(result.allowed).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error).toBe("cooldown");
    expect(result.waitSeconds).toBeGreaterThan(0);
  });

  it("allows requests after cooldown expires", async () => {
    // Set cooldown to 5 seconds ago (expired)
    redis.store.set("cooldown:user-4", {
      value: Date.now() - 5000,
      expiresAt: Date.now() + 5000,
    });

    const { result } = await checkRateLimit(
      redis as never,
      "user-4",
      "127.0.0.1"
    );

    expect(result.allowed).toBe(true);
  });

  it("cooldown is checked before user credit limit", async () => {
    // Cooldown active, user still has credits
    redis.store.set("cooldown:user-6", {
      value: Date.now(),
      expiresAt: Date.now() + 10000,
    });

    const { result } = await checkRateLimit(
      redis as never,
      "user-6",
      "127.0.0.1"
    );

    expect(result.error).toBe("cooldown");
    // User credits should not be decremented
    const credits = await getUserCredits(redis as never, "user-6");
    expect(credits.used).toBe(0);
  });
});

describe("validatePromptSize", () => {
  it("allows prompts under the token limit", () => {
    const text = "a".repeat(MAX_INPUT_TOKENS * 4 - 100);
    const result = validatePromptSize(text);
    expect(result.allowed).toBe(true);
  });

  it("rejects prompts over the token limit", () => {
    const text = "a".repeat(MAX_INPUT_TOKENS * 4 + 100);
    const result = validatePromptSize(text);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(413);
    expect(result.error).toBe("prompt_too_large");
  });

  it("allows exactly at the limit", () => {
    const text = "a".repeat(MAX_INPUT_TOKENS * 4);
    const result = validatePromptSize(text);
    expect(result.allowed).toBe(true);
  });

  it("allows empty prompts", () => {
    const result = validatePromptSize("");
    expect(result.allowed).toBe(true);
  });
});

describe("estimateTokens", () => {
  it("estimates ~4 chars per token", () => {
    expect(estimateTokens("hello world!")).toBe(3); // 12 chars / 4
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("getUserCredits", () => {
  it("returns 0 used when no requests made", async () => {
    const credits = await getUserCredits(redis as never, "new-user");
    expect(credits.used).toBe(0);
    expect(credits.limit).toBe(DAILY_USER_LIMIT);
    expect(credits.remaining).toBe(DAILY_USER_LIMIT);
  });

  it("reflects actual usage", async () => {
    const today = new Date().toISOString().split("T")[0];
    redis.store.set(`rate:user:user-7:${today}`, { value: 42 });

    const credits = await getUserCredits(redis as never, "user-7");
    expect(credits.used).toBe(42);
    expect(credits.remaining).toBe(DAILY_USER_LIMIT - 42);
  });

  it("clamps remaining to 0 when over limit", async () => {
    const today = new Date().toISOString().split("T")[0];
    redis.store.set(`rate:user:user-8:${today}`, { value: 150 });

    const credits = await getUserCredits(redis as never, "user-8");
    expect(credits.remaining).toBe(0);
  });
});
