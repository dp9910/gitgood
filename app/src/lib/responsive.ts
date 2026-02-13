/**
 * Responsive design utilities.
 * Breakpoints, media query hook, and layout helpers.
 */

import { useState, useEffect } from "react";

// ---------- Breakpoints ----------

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// ---------- Hook: useMediaQuery ----------

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    function handler(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// ---------- Hook: useIsMobile ----------

export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
}

// ---------- Hook: useIsTablet ----------

export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
  );
}

// ---------- Helpers ----------

export type MobilePanel = "sidebar" | "content" | "chat";

/**
 * Get the appropriate panel layout for the current viewport.
 * - Mobile (<768px): single panel with tab navigation
 * - Tablet (768-1023px): two panels (sidebar + content)
 * - Desktop (1024+): three panels (sidebar + content + chat)
 */
export function getPanelLayout(isMobile: boolean, isTablet: boolean): {
  showSidebar: boolean;
  showContent: boolean;
  showChat: boolean;
  panelCount: number;
} {
  if (isMobile) {
    return { showSidebar: false, showContent: true, showChat: false, panelCount: 1 };
  }
  if (isTablet) {
    return { showSidebar: true, showContent: true, showChat: false, panelCount: 2 };
  }
  return { showSidebar: true, showContent: true, showChat: true, panelCount: 3 };
}
