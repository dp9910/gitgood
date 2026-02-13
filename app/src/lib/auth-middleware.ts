import { cookies } from "next/headers";
import { getAdminAuth } from "./firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

const SESSION_COOKIE_NAME = "__session";

export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  name: string | undefined;
  picture: string | undefined;
}

/**
 * Verify the session cookie from an incoming request.
 * Returns the decoded user or null if invalid/missing.
 */
export async function verifySession(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) return null;

  try {
    const auth = getAdminAuth();
    const decoded: DecodedIdToken = await auth.verifySessionCookie(
      sessionCookie,
      true // checkRevoked
    );
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication for an API route.
 * Returns the user if authenticated, or a 401 Response.
 */
export async function requireAuth(): Promise<
  { user: AuthenticatedUser } | { error: Response }
> {
  const user = await verifySession();
  if (!user) {
    return {
      error: Response.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      ),
    };
  }
  return { user };
}

export { SESSION_COOKIE_NAME };
