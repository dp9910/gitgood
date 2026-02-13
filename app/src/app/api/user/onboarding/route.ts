import { requireAuth } from "@/lib/auth-middleware";
import {
  updateProfile,
  getUserGithubToken,
} from "@/lib/user-profile";
import { getUserOctokit, createRepo } from "@/lib/github";

/**
 * POST /api/user/onboarding
 * Complete onboarding. Optionally creates `gitgood-learning` repo.
 */
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  let body: { createRepo?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const updates: Record<string, unknown> = {
    onboardingComplete: true,
  };

  // Optionally create the learning repo
  if (body.createRepo) {
    const token = await getUserGithubToken(user.uid);
    if (!token) {
      return Response.json(
        { error: "no_token", message: "GitHub token not found. Please re-authenticate." },
        { status: 400 }
      );
    }

    try {
      const octokit = getUserOctokit(token);
      const { fullName } = await createRepo(octokit, "gitgood-learning", {
        description: "My GitGood learning progress and notes",
        isPrivate: true,
      });
      updates.learningRepoCreated = true;
      updates.learningRepoName = fullName;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create repo";
      // If repo already exists, that's fine
      if (message.includes("already exists") || message.includes("name already exists")) {
        updates.learningRepoCreated = true;
        updates.learningRepoName = `${user.name}/gitgood-learning`;
      } else {
        return Response.json(
          { error: "repo_creation_failed", message },
          { status: 502 }
        );
      }
    }
  }

  await updateProfile(user.uid, updates);
  return Response.json({ status: "success", ...updates });
}
