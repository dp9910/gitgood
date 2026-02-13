import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PricingPage from "../app/pricing/page";
import { FEATURES, FAQS } from "../lib/pricing";

describe("PricingPage", () => {
  it("renders the page", () => {
    render(<PricingPage />);
    expect(screen.getByTestId("pricing-page")).toBeDefined();
  });

  it("displays the title", () => {
    render(<PricingPage />);
    expect(screen.getByText("Simple, transparent pricing")).toBeDefined();
  });

  it("renders both pricing cards", () => {
    render(<PricingPage />);
    expect(screen.getByTestId("tier-free")).toBeDefined();
    expect(screen.getByTestId("tier-pro")).toBeDefined();
  });

  it("shows prices", () => {
    render(<PricingPage />);
    expect(screen.getByText("$0")).toBeDefined();
    expect(screen.getByText("$5")).toBeDefined();
  });

  it("shows CTA buttons", () => {
    render(<PricingPage />);
    expect(screen.getByTestId("cta-free")).toBeDefined();
    expect(screen.getByTestId("cta-pro")).toBeDefined();
    expect(screen.getByText("Get Started")).toBeDefined();
    expect(screen.getByText("Upgrade to Pro")).toBeDefined();
  });

  it("renders feature comparison table", () => {
    render(<PricingPage />);
    expect(screen.getByTestId("feature-table")).toBeDefined();
    expect(screen.getByText("Compare plans")).toBeDefined();
  });

  it("shows all feature names in table", () => {
    render(<PricingPage />);
    for (const feature of FEATURES) {
      expect(screen.getByText(feature.name)).toBeDefined();
    }
  });

  it("renders FAQ section", () => {
    render(<PricingPage />);
    expect(screen.getByTestId("faq-list")).toBeDefined();
    expect(screen.getByText("Frequently asked questions")).toBeDefined();
  });

  it("shows all FAQ questions", () => {
    render(<PricingPage />);
    for (const faq of FAQS) {
      expect(screen.getByText(faq.question)).toBeDefined();
    }
  });

  it("expands FAQ answer on click", () => {
    render(<PricingPage />);
    fireEvent.click(screen.getByTestId("faq-0"));
    expect(screen.getByTestId("faq-answer-0")).toBeDefined();
  });

  it("collapses FAQ on second click", () => {
    render(<PricingPage />);
    fireEvent.click(screen.getByTestId("faq-0"));
    expect(screen.getByTestId("faq-answer-0")).toBeDefined();
    fireEvent.click(screen.getByTestId("faq-0"));
    expect(screen.queryByTestId("faq-answer-0")).toBeNull();
  });

  it("links to home page", () => {
    render(<PricingPage />);
    const link = screen.getByText("GitGood");
    expect(link.closest("a")?.getAttribute("href")).toBe("/");
  });
});
