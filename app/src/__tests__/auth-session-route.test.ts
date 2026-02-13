import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock cookies
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock firebase-admin auth
const mockVerifyIdToken = vi.fn();
const mockCreateSessionCookie = vi.fn();
const mockVerifySessionCookie = vi.fn();
vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
    createSessionCookie: mockCreateSessionCookie,
    verifySessionCookie: mockVerifySessionCookie,
  }),
}));

import { POST, DELETE } from "@/app/api/auth/session/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/session", () => {
  it("returns 400 when idToken is missing", async () => {
    const req = new NextRequest("http://localhost/api/auth/session", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing idToken");
  });

  it("returns 400 when idToken is not a string", async () => {
    const req = new NextRequest("http://localhost/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: 12345 }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when Firebase rejects the token", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

    const req = new NextRequest("http://localhost/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: "bad-token" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid token");
  });

  it("creates session cookie on valid token", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "user-1" });
    mockCreateSessionCookie.mockResolvedValue("session-cookie-value");

    const req = new NextRequest("http://localhost/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: "valid-firebase-token" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("success");

    // Verify cookie was set with correct options
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "__session",
      "session-cookie-value",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      })
    );
  });

  it("sets cookie as httpOnly and non-accessible to JS", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "user-1" });
    mockCreateSessionCookie.mockResolvedValue("cookie-val");

    const req = new NextRequest("http://localhost/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: "valid-token" }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req);

    const setArgs = mockCookieStore.set.mock.calls[0];
    const cookieOptions = setArgs[2];
    expect(cookieOptions.httpOnly).toBe(true);
  });
});

describe("DELETE /api/auth/session", () => {
  it("clears the session cookie", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mockCookieStore.delete).toHaveBeenCalledWith("__session");
    const body = await res.json();
    expect(body.status).toBe("success");
  });
});
