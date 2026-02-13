"use client";

import { useState } from "react";
import type { Quiz, QuizResult } from "@/lib/quiz";
import { scoreQuiz } from "@/lib/quiz";

// ---------- Types ----------

export interface QuizModalProps {
  quiz: Quiz;
  onClose: () => void;
  onComplete: (result: QuizResult) => void;
}

// ---------- Component ----------

export default function QuizModal({ quiz, onClose, onComplete }: QuizModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const question = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const selectedLabel = answers[currentIndex];
  const isLast = currentIndex === totalQuestions - 1;

  function handleSelect(label: string) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [currentIndex]: label }));
  }

  function handleNext() {
    if (isLast) {
      // Submit and show results
      const quizResult = scoreQuiz(quiz, answers);
      setResult(quizResult);
      setSubmitted(true);
      onComplete(quizResult);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function handleRetake() {
    setCurrentIndex(0);
    setAnswers({});
    setSubmitted(false);
    setResult(null);
  }

  // ---------- Results Screen ----------

  if (submitted && result) {
    const percentage = Math.round((result.score / result.total) * 100);
    const emoji = percentage >= 80 ? "🎉" : percentage >= 60 ? "👍" : "📚";

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        data-testid="quiz-modal"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Knowledge Check: {quiz.topicName}
            </h2>
          </div>

          {/* Score */}
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">{emoji}</div>
            <h3
              className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2"
              data-testid="quiz-score"
            >
              {result.score}/{result.total} Correct!
            </h3>
            <p className="text-slate-500 text-sm">
              {percentage >= 80
                ? "Excellent work! You've mastered this topic."
                : percentage >= 60
                ? "Good job! Review the questions you missed."
                : "Keep learning! Review the explanations below."}
            </p>
          </div>

          {/* Wrong answers review */}
          {result.answers.some((a) => !a.correct) && (
            <div className="px-6 pb-4" data-testid="wrong-answers">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Review Incorrect Answers
              </h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {result.answers
                  .filter((a) => !a.correct)
                  .map((a) => {
                    const q = quiz.questions[a.questionIndex];
                    return (
                      <div
                        key={a.questionIndex}
                        className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20"
                      >
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          {q.question}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Your answer: {a.selectedLabel || "—"} • Correct: {q.correctLabel}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {q.explanation}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              onClick={handleRetake}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              data-testid="retake-btn"
            >
              Retake Quiz
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
              data-testid="continue-btn"
            >
              Continue Learning
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Question Screen ----------

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="quiz-modal"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Knowledge Check: {quiz.topicName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            aria-label="Close quiz"
          >
            <span className="material-icons text-slate-400 text-sm">close</span>
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
          </div>
          <div className="flex gap-1.5 mb-6">
            {quiz.questions.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  idx < currentIndex
                    ? "bg-primary"
                    : idx === currentIndex
                    ? "bg-primary/50"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question */}
        <div className="px-6 pb-4">
          <p className="text-base font-medium text-slate-900 dark:text-white mb-6">
            {question.question}
          </p>

          {/* Options */}
          <div className="space-y-3" data-testid="quiz-options">
            {question.options.map((option) => {
              const isSelected = selectedLabel === option.label;

              return (
                <button
                  key={option.label}
                  onClick={() => handleSelect(option.label)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                  data-testid={`option-${option.label}`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleNext}
            disabled={!selectedLabel}
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2"
            data-testid="next-btn"
          >
            {isLast ? "Submit" : "Next Question"}
            <span className="material-icons text-sm">
              {isLast ? "check" : "arrow_forward"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
