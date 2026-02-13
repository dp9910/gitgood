import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getRedis } from "@/lib/redis";
import { checkRateLimit, validatePromptSize } from "@/lib/rate-limit";
import { generateChatResponse } from "@/lib/chat";

/**
 * POST /api/chat
 *
 * AI tutor chat endpoint. Receives user question with context
 * (current topic, proficiency level, code snippets) and returns
 * Gemini response with rate limiting.
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
  let message: string;
  let topicName: string;
  let categoryName: string;
  let repoFullName: string;
  let level: string;
  let action: string | undefined;

  try {
    const body = await request.json();
    message = body.message;
    topicName = body.topicName ?? "";
    categoryName = body.categoryName ?? "";
    repoFullName = body.repoFullName ?? "";
    level = body.level ?? "intermediate";
    action = body.action;

    if (!message || typeof message !== "string") {
      return Response.json(
        { error: "invalid_input", message: "Missing message" },
        { status: 400 }
      );
    }
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate prompt size
  const sizeCheck = validatePromptSize(message);
  if (!sizeCheck.allowed) {
    return Response.json(
      { error: sizeCheck.error, message: sizeCheck.message },
      { status: sizeCheck.status ?? 413, headers: rlHeaders }
    );
  }

  // Generate response
  try {
    const response = await generateChatResponse({
      message,
      topicName,
      categoryName,
      repoFullName,
      level,
      action,
    });

    return Response.json(
      { response, remaining: rlResult.remaining },
      { headers: rlHeaders }
    );
  } catch (e) {
    const errMessage =
      e instanceof Error ? e.message : "Failed to generate response";
    return Response.json(
      { error: "generation_failed", message: errMessage },
      { status: 502, headers: rlHeaders }
    );
  }
}
