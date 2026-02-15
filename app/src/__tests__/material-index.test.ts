import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildDocumentId,
  lookupMaterial,
  saveMaterial,
  markLevelGenerated,
  incrementAccess,
  listAvailableMaterials,
  COLLECTION,
  type MaterialRecord,
} from "../lib/material-index";

// ---------- Mocks ----------

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockRunTransaction = vi.fn();
const mockCollectionGet = vi.fn();

const mockDoc = vi.fn().mockReturnValue({
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
});

const mockCollection = vi.fn().mockReturnValue({
  doc: mockDoc,
  get: mockCollectionGet,
});

vi.mock("../lib/firebase-admin", () => ({
  getAdminFirestore: () => ({
    collection: (...args: unknown[]) => mockCollection(...args),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  }),
}));

// ---------- Fixtures ----------

const sampleRecord: MaterialRecord = {
  repoUrl: "https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95",
  owner: "karpathy",
  name: "8627fe009c40f57531cb18360106ce95",
  language: "python",
  type: "gist",
  description: "A tiny autograd engine and neural net",
  levels: {
    beginner: { generated: true, generatedAt: "2026-01-01T00:00:00.000Z" },
    intermediate: { generated: false, generatedAt: null },
    advanced: { generated: false, generatedAt: null },
  },
  feasibility: {
    canLearn: true,
    complexity: "moderate",
    prerequisites: ["Basic Python"],
    estimatedHours: { beginner: 8, intermediate: 5, advanced: 3 },
    reason: null,
  },
  timesAccessed: 10,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Reset mockDoc chain
  mockDoc.mockReturnValue({
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
  });
  mockCollection.mockReturnValue({
    doc: mockDoc,
    get: mockCollectionGet,
  });
});

// ---------- Tests ----------

describe("buildDocumentId", () => {
  it("builds ID from language, owner, name", () => {
    const id = buildDocumentId("python", "karpathy", "8627fe009c40f57531cb18360106ce95");
    expect(id).toBe("python_karpathy_8627fe009c40f57531cb18360106ce95");
  });

  it("sanitizes special characters", () => {
    const id = buildDocumentId("Python", "Some-User", "my.repo-name");
    expect(id).toBe("python_some_user_my_repo_name");
  });

  it("removes leading/trailing underscores", () => {
    const id = buildDocumentId("--Python--", "user", "repo");
    expect(id).toBe("python_user_repo");
  });

  it("handles uppercase", () => {
    const id = buildDocumentId("JavaScript", "Facebook", "React");
    expect(id).toBe("javascript_facebook_react");
  });

  it("collapses consecutive special chars into single underscore", () => {
    const id = buildDocumentId("python", "user---name", "repo...name");
    expect(id).toBe("python_user_name_repo_name");
  });
});

describe("lookupMaterial", () => {
  it("returns MaterialRecord when document exists", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => sampleRecord,
    });

    const result = await lookupMaterial("python_karpathy_test");

    expect(mockCollection).toHaveBeenCalledWith(COLLECTION);
    expect(mockDoc).toHaveBeenCalledWith("python_karpathy_test");
    expect(result).toEqual(sampleRecord);
    expect(result?.owner).toBe("karpathy");
  });

  it("returns null when document does not exist", async () => {
    mockGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });

    const result = await lookupMaterial("nonexistent_doc");
    expect(result).toBeNull();
  });
});

describe("saveMaterial", () => {
  it("saves record to Firestore with correct collection and docId", async () => {
    mockSet.mockResolvedValue(undefined);

    await saveMaterial("python_karpathy_test", sampleRecord);

    expect(mockCollection).toHaveBeenCalledWith(COLLECTION);
    expect(mockDoc).toHaveBeenCalledWith("python_karpathy_test");
    expect(mockSet).toHaveBeenCalledWith(sampleRecord);
  });
});

describe("markLevelGenerated", () => {
  it("updates the correct level field and timestamp", async () => {
    mockUpdate.mockResolvedValue(undefined);

    await markLevelGenerated("python_karpathy_test", "intermediate");

    expect(mockCollection).toHaveBeenCalledWith(COLLECTION);
    expect(mockDoc).toHaveBeenCalledWith("python_karpathy_test");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        "levels.intermediate.generated": true,
        "levels.intermediate.generatedAt": expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  it("works for beginner level", async () => {
    mockUpdate.mockResolvedValue(undefined);

    await markLevelGenerated("doc_id", "beginner");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        "levels.beginner.generated": true,
      })
    );
  });

  it("works for advanced level", async () => {
    mockUpdate.mockResolvedValue(undefined);

    await markLevelGenerated("doc_id", "advanced");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        "levels.advanced.generated": true,
      })
    );
  });
});

describe("incrementAccess", () => {
  it("increments timesAccessed within a transaction", async () => {
    const mockTxGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ ...sampleRecord, timesAccessed: 10 }),
    });
    const mockTxUpdate = vi.fn();

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: mockTxGet, update: mockTxUpdate });
    });

    await incrementAccess("python_karpathy_test");

    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockTxUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        timesAccessed: 11,
        updatedAt: expect.any(String),
      })
    );
  });

  it("does nothing if document does not exist", async () => {
    const mockTxGet = vi.fn().mockResolvedValue({ exists: false });
    const mockTxUpdate = vi.fn();

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: mockTxGet, update: mockTxUpdate });
    });

    await incrementAccess("nonexistent");

    expect(mockTxUpdate).not.toHaveBeenCalled();
  });
});

describe("listAvailableMaterials", () => {
  const learnableRecord: MaterialRecord = {
    ...sampleRecord,
    owner: "karpathy",
    name: "micrograd",
    timesAccessed: 20,
    feasibility: { ...sampleRecord.feasibility, canLearn: true },
    levels: {
      beginner: { generated: true, generatedAt: "2026-01-01T00:00:00.000Z" },
      intermediate: { generated: true, generatedAt: "2026-01-02T00:00:00.000Z" },
      advanced: { generated: false, generatedAt: null },
    },
  };

  const unlearnableRecord: MaterialRecord = {
    ...sampleRecord,
    owner: "test",
    name: "unlearnable",
    timesAccessed: 5,
    feasibility: { ...sampleRecord.feasibility, canLearn: false },
    levels: {
      beginner: { generated: true, generatedAt: "2026-01-01T00:00:00.000Z" },
      intermediate: { generated: false, generatedAt: null },
      advanced: { generated: false, generatedAt: null },
    },
  };

  const noGeneratedRecord: MaterialRecord = {
    ...sampleRecord,
    owner: "test",
    name: "none-generated",
    timesAccessed: 3,
    feasibility: { ...sampleRecord.feasibility, canLearn: true },
    levels: {
      beginner: { generated: false, generatedAt: null },
      intermediate: { generated: false, generatedAt: null },
      advanced: { generated: false, generatedAt: null },
    },
  };

  const lowAccessRecord: MaterialRecord = {
    ...sampleRecord,
    owner: "trekhleb",
    name: "javascript-algorithms",
    language: "javascript",
    timesAccessed: 5,
    feasibility: { ...sampleRecord.feasibility, canLearn: true },
    levels: {
      beginner: { generated: true, generatedAt: "2026-01-03T00:00:00.000Z" },
      intermediate: { generated: false, generatedAt: null },
      advanced: { generated: false, generatedAt: null },
    },
  };

  it("returns materials with at least one generated level", async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [{ data: () => learnableRecord }],
    });

    const results = await listAvailableMaterials();
    expect(results).toHaveLength(1);
    expect(results[0].owner).toBe("karpathy");
    expect(results[0].name).toBe("micrograd");
  });

  it("includes correct level availability", async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [{ data: () => learnableRecord }],
    });

    const results = await listAvailableMaterials();
    expect(results[0].levels).toEqual({
      beginner: true,
      intermediate: true,
      advanced: false,
    });
  });

  it("excludes materials where canLearn is false", async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        { data: () => learnableRecord },
        { data: () => unlearnableRecord },
      ],
    });

    const results = await listAvailableMaterials();
    expect(results).toHaveLength(1);
    expect(results[0].owner).toBe("karpathy");
  });

  it("excludes materials with no generated levels", async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        { data: () => learnableRecord },
        { data: () => noGeneratedRecord },
      ],
    });

    const results = await listAvailableMaterials();
    expect(results).toHaveLength(1);
  });

  it("sorts by timesAccessed descending", async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        { data: () => lowAccessRecord },
        { data: () => learnableRecord },
      ],
    });

    const results = await listAvailableMaterials();
    expect(results).toHaveLength(2);
    expect(results[0].timesAccessed).toBe(20);
    expect(results[1].timesAccessed).toBe(5);
  });

  it("returns empty array for empty collection", async () => {
    mockCollectionGet.mockResolvedValue({ docs: [] });

    const results = await listAvailableMaterials();
    expect(results).toEqual([]);
  });
});
