import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getRedis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserOctokit, commitFile, fetchFileContent } from "@/lib/github";
import type { ProgressData } from "@/lib/progress";

/**
 * POST /api/sync-progress
 *
 * Sync learning progress to the user's learning-tracker repo on GitHub.
 * Receives the full progress object and commits it as progress.json.
 */
export async function POST(request: NextRequest) {
  // Auth
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  // Rate limit
  const redis = getRedis();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { result: rlResult, headers: rlHeaders } = await checkRateLimit(
    redis,
    user.uid,
    ip
  );

  if (!rlResult.allowed) {
    return Response.json(
      {
        error: rlResult.error,
        message: rlResult.message,
        resetAt: rlResult.resetAt,
      },
      { status: rlResult.status ?? 429, headers: rlHeaders }
    );
  }

  // Parse body
  let repoOwner: string;
  let repoName: string;
  let progress: ProgressData;
  let commitMessage: string;

  try {
    const body = await request.json();
    repoOwner = body.repoOwner;
    repoName = body.repoName;
    progress = body.progress;
    commitMessage = body.commitMessage ?? "Learning session update";

    if (!repoOwner || !repoName || !progress) {
      return Response.json(
        { error: "invalid_input", message: "Missing required fields" },
        { status: 400 }
      );
    }
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Get user's GitHub token from session (stored in Firebase custom claims)
  // For now, use the cache token as a fallback — in production this would
  // come from the user's OAuth token stored in their Firebase profile.
  const octokit = getUserOctokit(user.uid);

  const trackerRepo = "learning-tracker";
  const folder = `${repoOwner}-${repoName}`;
  const filePath = `${folder}/progress.json`;

  try {
    // Fetch existing file to get its SHA (needed for update)
    let existingSha: string | undefined;
    try {
      const existing = await fetchFileContent(
        octokit,
        user.name ?? user.uid,
        trackerRepo,
        filePath,
        { maxChars: 500_000 }
      );
      // We need the actual file SHA from the API, not just content
      // Re-fetch with raw API to get the SHA
      const res = await octokit.rest.repos.getContent({
        owner: user.name ?? user.uid,
        repo: trackerRepo,
        path: filePath,
      });
      const data = res.data;
      if (!Array.isArray(data) && "sha" in data) {
        existingSha = data.sha;
      }
      // Merge with existing progress data if present
      try {
        const existingProgress: ProgressData = JSON.parse(existing.content);
        progress = { ...existingProgress, ...progress };
      } catch {
        // Parse error — overwrite with new data
      }
    } catch {
      // File doesn't exist yet — first sync will create it
    }

    await commitFile(
      octokit,
      user.name ?? user.uid,
      trackerRepo,
      filePath,
      JSON.stringify(progress, null, 2),
      commitMessage,
      { sha: existingSha }
    );

    return Response.json(
      { success: true, message: "Progress synced" },
      { headers: rlHeaders }
    );
  } catch (e) {
    const errMessage =
      e instanceof Error ? e.message : "Failed to sync progress";
    return Response.json(
      { error: "sync_failed", message: errMessage },
      { status: 502, headers: rlHeaders }
    );
  }
}
