"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  async function handleGitHubLogin() {
    setError("");
    setSigningIn(true);
    try {
      await login();
      router.replace("/dashboard");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Sign-in failed. Please try again.";
      // Firebase popup closed by user
      if (message.includes("popup-closed")) {
        setError("Sign-in popup was closed. Please try again.");
      } else {
        setError(message);
      }
      setSigningIn(false);
    }
  }

  // Show nothing while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-primary animate-spin" />
      </div>
    );
  }

  // Already logged in — will redirect
  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="h-16 flex items-center px-6">
        <a
          href="/"
          className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight"
        >
          <span className="material-icons">code</span>
          <span>GitGood</span>
        </a>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 -mt-16">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-8">
            {/* Logo + heading */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <span className="material-icons text-3xl">code</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Welcome to GitGood
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Sign in to start learning from any GitHub repository
              </p>
            </div>

            {/* GitHub sign-in button */}
            <button
              onClick={handleGitHubLogin}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-60 text-white dark:text-slate-900 px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {signingIn ? (
                <>
                  <span className="w-5 h-5 rounded-full border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Continue with GitHub
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 text-center">
                  {error}
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-center text-slate-400 dark:text-slate-500 leading-relaxed">
                By signing in, you agree to our{" "}
                <a href="/terms" className="underline hover:text-slate-600 dark:hover:text-slate-300">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="underline hover:text-slate-600 dark:hover:text-slate-300">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>

          {/* Back link */}
          <p className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              &larr; Back to home
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
