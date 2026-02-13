/**
 * Keyboard shortcuts configuration and helpers.
 */

export interface KeyboardShortcut {
  keys: string[];
  description: string;
  context: "global" | "learning" | "chat" | "navigation";
}

export const SHORTCUTS: KeyboardShortcut[] = [
  // Global
  { keys: ["?"], description: "Open keyboard shortcuts help", context: "global" },
  { keys: ["Esc"], description: "Close modal / Back to overview", context: "global" },
  { keys: ["/"], description: "Focus search or chat input", context: "global" },

  // Navigation
  { keys: ["g", "d"], description: "Go to Dashboard", context: "navigation" },
  { keys: ["g", "b"], description: "Go to Browse", context: "navigation" },
  { keys: ["g", "s"], description: "Go to Settings", context: "navigation" },
  { keys: ["g", "h"], description: "Go to Home", context: "navigation" },

  // Learning interface
  { keys: ["\u2190"], description: "Previous topic", context: "learning" },
  { keys: ["\u2192"], description: "Next topic / Complete & continue", context: "learning" },
  { keys: ["n"], description: "Open notes editor", context: "learning" },
  { keys: ["b"], description: "Toggle bookmark", context: "learning" },
  { keys: ["1"], description: "Switch to Beginner level", context: "learning" },
  { keys: ["2"], description: "Switch to Intermediate level", context: "learning" },
  { keys: ["3"], description: "Switch to Expert level", context: "learning" },

  // Chat
  { keys: ["Enter"], description: "Send message", context: "chat" },
  { keys: ["Shift", "Enter"], description: "New line in message", context: "chat" },
];

export const CONTEXT_LABELS: Record<KeyboardShortcut["context"], string> = {
  global: "Global",
  learning: "Learning Interface",
  chat: "AI Tutor Chat",
  navigation: "Navigation",
};

export function getShortcutsByContext(context: KeyboardShortcut["context"]): KeyboardShortcut[] {
  return SHORTCUTS.filter((s) => s.context === context);
}

export function formatKeys(keys: string[]): string {
  return keys.join(" + ");
}

export function getAllContexts(): KeyboardShortcut["context"][] {
  return ["global", "navigation", "learning", "chat"];
}
