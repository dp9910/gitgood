"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import CurriculumView, { type TopicProgress, type TopicStatus } from "@/components/curriculum-view";
import ProficiencyModal, { type UserPreferences } from "@/components/proficiency-modal";
import LearningInterface, { type SelectedTopic } from "@/components/learning-interface";
import type { Curriculum } from "@/lib/curriculum-cache";

// ---------- Types ----------

type PageState =
  | { phase: "loading" }
  | { phase: "proficiency" }
  | { phase: "analyzing"; progress: number; message: string }
  | { phase: "ready"; curriculum: Curriculum }
  | { phase: "too_large"; message: string; alternatives: Alternative[] }
  | { phase: "error"; message: string };

interface Alternative {
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
}

// ---------- Helpers ----------

function parseRepoParam(param: string): { owner: string; repo: string } | null {
  // URL format: "owner-repo" (e.g., "karpathy-micrograd")
  const dashIndex = param.indexOf("-");
  if (dashIndex <= 0 || dashIndex >= param.length - 1) return null;
  return {
    owner: param.slice(0, dashIndex),
    repo: param.slice(dashIndex + 1),
  };
}

// ---------- Component ----------

export default function LearnPage() {
  const params = useParams<{ repo: string }>();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ phase: "loading" });
  const [topicProgress, setTopicProgress] = useState<TopicProgress>({});
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [activeTopic, setActiveTopic] = useState<SelectedTopic | null>(null);

  const parsed = parseRepoParam(params.repo);

  // Check cache on mount
  useEffect(() => {
    if (!parsed) {
      setState({ phase: "error", message: "Invalid repository URL format." });
      return;
    }

    async function checkForCachedCurriculum() {
      try {
        const res = await fetch("/api/check-cache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: `${parsed!.owner}/${parsed!.repo}` }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.cached) {
            // Cache hit — still need preferences for personalization
            setState({ phase: "proficiency" });
            return;
          }
        }
      } catch {
        // Network error — continue to proficiency
      }

      setState({ phase: "proficiency" });
    }

    checkForCachedCurriculum();
  }, [parsed?.owner, parsed?.repo]); // eslint-disable-line react-hooks/exhaustive-deps

  const startAnalysis = useCallback(
    async (prefs: UserPreferences) => {
      if (!parsed) return;
      setPreferences(prefs);

      setState({
        phase: "analyzing",
        progress: 10,
        message: "Fetching repository metadata...",
      });

      try {
        // Simulate progress updates
        const progressTimer = setInterval(() => {
          setState((prev) => {
            if (prev.phase !== "analyzing") return prev;
            const messages = [
              "Reading file tree...",
              "Analyzing code structure...",
              "Generating AI curriculum...",
              "Almost there...",
            ];
            const nextProgress = Math.min(prev.progress + 15, 85);
            const msgIndex = Math.floor(nextProgress / 25);
            return {
              phase: "analyzing",
              progress: nextProgress,
              message: messages[msgIndex] ?? prev.message,
            };
          });
        }, 2000);

        const res = await fetch("/api/analyze-repo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: `${parsed.owner}/${parsed.repo}`,
            preferences: prefs,
          }),
        });

        clearInterval(progressTimer);

        if (!res.ok) {
          const data = await res.json();

          if (data.error === "repo_too_large") {
            setState({
              phase: "too_large",
              message: data.message,
              alternatives: data.alternatives ?? [],
            });
            return;
          }

          setState({
            phase: "error",
            message: data.message ?? `Request failed (${res.status})`,
          });
          return;
        }

        const data = await res.json();
        const curriculum: Curriculum = data.curriculum;

        // Initialize progress map (all not_started)
        const initialProgress: TopicProgress = {};
        for (const cat of curriculum.categories) {
          for (const topic of cat.topics) {
            initialProgress[topic.name] = "not_started";
          }
        }
        setTopicProgress(initialProgress);

        setState({ phase: "ready", curriculum });
      } catch (e) {
        setState({
          phase: "error",
          message: e instanceof Error ? e.message : "An unexpected error occurred.",
        });
      }
    },
    [parsed]
  );

  function handleTopicSelect(categoryIndex: number, topicIndex: number) {
    if (state.phase !== "ready") return;
    const topic = state.curriculum.categories[categoryIndex].topics[topicIndex];
    if (topicProgress[topic.name] === "not_started") {
      setTopicProgress((prev) => ({ ...prev, [topic.name]: "in_progress" }));
    }
    setActiveTopic({ categoryIndex, topicIndex });
  }

  function handleTopicStatusChange(topicName: string, status: TopicStatus) {
    setTopicProgress((prev) => ({ ...prev, [topicName]: status }));
  }

  // ---------- Render ----------

  if (!parsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-6">
        <div className="text-center">
          <span className="material-icons text-5xl text-red-400 mb-4">error_outline</span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invalid Repository</h1>
          <p className="text-slate-500 mb-6">The URL format is not recognized.</p>
          <button
            onClick={() => router.push("/")}
            className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight"
          >
            <span className="material-icons">code</span>
            <span>GitGood</span>
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-sm font-medium text-slate-500">
            {parsed.owner}/{parsed.repo}
          </span>
        </div>
      </header>

      {/* Three-panel learning interface (full viewport) */}
      {state.phase === "ready" && activeTopic && (
        <LearningInterface
          curriculum={state.curriculum}
          progress={topicProgress}
          selectedTopic={activeTopic}
          onTopicSelect={handleTopicSelect}
          onTopicStatusChange={handleTopicStatusChange}
          onBackToOverview={() => setActiveTopic(null)}
        />
      )}

      {/* Main Content (non-learning states) */}
      <main className={`${state.phase === "ready" && activeTopic ? "hidden" : "p-6 md:p-8"}`}>
        {/* Proficiency Modal */}
        {state.phase === "proficiency" && (
          <ProficiencyModal
            onComplete={startAnalysis}
            onCancel={() => router.push("/")}
          />
        )}

        {/* Loading State */}
        {state.phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-primary animate-spin mb-6" />
            <p className="text-slate-500 font-medium">Checking for existing curriculum...</p>
          </div>
        )}

        {/* Analyzing State */}
        {state.phase === "analyzing" && (
          <div className="max-w-lg mx-auto py-16">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center">
              <div className="relative mb-8 inline-block">
                <div className="w-20 h-20 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center">
                  <span className="material-icons text-primary text-4xl animate-pulse">psychology</span>
                </div>
                <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Analyzing Repository
              </h2>
              <p className="text-slate-500 mb-6">{state.message}</p>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-3">
                {parsed.owner}/{parsed.repo}
              </p>
            </div>
          </div>
        )}

        {/* Curriculum Ready — overview or learning interface */}
        {state.phase === "ready" && !activeTopic && (
          <CurriculumView
            curriculum={state.curriculum}
            progress={topicProgress}
            onTopicSelect={handleTopicSelect}
            onTopicStatusChange={handleTopicStatusChange}
          />
        )}

        {/* Too Large */}
        {state.phase === "too_large" && (
          <div className="max-w-lg mx-auto py-16">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center">
              <span className="material-icons text-5xl text-amber-400 mb-4">warning</span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Repository Too Large
              </h2>
              <p className="text-slate-500 mb-6">{state.message}</p>
              {state.alternatives.length > 0 && (
                <div className="text-left space-y-3 mb-6">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Try these instead
                  </h3>
                  {state.alternatives.map((alt) => (
                    <button
                      key={alt.fullName}
                      onClick={() => {
                        const [owner, repo] = alt.fullName.split("/");
                        router.push(`/learn/${owner}-${repo}`);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div>
                        <span className="font-medium text-sm text-slate-900 dark:text-white">
                          {alt.fullName}
                        </span>
                        {alt.description && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                            {alt.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <span className="material-icons text-xs text-amber-400">star</span>
                        {alt.stars.toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => router.push("/")}
                className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Try Another Repo
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {state.phase === "error" && (
          <div className="max-w-lg mx-auto py-16">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center">
              <span className="material-icons text-5xl text-red-400 mb-4">error_outline</span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Something Went Wrong
              </h2>
              <p className="text-slate-500 mb-6">{state.message}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setState({ phase: "proficiency" });
                  }}
                  className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="border border-slate-200 dark:border-slate-700 px-6 py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export { parseRepoParam };
