import { NextRequest } from "next/server";
import { getOrGenerateSummary } from "@/lib/course-summary";

/**
 * POST /api/course-summary
 *
 * Public endpoint (no auth required).
 * Accepts { owner: string, name: string }
 * Returns cached or freshly generated course summary.
 */
export async function POST(request: NextRequest) {
  let owner: string;
  let name: string;

  try {
    const body = await request.json();
    owner = body.owner;
    name = body.name;

    if (
      !owner ||
      typeof owner !== "string" ||
      !name ||
      typeof name !== "string"
    ) {
      return Response.json(
        { error: "invalid_input", message: "Missing owner or name" },
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
    const { summary, source } = await getOrGenerateSummary(owner, name);
    return Response.json({ summary, source });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to generate summary";
    return Response.json(
      { error: "generation_failed", message },
      { status: 502 }
    );
  }
}
