"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type LearningPath,
  type DashboardStats,
  type HeatmapDay,
  generateHeatmapData,
  getHeatmapColor,
  calculateStreak,
} from "@/lib/dashboard";

// ---------- Mock data (will be replaced with real data from GitHub API) ----------

const MOCK_PATHS: LearningPath[] = [
  {
    repoOwner: "karpathy",
    repoName: "micrograd",
    fullName: "karpathy/micrograd",
    topicsCompleted: 8,
    topicsTotal: 12,
    lastTopic: "Understanding Backpropagation",
    lastAccessedAt: new Date().toISOString(),
    language: "Python",
  },
  {
    repoOwner: "trekhleb",
    repoName: "javascript-algorithms",
    fullName: "trekhleb/javascript-algorithms",
    topicsCompleted: 5,
    topicsTotal: 35,
    lastTopic: "Binary Search",
    lastAccessedAt: new Date(Date.now() - 86400000).toISOString(),
    language: "JavaScript",
  },
];

function getMockStats(): DashboardStats {
  return {
    topicsCompleted: 47,
    topicsThisWeek: 3,
    streakDays: calculateStreak(getMockActivityDates()),
    hoursInvested: 18.5,
  };
}

function getMockActivityDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  // Generate some activity for the last 2 weeks
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (Math.random() > 0.3) {
      dates.push(d.toISOString());
      if (Math.random() > 0.6) dates.push(d.toISOString()); // some days with 2+ activities
    }
  }
  return dates;
}

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
      <p className="text-3xl font-extrabold text-slate-900 dark:text-white" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
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
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6" data-testid="heatmap">
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

function LearningPathCard({
  path,
  onContinue,
}: {
  path: LearningPath;
  onContinue: () => void;
}) {
  const progress = Math.round(
    (path.topicsCompleted / path.topicsTotal) * 100
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
            {path.fullName}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Last: {path.lastTopic}
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
          {path.language}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>
            {path.topicsCompleted} of {path.topicsTotal} topics
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
        onClick={onContinue}
        className="w-full px-4 py-2 bg-primary/5 text-primary font-bold text-sm rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
      >
        Continue
        <span className="material-icons text-sm">arrow_forward</span>
      </button>
    </div>
  );
}

// ---------- Dashboard Page ----------

export default function DashboardPage() {
  const router = useRouter();
  const [paths] = useState<LearningPath[]>(MOCK_PATHS);
  const stats = getMockStats();
  const activityDates = getMockActivityDates();
  const heatmapData = generateHeatmapData(activityDates, 12);

  // Find most recent path for "Continue Learning"
  const continuePath = paths.length > 0
    ? [...paths].sort(
        (a, b) =>
          new Date(b.lastAccessedAt).getTime() -
          new Date(a.lastAccessedAt).getTime()
      )[0]
    : null;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight"
        >
          <span className="material-icons">code</span>
          <span>GitGood</span>
        </button>
        <nav className="flex items-center gap-4">
          <button
            onClick={() => router.push("/browse")}
            className="text-sm text-slate-500 hover:text-primary transition-colors font-medium"
          >
            Browse Repos
          </button>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome */}
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-8" data-testid="welcome">
          Welcome back! 👋
        </h1>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" data-testid="stats-row">
          <StatCard
            icon="check_circle"
            label="Topics Completed"
            value={stats.topicsCompleted.toString()}
            subtitle={`+${stats.topicsThisWeek} this week`}
          />
          <StatCard
            icon="local_fire_department"
            label="Learning Streak"
            value={`${stats.streakDays} days`}
          />
          <StatCard
            icon="timer"
            label="Time Invested"
            value={`${stats.hoursInvested}h`}
          />
        </div>

        {/* Heatmap */}
        <div className="mb-8">
          <Heatmap data={heatmapData} />
        </div>

        {/* Continue Learning */}
        {continuePath && (
          <div className="mb-8" data-testid="continue-section">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Pick up where you left off
            </h2>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {continuePath.fullName}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Last topic: {continuePath.lastTopic}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
                  {continuePath.language}
                </span>
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-slate-400 mb-1.5">
                  <span>
                    {continuePath.topicsCompleted} of {continuePath.topicsTotal} topics
                  </span>
                  <span className="font-medium">
                    {Math.round(
                      (continuePath.topicsCompleted / continuePath.topicsTotal) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${Math.round(
                        (continuePath.topicsCompleted / continuePath.topicsTotal) *
                          100
                      )}%`,
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

        {/* Your Learning Paths */}
        <div data-testid="learning-paths">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Your Learning Paths
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paths.map((path) => (
              <LearningPathCard
                key={path.fullName}
                path={path}
                onContinue={() =>
                  router.push(`/learn/${path.repoOwner}-${path.repoName}`)
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
              <span className="text-sm font-medium">Start New Learning Path</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
