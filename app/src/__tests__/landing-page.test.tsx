import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "../app/page";

// Mock parseRepoUrl since it's from our lib
vi.mock("../lib/github", () => ({
  parseRepoUrl: (url: string) => {
    const match = url.match(
      /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/
    );
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  },
}));

// Mock window.location
const mockLocation = { href: "" };
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    value: mockLocation,
    writable: true,
  });
  mockLocation.href = "";
});

function getInput() {
  return screen.getByPlaceholderText(/paste any github url/i) as HTMLInputElement;
}

function submitForm() {
  fireEvent.submit(getInput().closest("form")!);
}

describe("Landing page", () => {
  it("renders hero heading", () => {
    render(<Home />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toContain("Learn Anything on");
    expect(h1.textContent).toContain("GitHub");
  });

  it("renders repo URL input", () => {
    render(<Home />);
    expect(getInput()).toBeTruthy();
  });

  it("renders form submit button", () => {
    render(<Home />);
    const form = getInput().closest("form")!;
    const btn = form.querySelector('button[type="submit"]');
    expect(btn?.textContent).toContain("Start Learning");
  });

  it("shows error on empty submission", () => {
    render(<Home />);
    submitForm();
    expect(screen.getByText("Please enter a GitHub repository URL.")).toBeTruthy();
  });

  it("shows error on invalid URL", () => {
    render(<Home />);
    fireEvent.change(getInput(), { target: { value: "not-a-url" } });
    submitForm();
    expect(
      screen.getByText("Invalid URL. Please enter a valid github.com/owner/repo link.")
    ).toBeTruthy();
  });

  it("navigates to learn page on valid URL", () => {
    render(<Home />);
    fireEvent.change(getInput(), {
      target: { value: "https://github.com/karpathy/micrograd" },
    });
    submitForm();
    expect(mockLocation.href).toBe("/learn/karpathy-micrograd");
  });

  it("clears error when user types", () => {
    render(<Home />);
    submitForm();
    expect(screen.getByText("Please enter a GitHub repository URL.")).toBeTruthy();

    fireEvent.change(getInput(), { target: { value: "h" } });
    expect(screen.queryByText("Please enter a GitHub repository URL.")).toBeNull();
  });

  it("renders example repo buttons", () => {
    render(<Home />);
    expect(screen.getByText("micrograd")).toBeTruthy();
    expect(screen.getByText("nanoGPT")).toBeTruthy();
  });

  it("fills input when example repo clicked", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("micrograd"));
    expect(getInput().value).toBe("https://github.com/karpathy/micrograd");
  });

  it("renders How It Works section", () => {
    render(<Home />);
    const section = document.getElementById("how-it-works")!;
    expect(section).toBeTruthy();
    expect(section.textContent).toContain("Paste a Repo");
    expect(section.textContent).toContain("AI Builds Your Path");
    expect(section.textContent).toContain("Learn Interactively");
  });

  it("renders footer", () => {
    render(<Home />);
    const footer = document.querySelector("footer");
    expect(footer).toBeTruthy();
    expect(footer!.textContent).toContain("Terms");
    expect(footer!.textContent).toContain("Privacy");
  });
});
