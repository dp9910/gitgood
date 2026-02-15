"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import SidebarLayout from "@/components/sidebar-layout";
import type { LearningPathEntry } from "@/lib/user-profile";

// ---------- Types ----------

type PathFilter = "active" | "completed" | "to_learn";

// ---------- Sub-components ----------

function PathFilterTabs({
  active,
  onChange,
  counts,
}: {
  active: PathFilter;
  onChange: (f: PathFilter) => void;
  counts: Record<PathFilter, number>;
}) {
  const tabs: { key: PathFilter; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "to_learn", label: "To Learn" },
  ];

  return (
    <div className="flex gap-1 mb-6" data-testid="filter-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            active === tab.key
              ? "bg-primary/10 text-primary"
              : "text-slate-400 hover:text-slate-600"
          }`}
          data-testid={`tab-${tab.key}`}
        >
          {tab.label} ({counts[tab.key]})
        </button>
      ))}
    </div>
  );
}

function LearningPathCard({
  path,
  onAction,
}: {
  path: LearningPathEntry;
  onAction: () => void;
}) {
  const progress =
    path.modulesTotal > 0
      ? Math.round((path.modulesCompleted / path.modulesTotal) * 100)
      : 0;

  const ctaLabel =
    path.status === "to_learn"
      ? "Start"
      : path.status === "completed"
      ? "Review"
      : "Continue";

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow"
      data-testid={`path-card-${path.repoName}`}
    >
      <h3 className="font-bold text-slate-900 dark:text-white mb-1 truncate">
        {path.repoOwner}/{path.repoName}
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        {path.lastModuleTitle ? `Last: ${path.lastModuleTitle}` : path.level}
      </p>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
          {path.language}
        </span>
        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 capitalize">
          {path.level}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>
            {path.modulesCompleted}/{path.modulesTotal} modules
          </span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button
        onClick={onAction}
        className="w-full px-4 py-2 bg-primary/5 text-primary font-bold text-sm rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
      >
        {ctaLabel}
        <span className="material-icons text-sm">arrow_forward</span>
      </button>
    </div>
  );
}

function AddPathCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary transition-colors"
      data-testid="add-path-btn"
    >
      <span className="material-icons text-3xl mb-2">add</span>
      <span className="text-sm font-medium">Start New Path</span>
    </button>
  );
}

function EmptyState() {
  const router = useRouter();
  return (
    <div className="text-center py-16" data-testid="empty-state">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <span className="material-icons text-4xl text-primary">school</span>
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        No learning paths yet
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
        Browse courses to find something to learn, and we&apos;ll create a
        personalized curriculum for you.
      </p>
      <button
        onClick={() => router.push("/browse")}
        className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
        data-testid="browse-btn"
      >
        Browse Courses
        <span className="material-icons text-sm">arrow_forward</span>
      </button>
    </div>
  );
}

// ---------- My Learning Page ----------

export default function MyLearningPage() {
  const router = useRouter();
  const { user, loading, userProfile, profileLoading } = useAuth();
  const [filter, setFilter] = useState<PathFilter>("active");

  const paths = userProfile?.learningPaths ?? [];

  const activePaths = paths.filter((p) => p.status === "active");
  const completedPaths = paths.filter((p) => p.status === "completed");
  const toLearnPaths = paths.filter((p) => p.status === "to_learn");

  const counts = {
    active: activePaths.length,
    completed: completedPaths.length,
    to_learn: toLearnPaths.length,
  };

  const filteredPaths =
    filter === "active"
      ? activePaths
      : filter === "completed"
      ? completedPaths
      : toLearnPaths;

  // Redirect unauthenticated users
  if (!loading && !user) {
    router.replace("/login");
    return null;
  }

  if (loading || profileLoading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64" data-testid="loading">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My Learning
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {counts.active} active &middot; {counts.completed} completed &middot;{" "}
          {counts.to_learn} queued
        </p>
      </div>

      {paths.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <PathFilterTabs active={filter} onChange={setFilter} counts={counts} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPaths.map((path) => (
              <LearningPathCard
                key={`${path.repoOwner}/${path.repoName}/${path.level}`}
                path={path}
                onAction={() =>
                  router.push(`/learn/${path.repoOwner}-${path.repoName}`)
                }
              />
            ))}
            <AddPathCard onClick={() => router.push("/browse")} />
          </div>
        </>
      )}
    </SidebarLayout>
  );
}
