"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "My Learning", icon: "school", href: "/learn" },
  { label: "Browse", icon: "explore", href: "/browse" },
  { label: "Settings", icon: "settings", href: "/settings" },
] as const;

interface SidebarLayoutProps {
  children: ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName =
    userProfile?.displayName ?? user?.displayName ?? "Learner";
  const photoURL = userProfile?.photoURL ?? user?.photoURL ?? null;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight"
          >
            <span className="material-icons">code</span>
            <span>GitGood</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1" data-testid="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <button
                key={item.href}
                onClick={() => {
                  router.push(item.href);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <span className="material-icons text-xl">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-icons text-sm text-primary">
                  person
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
              {displayName}
            </span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            data-testid="logout-btn"
          >
            <span className="material-icons text-sm">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-600 dark:text-slate-400"
            data-testid="mobile-menu-btn"
          >
            <span className="material-icons">menu</span>
          </button>
          <span className="text-primary font-bold text-lg">GitGood</span>
          <div className="w-6" /> {/* Spacer for centering */}
        </header>

        {/* Desktop header */}
        <header className="h-16 hidden lg:flex items-center justify-between px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <h1
            className="text-lg font-bold text-slate-900 dark:text-white"
            data-testid="header-welcome"
          >
            Welcome back, {displayName.split(" ")[0]}!
          </h1>
          <div className="flex items-center gap-3">
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-icons text-sm text-primary">
                  person
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export { NAV_ITEMS };
