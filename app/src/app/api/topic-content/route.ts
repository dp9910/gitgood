import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getRedis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTopicContent } from "@/lib/topic-content";

/**
 * POST /api/topic-content
 *
 * Generate or fetch topic explanation content at a given proficiency level.
 * Uses Gemini AI to generate markdown content for the selected topic.
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
        waitSeconds: rlResult.waitSeconds,
      },
      { status: rlResult.status ?? 429, headers: rlHeaders }
    );
  }

  // Parse body
  let repoOwner: string;
  let repoName: string;
  let topicName: string;
  let categoryName: string;
  let subtopics: string[];
  let level: string;
  let repoLanguage: string;

  try {
    const body = await request.json();
    repoOwner = body.repoOwner;
    repoName = body.repoName;
    topicName = body.topicName;
    categoryName = body.categoryName;
    subtopics = body.subtopics ?? [];
    level = body.level ?? "intermediate";
    repoLanguage = body.repoLanguage ?? "Unknown";

    if (!repoOwner || !repoName || !topicName || !categoryName) {
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

  // Generate content
  try {
    const content = await getTopicContent({
      repoOwner,
      repoName,
      topicName,
      categoryName,
      subtopics,
      level,
      repoLanguage,
    });

    return Response.json({ content, level }, { headers: rlHeaders });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to generate content";
    return Response.json(
      { error: "generation_failed", message },
      { status: 502, headers: rlHeaders }
    );
  }
}
