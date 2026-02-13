import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "../app/privacy/page";
import { PRIVACY_SECTIONS, PRIVACY_LAST_UPDATED } from "../lib/legal";

describe("PrivacyPage", () => {
  it("renders the page", () => {
    render(<PrivacyPage />);
    expect(screen.getByTestId("privacy-page")).toBeDefined();
  });

  it("displays the title", () => {
    render(<PrivacyPage />);
    expect(screen.getByText("Privacy Policy")).toBeDefined();
  });

  it("shows last updated date", () => {
    render(<PrivacyPage />);
    expect(screen.getByTestId("last-updated").textContent).toContain(PRIVACY_LAST_UPDATED);
  });

  it("renders table of contents", () => {
    render(<PrivacyPage />);
    const toc = screen.getByTestId("toc");
    expect(toc).toBeDefined();
    expect(toc.querySelectorAll("a").length).toBe(PRIVACY_SECTIONS.length);
  });

  it("renders all sections", () => {
    render(<PrivacyPage />);
    for (const section of PRIVACY_SECTIONS) {
      expect(screen.getByTestId(`section-${section.id}`)).toBeDefined();
    }
  });

  it("displays section titles", () => {
    render(<PrivacyPage />);
    // Titles appear in both TOC and section headers
    expect(screen.getAllByText("1. Overview").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("8. Your Rights").length).toBeGreaterThanOrEqual(2);
  });

  it("includes contact email", () => {
    render(<PrivacyPage />);
    expect(screen.getByText("privacy@gitgood.dev")).toBeDefined();
  });

  it("links to terms page", () => {
    render(<PrivacyPage />);
    const link = screen.getByText("Terms of Service");
    expect(link.getAttribute("href")).toBe("/terms");
  });

  it("links to home page", () => {
    render(<PrivacyPage />);
    const link = screen.getByText("GitGood");
    expect(link.closest("a")?.getAttribute("href")).toBe("/");
  });
});
