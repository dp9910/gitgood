/**
 * Progress tracking — localStorage queue, batching logic, commit message builder.
 *
 * The flow:
 * 1. User marks topic as complete → in-memory state updates immediately
 * 2. Changes are queued in localStorage
 * 3. Every 5 min or 5 topics completed → batch sync to GitHub via API
 * 4. If sync fails → keep in localStorage, retry later
 * 5. On page load → check localStorage for queued commits
 */

// ---------- Types ----------

export interface TopicCompletion {
  status: "not_started" | "in_progress" | "completed";
  completedAt?: string;
  timeSpentMinutes?: number;
}

export type ProgressData = Record<string, TopicCompletion>;

export interface PendingSync {
  repoOwner: string;
  repoName: string;
  progress: ProgressData;
  updatedTopics: string[];
  queuedAt: string;
}

// ---------- Constants ----------

const STORAGE_KEY = "gitgood_pending_sync";
const BATCH_TOPIC_THRESHOLD = 5;
const BATCH_TIME_MS = 5 * 60 * 1000; // 5 minutes

// ---------- localStorage helpers ----------

export function getPendingSyncs(): PendingSync[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingSync[];
  } catch {
    return [];
  }
}

export function addPendingSync(sync: PendingSync): void {
  if (typeof window === "undefined") return;
  const existing = getPendingSyncs();
  // Merge with existing entry for the same repo if present
  const idx = existing.findIndex(
    (s) => s.repoOwner === sync.repoOwner && s.repoName === sync.repoName
  );
  if (idx >= 0) {
    // Merge: update progress and combine updatedTopics
    existing[idx].progress = { ...existing[idx].progress, ...sync.progress };
    const combined = new Set([
      ...existing[idx].updatedTopics,
      ...sync.updatedTopics,
    ]);
    existing[idx].updatedTopics = [...combined];
    existing[idx].queuedAt = sync.queuedAt;
  } else {
    existing.push(sync);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function removePendingSync(
  repoOwner: string,
  repoName: string
): void {
  if (typeof window === "undefined") return;
  const existing = getPendingSyncs();
  const filtered = existing.filter(
    (s) => !(s.repoOwner === repoOwner && s.repoName === repoName)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearAllPendingSyncs(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ---------- Batch logic ----------

/**
 * Determine whether we should trigger a sync now.
 * Sync when: 5+ topics completed since last sync OR 5+ minutes elapsed.
 */
export function shouldSync(
  topicsSinceLastSync: number,
  lastSyncTimestamp: number
): boolean {
  if (topicsSinceLastSync >= BATCH_TOPIC_THRESHOLD) return true;
  if (topicsSinceLastSync > 0 && Date.now() - lastSyncTimestamp >= BATCH_TIME_MS)
    return true;
  return false;
}

// ---------- Commit message builder ----------

/**
 * Build a descriptive commit message for a progress sync.
 * Format: "Learning session update: completed N topics in Category (+notes, +quizzes)"
 */
export function buildCommitMessage(updatedTopics: string[]): string {
  const count = updatedTopics.length;
  if (count === 0) return "Learning session update";
  if (count === 1) return `Completed: ${updatedTopics[0]}`;
  return `Learning session update: completed ${count} topics`;
}

// ---------- Conversion helpers ----------

/**
 * Convert simple TopicProgress (string map) to rich ProgressData.
 */
export function toProgressData(
  simple: Record<string, string>
): ProgressData {
  const result: ProgressData = {};
  for (const [name, status] of Object.entries(simple)) {
    result[name] = {
      status: status as TopicCompletion["status"],
      ...(status === "completed" ? { completedAt: new Date().toISOString() } : {}),
    };
  }
  return result;
}

/**
 * Convert ProgressData back to simple TopicProgress (string map).
 */
export function toSimpleProgress(
  data: ProgressData
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, completion] of Object.entries(data)) {
    result[name] = completion.status;
  }
  return result;
}

export { BATCH_TOPIC_THRESHOLD, BATCH_TIME_MS, STORAGE_KEY };
