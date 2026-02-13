"use client";

import { useState } from "react";
import { parseRepoUrl } from "@/lib/github";

const EXAMPLE_REPOS = [
  { name: "karpathy/micrograd", label: "micrograd", stars: "6.8k" },
  { name: "facebook/react", label: "React", stars: "215k" },
  { name: "karpathy/nanoGPT", label: "nanoGPT", stars: "28k" },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: "link",
    title: "Paste a Repo",
    description: "Any public GitHub repository or gist. Drop the URL and go.",
  },
  {
    step: 2,
    icon: "psychology",
    title: "AI Builds Your Path",
    description:
      "AI analyzes the codebase and generates a personalized curriculum for your level.",
  },
  {
    step: 3,
    icon: "rocket_launch",
    title: "Learn Interactively",
    description:
      "Work through lessons, quizzes, and code challenges with an AI tutor by your side.",
  },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a GitHub repository URL.");
      return;
    }

    const parsed = parseRepoUrl(trimmed);
    if (!parsed) {
      setError("Invalid URL. Please enter a valid github.com/owner/repo link.");
      return;
    }

    setLoading(true);
    // Navigate to learning page (will be built in later phase)
    window.location.href = `/learn/${parsed.owner}-${parsed.repo}`;
  }

  function handleExample(repoShorthand: string) {
    setUrl(`https://github.com/${repoShorthand}`);
    setError("");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <span className="material-icons">code</span>
            <span>GitGood</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#how-it-works" className="hover:text-primary transition-colors">
              How It Works
            </a>
            <a href="/browse" className="hover:text-primary transition-colors">
              Browse Repos
            </a>
          </nav>
          <a
            href="/login"
            className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Start Learning
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
            Learn Anything on{" "}
            <span className="text-primary">GitHub</span>
          </h1>
          <p className="mt-4 text-xl text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Turn any repository into a personalized AI-powered course
          </p>

          {/* URL Input */}
          <form onSubmit={handleSubmit} className="mt-10 max-w-2xl mx-auto">
            <div
              className={`flex items-center bg-white dark:bg-slate-900 border-2 rounded-xl shadow-lg transition-colors ${
                error
                  ? "border-error"
                  : "border-slate-200 dark:border-slate-700 focus-within:border-primary"
              }`}
            >
              <span className="pl-4 text-slate-400 material-icons text-xl">
                link
              </span>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Paste any GitHub URL... (try: github.com/karpathy/micrograd)"
                className="flex-1 px-3 py-4 bg-transparent text-base outline-none placeholder-slate-400 dark:text-white"
              />
              <button
                type="submit"
                disabled={loading}
                className="mr-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white px-6 py-3 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shrink-0"
              >
                {loading ? (
                  <>
                    <span className="animate-spin material-icons text-sm">progress_activity</span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    Start Learning
                    <span className="material-icons text-sm">arrow_forward</span>
                  </>
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="mt-2 text-sm text-error text-left pl-1">{error}</p>
            )}
          </form>

          {/* Example repos */}
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-sm text-slate-400">Try:</span>
            {EXAMPLE_REPOS.map((repo) => (
              <button
                key={repo.name}
                onClick={() => handleExample(repo.name)}
                className="text-sm px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary transition-colors"
              >
                {repo.label}
              </button>
            ))}
          </div>

          {/* Social proof */}
          <p className="mt-6 text-sm text-slate-400">
            Free forever &middot; No credit card &middot; 847 developers learning
          </p>
        </section>

        {/* Popular repos */}
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {EXAMPLE_REPOS.map((repo) => (
              <button
                key={repo.name}
                onClick={() => handleExample(repo.name)}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all text-left"
              >
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                  <span className="material-icons text-xs">star</span>
                  <span>{repo.stars}</span>
                </div>
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                  {repo.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Learn {repo.label} with an AI-generated curriculum
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-6 py-20">
            <h2 className="text-3xl font-bold text-center mb-16 text-slate-900 dark:text-white">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    <span className="material-icons">{item.icon}</span>
                  </div>
                  <div className="text-xs font-bold text-primary mb-2">
                    STEP {item.step}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">
            Ready to level up?
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Stop starring repos you&apos;ll &quot;learn later.&quot; Start learning now.
          </p>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-xl text-lg font-bold transition-colors shadow-lg shadow-primary/20"
          >
            Get Started
            <span className="material-icons">arrow_forward</span>
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="material-icons text-sm">code</span>
            <span>GitGood</span>
            <span>&middot;</span>
            <span>Learn Anything on GitHub</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="/terms" className="hover:text-slate-600 transition-colors">
              Terms
            </a>
            <a href="/privacy" className="hover:text-slate-600 transition-colors">
              Privacy
            </a>
            <a
              href="https://github.com/gitgood-platform"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
