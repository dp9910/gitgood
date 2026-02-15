import { listAvailableMaterials } from "@/lib/material-index";

/**
 * GET /api/materials
 *
 * Public endpoint — no auth required.
 * Returns lightweight metadata for all available (generated) learning materials.
 */
export async function GET() {
  try {
    const materials = await listAvailableMaterials();
    return Response.json({ materials });
  } catch {
    return Response.json({ materials: [] });
  }
}
