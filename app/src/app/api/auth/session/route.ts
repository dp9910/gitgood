import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth-middleware";

const SESSION_EXPIRY_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

/**
 * POST /api/auth/session
 * Receives a Firebase ID token and creates an httpOnly session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return Response.json(
        { error: "Missing idToken" },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();

    // Verify the ID token first
    await auth.verifyIdToken(idToken);

    // Create a session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_MS,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_MS / 1000,
      path: "/",
    });

    return Response.json({ status: "success" });
  } catch {
    return Response.json(
      { error: "Invalid token" },
      { status: 401 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * Clears the session cookie (logout).
 */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return Response.json({ status: "success" });
}
