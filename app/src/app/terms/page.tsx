"use client";

import { TOS_SECTIONS, TOS_LAST_UPDATED, getTableOfContents } from "@/lib/legal";

export default function TermsPage() {
  const toc = getTableOfContents(TOS_SECTIONS);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" data-testid="terms-page">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <span className="material-icons text-primary">code</span>
            GitGood
          </a>
          <a href="/privacy" className="text-sm text-slate-500 hover:text-primary transition-colors">
            Privacy Policy
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-slate-500 mb-8" data-testid="last-updated">
          Last updated: {TOS_LAST_UPDATED}
        </p>

        {/* Table of Contents */}
        <nav className="mb-12 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" data-testid="toc">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
            Table of Contents
          </h2>
          <ol className="space-y-1">
            {toc.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-10">
          {TOS_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} data-testid={`section-${section.id}`}>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {section.title}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">
            Questions about these terms? Contact us at{" "}
            <a href="mailto:legal@gitgood.dev" className="text-primary hover:underline">
              legal@gitgood.dev
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
