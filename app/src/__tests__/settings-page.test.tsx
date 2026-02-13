import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsPage from "../app/settings/page";
import { SETTINGS_KEY } from "../lib/settings";

// ---------- localStorage mock ----------

const storage: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];

  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    },
    writable: true,
    configurable: true,
  });
});

describe("SettingsPage", () => {
  it("renders settings page", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("settings-page")).toBeTruthy();
  });

  it("shows sidebar navigation", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("settings-nav")).toBeTruthy();
    expect(screen.getByTestId("tab-profile")).toBeTruthy();
    expect(screen.getByTestId("tab-preferences")).toBeTruthy();
    expect(screen.getByTestId("tab-credits")).toBeTruthy();
  });

  it("shows profile section by default", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("profile-section")).toBeTruthy();
  });

  it("shows display name input", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("display-name-input")).toBeTruthy();
  });

  it("shows bio input with character count", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("bio-input")).toBeTruthy();
    expect(screen.getByTestId("bio-count")).toBeTruthy();
  });

  it("switches to preferences tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("tab-preferences"));
    expect(screen.getByTestId("preferences-section")).toBeTruthy();
  });

  it("shows experience level buttons", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("tab-preferences"));
    expect(screen.getByTestId("level-junior")).toBeTruthy();
    expect(screen.getByTestId("level-mid")).toBeTruthy();
    expect(screen.getByTestId("level-senior")).toBeTruthy();
  });

  it("selects experience level", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("tab-preferences"));
    fireEvent.click(screen.getByTestId("level-senior"));

    // Senior button should be highlighted (has border-primary class)
    expect(screen.getByTestId("level-senior").className).toContain("border-primary");
  });

  it("shows learning mode options", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("tab-preferences"));
    expect(screen.getByTestId("mode-standard")).toBeTruthy();
    expect(screen.getByTestId("mode-quickstart")).toBeTruthy();
  });

  it("switches to credits tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId("tab-credits"));
    expect(screen.getByTestId("credits-section")).toBeTruthy();
    expect(screen.getByTestId("credits-count")).toBeTruthy();
  });

  it("shows credits remaining in sidebar", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("credits-remaining").textContent).toContain("500");
  });

  it("saves settings on Save click", () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByTestId("display-name-input"), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByTestId("save-btn"));

    expect(screen.getByTestId("saved-msg")).toBeTruthy();
    const stored = JSON.parse(storage[SETTINGS_KEY]);
    expect(stored.displayName).toBe("Alice");
  });

  it("shows validation error for empty display name", () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByTestId("display-name-input"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByTestId("save-btn"));

    expect(screen.getByTestId("name-error")).toBeTruthy();
  });

  it("resets settings on Cancel click", () => {
    storage[SETTINGS_KEY] = JSON.stringify({ displayName: "Original" });
    render(<SettingsPage />);

    fireEvent.change(screen.getByTestId("display-name-input"), {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getByTestId("cancel-btn"));

    const input = screen.getByTestId("display-name-input") as HTMLInputElement;
    expect(input.value).toBe("Original");
  });

  it("updates bio character count", () => {
    render(<SettingsPage />);
    fireEvent.change(screen.getByTestId("bio-input"), {
      target: { value: "Hello world" },
    });
    expect(screen.getByTestId("bio-count").textContent).toContain("11");
  });
});
