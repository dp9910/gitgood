import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  BREAKPOINTS,
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  getPanelLayout,
} from "../lib/responsive";

// ---------- matchMedia mock ----------

let mediaQueryMatches = false;
let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

beforeEach(() => {
  mediaQueryMatches = false;
  changeHandler = null;

  Object.defineProperty(globalThis, "matchMedia", {
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mediaQueryMatches,
      media: query,
      addEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
        changeHandler = handler;
      },
      removeEventListener: vi.fn(),
    })),
    writable: true,
    configurable: true,
  });
});

describe("BREAKPOINTS", () => {
  it("has standard breakpoints", () => {
    expect(BREAKPOINTS.sm).toBe(640);
    expect(BREAKPOINTS.md).toBe(768);
    expect(BREAKPOINTS.lg).toBe(1024);
    expect(BREAKPOINTS.xl).toBe(1280);
  });
});

describe("useMediaQuery", () => {
  it("returns false initially", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(false);
  });

  it("returns true when media query matches", () => {
    mediaQueryMatches = true;
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(true);
  });

  it("updates when media query changes", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(false);

    act(() => {
      changeHandler?.({ matches: true } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);
  });
});

describe("useIsMobile", () => {
  it("returns false for desktop", () => {
    mediaQueryMatches = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true for mobile viewport", () => {
    mediaQueryMatches = true;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});

describe("useIsTablet", () => {
  it("returns false for non-tablet viewport", () => {
    mediaQueryMatches = false;
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });
});

describe("getPanelLayout", () => {
  it("returns single panel for mobile", () => {
    const layout = getPanelLayout(true, false);
    expect(layout.panelCount).toBe(1);
    expect(layout.showSidebar).toBe(false);
    expect(layout.showContent).toBe(true);
    expect(layout.showChat).toBe(false);
  });

  it("returns two panels for tablet", () => {
    const layout = getPanelLayout(false, true);
    expect(layout.panelCount).toBe(2);
    expect(layout.showSidebar).toBe(true);
    expect(layout.showContent).toBe(true);
    expect(layout.showChat).toBe(false);
  });

  it("returns three panels for desktop", () => {
    const layout = getPanelLayout(false, false);
    expect(layout.panelCount).toBe(3);
    expect(layout.showSidebar).toBe(true);
    expect(layout.showContent).toBe(true);
    expect(layout.showChat).toBe(true);
  });
});
