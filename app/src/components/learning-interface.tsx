"use client";

import { useState, useEffect, useCallback } from "react";
import type { Curriculum, CurriculumCategory, CurriculumTopic } from "@/lib/curriculum-cache";
import { isTopicUnlocked, type TopicProgress, type TopicStatus } from "./curriculum-view";

// ---------- Types ----------

export interface SelectedTopic {
  categoryIndex: number;
  topicIndex: number;
}

export interface LearningInterfaceProps {
  curriculum: Curriculum;
  progress: TopicProgress;
  selectedTopic: SelectedTopic;
  onTopicSelect: (categoryIndex: number, topicIndex: number) => void;
  onTopicStatusChange: (topicName: string, status: TopicStatus) => void;
  onBackToOverview: () => void;
}

// ---------- Sidebar Component ----------

function CurriculumSidebar({
  curriculum,
  progress,
  selectedTopic,
  collapsed,
  onTopicSelect,
  onToggleCollapse,
}: {
  curriculum: Curriculum;
  progress: TopicProgress;
  selectedTopic: SelectedTopic;
  collapsed: boolean;
  onTopicSelect: (catIdx: number, topicIdx: number) => void;
  onToggleCollapse: () => void;
}) {
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
    () => new Set([selectedTopic.categoryIndex])
  );

  function toggleCategory(idx: number) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  if (collapsed) {
    return (
      <aside className="w-12 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Expand sidebar"
        >
          <span className="material-icons text-slate-400 text-sm">chevron_right</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Course Curriculum
        </h2>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          aria-label="Collapse sidebar"
        >
          <span className="material-icons text-slate-400 text-sm">chevron_left</span>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1" aria-label="Course curriculum">
        {curriculum.categories.map((category, catIdx) => {
          const isExpanded = expandedCategories.has(catIdx);
          const completed = category.topics.filter(
            (t) => progress[t.name] === "completed"
          ).length;

          return (
            <div key={catIdx} className="mb-2">
              <button
                onClick={() => toggleCategory(catIdx)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="material-icons text-sm">
                    {isExpanded ? "keyboard_arrow_down" : "keyboard_arrow_right"}
                  </span>
                  <span className="truncate">{category.name}</span>
                </span>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                  {completed}/{category.topics.length}
                </span>
              </button>
              {isExpanded && (
                <div className="mt-1 space-y-0.5">
                  {category.topics.map((topic, topicIdx) => {
                    const status = progress[topic.name] ?? "not_started";
                    const unlocked = isTopicUnlocked(topic, progress);
                    const isSelected =
                      catIdx === selectedTopic.categoryIndex &&
                      topicIdx === selectedTopic.topicIndex;

                    return (
                      <button
                        key={topicIdx}
                        onClick={() => {
                          if (unlocked) onTopicSelect(catIdx, topicIdx);
                        }}
                        disabled={!unlocked}
                        className={`w-full flex items-center justify-between p-2 pl-8 rounded-lg text-sm transition-colors ${
                          isSelected
                            ? "bg-primary/5 text-primary border-l-2 border-primary font-medium"
                            : unlocked
                            ? "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            : "text-slate-400 dark:text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="material-icons text-sm shrink-0">
                            {status === "completed"
                              ? "check_circle"
                              : isSelected
                              ? "play_circle"
                              : !unlocked
                              ? "lock"
                              : "radio_button_unchecked"}
                          </span>
                          <span className="truncate">{topic.name}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                          {topic.estimatedMinutes}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

// ---------- Content Panel ----------

function ContentPanel({
  category,
  topic,
  onComplete,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: {
  category: CurriculumCategory;
  topic: CurriculumTopic;
  onComplete: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}) {
  return (
    <section className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden min-w-0">
      {/* Content Header */}
      <div className="px-8 pt-8 pb-4 shrink-0">
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-4" aria-label="Breadcrumb">
          <span>{category.name}</span>
          <span className="material-icons text-[12px]">chevron_right</span>
          <span className="text-primary font-medium">{topic.name}</span>
        </nav>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {topic.name}
        </h1>
        <div className="flex items-center gap-3 mt-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            topic.difficulty === "beginner"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : topic.difficulty === "intermediate"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {topic.difficulty === "beginner" ? "Easy" : topic.difficulty === "intermediate" ? "Medium" : "Hard"}
          </span>
          <span className="text-xs text-slate-400">
            <span className="material-icons text-[12px] align-middle mr-1">timer</span>
            {topic.estimatedMinutes} min
          </span>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-8" data-testid="content-area">
        <div className="max-w-3xl pb-12">
          {/* Subtopics overview */}
          {topic.subtopics.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                What you&apos;ll learn
              </h3>
              <ul className="space-y-2">
                {topic.subtopics.map((sub, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="material-icons text-primary text-sm">check</span>
                    {sub}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prerequisites */}
          {topic.prerequisites.length > 0 && (
            <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Prerequisites</h3>
              <div className="flex flex-wrap gap-2">
                {topic.prerequisites.map((pre) => (
                  <span
                    key={pre}
                    className="text-xs px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-400"
                  >
                    {pre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Content placeholder — will be populated by Task #23 (Content delivery) */}
          <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center" data-testid="content-placeholder">
            <span className="material-icons text-4xl text-slate-300 dark:text-slate-600 mb-3">auto_stories</span>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              AI-generated content will appear here.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Content delivery coming in a future update.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="h-16 border-t border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-icons text-sm">arrow_back</span>
          Previous
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onComplete}
            className="px-6 py-2 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            Complete &amp; Continue
          </button>
          {hasNext && (
            <button
              onClick={onNext}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-medium text-sm transition-all"
            >
              Skip
              <span className="material-icons text-sm">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------- Chat Panel Placeholder ----------

function ChatPanel({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  if (collapsed) {
    return (
      <aside className="w-12 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <button
          onClick={onToggle}
          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open AI tutor"
        >
          <span className="material-icons text-primary text-sm">smart_toy</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="font-bold text-sm">AI Tutor</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          aria-label="Close AI tutor"
        >
          <span className="material-icons text-slate-400 text-sm">close</span>
        </button>
      </div>
      {/* Chat placeholder — will be populated by Task #24 */}
      <div className="flex-1 flex items-center justify-center p-6" data-testid="chat-placeholder">
        <div className="text-center">
          <span className="material-icons text-4xl text-slate-300 dark:text-slate-600 mb-3">smart_toy</span>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
            AI Tutor
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Chat interface coming soon.
          </p>
        </div>
      </div>
    </aside>
  );
}

// ---------- Main Interface ----------

export default function LearningInterface({
  curriculum,
  progress,
  selectedTopic,
  onTopicSelect,
  onTopicStatusChange,
  onBackToOverview,
}: LearningInterfaceProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(true);

  const category = curriculum.categories[selectedTopic.categoryIndex];
  const topic = category?.topics[selectedTopic.topicIndex];

  // Flatten all topics for prev/next navigation
  const allTopics = curriculum.categories.flatMap((cat, catIdx) =>
    cat.topics.map((t, topicIdx) => ({ catIdx, topicIdx, topic: t }))
  );
  const currentFlatIndex = allTopics.findIndex(
    (t) =>
      t.catIdx === selectedTopic.categoryIndex &&
      t.topicIdx === selectedTopic.topicIndex
  );

  const hasPrevious = currentFlatIndex > 0;
  const hasNext = currentFlatIndex < allTopics.length - 1;

  function goToPrevious() {
    if (!hasPrevious) return;
    const prev = allTopics[currentFlatIndex - 1];
    onTopicSelect(prev.catIdx, prev.topicIdx);
  }

  function goToNext() {
    if (!hasNext) return;
    const next = allTopics[currentFlatIndex + 1];
    if (isTopicUnlocked(next.topic, progress)) {
      onTopicSelect(next.catIdx, next.topicIdx);
    }
  }

  function handleComplete() {
    if (!topic) return;
    onTopicStatusChange(topic.name, "completed");
    // Auto-advance to next topic if available
    if (hasNext) {
      const next = allTopics[currentFlatIndex + 1];
      if (isTopicUnlocked(next.topic, { ...progress, [topic.name]: "completed" })) {
        onTopicSelect(next.catIdx, next.topicIdx);
      }
    }
  }

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture shortcuts when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onBackToOverview();
      } else if (e.key === "/") {
        e.preventDefault();
        setChatCollapsed(false);
      }
    },
    [currentFlatIndex, progress] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!category || !topic) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">Topic not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden" data-testid="learning-interface">
      {/* Left: Curriculum Sidebar */}
      <CurriculumSidebar
        curriculum={curriculum}
        progress={progress}
        selectedTopic={selectedTopic}
        collapsed={sidebarCollapsed}
        onTopicSelect={onTopicSelect}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Center: Content Area */}
      <ContentPanel
        category={category}
        topic={topic}
        onComplete={handleComplete}
        onPrevious={goToPrevious}
        onNext={goToNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
      />

      {/* Right: AI Chat */}
      <ChatPanel
        collapsed={chatCollapsed}
        onToggle={() => setChatCollapsed((prev) => !prev)}
      />
    </div>
  );
}
