import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPendingSyncs,
  addPendingSync,
  removePendingSync,
  clearAllPendingSyncs,
  shouldSync,
  buildCommitMessage,
  toProgressData,
  toSimpleProgress,
  BATCH_TOPIC_THRESHOLD,
  BATCH_TIME_MS,
  STORAGE_KEY,
  type PendingSync,
} from "../lib/progress";

// ---------- localStorage mock ----------

const storage: Record<string, string> = {};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(storage)) delete storage[key];

  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    },
    writable: true,
    configurable: true,
  });
});

// ---------- Tests ----------

describe("getPendingSyncs", () => {
  it("returns empty array when nothing stored", () => {
    expect(getPendingSyncs()).toEqual([]);
  });

  it("returns parsed syncs from localStorage", () => {
    const syncs: PendingSync[] = [
      {
        repoOwner: "karpathy",
        repoName: "micrograd",
        progress: { "Backprop": { status: "completed", completedAt: "2026-01-01" } },
        updatedTopics: ["Backprop"],
        queuedAt: "2026-01-01T00:00:00Z",
      },
    ];
    storage[STORAGE_KEY] = JSON.stringify(syncs);
    expect(getPendingSyncs()).toEqual(syncs);
  });

  it("returns empty array on corrupted JSON", () => {
    storage[STORAGE_KEY] = "invalid{json";
    expect(getPendingSyncs()).toEqual([]);
  });
});

describe("addPendingSync", () => {
  it("adds a new sync entry", () => {
    const sync: PendingSync = {
      repoOwner: "karpathy",
      repoName: "micrograd",
      progress: { "Backprop": { status: "completed" } },
      updatedTopics: ["Backprop"],
      queuedAt: "2026-01-01T00:00:00Z",
    };
    addPendingSync(sync);
    const stored = JSON.parse(storage[STORAGE_KEY]);
    expect(stored).toHaveLength(1);
    expect(stored[0].repoOwner).toBe("karpathy");
  });

  it("merges with existing entry for the same repo", () => {
    const sync1: PendingSync = {
      repoOwner: "karpathy",
      repoName: "micrograd",
      progress: { "Backprop": { status: "completed" } },
      updatedTopics: ["Backprop"],
      queuedAt: "2026-01-01T00:00:00Z",
    };
    addPendingSync(sync1);

    const sync2: PendingSync = {
      repoOwner: "karpathy",
      repoName: "micrograd",
      progress: { "Forward Pass": { status: "completed" } },
      updatedTopics: ["Forward Pass"],
      queuedAt: "2026-01-02T00:00:00Z",
    };
    addPendingSync(sync2);

    const stored = JSON.parse(storage[STORAGE_KEY]) as PendingSync[];
    expect(stored).toHaveLength(1);
    expect(stored[0].updatedTopics).toContain("Backprop");
    expect(stored[0].updatedTopics).toContain("Forward Pass");
    expect(stored[0].progress["Forward Pass"]).toBeDefined();
  });

  it("adds separate entry for different repo", () => {
    addPendingSync({
      repoOwner: "karpathy",
      repoName: "micrograd",
      progress: {},
      updatedTopics: ["A"],
      queuedAt: "2026-01-01T00:00:00Z",
    });
    addPendingSync({
      repoOwner: "karpathy",
      repoName: "nanoGPT",
      progress: {},
      updatedTopics: ["B"],
      queuedAt: "2026-01-01T00:00:00Z",
    });

    const stored = JSON.parse(storage[STORAGE_KEY]);
    expect(stored).toHaveLength(2);
  });
});

describe("removePendingSync", () => {
  it("removes matching repo entry", () => {
    addPendingSync({
      repoOwner: "karpathy",
      repoName: "micrograd",
      progress: {},
      updatedTopics: ["A"],
      queuedAt: "2026-01-01T00:00:00Z",
    });
    addPendingSync({
      repoOwner: "karpathy",
      repoName: "nanoGPT",
      progress: {},
      updatedTopics: ["B"],
      queuedAt: "2026-01-01T00:00:00Z",
    });

    removePendingSync("karpathy", "micrograd");
    const stored = JSON.parse(storage[STORAGE_KEY]) as PendingSync[];
    expect(stored).toHaveLength(1);
    expect(stored[0].repoName).toBe("nanoGPT");
  });
});

describe("clearAllPendingSyncs", () => {
  it("removes all pending syncs", () => {
    addPendingSync({
      repoOwner: "a",
      repoName: "b",
      progress: {},
      updatedTopics: [],
      queuedAt: "2026-01-01T00:00:00Z",
    });
    clearAllPendingSyncs();
    expect(storage[STORAGE_KEY]).toBeUndefined();
  });
});

describe("shouldSync", () => {
  it("returns true when topic threshold reached", () => {
    expect(shouldSync(BATCH_TOPIC_THRESHOLD, Date.now())).toBe(true);
  });

  it("returns false when under threshold and within time", () => {
    expect(shouldSync(2, Date.now())).toBe(false);
  });

  it("returns true when time threshold passed with pending topics", () => {
    const fiveMinAgo = Date.now() - BATCH_TIME_MS - 1000;
    expect(shouldSync(1, fiveMinAgo)).toBe(true);
  });

  it("returns false when time threshold passed but no pending topics", () => {
    const fiveMinAgo = Date.now() - BATCH_TIME_MS - 1000;
    expect(shouldSync(0, fiveMinAgo)).toBe(false);
  });
});

describe("buildCommitMessage", () => {
  it("handles empty topics", () => {
    expect(buildCommitMessage([])).toBe("Learning session update");
  });

  it("shows single topic name", () => {
    expect(buildCommitMessage(["Backprop"])).toBe("Completed: Backprop");
  });

  it("shows count for multiple topics", () => {
    expect(buildCommitMessage(["A", "B", "C"])).toBe(
      "Learning session update: completed 3 topics"
    );
  });
});

describe("toProgressData", () => {
  it("converts simple progress to rich progress data", () => {
    const simple = { "Backprop": "completed", "Forward Pass": "not_started" };
    const result = toProgressData(simple);
    expect(result["Backprop"].status).toBe("completed");
    expect(result["Backprop"].completedAt).toBeDefined();
    expect(result["Forward Pass"].status).toBe("not_started");
    expect(result["Forward Pass"].completedAt).toBeUndefined();
  });
});

describe("toSimpleProgress", () => {
  it("converts rich progress back to simple", () => {
    const data = {
      "Backprop": { status: "completed" as const, completedAt: "2026-01-01" },
      "Forward Pass": { status: "not_started" as const },
    };
    const result = toSimpleProgress(data);
    expect(result).toEqual({
      "Backprop": "completed",
      "Forward Pass": "not_started",
    });
  });
});
