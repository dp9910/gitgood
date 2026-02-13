"use client";

import { useState } from "react";
import { getCodespaceUrl, getGithubDevUrl, estimateFreeHours } from "@/lib/codespaces";

interface CodespaceButtonProps {
  owner: string;
  repo: string;
  branch?: string;
  variant?: "full" | "compact";
}

export function CodespaceButton({ owner, repo, branch = "main", variant = "full" }: CodespaceButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const codespaceUrl = getCodespaceUrl({ owner, repo, branch });
  const githubDevUrl = getGithubDevUrl({ owner, repo, branch });
  const freeInfo = estimateFreeHours();

  if (variant === "compact") {
    return (
      <a
        href={codespaceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        data-testid="codespace-btn"
        title="Open in GitHub Codespace"
      >
        <span className="material-icons text-sm">terminal</span>
        Codespace
      </a>
    );
  }

  return (
    <div className="relative" data-testid="codespace-container">
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-icons text-green-500">terminal</span>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Try it yourself
          </h3>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Open a pre-configured development environment in your browser.
        </p>

        <div className="space-y-2">
          {/* Full Codespace */}
          <a
            href={codespaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            data-testid="codespace-btn"
          >
            <span className="material-icons text-sm">terminal</span>
            Open in Codespace
            <span className="material-icons text-sm ml-auto">open_in_new</span>
          </a>

          {/* Lightweight github.dev */}
          <a
            href={githubDevUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full px-3 py-2 border border-slate-200 dark:border-slate-700 hover:border-primary rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
            data-testid="githubdev-btn"
          >
            <span className="material-icons text-sm">code</span>
            Quick Edit (github.dev)
            <span className="material-icons text-sm ml-auto">open_in_new</span>
          </a>
        </div>

        {/* Free tier info */}
        <div
          className="mt-3 flex items-center gap-1 cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          data-testid="free-info"
        >
          <span className="material-icons text-xs text-slate-400">info</span>
          <span className="text-xs text-slate-400">
            {freeInfo.totalHours} hours/month free via GitHub
          </span>
        </div>

        {showTooltip && (
          <div className="mt-2 p-2 bg-slate-800 text-white text-xs rounded-lg" data-testid="tooltip">
            Codespaces provide a full VS Code environment in your browser. GitHub Free plan includes{" "}
            {freeInfo.totalHours} hours/month on a {freeInfo.machineType} machine. No cost to you.
          </div>
        )}
      </div>
    </div>
  );
}
