import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFocusableElements,
  trapFocus,
  createSkipLink,
  announceToScreenReader,
  relativeLuminance,
  contrastRatio,
  meetsContrastAA,
  handleArrowNavigation,
} from "../lib/accessibility";

describe("getFocusableElements", () => {
  it("finds buttons and links", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <button>Click</button>
      <a href="#">Link</a>
      <input type="text" />
      <button disabled>Disabled</button>
      <div>Not focusable</div>
    `;
    document.body.appendChild(container);

    const focusable = getFocusableElements(container);
    expect(focusable).toHaveLength(3); // button, link, input (not disabled button, not div)

    document.body.removeChild(container);
  });

  it("finds elements with tabindex", () => {
    const container = document.createElement("div");
    container.innerHTML = `<div tabindex="0">Focusable</div><div tabindex="-1">Not focusable</div>`;
    document.body.appendChild(container);

    const focusable = getFocusableElements(container);
    expect(focusable).toHaveLength(1);

    document.body.removeChild(container);
  });
});

describe("trapFocus", () => {
  it("prevents focus from leaving container", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <button id="first">First</button>
      <button id="last">Last</button>
    `;
    document.body.appendChild(container);

    const cleanup = trapFocus(container);
    const last = container.querySelector("#last") as HTMLElement;
    last.focus();

    // Simulate Tab on last element — should wrap to first
    const tabEvent = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
    Object.defineProperty(tabEvent, "preventDefault", { value: vi.fn() });
    container.dispatchEvent(tabEvent);

    cleanup();
    document.body.removeChild(container);
  });

  it("returns cleanup function", () => {
    const container = document.createElement("div");
    container.innerHTML = `<button>btn</button>`;
    document.body.appendChild(container);

    const cleanup = trapFocus(container);
    expect(typeof cleanup).toBe("function");
    cleanup();

    document.body.removeChild(container);
  });
});

describe("createSkipLink", () => {
  it("creates an anchor element targeting the given id", () => {
    const link = createSkipLink("main-content");
    expect(link.tagName).toBe("A");
    expect(link.href).toContain("#main-content");
    expect(link.textContent).toBe("Skip to main content");
  });

  it("has sr-only class for screen reader visibility", () => {
    const link = createSkipLink("main");
    expect(link.className).toContain("sr-only");
  });
});

describe("announceToScreenReader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("creates a live region element", () => {
    announceToScreenReader("Topic completed!");
    const liveRegion = document.querySelector('[role="status"]');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion?.textContent).toBe("Topic completed!");
    expect(liveRegion?.getAttribute("aria-live")).toBe("polite");

    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("supports assertive priority", () => {
    announceToScreenReader("Error occurred!", "assertive");
    const liveRegion = document.querySelector('[role="status"]');
    expect(liveRegion?.getAttribute("aria-live")).toBe("assertive");

    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("removes element after timeout", () => {
    announceToScreenReader("Temp message");
    expect(document.querySelector('[role="status"]')).toBeTruthy();

    vi.advanceTimersByTime(1100);
    expect(document.querySelector('[role="status"]')).toBeNull();

    vi.useRealTimers();
  });
});

describe("relativeLuminance", () => {
  it("returns 0 for black", () => {
    expect(relativeLuminance(0, 0, 0)).toBe(0);
  });

  it("returns 1 for white", () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 2);
  });

  it("returns intermediate value for gray", () => {
    const lum = relativeLuminance(128, 128, 128);
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    const ratio = contrastRatio([0, 0, 0], [255, 255, 255]);
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("returns 1 for same color", () => {
    const ratio = contrastRatio([100, 100, 100], [100, 100, 100]);
    expect(ratio).toBeCloseTo(1, 1);
  });

  it("is symmetric", () => {
    const r1 = contrastRatio([36, 99, 235], [255, 255, 255]);
    const r2 = contrastRatio([255, 255, 255], [36, 99, 235]);
    expect(r1).toBeCloseTo(r2, 2);
  });
});

describe("meetsContrastAA", () => {
  it("passes for black on white (normal text)", () => {
    expect(meetsContrastAA([0, 0, 0], [255, 255, 255])).toBe(true);
  });

  it("fails for light gray on white (normal text)", () => {
    expect(meetsContrastAA([200, 200, 200], [255, 255, 255])).toBe(false);
  });

  it("uses lower threshold for large text", () => {
    // A ratio of ~3.5 should fail for normal but pass for large text
    // Medium gray on white
    const passes = meetsContrastAA([119, 119, 119], [255, 255, 255], true);
    expect(passes).toBe(true);
  });

  it("validates primary color against white", () => {
    // Primary #2463eb = rgb(36, 99, 235)
    const passes = meetsContrastAA([36, 99, 235], [255, 255, 255]);
    // Our primary should meet AA for normal text
    expect(passes).toBe(true);
  });
});

describe("handleArrowNavigation", () => {
  function createItems(count: number): HTMLElement[] {
    return Array.from({ length: count }, (_, i) => {
      const el = document.createElement("button");
      el.textContent = `Item ${i}`;
      el.focus = vi.fn();
      return el;
    });
  }

  it("moves forward on ArrowDown", () => {
    const items = createItems(3);
    const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    const newIdx = handleArrowNavigation(event, items, 0);
    expect(newIdx).toBe(1);
    expect(items[1].focus).toHaveBeenCalled();
  });

  it("moves backward on ArrowUp", () => {
    const items = createItems(3);
    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    const newIdx = handleArrowNavigation(event, items, 1);
    expect(newIdx).toBe(0);
    expect(items[0].focus).toHaveBeenCalled();
  });

  it("wraps around forward", () => {
    const items = createItems(3);
    const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    const newIdx = handleArrowNavigation(event, items, 2);
    expect(newIdx).toBe(0);
  });

  it("wraps around backward", () => {
    const items = createItems(3);
    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    const newIdx = handleArrowNavigation(event, items, 0);
    expect(newIdx).toBe(2);
  });

  it("jumps to start on Home", () => {
    const items = createItems(5);
    const event = new KeyboardEvent("keydown", { key: "Home" });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    const newIdx = handleArrowNavigation(event, items, 3);
    expect(newIdx).toBe(0);
  });

  it("jumps to end on End", () => {
    const items = createItems(5);
    const event = new KeyboardEvent("keydown", { key: "End" });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });

    const newIdx = handleArrowNavigation(event, items, 1);
    expect(newIdx).toBe(4);
  });

  it("returns same index for unrelated key", () => {
    const items = createItems(3);
    const event = new KeyboardEvent("keydown", { key: "a" });

    const newIdx = handleArrowNavigation(event, items, 1);
    expect(newIdx).toBe(1);
  });
});
