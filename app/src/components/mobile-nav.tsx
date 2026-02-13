"use client";

import type { MobilePanel } from "@/lib/responsive";

// ---------- Types ----------

export interface MobileNavProps {
  activePanel: MobilePanel;
  onPanelChange: (panel: MobilePanel) => void;
  hasUnreadChat?: boolean;
}

const PANELS: { id: MobilePanel; icon: string; label: string }[] = [
  { id: "sidebar", icon: "menu_book", label: "Curriculum" },
  { id: "content", icon: "auto_stories", label: "Content" },
  { id: "chat", icon: "smart_toy", label: "AI Tutor" },
];

// ---------- Component ----------

export default function MobileNav({
  activePanel,
  onPanelChange,
  hasUnreadChat = false,
}: MobileNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-bottom"
      role="tablist"
      aria-label="Learning panels"
      data-testid="mobile-nav"
    >
      <div className="flex items-center justify-around h-14">
        {PANELS.map((panel) => (
          <button
            key={panel.id}
            role="tab"
            aria-selected={activePanel === panel.id}
            aria-label={panel.label}
            onClick={() => onPanelChange(panel.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
              activePanel === panel.id
                ? "text-primary"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
            data-testid={`mobile-tab-${panel.id}`}
          >
            <span className="material-icons text-xl">{panel.icon}</span>
            <span className="text-[10px] font-medium mt-0.5">{panel.label}</span>
            {panel.id === "chat" && hasUnreadChat && (
              <span
                className="absolute top-1.5 right-1/4 w-2 h-2 bg-red-500 rounded-full"
                data-testid="unread-indicator"
              />
            )}
            {activePanel === panel.id && (
              <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
