"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import SidebarLayout from "@/components/sidebar-layout";
import {
  type HeatmapDay,
  generateHeatmapData,
  getHeatmapColor,
} from "@/lib/dashboard";
import type { LearningPathEntry } from "@/lib/user-profile";

// ---------- Sub-components ----------

function StatCard({
  icon,
  label,
  value,
  subtitle,
}: {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <span className="material-icons text-primary">{icon}</span>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className="text-3xl font-extrabold text-slate-900 dark:text-white"
        data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Heatmap({ data }: { data: HeatmapDay[] }) {
  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6"
      data-testid="heatmap"
    >
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
        Learning Activity
      </h3>
      <div className="flex flex-wrap gap-1">
        {data.map((day) => (
          <div
            key={day.date}
            className={`w-3 h-3 rounded-sm ${getHeatmapColor(day.count)}`}
            title={`${day.date}: ${day.count} topics`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
        <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
        <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
        <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
        <span>More</span>
      </div>
    </div>
  );
}

function ProgressRing({
  progress,
  size = 56,
  strokeWidth = 5,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        fill="none"
        className="stroke-slate-200 dark:stroke-slate-700"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="stroke-primary transition-all"
      />
    </svg>
  );
}

function LearningPathCard({
  path,
  onContinue,
}: {
  path: LearningPathEntry;
  onContinue: () => void;
}) {
  const progress =
    path.modulesTotal > 0
      ? Math.round((path.modulesCompleted / path.modulesTotal) * 100)
      : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">
            {path.repoOwner}/{path.repoName}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {path.lastModuleTitle ? `Last: ${path.lastModuleTitle}` : path.level}
          </p>
        </div>
        <ProgressRing progress={progress} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
          {path.language}
        </span>
        <span className="text-xs text-slate-400 font-medium">
          {path.modulesCompleted}/{path.modulesTotal} modules
        </span>
      </div>

      <button
        onClick={onContinue}
        className="w-full px-4 py-2 bg-primary/5 text-primary font-bold text-sm rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
      >
        {path.status === "to_learn" ? "Start" : "Continue"}
        <span className="material-icons text-sm">arrow_forward</span>
      </button>
    </div>
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
        Start your learning journey
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
        Browse repositories to find something to learn, and we&apos;ll create a
        personalized curriculum for you.
      </p>
      <button
        onClick={() => router.push("/browse")}
        className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
        data-testid="browse-btn"
      >
        Browse Repositories
        <span className="material-icons text-sm">arrow_forward</span>
      </button>
    </div>
  );
}

// ---------- Filter Tabs ----------

type PathFilter = "active" | "completed" | "to_learn";

function FilterTabs({
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
    <div className="flex gap-1 mb-4" data-testid="filter-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

// ---------- Dashboard Page ----------

export default function DashboardPage() {
  const router = useRouter();
  const { userProfile, profileLoading } = useAuth();
  const [filter, setFilter] = useState<PathFilter>("active");

  const stats = userProfile?.stats;
  const paths = userProfile?.learningPaths ?? [];

  // Filter learning paths
  const activePaths = paths.filter((p) => p.status === "active");
  const completedPaths = paths.filter((p) => p.status === "completed");
  const toLearnPaths = paths.filter((p) => p.status === "to_learn");

  const filteredPaths =
    filter === "active"
      ? activePaths
      : filter === "completed"
      ? completedPaths
      : toLearnPaths;

  // Find most recently active path for "Continue Learning"
  const continuePath =
    activePaths.length > 0
      ? [...activePaths].sort(
          (a, b) =>
            new Date(b.lastAccessedAt).getTime() -
            new Date(a.lastAccessedAt).getTime()
        )[0]
      : null;

  // Heatmap from lastActiveAt (simplified — in production, track per-day activity)
  const heatmapData = generateHeatmapData(
    stats?.lastActiveAt ? [stats.lastActiveAt] : [],
    12
  );

  if (profileLoading) {
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
      {/* Stats Row */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        data-testid="stats-row"
      >
        <StatCard
          icon="check_circle"
          label="Topics Completed"
          value={(stats?.topicsCompleted ?? 0).toString()}
        />
        <StatCard
          icon="local_fire_department"
          label="Learning Streak"
          value={`${stats?.currentStreak ?? 0} days`}
        />
        <StatCard
          icon="timer"
          label="Time Invested"
          value={`${stats?.hoursInvested ?? 0}h`}
        />
      </div>

      {/* Heatmap */}
      <div className="mb-8">
        <Heatmap data={heatmapData} />
      </div>

      {/* Continue Learning Hero */}
      {continuePath && (
        <div className="mb-8" data-testid="continue-section">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Pick up where you left off
          </h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {continuePath.repoOwner}/{continuePath.repoName}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {continuePath.lastModuleTitle
                    ? `Last: ${continuePath.lastModuleTitle}`
                    : continuePath.level}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
                {continuePath.language}
              </span>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-slate-400 mb-1.5">
                <span>
                  {continuePath.modulesCompleted} of{" "}
                  {continuePath.modulesTotal} modules
                </span>
                <span className="font-medium">
                  {continuePath.modulesTotal > 0
                    ? Math.round(
                        (continuePath.modulesCompleted /
                          continuePath.modulesTotal) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${
                      continuePath.modulesTotal > 0
                        ? Math.round(
                            (continuePath.modulesCompleted /
                              continuePath.modulesTotal) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <button
              onClick={() =>
                router.push(
                  `/learn/${continuePath.repoOwner}-${continuePath.repoName}`
                )
              }
              className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              data-testid="continue-btn"
            >
              Continue Learning
              <span className="material-icons text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Learning Paths */}
      <div data-testid="learning-paths">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Your Learning Paths
        </h2>

        {paths.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <FilterTabs
              active={filter}
              onChange={setFilter}
              counts={{
                active: activePaths.length,
                completed: completedPaths.length,
                to_learn: toLearnPaths.length,
              }}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPaths.map((path) => (
                <LearningPathCard
                  key={`${path.repoOwner}/${path.repoName}/${path.level}`}
                  path={path}
                  onContinue={() =>
                    router.push(
                      `/learn/${path.repoOwner}-${path.repoName}`
                    )
                  }
                />
              ))}
              {/* Start New Path */}
              <button
                onClick={() => router.push("/browse")}
                className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary transition-colors"
                data-testid="new-path-btn"
              >
                <span className="material-icons text-3xl mb-2">add</span>
                <span className="text-sm font-medium">
                  Start New Learning Path
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
