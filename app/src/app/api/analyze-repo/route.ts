import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getRedis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseRepoUrl, getUserOctokit, fetchFileContent } from "@/lib/github";
import { checkCache, saveToCache, cloneToUserRepo } from "@/lib/curriculum-cache";
import { analyzeRepo } from "@/lib/repo-analysis";
import { generateCurriculum } from "@/lib/gemini";
import type { UserPreferences } from "@/components/proficiency-modal";

/**
 * POST /api/analyze-repo
 *
 * Orchestrates the full curriculum generation flow:
 * 1. Auth + rate limit
 * 2. Parse URL
 * 3. Check cache → return cached if available
 * 4. Analyze repo (metadata, file tree, file contents)
 * 5. Generate curriculum via Gemini AI
 * 6. Save to central cache (fire-and-forget)
 * 7. Return curriculum to client
 */
export async function POST(request: NextRequest) {
  // 1. Auth
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  // 2. Rate limit
  const redis = getRedis();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { result: rateLimitResult, headers: rateLimitHeaders } =
    await checkRateLimit(redis, user.uid, ip);

  if (!rateLimitResult.allowed) {
    return Response.json(
      {
        error: rateLimitResult.error,
        message: rateLimitResult.message,
        resetAt: rateLimitResult.resetAt,
        waitSeconds: rateLimitResult.waitSeconds,
      },
      {
        status: rateLimitResult.status ?? 429,
        headers: rateLimitHeaders,
      }
    );
  }

  // 3. Parse request body
  let url: string;
  let preferences: UserPreferences;
  let userGithubToken: string | undefined;

  try {
    const body = await request.json();
    url = body.url;
    preferences = body.preferences;
    userGithubToken = body.githubToken;

    if (!url || typeof url !== "string") {
      return Response.json(
        { error: "invalid_input", message: "Missing repo URL" },
        { status: 400 }
      );
    }

    if (
      !preferences ||
      !preferences.level ||
      !preferences.goal ||
      !preferences.timeCommitment
    ) {
      return Response.json(
        { error: "invalid_input", message: "Missing user preferences" },
        { status: 400 }
      );
    }
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // 4. Parse URL
  const parsed = parseRepoUrl(url);
  if (!parsed) {
    return Response.json(
      { error: "invalid_url", message: "Invalid GitHub repository URL" },
      { status: 400 }
    );
  }
  const { owner, repo } = parsed;

  // 5. Check cache
  const cacheResult = await checkCache(owner, repo);

  if (cacheResult.hit) {
    // Clone to user repo in background (non-blocking) if they have a token
    if (userGithubToken) {
      const userOctokit = getUserOctokit(userGithubToken);
      cloneToUserRepo(
        userOctokit,
        user.uid,
        cacheResult.curriculum,
        cacheResult.metadata,
        preferences
      ).catch(() => {
        // Silently fail — user can still learn, just won't have GitHub sync
      });
    }

    return Response.json(
      {
        source: "cache",
        curriculum: cacheResult.curriculum,
        metadata: cacheResult.metadata,
      },
      { headers: rateLimitHeaders }
    );
  }

  // 6. Analyze repo (fetch metadata, file tree, file contents)
  let analysis;
  try {
    const octokit = userGithubToken
      ? getUserOctokit(userGithubToken)
      : getUserOctokit(""); // Will rely on unauthenticated GitHub API

    analysis = await analyzeRepo(octokit, owner, repo);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to analyze repository";
    return Response.json(
      { error: "analysis_failed", message },
      { status: 502, headers: rateLimitHeaders }
    );
  }

  // 6a. If repo is massive, return alternatives instead
  if (analysis.classification.blocked) {
    return Response.json(
      {
        error: "repo_too_large",
        message: analysis.classification.message,
        classification: analysis.classification,
        alternatives: analysis.alternatives,
      },
      { status: 422, headers: rateLimitHeaders }
    );
  }

  // 7. Fetch README separately for the prompt (may already be in fileContents)
  let readme = analysis.fileContents.get("README.md") ?? "";
  if (!readme) {
    try {
      const octokit = userGithubToken
        ? getUserOctokit(userGithubToken)
        : getUserOctokit("");
      const readmeResult = await fetchFileContent(
        octokit,
        owner,
        repo,
        "README.md",
        { maxChars: 2000 }
      );
      readme = readmeResult.content;
    } catch {
      // No README — that's fine, AI will work with file snippets
    }
  }

  // 8. Generate curriculum via Gemini
  let generationResult;
  try {
    generationResult = await generateCurriculum(
      analysis.metadata,
      analysis.repoType,
      readme,
      analysis.fileContents,
      preferences
    );
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to generate curriculum";
    return Response.json(
      { error: "generation_failed", message },
      { status: 502, headers: rateLimitHeaders }
    );
  }

  const { curriculum, model } = generationResult;

  // 9. Save to central cache (fire-and-forget)
  saveToCache(curriculum, analysis.metadata.defaultBranch, model).catch(
    () => {
      // Silently fail — curriculum was generated, user can still use it
    }
  );

  // 10. Clone to user repo in background (non-blocking)
  if (userGithubToken) {
    const userOctokit = getUserOctokit(userGithubToken);
    const cacheMetadata = {
      repoCommitSha: analysis.metadata.defaultBranch,
      createdAt: new Date().toISOString(),
      timesUsed: 1,
      averageRating: null,
      aiModel: model,
    };
    cloneToUserRepo(
      userOctokit,
      user.uid,
      curriculum,
      cacheMetadata,
      preferences
    ).catch(() => {
      // Silently fail
    });
  }

  return Response.json(
    {
      source: "generated",
      curriculum,
      model,
      classification: analysis.classification,
      repoType: analysis.repoType,
    },
    { headers: rateLimitHeaders }
  );
}
