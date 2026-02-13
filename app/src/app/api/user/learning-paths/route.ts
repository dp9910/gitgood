import { requireAuth } from "@/lib/auth-middleware";
import {
  getProfile,
  addLearningPath,
  updateLearningPath,
  type LearningPathEntry,
} from "@/lib/user-profile";

/**
 * GET /api/user/learning-paths
 * Return user's learning paths.
 */
export async function GET() {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  const profile = await getProfile(user.uid);
  return Response.json({ learningPaths: profile?.learningPaths ?? [] });
}

/**
 * POST /api/user/learning-paths
 * Add a new learning path.
 */
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let entry: LearningPathEntry;
  try {
    entry = await request.json();
    if (!entry.repoOwner || !entry.repoName || !entry.language || !entry.level) {
      return Response.json(
        { error: "invalid_input", message: "Missing required fields: repoOwner, repoName, language, level" },
        { status: 400 }
      );
    }
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  try {
    await addLearningPath(user.uid, entry);
    return Response.json({ status: "success" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add learning path";
    return Response.json(
      { error: "add_failed", message },
      { status: 409 }
    );
  }
}

/**
 * PATCH /api/user/learning-paths
 * Update an existing learning path.
 */
export async function PATCH(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let body: { repoOwner: string; repoName: string; level: string; updates: Partial<LearningPathEntry> };
  try {
    body = await request.json();
    if (!body.repoOwner || !body.repoName || !body.level || !body.updates) {
      return Response.json(
        { error: "invalid_input", message: "Missing required fields: repoOwner, repoName, level, updates" },
        { status: 400 }
      );
    }
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  try {
    await updateLearningPath(user.uid, body.repoOwner, body.repoName, body.level, body.updates);
    return Response.json({ status: "success" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update learning path";
    return Response.json(
      { error: "update_failed", message },
      { status: 500 }
    );
  }
}
