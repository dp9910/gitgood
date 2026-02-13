"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CURATED_REPOS,
  CATEGORIES,
  filterRepos,
  formatStars,
  type Category,
} from "@/lib/curated-repos";

// ---------- Difficulty helpers ----------

const DIFFICULTY_CONFIG = {
  beginner: { label: "Beginner", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  intermediate: { label: "Intermediate", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  advanced: { label: "Advanced", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

// ---------- Component ----------

export default function BrowsePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const filteredRepos = filterRepos(CURATED_REPOS, search, activeCategory);

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
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
            Curated Learning Paths
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Expertly reviewed courses from the best GitHub repos
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics, languages, repos..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-10" data-testid="filter-chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Repo Grid */}
        {filteredRepos.length > 0 ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            data-testid="repo-grid"
          >
            {filteredRepos.map((repo) => {
              const diff = DIFFICULTY_CONFIG[repo.difficulty];
              return (
                <button
                  key={repo.fullName}
                  onClick={() =>
                    router.push(`/learn/${repo.owner}-${repo.name}`)
                  }
                  className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  data-testid={`repo-card-${repo.name}`}
                >
                  {/* Curated badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${diff.color}`}>
                      {diff.label}
                    </span>
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                      Curated
                    </span>
                  </div>

                  {/* Repo name */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors">
                    {repo.fullName}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {repo.description}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="material-icons text-amber-400 text-xs">star</span>
                      {formatStars(repo.stars)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-icons text-xs">group</span>
                      {repo.learners.toLocaleString()} learning
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-icons text-xs">timer</span>
                      {repo.estimatedHours}h
                    </span>
                  </div>

                  {/* Topic pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">
                      {repo.language}
                    </span>
                    {repo.topics.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {repo.topicCount} topics
                    </span>
                    <span className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Start Learning
                      <span className="material-icons text-sm">arrow_forward</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-20" data-testid="empty-state">
            <span className="material-icons text-5xl text-slate-300 dark:text-slate-600 mb-4">
              search_off
            </span>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
              No repos found
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Try different filters or search terms.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("All");
              }}
              className="text-sm text-primary font-medium hover:underline"
              data-testid="clear-filters"
            >
              Clear all filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
