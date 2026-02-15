import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListAvailableMaterials = vi.fn();

vi.mock("../lib/material-index", () => ({
  listAvailableMaterials: (...args: unknown[]) => mockListAvailableMaterials(...args),
}));

import { GET } from "../app/api/materials/route";

const sampleMaterials = [
  {
    owner: "karpathy",
    name: "micrograd",
    language: "python",
    description: "A tiny autograd engine",
    levels: { beginner: true, intermediate: false, advanced: false },
    estimatedHours: { beginner: 8, intermediate: 5, advanced: 3 },
    timesAccessed: 10,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/materials", () => {
  it("returns 200 with materials array", async () => {
    mockListAvailableMaterials.mockResolvedValue(sampleMaterials);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.materials).toEqual(sampleMaterials);
  });

  it("calls listAvailableMaterials", async () => {
    mockListAvailableMaterials.mockResolvedValue([]);

    await GET();

    expect(mockListAvailableMaterials).toHaveBeenCalledTimes(1);
  });

  it("returns empty array on error", async () => {
    mockListAvailableMaterials.mockRejectedValue(new Error("Firestore down"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.materials).toEqual([]);
  });
});
