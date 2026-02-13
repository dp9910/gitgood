import { parseRepoUrl } from "@/lib/github";
import { checkCache, incrementCacheUsage } from "@/lib/curriculum-cache";

/**
 * POST /api/check-cache
 *
 * Lightweight cache check — no auth required.
 * Returns whether a curriculum exists for the given repo URL.
 * Used by the landing page to show "Instant curriculum available" badge.
 */
export async function POST(request: Request) {
  let url: string;

  try {
    const body = await request.json();
    url = body.url;

    if (!url || typeof url !== "string") {
      return Response.json(
        { error: "invalid_input", message: "Missing repo URL" },
        { status: 400 }
      );
    }
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = parseRepoUrl(url);
  if (!parsed) {
    return Response.json(
      { error: "invalid_url", message: "Invalid GitHub repository URL" },
      { status: 400 }
    );
  }

  const { owner, repo } = parsed;
  const result = await checkCache(owner, repo);

  if (result.hit) {
    // Increment usage counter (fire-and-forget)
    incrementCacheUsage(owner, repo, result.metadata).catch(() => {});

    return Response.json({
      cached: true,
      metadata: {
        createdAt: result.metadata.createdAt,
        timesUsed: result.metadata.timesUsed,
        aiModel: result.metadata.aiModel,
      },
      categoryCount: result.curriculum.categories.length,
      topicCount: result.curriculum.categories.reduce(
        (sum, c) => sum + c.topics.length,
        0
      ),
    });
  }

  return Response.json({ cached: false });
}
