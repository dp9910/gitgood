import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TermsPage from "../app/terms/page";
import { TOS_SECTIONS, TOS_LAST_UPDATED } from "../lib/legal";

describe("TermsPage", () => {
  it("renders the page", () => {
    render(<TermsPage />);
    expect(screen.getByTestId("terms-page")).toBeDefined();
  });

  it("displays the title", () => {
    render(<TermsPage />);
    expect(screen.getByText("Terms of Service")).toBeDefined();
  });

  it("shows last updated date", () => {
    render(<TermsPage />);
    expect(screen.getByTestId("last-updated").textContent).toContain(TOS_LAST_UPDATED);
  });

  it("renders table of contents", () => {
    render(<TermsPage />);
    const toc = screen.getByTestId("toc");
    expect(toc).toBeDefined();
    expect(toc.querySelectorAll("a").length).toBe(TOS_SECTIONS.length);
  });

  it("renders all sections", () => {
    render(<TermsPage />);
    for (const section of TOS_SECTIONS) {
      expect(screen.getByTestId(`section-${section.id}`)).toBeDefined();
    }
  });

  it("displays section titles", () => {
    render(<TermsPage />);
    // Titles appear in both TOC and section headers
    expect(screen.getAllByText("1. Acceptance of Terms").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("6. DMCA & Takedown Requests").length).toBeGreaterThanOrEqual(2);
  });

  it("includes contact email", () => {
    render(<TermsPage />);
    expect(screen.getByText("legal@gitgood.dev")).toBeDefined();
  });

  it("links to privacy page", () => {
    render(<TermsPage />);
    const link = screen.getByText("Privacy Policy");
    expect(link.getAttribute("href")).toBe("/privacy");
  });

  it("links to home page", () => {
    render(<TermsPage />);
    const link = screen.getByText("GitGood");
    expect(link.closest("a")?.getAttribute("href")).toBe("/");
  });
});
