import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileNav from "../components/mobile-nav";

describe("MobileNav", () => {
  const onPanelChange = vi.fn();

  function renderNav(activePanel: "sidebar" | "content" | "chat" = "content") {
    return render(
      <MobileNav activePanel={activePanel} onPanelChange={onPanelChange} />
    );
  }

  it("renders mobile nav", () => {
    renderNav();
    expect(screen.getByTestId("mobile-nav")).toBeTruthy();
  });

  it("shows three tabs", () => {
    renderNav();
    expect(screen.getByTestId("mobile-tab-sidebar")).toBeTruthy();
    expect(screen.getByTestId("mobile-tab-content")).toBeTruthy();
    expect(screen.getByTestId("mobile-tab-chat")).toBeTruthy();
  });

  it("shows labels on tabs", () => {
    renderNav();
    expect(screen.getByText("Curriculum")).toBeTruthy();
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.getByText("AI Tutor")).toBeTruthy();
  });

  it("marks active tab with aria-selected", () => {
    renderNav("content");
    const contentTab = screen.getByTestId("mobile-tab-content");
    expect(contentTab.getAttribute("aria-selected")).toBe("true");

    const sidebarTab = screen.getByTestId("mobile-tab-sidebar");
    expect(sidebarTab.getAttribute("aria-selected")).toBe("false");
  });

  it("calls onPanelChange when tab clicked", () => {
    renderNav();
    fireEvent.click(screen.getByTestId("mobile-tab-sidebar"));
    expect(onPanelChange).toHaveBeenCalledWith("sidebar");
  });

  it("calls onPanelChange for chat tab", () => {
    renderNav();
    fireEvent.click(screen.getByTestId("mobile-tab-chat"));
    expect(onPanelChange).toHaveBeenCalledWith("chat");
  });

  it("shows unread indicator when hasUnreadChat is true", () => {
    render(
      <MobileNav
        activePanel="content"
        onPanelChange={onPanelChange}
        hasUnreadChat={true}
      />
    );
    expect(screen.getByTestId("unread-indicator")).toBeTruthy();
  });

  it("hides unread indicator by default", () => {
    renderNav();
    expect(screen.queryByTestId("unread-indicator")).toBeNull();
  });

  it("has role tablist", () => {
    renderNav();
    const nav = screen.getByTestId("mobile-nav");
    expect(nav.getAttribute("role")).toBe("tablist");
  });

  it("has aria-label for accessibility", () => {
    renderNav();
    const nav = screen.getByTestId("mobile-nav");
    expect(nav.getAttribute("aria-label")).toBe("Learning panels");
  });

  it("highlights active panel with primary color", () => {
    renderNav("content");
    const contentTab = screen.getByTestId("mobile-tab-content");
    expect(contentTab.className).toContain("text-primary");
  });
});
