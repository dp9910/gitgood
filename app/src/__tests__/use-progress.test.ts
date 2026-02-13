import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProgress } from "../hooks/use-progress";
import type { Curriculum } from "../lib/curriculum-cache";
import { STORAGE_KEY, BATCH_TOPIC_THRESHOLD } from "../lib/progress";

// ---------- helpers ----------

/** Flush pending microtasks (resolved promises). */
function flushPromises() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

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

  global.fetch = vi.fn();
});

// ---------- Fixtures ----------

const mockCurriculum: Curriculum = {
  repoOwner: "karpathy",
  repoName: "micrograd",
  categories: [
    {
      name: "Foundations",
      description: "Core concepts",
      topics: [
        { name: "Backprop", difficulty: "beginner", estimatedMinutes: 15, prerequisites: [], subtopics: [] },
        { name: "Forward Pass", difficulty: "beginner", estimatedMinutes: 10, prerequisites: [], subtopics: [] },
        { name: "Loss Functions", difficulty: "intermediate", estimatedMinutes: 20, prerequisites: [], subtopics: [] },
        { name: "Gradients", difficulty: "intermediate", estimatedMinutes: 15, prerequisites: [], subtopics: [] },
        { name: "Optimization", difficulty: "expert", estimatedMinutes: 25, prerequisites: [], subtopics: [] },
        { name: "Regularization", difficulty: "expert", estimatedMinutes: 20, prerequisites: [], subtopics: [] },
      ],
    },
  ],
};

const initialProgress = {
  "Backprop": "not_started",
  "Forward Pass": "not_started",
  "Loss Functions": "not_started",
  "Gradients": "not_started",
  "Optimization": "not_started",
  "Regularization": "not_started",
};

function renderProgressHook() {
  return renderHook(() =>
    useProgress({
      repoOwner: "karpathy",
      repoName: "micrograd",
      initialProgress,
      curriculum: mockCurriculum,
    })
  );
}

// ---------- Tests ----------

describe("useProgress", () => {
  it("initializes with provided progress", () => {
    const { result } = renderProgressHook();
    expect(result.current.progress).toEqual(initialProgress);
  });

  it("starts with idle sync status", () => {
    const { result } = renderProgressHook();
    expect(result.current.syncStatus.state).toBe("idle");
  });

  it("updates topic status immediately", () => {
    const { result } = renderProgressHook();

    act(() => {
      result.current.updateTopic("Backprop", "completed");
    });

    expect(result.current.progress["Backprop"]).toBe("completed");
  });

  it("updates multiple topics", () => {
    const { result } = renderProgressHook();

    act(() => {
      result.current.updateTopic("Backprop", "completed");
      result.current.updateTopic("Forward Pass", "in_progress");
    });

    expect(result.current.progress["Backprop"]).toBe("completed");
    expect(result.current.progress["Forward Pass"]).toBe("in_progress");
  });

  it("triggers sync after batch threshold reached", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const { result } = renderProgressHook();

    // Complete 5 topics to hit threshold
    act(() => {
      for (let i = 0; i < BATCH_TOPIC_THRESHOLD; i++) {
        result.current.updateTopic(
          mockCurriculum.categories[0].topics[i].name,
          "completed"
        );
      }
    });

    // Let the deferred setTimeout(fn, 0) sync run
    await act(async () => {
      await flushPromises();
    });

    // Wait for fetch to resolve
    await act(async () => {
      await flushPromises();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/sync-progress",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("does not sync before threshold", async () => {
    const { result } = renderProgressHook();

    act(() => {
      result.current.updateTopic("Backprop", "completed");
    });

    await act(async () => {
      await flushPromises();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("saves to localStorage on sync failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Server error" }),
    });

    const { result } = renderProgressHook();

    act(() => {
      for (let i = 0; i < BATCH_TOPIC_THRESHOLD; i++) {
        result.current.updateTopic(
          mockCurriculum.categories[0].topics[i].name,
          "completed"
        );
      }
    });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(storage[STORAGE_KEY]).toBeDefined();
    const pending = JSON.parse(storage[STORAGE_KEY]);
    expect(pending[0].repoOwner).toBe("karpathy");
  });

  it("sets error sync status on failure", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Server error" }),
    });

    const { result } = renderProgressHook();

    act(() => {
      for (let i = 0; i < BATCH_TOPIC_THRESHOLD; i++) {
        result.current.updateTopic(
          mockCurriculum.categories[0].topics[i].name,
          "completed"
        );
      }
    });

    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.syncStatus.state).toBe("error");
  });

  it("dismisses sync status", () => {
    const { result } = renderProgressHook();

    act(() => {
      result.current.dismissSync();
    });

    expect(result.current.syncStatus.state).toBe("idle");
  });

  it("retries sync from localStorage on mount", async () => {
    // Pre-populate localStorage with a pending sync
    const pending = [
      {
        repoOwner: "karpathy",
        repoName: "micrograd",
        progress: { "Backprop": { status: "completed" } },
        updatedTopics: ["Backprop"],
        queuedAt: "2026-01-01T00:00:00Z",
      },
    ];
    storage[STORAGE_KEY] = JSON.stringify(pending);

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    renderProgressHook();

    // Wait for the mount effect + fetch
    await act(async () => {
      await flushPromises();
    });
    await act(async () => {
      await flushPromises();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/sync-progress",
      expect.objectContaining({ method: "POST" })
    );
  });
});
