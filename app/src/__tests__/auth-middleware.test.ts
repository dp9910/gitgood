import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock cookies() from next/headers
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock firebase-admin auth
const mockVerifySessionCookie = vi.fn();
vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: () => ({
    verifySessionCookie: mockVerifySessionCookie,
  }),
}));

// Import after mocks are set up
import { verifySession, requireAuth, SESSION_COOKIE_NAME } from "@/lib/auth-middleware";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("verifySession", () => {
  it("returns null when no session cookie exists", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await verifySession();

    expect(result).toBeNull();
    expect(mockCookieStore.get).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
    expect(mockVerifySessionCookie).not.toHaveBeenCalled();
  });

  it("returns user when valid session cookie exists", async () => {
    mockCookieStore.get.mockReturnValue({ value: "valid-session-token" });
    mockVerifySessionCookie.mockResolvedValue({
      uid: "user-123",
      email: "test@example.com",
      name: "Test User",
      picture: "https://example.com/avatar.jpg",
    });

    const result = await verifySession();

    expect(result).toEqual({
      uid: "user-123",
      email: "test@example.com",
      name: "Test User",
      picture: "https://example.com/avatar.jpg",
    });
    expect(mockVerifySessionCookie).toHaveBeenCalledWith(
      "valid-session-token",
      true
    );
  });

  it("returns null when session cookie is invalid/expired", async () => {
    mockCookieStore.get.mockReturnValue({ value: "expired-token" });
    mockVerifySessionCookie.mockRejectedValue(
      new Error("Session cookie has been revoked")
    );

    const result = await verifySession();

    expect(result).toBeNull();
  });

  it("returns null when firebase-admin throws unexpected error", async () => {
    mockCookieStore.get.mockReturnValue({ value: "some-token" });
    mockVerifySessionCookie.mockRejectedValue(new Error("Network failure"));

    const result = await verifySession();

    expect(result).toBeNull();
  });
});

describe("requireAuth", () => {
  it("returns error Response with 401 when no cookie present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await requireAuth();

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(401);
      const body = await result.error.json();
      expect(body.error).toBe("Unauthorized");
      expect(body.message).toBe("Authentication required");
    }
  });

  it("returns error Response with 401 when token is invalid", async () => {
    mockCookieStore.get.mockReturnValue({ value: "bad-token" });
    mockVerifySessionCookie.mockRejectedValue(new Error("Invalid"));

    const result = await requireAuth();

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(401);
    }
  });

  it("returns user object when authentication succeeds", async () => {
    mockCookieStore.get.mockReturnValue({ value: "good-token" });
    mockVerifySessionCookie.mockResolvedValue({
      uid: "user-456",
      email: "dev@example.com",
      name: "Dev User",
      picture: "https://example.com/dev.jpg",
    });

    const result = await requireAuth();

    expect("user" in result).toBe(true);
    if ("user" in result) {
      expect(result.user.uid).toBe("user-456");
      expect(result.user.email).toBe("dev@example.com");
      expect(result.user.name).toBe("Dev User");
    }
  });
});

describe("SESSION_COOKIE_NAME", () => {
  it("is __session (Firebase hosting compatible)", () => {
    expect(SESSION_COOKIE_NAME).toBe("__session");
  });
});
