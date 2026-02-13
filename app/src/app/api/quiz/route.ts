import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getRedis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateQuiz, generateChallenge } from "@/lib/quiz";

/**
 * POST /api/quiz
 *
 * Generate a quiz or coding challenge for a given topic.
 * type=quiz → 5 multiple choice questions (2 credits)
 * type=challenge → 1 coding challenge (3 credits)
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
  let topicName: string;
  let categoryName: string;
  let repoFullName: string;
  let level: string;
  let type: "quiz" | "challenge";

  try {
    const body = await request.json();
    topicName = body.topicName;
    categoryName = body.categoryName ?? "";
    repoFullName = body.repoFullName ?? "";
    level = body.level ?? "intermediate";
    type = body.type ?? "quiz";

    if (!topicName || typeof topicName !== "string") {
      return Response.json(
        { error: "invalid_input", message: "Missing topicName" },
        { status: 400 }
      );
    }

    if (type !== "quiz" && type !== "challenge") {
      return Response.json(
        { error: "invalid_input", message: "type must be 'quiz' or 'challenge'" },
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
    const quizRequest = { topicName, categoryName, repoFullName, level, type };

    if (type === "quiz") {
      const quiz = await generateQuiz(quizRequest);
      return Response.json(
        { quiz, remaining: rlResult.remaining },
        { headers: rlHeaders }
      );
    } else {
      const challenge = await generateChallenge(quizRequest);
      return Response.json(
        { challenge, remaining: rlResult.remaining },
        { headers: rlHeaders }
      );
    }
  } catch (e) {
    const errMessage =
      e instanceof Error ? e.message : "Failed to generate content";
    return Response.json(
      { error: "generation_failed", message: errMessage },
      { status: 502, headers: rlHeaders }
    );
  }
}
