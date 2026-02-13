"use client";

import type { SyncStatus } from "@/hooks/use-progress";

export interface ToastProps {
  syncStatus: SyncStatus;
  onRetry: () => void;
  onDismiss: () => void;
}

export default function Toast({ syncStatus, onRetry, onDismiss }: ToastProps) {
  if (syncStatus.state === "idle") return null;

  const config = {
    syncing: {
      icon: "sync",
      iconClass: "text-primary animate-spin",
      bg: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
      textClass: "text-slate-600 dark:text-slate-300",
    },
    success: {
      icon: "check_circle",
      iconClass: "text-green-500",
      bg: "bg-white dark:bg-slate-800 border-green-200 dark:border-green-800",
      textClass: "text-green-700 dark:text-green-400",
    },
    error: {
      icon: "error",
      iconClass: "text-red-500",
      bg: "bg-white dark:bg-slate-800 border-red-200 dark:border-red-800",
      textClass: "text-red-700 dark:text-red-400",
    },
  }[syncStatus.state];

  if (!config) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${config.bg} max-w-sm animate-in`}
      role="status"
      aria-live="polite"
      data-testid="sync-toast"
    >
      <span className={`material-icons text-lg ${config.iconClass}`}>
        {config.icon}
      </span>
      <span className={`text-sm font-medium ${config.textClass}`}>
        {syncStatus.message ?? "Syncing..."}
      </span>
      {syncStatus.state === "error" && (
        <button
          onClick={onRetry}
          className="ml-2 px-3 py-1 text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          data-testid="toast-retry"
        >
          Retry
        </button>
      )}
      {syncStatus.state !== "syncing" && (
        <button
          onClick={onDismiss}
          className="ml-1 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          aria-label="Dismiss notification"
        >
          <span className="material-icons text-sm">close</span>
        </button>
      )}
    </div>
  );
}
