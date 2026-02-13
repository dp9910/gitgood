"use client";

import { useState } from "react";
import type { ChallengeData } from "@/lib/quiz";

// ---------- Types ----------

export interface ChallengeModalProps {
  challenge: ChallengeData;
  onClose: () => void;
}

// ---------- Component ----------

export default function ChallengeModal({ challenge, onClose }: ChallengeModalProps) {
  const [code, setCode] = useState(challenge.starterCode);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="challenge-modal"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {challenge.title}
            </h2>
            <span className="text-xs text-slate-400">{challenge.topicName}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            aria-label="Close challenge"
          >
            <span className="material-icons text-slate-400 text-sm">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Problem
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {challenge.description}
            </p>
          </div>

          {/* Code Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Your Solution
              </h3>
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
                {challenge.language}
              </span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-48 bg-slate-950 text-green-400 font-mono text-sm p-4 rounded-xl border border-slate-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              spellCheck={false}
              data-testid="code-editor"
            />
          </div>

          {/* Hint */}
          <div>
            {!showHint ? (
              <button
                onClick={() => setShowHint(true)}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                data-testid="show-hint"
              >
                <span className="material-icons text-sm">lightbulb</span>
                Show Hint
              </button>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                  Hint
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300" data-testid="hint-text">
                  {challenge.hint}
                </p>
              </div>
            )}
          </div>

          {/* Solution */}
          <div>
            {!showSolution ? (
              <button
                onClick={() => setShowSolution(true)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                data-testid="show-solution"
              >
                <span className="material-icons text-sm">visibility</span>
                Show Solution
              </button>
            ) : (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Solution
                </h3>
                <pre
                  className="bg-slate-950 text-green-400 font-mono text-sm p-4 rounded-xl border border-slate-700 overflow-x-auto"
                  data-testid="solution-code"
                >
                  {challenge.solution}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={() => setCode(challenge.starterCode)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            data-testid="reset-btn"
          >
            Reset Code
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
