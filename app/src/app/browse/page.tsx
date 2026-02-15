"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/sidebar-layout";
import { CURATED_REPOS, filterRepos, formatStars } from "@/lib/curated-repos";
import { parseRepoUrl } from "@/lib/github";

// ---------- Types ----------

interface AvailableMaterial {
  owner: string;
  name: string;
  language: string;
  description: string;
  levels: { beginner: boolean; intermediate: boolean; advanced: boolean };
  estimatedHours: { beginner: number; intermediate: number; advanced: number };
  timesAccessed: number;
}

// ---------- Difficulty helpers ----------

const DIFFICULTY_CONFIG = {
  beginner: { label: "Beginner", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  intermediate: { label: "Intermediate", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  advanced: { label: "Advanced", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const LEVEL_KEYS = ["beginner", "intermediate", "advanced"] as const;

// Trending: top 4 by stars
const TRENDING = [...CURATED_REPOS].sort((a, b) => b.stars - a.stars).slice(0, 4);

// ---------- Sub-components ----------

function RepoUrlInput() {
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
    <div className="mb-8" data-testid="repo-url-input">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
        Learn from any repo
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => {
            setRepoUrl(e.target.value);
            setUrlError("");
          }}
          placeholder="Paste a GitHub URL..."
          className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          data-testid="url-input"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 whitespace-nowrap"
          data-testid="url-go-btn"
        >
          Go
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

function ReadyCourseCard({ material }: { material: AvailableMaterial }) {
  const router = useRouter();
  const availableLevels = LEVEL_KEYS.filter((l) => material.levels[l]);

  return (
    <button
      onClick={() => router.push(`/course/${material.owner}-${material.name}`)}
      className="group bg-white dark:bg-slate-900 rounded-xl border border-green-200 dark:border-green-900/50 p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all relative"
      data-testid={`ready-card-${material.name}`}
    >
      {/* Ready badge */}
      <span
        className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1"
        data-testid="ready-badge"
      >
        <span className="material-icons text-[10px]">check_circle</span>
        Ready
      </span>

      <h3 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors truncate pr-16">
        {material.owner}/{material.name}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">
        {material.description}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
          {material.language}
        </span>
        {availableLevels.map((level) => {
          const config = DIFFICULTY_CONFIG[level];
          return (
            <span
              key={level}
              className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5 ${config.color}`}
              data-testid={`level-${level}`}
            >
              <span className="material-icons text-[10px]">check</span>
              {config.label}
            </span>
          );
        })}
      </div>
    </button>
  );
}

// ---------- Helpers ----------

function filterReadyCourses(
  courses: AvailableMaterial[],
  query: string
): AvailableMaterial[] {
  if (!query.trim()) return courses;
  const q = query.toLowerCase();
  return courses.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.owner.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.language.toLowerCase().includes(q)
  );
}

function isReady(
  readyCourses: AvailableMaterial[],
  owner: string,
  name: string
): boolean {
  return readyCourses.some(
    (c) =>
      c.owner.toLowerCase() === owner.toLowerCase() &&
      c.name.toLowerCase() === name.toLowerCase()
  );
}

// ---------- Browse Page ----------

export default function BrowsePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [readyCourses, setReadyCourses] = useState<AvailableMaterial[]>([]);
  const [readyLoading, setReadyLoading] = useState(true);

  useEffect(() => {
    fetch("/api/materials")
      .then((res) => res.json())
      .then((data) => setReadyCourses(data.materials ?? []))
      .catch(() => {})
      .finally(() => setReadyLoading(false));
  }, []);

  const filteredRepos = filterRepos(CURATED_REPOS, search, "All");
  const filteredReady = filterReadyCourses(readyCourses, search);
  const isSearching = search.trim().length > 0;

  return (
    <SidebarLayout>
      {/* URL input section */}
      <RepoUrlInput />

      {/* Ready to Learn — hidden while loading or empty */}
      {!readyLoading && filteredReady.length > 0 && (
        <div className="mb-8" data-testid="ready-courses">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Ready to Learn
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Instant access
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReady.map((m) => (
              <ReadyCourseCard key={`${m.owner}/${m.name}`} material={m} />
            ))}
          </div>
        </div>
      )}

      {/* All Courses */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
          Available Courses
        </h2>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              data-testid="search-input"
            />
          </div>
        </div>

        {filteredRepos.length > 0 ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            data-testid="repo-grid"
          >
            {filteredRepos.map((repo) => {
              const diff = DIFFICULTY_CONFIG[repo.difficulty];
              const ready = isReady(readyCourses, repo.owner, repo.name);
              return (
                <button
                  key={repo.fullName}
                  onClick={() =>
                    router.push(`/course/${repo.owner}-${repo.name}`)
                  }
                  className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all relative"
                  data-testid={`repo-card-${repo.name}`}
                >
                  {ready && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500" data-testid="ready-dot" title="Ready to learn" />
                  )}
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors truncate">
                    {repo.fullName}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">
                    {repo.description}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
                      {repo.language}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${diff.color}`}>
                      {diff.label}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
                      <span className="material-icons text-amber-400 text-xs">star</span>
                      {formatStars(repo.stars)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16" data-testid="empty-state">
            <span className="material-icons text-5xl text-slate-300 dark:text-slate-600 mb-4">
              search_off
            </span>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
              No repos found
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Try a different search term.
            </p>
            <button
              onClick={() => setSearch("")}
              className="text-sm text-primary font-medium hover:underline"
              data-testid="clear-filters"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* Trending Section — hidden during search */}
      {!isSearching && (
        <div data-testid="trending-section">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
            Trending This Week
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TRENDING.map((repo) => (
              <button
                key={repo.fullName}
                onClick={() =>
                  router.push(`/course/${repo.owner}-${repo.name}`)
                }
                className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-left hover:shadow-md transition-shadow"
                data-testid={`trending-${repo.name}`}
              >
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors truncate">
                  {repo.fullName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono">{repo.language}</span>
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-amber-400 text-xs">star</span>
                    {formatStars(repo.stars)}
                  </span>
                  <span className="material-icons text-green-500 text-xs ml-auto">trending_up</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
