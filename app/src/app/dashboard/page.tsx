"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import SidebarLayout from "@/components/sidebar-layout";
import OnboardingModal from "@/components/onboarding-modal";
import { CURATED_REPOS } from "@/lib/curated-repos";
import { parseRepoUrl } from "@/lib/github";
import type { LearningPathEntry } from "@/lib/user-profile";

// ---------- Shared sub-components ----------

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="material-icons text-primary text-lg">{icon}</span>
      <div>
        <p
          className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight"
          data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
          {value}
        </p>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
    </div>
  );
}

// ---------- Returning-user sub-components ----------

function ContinueHeroCard({
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
    <div
      className="bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-slate-200 dark:border-slate-800 p-8 mb-6"
      data-testid="continue-hero"
    >
      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
        Continue Learning
      </h2>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          {path.repoOwner}/{path.repoName}
        </h3>
        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
          {path.language}
        </span>
      </div>
      {path.lastModuleTitle && (
        <p className="text-sm text-slate-500 mb-4">
          Last: {path.lastModuleTitle}
        </p>
      )}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-slate-400 mb-1.5">
          <span>
            {path.modulesCompleted} of {path.modulesTotal} modules
          </span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <button
        onClick={onContinue}
        className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        data-testid="continue-btn"
      >
        Continue Learning
        <span className="material-icons text-sm">arrow_forward</span>
      </button>
    </div>
  );
}

function StatsStrip({ stats }: { stats: { topicsCompleted: number; currentStreak: number; hoursInvested: number } }) {
  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap divide-x divide-slate-200 dark:divide-slate-800 mb-6"
      data-testid="stats-strip"
    >
      <StatCard
        icon="check_circle"
        label="Topics Completed"
        value={stats.topicsCompleted.toString()}
      />
      <StatCard
        icon="local_fire_department"
        label="Learning Streak"
        value={`${stats.currentStreak} days`}
      />
      <StatCard
        icon="timer"
        label="Time Invested"
        value={`${stats.hoursInvested}h`}
      />
    </div>
  );
}

function QuickActionCard({
  icon,
  title,
  subtitle,
  onClick,
  testId,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-left hover:shadow-md hover:-translate-y-0.5 transition-all group"
      data-testid={testId}
    >
      <span className="material-icons text-primary text-2xl mb-3 block">
        {icon}
      </span>
      <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </button>
  );
}

// ---------- New-user sub-components ----------

function WelcomeHero() {
  return (
    <div
      className="bg-gradient-to-r from-primary/5 to-transparent rounded-xl border border-slate-200 dark:border-slate-800 p-8 mb-6 text-center"
      data-testid="welcome-hero"
    >
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
        Ready to start learning?
      </h1>
      <p className="text-slate-500 dark:text-slate-400">
        Pick a course or paste any GitHub URL
      </p>
    </div>
  );
}

interface ReadyMaterial {
  owner: string;
  name: string;
  language: string;
  description: string;
  levels: { beginner: boolean; intermediate: boolean; advanced: boolean };
}

function SuggestedCourses() {
  const router = useRouter();
  const [readyCourses, setReadyCourses] = useState<ReadyMaterial[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/materials")
      .then((res) => res.json())
      .then((data) => setReadyCourses((data.materials ?? []).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Fall back to curated beginner repos if no ready courses
  const beginnerRepos = CURATED_REPOS.filter(
    (r) => r.difficulty === "beginner"
  ).slice(0, 3);

  const hasReady = loaded && readyCourses.length > 0;
  const courses = hasReady
    ? readyCourses.map((c) => ({
        key: `${c.owner}/${c.name}`,
        name: `${c.owner}/${c.name}`,
        language: c.language,
        ready: true,
        onClick: () => router.push(`/course/${c.owner}-${c.name}`),
      }))
    : beginnerRepos.map((r) => ({
        key: r.fullName,
        name: r.fullName,
        language: r.language,
        ready: false,
        onClick: () => router.push(`/course/${r.owner}-${r.name}`),
      }));

  return (
    <div className="mb-6" data-testid="suggested-courses">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
          {hasReady ? "Ready to Learn" : "Suggested Courses"}
        </h2>
        {hasReady && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Instant access
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {courses.map((course) => (
          <button
            key={course.key}
            onClick={course.onClick}
            className={`bg-white dark:bg-slate-900 rounded-xl border p-5 text-left hover:shadow-md transition-shadow group relative ${
              course.ready
                ? "border-green-200 dark:border-green-900/50"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            {course.ready && (
              <span
                className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1"
                data-testid="ready-badge"
              >
                <span className="material-icons text-[10px]">check_circle</span>
                Ready
              </span>
            )}
            <h3 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors truncate pr-14">
              {course.name}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
                {course.language}
              </span>
              {!course.ready && (
                <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded font-bold">
                  Beginner
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickStartInput() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    const parsed = parseRepoUrl(repoUrl.trim());
    if (!parsed) {
      setUrlError("Invalid GitHub URL. Try owner/repo or a full URL.");
      return;
    }
    setUrlError("");
    router.push(`/course/${parsed.owner}-${parsed.repo}`);
  }

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6"
      data-testid="quick-start"
    >
      <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
        Quick Start
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => {
            setRepoUrl(e.target.value);
            setUrlError("");
          }}
          placeholder="Paste any GitHub URL..."
          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          data-testid="quick-start-input"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 whitespace-nowrap"
          data-testid="quick-start-btn"
        >
          Start Learning
          <span className="material-icons text-sm">arrow_forward</span>
        </button>
      </form>
      {urlError && (
        <p className="text-xs text-red-500 mt-2" data-testid="url-error">
          {urlError}
        </p>
      )}
    </div>
  );
}

// ---------- Dashboard Page ----------

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, userProfile, profileLoading, isNewUser, refreshProfile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(true);

  const stats = userProfile?.stats;
  const paths = userProfile?.learningPaths ?? [];

  const activePaths = paths.filter((p) => p.status === "active");
  const toLearnPaths = paths.filter((p) => p.status === "to_learn");

  // Find most recently active path for "Continue Learning"
  const continuePath =
    activePaths.length > 0
      ? [...activePaths].sort(
          (a, b) =>
            new Date(b.lastAccessedAt).getTime() -
            new Date(a.lastAccessedAt).getTime()
        )[0]
      : null;

  const hasLearningPaths = paths.length > 0;

  // Redirect unauthenticated users to login
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

  async function handleOnboardingComplete(options?: { createRepo?: boolean }) {
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createRepo: options?.createRepo ?? false }),
      });
      await refreshProfile();
    } catch {
      // Silently fail — profile will refresh on next load
    }
    setShowOnboarding(false);
  }

  function handleOnboardingSkip() {
    setShowOnboarding(false);
  }

  return (
    <SidebarLayout>
      {/* Onboarding modal for new users */}
      {isNewUser && showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {hasLearningPaths ? (
        /* ===== Returning User Layout ===== */
        <>
          {/* Continue Learning Hero */}
          {continuePath && (
            <ContinueHeroCard
              path={continuePath}
              onContinue={() =>
                router.push(
                  `/learn/${continuePath.repoOwner}-${continuePath.repoName}`
                )
              }
            />
          )}

          {/* Stats Strip */}
          <StatsStrip
            stats={{
              topicsCompleted: stats?.topicsCompleted ?? 0,
              currentStreak: stats?.currentStreak ?? 0,
              hoursInvested: stats?.hoursInvested ?? 0,
            }}
          />

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="quick-actions">
            <QuickActionCard
              icon="explore"
              title="Browse Courses"
              subtitle="Discover new repos to learn from"
              onClick={() => router.push("/browse")}
              testId="action-browse"
            />
            <QuickActionCard
              icon="menu_book"
              title="My Learning"
              subtitle="Manage your learning paths"
              onClick={() => router.push("/learn")}
              testId="action-learn"
            />
            {toLearnPaths.length > 0 && (
              <QuickActionCard
                icon="queue"
                title={`${toLearnPaths.length} queued`}
                subtitle="Paths waiting to start"
                onClick={() => router.push("/learn")}
                testId="action-queued"
              />
            )}
          </div>
        </>
      ) : (
        /* ===== New User Layout ===== */
        <>
          <WelcomeHero />
          <SuggestedCourses />
          <QuickStartInput />
        </>
      )}
    </SidebarLayout>
  );
}
