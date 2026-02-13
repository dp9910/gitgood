"use client";

import { useEffect, useState as useReactState } from "react";
import {
  SHORTCUTS,
  CONTEXT_LABELS,
  getShortcutsByContext,
  formatKeys,
  getAllContexts,
} from "@/lib/keyboard-shortcuts";

interface ShortcutsModalProps {
  onClose: () => void;
}

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const contexts = getAllContexts();

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-testid="shortcuts-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-icons text-primary">keyboard</span>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            data-testid="close-btn"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="space-y-6" data-testid="shortcuts-list">
          {contexts.map((ctx) => {
            const shortcuts = getShortcutsByContext(ctx);
            return (
              <div key={ctx} data-testid={`context-${ctx}`}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  {CONTEXT_LABELS[ctx]}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, ki) => (
                          <span key={ki}>
                            {ki > 0 && (
                              <span className="text-xs text-slate-400 mx-0.5">+</span>
                            )}
                            <kbd
                              className="inline-block px-2 py-0.5 text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 min-w-[24px] text-center"
                            >
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono border border-slate-200 dark:border-slate-700">?</kbd> anywhere to open this panel
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Hook to open modal with ? key ----------

export function useShortcutsModal(): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
} {
  const [isOpen, setIsOpen] = useReactState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "?") {
        e.preventDefault();
        setIsOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
