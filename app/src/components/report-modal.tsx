"use client";

import { useState } from "react";
import {
  REPORT_REASONS,
  submitReport,
  hasUserReportedRepo,
  type ReportReason,
} from "@/lib/moderation";

interface ReportModalProps {
  repoOwner: string;
  repoName: string;
  username: string;
  onClose: () => void;
}

export function ReportModal({ repoOwner, repoName, username, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Check on mount only — not after our own submit
  const [alreadyReported] = useState(() =>
    hasUserReportedRepo(repoOwner, repoName, username)
  );

  function handleSubmit() {
    if (!reason) {
      setError("Please select a reason");
      return;
    }
    if (!description.trim()) {
      setError("Please provide a description");
      return;
    }

    try {
      submitReport(repoOwner, repoName, reason, description, username);
      setSubmitted(true);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    }
  }

  if (alreadyReported) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        data-testid="report-modal"
      >
        <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6">
          <div className="text-center">
            <span className="material-icons text-4xl text-amber-500 mb-2">info</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Already Reported
            </h2>
            <p className="text-sm text-slate-500 mb-4" data-testid="already-reported">
              You have already submitted a report for this repository. We will review it shortly.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-medium"
              data-testid="close-btn"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        data-testid="report-modal"
      >
        <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6">
          <div className="text-center">
            <span className="material-icons text-4xl text-green-500 mb-2">check_circle</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Report Submitted
            </h2>
            <p className="text-sm text-slate-500 mb-4" data-testid="success-msg">
              Thank you for helping keep GitGood safe. We will review your report within 72 hours.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
              data-testid="close-btn"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-testid="report-modal"
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-icons text-red-500">flag</span>
            Report Content
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
          Report inappropriate content for{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {repoOwner}/{repoName}
          </span>
        </p>

        {/* Reason selection */}
        <div className="space-y-2 mb-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Reason
          </label>
          <div className="space-y-2" data-testid="reason-list">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  reason === r.value
                    ? "border-primary bg-primary/5"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="mt-0.5"
                  data-testid={`reason-${r.value}`}
                />
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {r.label}
                  </div>
                  <div className="text-xs text-slate-500">{r.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe the issue in detail..."
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none"
            data-testid="description-input"
          />
          <div className="text-xs text-slate-400 text-right">{description.length}/1000</div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 mb-4" data-testid="error-msg">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            data-testid="submit-btn"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Trigger Button ----------

interface ReportButtonProps {
  onClick: () => void;
}

export function ReportButton({ onClick }: ReportButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
      title="Report inappropriate content"
      data-testid="report-btn"
    >
      <span className="material-icons text-sm">flag</span>
      Report
    </button>
  );
}
