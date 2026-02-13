"use client";

import { useState, useMemo } from "react";
import type { Curriculum, CurriculumCategory, CurriculumTopic } from "@/lib/curriculum-cache";

// ---------- Types ----------

export type TopicStatus = "not_started" | "in_progress" | "completed";

export interface TopicProgress {
  [topicName: string]: TopicStatus;
}

export interface CurriculumViewProps {
  curriculum: Curriculum;
  progress: TopicProgress;
  onTopicSelect: (categoryIndex: number, topicIndex: number) => void;
  onTopicStatusChange: (topicName: string, status: TopicStatus) => void;
}

type FilterMode = "all" | "incomplete" | "unlocked";
type SortMode = "default" | "difficulty" | "time";

// ---------- Helpers ----------

const DIFFICULTY_ORDER: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  expert: 2,
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  beginner: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Easy" },
  intermediate: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "Medium" },
  expert: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Hard" },
};

function isTopicUnlocked(topic: CurriculumTopic, progress: TopicProgress): boolean {
  if (topic.prerequisites.length === 0) return true;
  return topic.prerequisites.every((pre) => progress[pre] === "completed");
}

function findNextRecommended(
  categories: CurriculumCategory[],
  progress: TopicProgress
): string | null {
  for (const category of categories) {
    for (const topic of category.topics) {
      const status = progress[topic.name] ?? "not_started";
      if (status !== "completed" && isTopicUnlocked(topic, progress)) {
        return topic.name;
      }
    }
  }
  return null;
}

// ---------- Component ----------

export default function CurriculumView({
  curriculum,
  progress,
  onTopicSelect,
  onTopicStatusChange,
}: CurriculumViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(() => {
    // Start with first category expanded
    return new Set([0]);
  });
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");

  // Compute stats
  const stats = useMemo(() => {
    let totalTopics = 0;
    let completedTopics = 0;
    let totalMinutes = 0;
    let completedMinutes = 0;

    for (const category of curriculum.categories) {
      for (const topic of category.topics) {
        totalTopics++;
        totalMinutes += topic.estimatedMinutes;
        if (progress[topic.name] === "completed") {
          completedTopics++;
          completedMinutes += topic.estimatedMinutes;
        }
      }
    }

    const percent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    return { totalTopics, completedTopics, totalMinutes, completedMinutes, percent };
  }, [curriculum, progress]);

  const nextRecommended = useMemo(
    () => findNextRecommended(curriculum.categories, progress),
    [curriculum, progress]
  );

  function toggleCategory(index: number) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function getCategoryStats(category: CurriculumCategory) {
    const total = category.topics.length;
    const completed = category.topics.filter(
      (t) => progress[t.name] === "completed"
    ).length;
    const totalMin = category.topics.reduce((s, t) => s + t.estimatedMinutes, 0);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, totalMin, percent };
  }

  function filterAndSortTopics(topics: CurriculumTopic[]): CurriculumTopic[] {
    let filtered = topics;

    if (filterMode === "incomplete") {
      filtered = filtered.filter((t) => progress[t.name] !== "completed");
    } else if (filterMode === "unlocked") {
      filtered = filtered.filter((t) => isTopicUnlocked(t, progress) && progress[t.name] !== "completed");
    }

    if (sortMode === "difficulty") {
      filtered = [...filtered].sort(
        (a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 0) - (DIFFICULTY_ORDER[b.difficulty] ?? 0)
      );
    } else if (sortMode === "time") {
      filtered = [...filtered].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
    }

    return filtered;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Overall Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Learning {curriculum.repoOwner}/{curriculum.repoName}
          </h1>
          <span className="text-sm font-bold text-primary">
            {stats.percent}% complete
          </span>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {stats.completedTopics} of {stats.totalTopics} topics completed
          <span className="mx-2">·</span>
          ~{stats.totalMinutes - stats.completedMinutes} min remaining
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6" role="toolbar" aria-label="Curriculum filters">
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
          {(["all", "incomplete", "unlocked"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterMode === mode
                  ? "bg-primary text-white"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {mode === "all" ? "All" : mode === "incomplete" ? "Incomplete" : "Unlocked"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
          {(["default", "difficulty", "time"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                sortMode === mode
                  ? "bg-primary text-white"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {mode === "default" ? "Default" : mode === "difficulty" ? "Difficulty" : "Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {curriculum.categories.map((category, catIdx) => {
          const catStats = getCategoryStats(category);
          const isExpanded = expandedCategories.has(catIdx);
          const topics = filterAndSortTopics(category.topics);

          return (
            <div
              key={catIdx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(catIdx)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3">
                  <span className="material-icons text-slate-400 text-sm transition-transform" style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
                    keyboard_arrow_down
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {category.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-medium text-slate-400">
                    ~{catStats.totalMin}m
                  </span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {catStats.completed}/{catStats.total}
                  </span>
                  <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${catStats.percent}%` }}
                    />
                  </div>
                </div>
              </button>

              {/* Topics List */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800">
                  {topics.length === 0 ? (
                    <p className="p-5 text-sm text-slate-400 text-center">
                      No topics match current filters.
                    </p>
                  ) : (
                    topics.map((topic, topicIdx) => {
                      const originalIdx = category.topics.indexOf(topic);
                      const status = progress[topic.name] ?? "not_started";
                      const unlocked = isTopicUnlocked(topic, progress);
                      const isNext = topic.name === nextRecommended;
                      const diff = DIFFICULTY_COLORS[topic.difficulty] ?? DIFFICULTY_COLORS.beginner;

                      return (
                        <div
                          key={topicIdx}
                          className={`flex items-center gap-3 px-5 py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-b-0 transition-colors ${
                            isNext ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""
                          } ${unlocked ? "hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
                          onClick={() => {
                            if (unlocked) onTopicSelect(catIdx, originalIdx);
                          }}
                          role="button"
                          tabIndex={unlocked ? 0 : -1}
                          aria-disabled={!unlocked}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && unlocked) onTopicSelect(catIdx, originalIdx);
                          }}
                        >
                          {/* Status icon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!unlocked) return;
                              const next = status === "completed" ? "not_started" : "completed";
                              onTopicStatusChange(topic.name, next);
                            }}
                            className="shrink-0"
                            aria-label={`Mark ${topic.name} as ${status === "completed" ? "incomplete" : "complete"}`}
                            disabled={!unlocked}
                          >
                            {status === "completed" ? (
                              <span className="material-icons text-green-500 text-xl">check_circle</span>
                            ) : !unlocked ? (
                              <span className="material-icons text-slate-300 dark:text-slate-600 text-xl">lock</span>
                            ) : isNext ? (
                              <span className="material-icons text-primary text-xl">play_circle</span>
                            ) : (
                              <span className="material-icons text-slate-300 dark:text-slate-600 text-xl">radio_button_unchecked</span>
                            )}
                          </button>

                          {/* Topic info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${
                                status === "completed"
                                  ? "text-slate-400 line-through"
                                  : unlocked
                                  ? "text-slate-900 dark:text-white"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}>
                                {topic.name}
                              </span>
                              {isNext && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                  Next
                                </span>
                              )}
                            </div>
                            {topic.subtopics.length > 0 && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                                {topic.subtopics.join(" · ")}
                              </p>
                            )}
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${diff.bg} ${diff.text}`}>
                              {diff.label}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {topic.estimatedMinutes}m
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { isTopicUnlocked, findNextRecommended };
