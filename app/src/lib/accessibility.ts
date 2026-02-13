/**
 * Accessibility utilities for WCAG 2.1 AA compliance.
 * Focus management, ARIA helpers, and color contrast.
 */

// ---------- Focus Management ----------

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Trap focus within a container element (e.g., modal).
 * Returns a cleanup function to remove the event listener.
 */
export function trapFocus(container: HTMLElement): () => void {
  function handler(e: KeyboardEvent) {
    if (e.key !== "Tab") return;

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  container.addEventListener("keydown", handler);
  return () => container.removeEventListener("keydown", handler);
}

// ---------- Skip to Content ----------

export function createSkipLink(targetId: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = `#${targetId}`;
  link.textContent = "Skip to main content";
  link.className =
    "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:text-sm focus:font-bold";
  return link;
}

// ---------- ARIA Helpers ----------

export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", priority);
  el.setAttribute("aria-atomic", "true");
  el.className = "sr-only";
  el.textContent = message;
  document.body.appendChild(el);

  // Clean up after announcement
  setTimeout(() => {
    document.body.removeChild(el);
  }, 1000);
}

// ---------- Color Contrast ----------

/**
 * Calculate relative luminance per WCAG 2.1.
 * Input: [r, g, b] each 0-255.
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors.
 * Returns ratio (1-21). WCAG AA requires >= 4.5 for normal text, >= 3 for large text.
 */
export function contrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color combination meets WCAG AA contrast requirements.
 */
export function meetsContrastAA(
  foreground: [number, number, number],
  background: [number, number, number],
  isLargeText: boolean = false
): boolean {
  const ratio = contrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

// ---------- Keyboard Navigation ----------

export function handleArrowNavigation(
  e: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number
): number {
  let newIndex = currentIndex;

  if (e.key === "ArrowDown" || e.key === "ArrowRight") {
    e.preventDefault();
    newIndex = (currentIndex + 1) % items.length;
  } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
    e.preventDefault();
    newIndex = (currentIndex - 1 + items.length) % items.length;
  } else if (e.key === "Home") {
    e.preventDefault();
    newIndex = 0;
  } else if (e.key === "End") {
    e.preventDefault();
    newIndex = items.length - 1;
  }

  if (newIndex !== currentIndex) {
    items[newIndex].focus();
  }

  return newIndex;
}
