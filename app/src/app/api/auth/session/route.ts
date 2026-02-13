import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth-middleware";
import { getOrCreateProfile, storeGithubToken } from "@/lib/user-profile";

const SESSION_EXPIRY_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

/**
 * POST /api/auth/session
 * Receives a Firebase ID token and creates an httpOnly session cookie.
 * Optionally stores encrypted GitHub access token in user profile.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, githubAccessToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return Response.json(
        { error: "Missing idToken" },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();

    // Verify the ID token first
    const decoded = await auth.verifyIdToken(idToken);

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

    // Create or fetch user profile in Firestore
    await getOrCreateProfile(decoded.uid, {
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      photoURL: decoded.picture ?? null,
      githubUsername: decoded.firebase?.identities?.["github.com"]?.[0] ?? null,
    });

    // Store encrypted GitHub token if provided
    if (githubAccessToken && typeof githubAccessToken === "string") {
      await storeGithubToken(decoded.uid, githubAccessToken);
    }

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
