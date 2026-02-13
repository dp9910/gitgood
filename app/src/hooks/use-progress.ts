"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Curriculum } from "@/lib/curriculum-cache";
import type { TopicProgress, TopicStatus } from "@/components/curriculum-view";
import {
  type PendingSync,
  type ProgressData,
  getPendingSyncs,
  addPendingSync,
  removePendingSync,
  shouldSync,
  buildCommitMessage,
  toProgressData,
  BATCH_TIME_MS,
} from "@/lib/progress";

// ---------- Types ----------

export interface SyncStatus {
  state: "idle" | "syncing" | "success" | "error";
  message?: string;
}

export interface UseProgressOptions {
  repoOwner: string;
  repoName: string;
  initialProgress: TopicProgress;
  curriculum: Curriculum;
}

export interface UseProgressReturn {
  progress: TopicProgress;
  updateTopic: (topicName: string, status: TopicStatus) => void;
  syncStatus: SyncStatus;
  retrySync: () => void;
  dismissSync: () => void;
}

// ---------- Hook ----------

export function useProgress({
  repoOwner,
  repoName,
  initialProgress,
}: UseProgressOptions): UseProgressReturn {
  const [progress, setProgress] = useState<TopicProgress>(initialProgress);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: "idle" });

  // Track completed topics since last sync
  const completedSinceSync = useRef<string[]>([]);
  const lastSyncTime = useRef(Date.now());
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync progress to GitHub via API
  const syncToGitHub = useCallback(
    async (topicsToSync: string[], currentProgress: TopicProgress) => {
      if (topicsToSync.length === 0) return;

      setSyncStatus({ state: "syncing", message: "Saving progress..." });

      const progressData: ProgressData = toProgressData(currentProgress);
      const commitMessage = buildCommitMessage(topicsToSync);

      try {
        const res = await fetch("/api/sync-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoOwner,
            repoName,
            progress: progressData,
            commitMessage,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.message ?? `Sync failed (${res.status})`
          );
        }

        // Success — clear pending sync from localStorage
        removePendingSync(repoOwner, repoName);
        completedSinceSync.current = [];
        lastSyncTime.current = Date.now();
        setSyncStatus({ state: "success", message: "Progress saved!" });

        // Auto-dismiss success after 3s
        setTimeout(() => {
          setSyncStatus((prev) =>
            prev.state === "success" ? { state: "idle" } : prev
          );
        }, 3000);
      } catch (e) {
        // Save to localStorage for retry
        const pendingSync: PendingSync = {
          repoOwner,
          repoName,
          progress: progressData,
          updatedTopics: topicsToSync,
          queuedAt: new Date().toISOString(),
        };
        addPendingSync(pendingSync);

        setSyncStatus({
          state: "error",
          message:
            e instanceof Error
              ? e.message
              : "Failed to save progress. Will retry.",
        });
      }
    },
    [repoOwner, repoName]
  );

  // Update a topic's status — immediate UI update + queue for sync
  const updateTopic = useCallback(
    (topicName: string, status: TopicStatus) => {
      setProgress((prev) => {
        const updated = { ...prev, [topicName]: status };

        if (status === "completed") {
          completedSinceSync.current = [
            ...completedSinceSync.current,
            topicName,
          ];

          // Check if we should sync immediately (5 topics threshold)
          if (
            shouldSync(completedSinceSync.current.length, lastSyncTime.current)
          ) {
            // Defer to avoid state update during render
            const topicsToSync = [...completedSinceSync.current];
            setTimeout(() => syncToGitHub(topicsToSync, updated), 0);
          }
        }

        return updated;
      });
    },
    [syncToGitHub]
  );

  // Periodic sync timer (every 5 minutes)
  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      if (
        completedSinceSync.current.length > 0 &&
        shouldSync(completedSinceSync.current.length, lastSyncTime.current)
      ) {
        const topicsToSync = [...completedSinceSync.current];
        setProgress((current) => {
          syncToGitHub(topicsToSync, current);
          return current;
        });
      }
    }, BATCH_TIME_MS);

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [syncToGitHub]);

  // On mount: check for queued syncs in localStorage
  useEffect(() => {
    const pending = getPendingSyncs();
    const match = pending.find(
      (s) => s.repoOwner === repoOwner && s.repoName === repoName
    );
    if (match) {
      syncToGitHub(match.updatedTopics, progress);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retrySync = useCallback(() => {
    const pending = getPendingSyncs();
    const match = pending.find(
      (s) => s.repoOwner === repoOwner && s.repoName === repoName
    );
    if (match) {
      syncToGitHub(match.updatedTopics, progress);
    } else if (completedSinceSync.current.length > 0) {
      syncToGitHub([...completedSinceSync.current], progress);
    }
  }, [repoOwner, repoName, progress, syncToGitHub]);

  const dismissSync = useCallback(() => {
    setSyncStatus({ state: "idle" });
  }, []);

  return {
    progress,
    updateTopic,
    syncStatus,
    retrySync,
    dismissSync,
  };
}
