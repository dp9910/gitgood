"use client";

import { useState } from "react";
import {
  downloadProgress,
  downloadNotes,
  downloadBookmarks,
  downloadAllData,
} from "@/lib/data-export";

interface ExportModalProps {
  repoOwner?: string;
  repoName?: string;
  onClose: () => void;
}

type ExportType = "progress" | "notes" | "bookmarks" | "all";

const EXPORT_OPTIONS: { value: ExportType; label: string; icon: string; description: string; requiresRepo: boolean }[] = [
  {
    value: "progress",
    label: "Learning Progress",
    icon: "trending_up",
    description: "Export all learning progress as JSON",
    requiresRepo: false,
  },
  {
    value: "notes",
    label: "Notes",
    icon: "edit_note",
    description: "Export notes as Markdown",
    requiresRepo: true,
  },
  {
    value: "bookmarks",
    label: "Bookmarks",
    icon: "bookmark",
    description: "Export bookmarks as JSON",
    requiresRepo: true,
  },
  {
    value: "all",
    label: "Everything",
    icon: "download",
    description: "Export all data in one file",
    requiresRepo: true,
  },
];

export function ExportModal({ repoOwner, repoName, onClose }: ExportModalProps) {
  const [exported, setExported] = useState<ExportType | null>(null);
  const hasRepo = Boolean(repoOwner && repoName);

  function handleExport(type: ExportType) {
    switch (type) {
      case "progress":
        downloadProgress();
        break;
      case "notes":
        if (repoOwner && repoName) downloadNotes(repoOwner, repoName);
        break;
      case "bookmarks":
        if (repoOwner && repoName) downloadBookmarks(repoOwner, repoName);
        break;
      case "all":
        if (repoOwner && repoName) downloadAllData(repoOwner, repoName);
        break;
    }
    setExported(type);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-testid="export-modal"
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-icons text-primary">download</span>
            Export Data
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            data-testid="close-btn"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Download your learning data. Your data belongs to you.
        </p>

        {/* Export options */}
        <div className="space-y-2" data-testid="export-options">
          {EXPORT_OPTIONS.map((opt) => {
            const disabled = opt.requiresRepo && !hasRepo;
            return (
              <button
                key={opt.value}
                onClick={() => handleExport(opt.value)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  exported === opt.value
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : disabled
                    ? "border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed"
                    : "border-slate-200 dark:border-slate-700 hover:border-primary"
                }`}
                data-testid={`export-${opt.value}`}
              >
                <span className={`material-icons ${exported === opt.value ? "text-green-500" : "text-slate-400"}`}>
                  {exported === opt.value ? "check_circle" : opt.icon}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {opt.label}
                  </div>
                  <div className="text-xs text-slate-500">
                    {disabled ? "Select a repository first" : opt.description}
                  </div>
                </div>
                {exported === opt.value && (
                  <span className="text-xs text-green-600 font-medium" data-testid="exported-badge">
                    Downloaded
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400">
            Progress data is also stored in your GitHub learning-tracker repository.
          </p>
        </div>
      </div>
    </div>
  );
}
