import { requireAuth } from "@/lib/auth-middleware";
import { getOrCreateProfile, updateProfile } from "@/lib/user-profile";

/**
 * GET /api/user/profile
 * Return current user's profile (creates if missing).
 */
export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const profile = await getOrCreateProfile(user.uid, {
    email: user.email ?? null,
    displayName: user.name ?? null,
    photoURL: user.picture ?? null,
  });

  // Never expose encrypted token to client
  const { encryptedGithubToken: _, ...safeProfile } = profile;
  return Response.json(safeProfile);
}

/**
 * PATCH /api/user/profile
 * Update profile fields.
 */
export async function PATCH(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let updates: Record<string, unknown>;
  try {
    updates = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Prevent overwriting sensitive/immutable fields
  const forbidden = ["uid", "createdAt", "encryptedGithubToken"];
  for (const key of forbidden) {
    delete updates[key];
  }

  await updateProfile(user.uid, updates);
  return Response.json({ status: "success" });
}
