import { requireAuth } from "@/lib/auth-middleware";

/**
 * GET /api/protected
 * Example protected API route — returns 401 if not authenticated.
 */
export async function GET() {
  const result = await requireAuth();
  if ("error" in result) return result.error;

  return Response.json({
    message: "Authenticated",
    user: result.user,
  });
}
