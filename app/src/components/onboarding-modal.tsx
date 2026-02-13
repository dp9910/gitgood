"use client";

import { useState } from "react";

// ---------- Types ----------

export interface OnboardingModalProps {
  onComplete: (options?: { createRepo?: boolean }) => void;
  onSkip: () => void;
}

const STEPS = [
  {
    icon: "link",
    title: "Paste any GitHub repo URL",
    description:
      "Start learning from any public GitHub repository. We'll analyze its structure and create a personalized curriculum just for you.",
    tip: 'Try starting with karpathy/micrograd — perfect for beginners!',
  },
  {
    icon: "tune",
    title: "Personalize your learning path",
    description:
      "Answer a few quick questions about your experience level, goals, and time commitment. We'll tailor the curriculum to match.",
    tip: "You can change your preferences anytime in Settings.",
  },
  {
    icon: "school",
    title: "Learn with AI-powered tools",
    description:
      "Get AI explanations at your level, take quizzes to test your knowledge, and tackle coding challenges — all powered by your daily credits.",
    tip: "Use quick actions like 'Quiz me' and 'ELI5' for focused learning.",
  },
  {
    icon: "cloud_upload",
    title: "Save your progress",
    description:
      "We can create a private GitHub repo called gitgood-learning to save your progress, notes, and achievements. This is optional — you can always set it up later.",
    tip: "Your progress repo is private and only you can see it.",
  },
] as const;

// ---------- Component ----------

export default function OnboardingModal({
  onComplete,
  onSkip,
}: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [repoLoading, setRepoLoading] = useState(false);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function handleComplete(createRepo: boolean) {
    if (isLast) {
      setRepoLoading(true);
      try {
        onComplete({ createRepo });
      } finally {
        setRepoLoading(false);
      }
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="onboarding-modal"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary">
            Welcome to GitGood!
          </h2>
          <button
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            data-testid="skip-btn"
          >
            Skip
          </button>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 pt-4">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === step
                  ? "bg-primary"
                  : idx < step
                  ? "bg-primary/40"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <span className="material-icons text-3xl text-primary">
              {current.icon}
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
            {current.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            {current.description}
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <span className="material-icons text-sm text-amber-500">
              tips_and_updates
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {current.tip}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-0 transition-all"
            data-testid="back-btn"
          >
            Back
          </button>

          {isLast ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleComplete(false)}
                disabled={repoLoading}
                className="px-4 py-2.5 text-slate-500 font-medium text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                data-testid="skip-repo-btn"
              >
                Skip for now
              </button>
              <button
                onClick={() => handleComplete(true)}
                disabled={repoLoading}
                className="px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                data-testid="create-repo-btn"
              >
                {repoLoading ? "Creating..." : "Create Repo"}
                <span className="material-icons text-sm">cloud_upload</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              data-testid="next-btn"
            >
              Next
              <span className="material-icons text-sm">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Hook: first-time detection ----------

const ONBOARDING_KEY = "gitgood_onboarding_complete";

export function useOnboarding() {
  const isComplete = (): boolean => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  };

  const markComplete = (): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ONBOARDING_KEY, "true");
  };

  return { isComplete, markComplete };
}

export { ONBOARDING_KEY, STEPS };
