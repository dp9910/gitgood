import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard",
}));

const mockLogout = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { uid: "user-1", displayName: "Test User", photoURL: null },
    userProfile: {
      uid: "user-1",
      displayName: "Test User",
      photoURL: null,
      onboardingComplete: true,
    },
    logout: mockLogout,
  }),
}));

import SidebarLayout, { NAV_ITEMS } from "../components/sidebar-layout";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SidebarLayout", () => {
  function renderLayout(children = <div data-testid="child-content">Page Content</div>) {
    return render(<SidebarLayout>{children}</SidebarLayout>);
  }

  it("renders sidebar", () => {
    renderLayout();
    expect(screen.getByTestId("sidebar")).toBeTruthy();
  });

  it("renders GitGood logo", () => {
    renderLayout();
    expect(screen.getAllByText("GitGood").length).toBeGreaterThanOrEqual(1);
  });

  it("renders all navigation items", () => {
    renderLayout();
    for (const item of NAV_ITEMS) {
      expect(screen.getByTestId(`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`)).toBeTruthy();
    }
  });

  it("highlights active nav item (Dashboard)", () => {
    renderLayout();
    const dashboardNav = screen.getByTestId("nav-dashboard");
    expect(dashboardNav.className).toContain("bg-primary/10");
    expect(dashboardNav.className).toContain("text-primary");
  });

  it("non-active nav items are not highlighted", () => {
    renderLayout();
    const browseNav = screen.getByTestId("nav-browse");
    expect(browseNav.className).not.toContain("bg-primary/10");
  });

  it("navigates on nav click", () => {
    renderLayout();
    fireEvent.click(screen.getByTestId("nav-browse"));
    expect(mockPush).toHaveBeenCalledWith("/browse");
  });

  it("renders children", () => {
    renderLayout();
    expect(screen.getByTestId("child-content")).toBeTruthy();
    expect(screen.getByText("Page Content")).toBeTruthy();
  });

  it("shows user display name", () => {
    renderLayout();
    expect(screen.getAllByText("Test User").length).toBeGreaterThanOrEqual(1);
  });

  it("renders welcome header with first name", () => {
    renderLayout();
    expect(screen.getByTestId("header-welcome").textContent).toContain("Welcome back, Test!");
  });

  it("has sign out button", () => {
    renderLayout();
    const logoutBtn = screen.getByTestId("logout-btn");
    expect(logoutBtn).toBeTruthy();
    expect(logoutBtn.textContent).toContain("Sign Out");
  });

  it("calls logout on sign out click", () => {
    renderLayout();
    fireEvent.click(screen.getByTestId("logout-btn"));
    expect(mockLogout).toHaveBeenCalled();
  });

  it("has mobile menu button", () => {
    renderLayout();
    expect(screen.getByTestId("mobile-menu-btn")).toBeTruthy();
  });

  it("opens mobile sidebar on hamburger click", () => {
    renderLayout();
    const sidebar = screen.getByTestId("sidebar");
    // Initially hidden on mobile (has -translate-x-full)
    expect(sidebar.className).toContain("-translate-x-full");

    fireEvent.click(screen.getByTestId("mobile-menu-btn"));
    // After click, should be visible (translate-x-0)
    expect(sidebar.className).toContain("translate-x-0");
    expect(sidebar.className).not.toContain("-translate-x-full");
  });

  it("closes mobile sidebar on overlay click", () => {
    renderLayout();
    fireEvent.click(screen.getByTestId("mobile-menu-btn"));
    expect(screen.getByTestId("sidebar-overlay")).toBeTruthy();

    fireEvent.click(screen.getByTestId("sidebar-overlay"));
    expect(screen.getByTestId("sidebar").className).toContain("-translate-x-full");
  });

  it("exports NAV_ITEMS constant", () => {
    expect(NAV_ITEMS.length).toBe(4);
    expect(NAV_ITEMS[0].label).toBe("Dashboard");
    expect(NAV_ITEMS[0].href).toBe("/dashboard");
  });
});
