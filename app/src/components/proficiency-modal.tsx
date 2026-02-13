"use client";

import { useState } from "react";

// ---------- Types ----------

export type ExperienceLevel = "novice" | "intermediate" | "expert";
export type LearningGoal = "understand" | "build" | "deep-dive" | "overview";
export type TimeCommitment = "light" | "moderate" | "marathon";

export interface UserPreferences {
  level: ExperienceLevel;
  goal: LearningGoal;
  timeCommitment: TimeCommitment;
}

interface Option<T extends string> {
  value: T;
  icon: string;
  label: string;
  description: string;
}

// ---------- Question definitions ----------

const EXPERIENCE_OPTIONS: Option<ExperienceLevel>[] = [
  {
    value: "novice",
    icon: "eco",
    label: "Novice",
    description: "New to programming or this topic",
  },
  {
    value: "intermediate",
    icon: "work",
    label: "Intermediate",
    description: "Some coding experience, comfortable reading code",
  },
  {
    value: "expert",
    icon: "rocket_launch",
    label: "Expert",
    description: "Experienced developer, want deep internals",
  },
];

const GOAL_OPTIONS: Option<LearningGoal>[] = [
  {
    value: "understand",
    icon: "lightbulb",
    label: "Understand Concepts",
    description: "Grasp the ideas and patterns behind the code",
  },
  {
    value: "build",
    icon: "construction",
    label: "Build Something Similar",
    description: "Learn enough to create my own version",
  },
  {
    value: "deep-dive",
    icon: "search",
    label: "Deep Dive",
    description: "Understand every implementation detail",
  },
  {
    value: "overview",
    icon: "speed",
    label: "Quick Overview",
    description: "Get the gist in under an hour",
  },
];

const TIME_OPTIONS: Option<TimeCommitment>[] = [
  {
    value: "light",
    icon: "coffee",
    label: "15-30 min/day",
    description: "Casual pace, a few topics per session",
  },
  {
    value: "moderate",
    icon: "schedule",
    label: "1-2 hours/day",
    description: "Steady progress, finish in 1-2 weeks",
  },
  {
    value: "marathon",
    icon: "bolt",
    label: "3+ hours/day",
    description: "Intensive learning, finish as fast as possible",
  },
];

// ---------- Props ----------

interface ProficiencyModalProps {
  onComplete: (preferences: UserPreferences) => void;
  onCancel?: () => void;
}

// ---------- Component ----------

export default function ProficiencyModal({
  onComplete,
  onCancel,
}: ProficiencyModalProps) {
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [time, setTime] = useState<TimeCommitment | null>(null);

  const totalSteps = 3;

  function handleNext() {
    if (step === 0 && level) {
      setStep(1);
    } else if (step === 1 && goal) {
      setStep(2);
    } else if (step === 2 && time) {
      onComplete({ level: level!, goal: goal!, timeCommitment: time! });
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  const currentSelection = step === 0 ? level : step === 1 ? goal : time;

  const questions = [
    {
      title: "What's your experience level?",
      subtitle: "We'll adjust explanations to match your background.",
      options: EXPERIENCE_OPTIONS,
      value: level,
      onChange: setLevel as (v: string) => void,
    },
    {
      title: "What's your learning goal?",
      subtitle: "This shapes the depth and focus of your curriculum.",
      options: GOAL_OPTIONS,
      value: goal,
      onChange: setGoal as (v: string) => void,
    },
    {
      title: "How much time can you commit?",
      subtitle: "We'll size the curriculum to fit your schedule.",
      options: TIME_OPTIONS,
      value: time,
      onChange: setTime as (v: string) => void,
    },
  ];

  const q = questions[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-primary rounded-r-full transition-all duration-300 ease-out"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step
                    ? "bg-primary"
                    : i < step
                    ? "bg-primary/40"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
            <span className="ml-2 text-xs text-slate-400 font-medium">
              {step + 1} of {totalSteps}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-1">
            {q.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">
            {q.subtitle}
          </p>

          {/* Options */}
          <div className="space-y-3">
            {q.options.map((opt) => {
              const selected = q.value === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => q.onChange(opt.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      selected
                        ? "bg-primary/10 text-primary"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="material-icons text-xl">{opt.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {opt.label}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {opt.description}
                    </div>
                  </div>
                  {selected && (
                    <span className="material-icons text-primary text-xl shrink-0">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={step === 0 ? onCancel : handleBack}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              {step === 0 ? "Cancel" : "Back"}
            </button>
            <button
              onClick={handleNext}
              disabled={!currentSelection}
              className="bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
              {step === totalSteps - 1 ? "Start Learning" : "Next"}
              <span className="material-icons text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
