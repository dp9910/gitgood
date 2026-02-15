"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import SidebarLayout from "@/components/sidebar-layout";

// ---------- Types ----------

interface CourseSummary {
  tagline: string;
  about: string;
  whyLearn: string;
  youWillLearn: string[];
  prerequisites: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  language: string;
  estimatedMinutes: number;
}

interface SummaryRecord {
  owner: string;
  name: string;
  repoUrl: string;
  summary: CourseSummary;
  generatedAt: string;
}

type PageState =
  | { phase: "loading" }
  | {
      phase: "ready";
      summary: CourseSummary;
      owner: string;
      name: string;
      hasLearningMaterial: boolean;
    }
  | { phase: "error"; message: string };

// ---------- Helpers ----------

export function parseRepoParam(
  param: string
): { owner: string; repo: string } | null {
  const dashIndex = param.indexOf("-");
  if (dashIndex <= 0 || dashIndex >= param.length - 1) return null;
  return {
    owner: param.slice(0, dashIndex),
    repo: param.slice(dashIndex + 1),
  };
}

function formatTime(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.round(minutes / 60);
    return `~${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `~${minutes} min`;
}

const DIFFICULTY_STYLES = {
  beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  intermediate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// ---------- Component ----------

export default function CoursePreviewPage() {
  const params = useParams<{ repo: string }>();
  const router = useRouter();
  const [state, setState] = useState<PageState>({ phase: "loading" });

  const parsed = params.repo ? parseRepoParam(params.repo) : null;

  useEffect(() => {
    if (!parsed) {
      setState({ phase: "error", message: "Invalid repository URL format." });
      return;
    }

    let cancelled = false;

    async function loadSummary() {
      try {
        const [summaryRes, materialsData] = await Promise.all([
          fetch("/api/course-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              owner: parsed!.owner,
              name: parsed!.repo,
            }),
          }),
          fetch("/api/materials")
            .then((r) => r.json())
            .catch(() => ({ materials: [] })),
        ]);

        if (cancelled) return;

        if (!summaryRes.ok) {
          const data = await summaryRes.json().catch(() => ({}));
          setState({
            phase: "error",
            message: data.message ?? "Failed to load course summary.",
          });
          return;
        }

        const { summary: record } = (await summaryRes.json()) as {
          summary: SummaryRecord;
        };

        const hasLearningMaterial = (materialsData.materials ?? []).some(
          (m: { owner: string; name: string }) =>
            m.owner.toLowerCase() === parsed!.owner.toLowerCase() &&
            m.name.toLowerCase() === parsed!.repo.toLowerCase()
        );

        setState({
          phase: "ready",
          summary: record.summary,
          owner: parsed!.owner,
          name: parsed!.repo,
          hasLearningMaterial,
        });
      } catch {
        if (!cancelled) {
          setState({
            phase: "error",
            message: "An unexpected error occurred.",
          });
        }
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [parsed?.owner, parsed?.repo]);

  // ---------- Loading ----------

  if (state.phase === "loading") {
    return (
      <SidebarLayout>
        <div
          className="flex flex-col items-center justify-center h-64 gap-3"
          data-testid="course-preview-loading"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-slate-500">Loading course details...</p>
        </div>
      </SidebarLayout>
    );
  }

  // ---------- Error ----------

  if (state.phase === "error") {
    return (
      <SidebarLayout>
        <div
          className="flex flex-col items-center justify-center h-64 gap-4"
          data-testid="course-preview-error"
        >
          <span className="material-icons text-4xl text-slate-400">
            error_outline
          </span>
          <p className="text-slate-500">{state.message}</p>
          <button
            onClick={() => router.push("/browse")}
            className="px-4 py-2 text-sm font-medium text-primary hover:underline"
            data-testid="back-btn"
          >
            Back to Browse
          </button>
        </div>
      </SidebarLayout>
    );
  }

  // ---------- Ready ----------

  const { summary, owner, name, hasLearningMaterial } = state;

  return (
    <SidebarLayout>
      <div data-testid="course-preview-ready" className="max-w-2xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => router.push("/browse")}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-6 transition-colors"
          data-testid="back-btn"
        >
          <span className="material-icons text-sm">arrow_back</span>
          Back to Browse
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {owner}/{name}
            </h1>
            <a
              href={`https://github.com/${owner}/${name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
              data-testid="github-link"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              View on GitHub
            </a>
            <span
              className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono"
              data-testid="language-badge"
            >
              {summary.language}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${DIFFICULTY_STYLES[summary.difficulty]}`}
              data-testid="difficulty-badge"
            >
              {summary.difficulty}
            </span>
          </div>
          <p
            className="text-lg text-slate-600 dark:text-slate-300 italic"
            data-testid="summary-tagline"
          >
            &ldquo;{summary.tagline}&rdquo;
          </p>
        </div>

        {/* About */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
            About
          </h2>
          <p
            className="text-slate-700 dark:text-slate-300 leading-relaxed"
            data-testid="summary-about"
          >
            {summary.about}
          </p>
        </section>

        {/* Why Learn */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="material-icons text-sm text-primary">
              lightbulb
            </span>
            Why Learn This?
          </h2>
          <p
            className="text-slate-700 dark:text-slate-300 leading-relaxed"
            data-testid="summary-why-learn"
          >
            {summary.whyLearn}
          </p>
        </section>

        {/* What You'll Learn */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
            What You&apos;ll Learn
          </h2>
          <ul
            className="space-y-2"
            data-testid="summary-you-will-learn"
          >
            {summary.youWillLearn.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-slate-700 dark:text-slate-300"
              >
                <span className="material-icons text-sm text-green-500 mt-0.5">
                  check_circle
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Prerequisites */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
            Prerequisites
          </h2>
          <ul
            className="space-y-1.5"
            data-testid="summary-prerequisites"
          >
            {summary.prerequisites.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm"
              >
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Meta strip */}
        <div className="flex items-center gap-4 flex-wrap mb-6">
          <span
            className="flex items-center gap-1.5 text-sm text-slate-500"
            data-testid="estimated-time"
          >
            <span className="material-icons text-sm">timer</span>
            {formatTime(summary.estimatedMinutes)}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <span className="material-icons text-sm">signal_cellular_alt</span>
            <span className="capitalize">{summary.difficulty}</span>
          </span>
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <span className="material-icons text-sm">code</span>
            {summary.language}
          </span>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push(`/learn/${owner}-${name}`)}
            className="px-8 py-3.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-base"
            data-testid="start-learning-btn"
          >
            Start Learning
            <span className="material-icons text-sm">arrow_forward</span>
          </button>

          {hasLearningMaterial && (
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1.5"
              data-testid="ready-badge"
            >
              <span className="material-icons text-xs">check_circle</span>
              Ready &mdash; Instant Access
            </span>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
