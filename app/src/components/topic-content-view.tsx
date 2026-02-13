"use client";

import { useState, useEffect, useCallback } from "react";

// ---------- Types ----------

export interface TopicContentViewProps {
  repoOwner: string;
  repoName: string;
  topicName: string;
  categoryName: string;
  subtopics: string[];
  level: string;
  repoLanguage: string;
}

type ContentState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; content: string; level: string }
  | { status: "error"; message: string };

// ---------- Simple Markdown Renderer ----------

/**
 * Minimal markdown-to-HTML renderer for educational content.
 * Handles: headings, code blocks, inline code, bold, italic, lists, paragraphs.
 */
function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeLines: string[] = [];
  let inList = false;

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function processInline(text: string): string {
    let result = escapeHtml(text);
    // Bold
    result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic
    result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
    // Inline code
    result = result.replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-primary">$1</code>');
    return result;
  }

  for (const line of lines) {
    // Code block toggle
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html.push(
          `<div class="my-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">` +
          `<div class="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800">` +
          `<span class="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest">${escapeHtml(codeBlockLang || "code")}</span>` +
          `</div>` +
          `<pre class="p-4 bg-slate-900 text-slate-300 font-mono text-sm leading-6 overflow-x-auto"><code>${codeLines.join("\n")}</code></pre>` +
          `</div>`
        );
        codeLines = [];
        inCodeBlock = false;
        codeBlockLang = "";
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(escapeHtml(line));
      continue;
    }

    // Close list if needed
    if (inList && !line.startsWith("- ") && !line.startsWith("* ") && !line.match(/^\d+\. /)) {
      html.push("</ul>");
      inList = false;
    }

    // Headings
    if (line.startsWith("### ")) {
      html.push(`<h3 class="text-lg font-bold mt-8 mb-3 text-slate-900 dark:text-white">${processInline(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      html.push(`<h2 class="text-xl font-bold mt-8 mb-4 text-slate-900 dark:text-white">${processInline(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      html.push(`<h1 class="text-2xl font-bold mt-6 mb-4 text-slate-900 dark:text-white">${processInline(line.slice(2))}</h1>`);
    }
    // List items
    else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        html.push('<ul class="list-disc pl-6 space-y-1 mb-4">');
        inList = true;
      }
      html.push(`<li class="text-slate-600 dark:text-slate-400">${processInline(line.slice(2))}</li>`);
    } else if (line.match(/^\d+\. /)) {
      if (!inList) {
        html.push('<ul class="list-decimal pl-6 space-y-1 mb-4">');
        inList = true;
      }
      html.push(`<li class="text-slate-600 dark:text-slate-400">${processInline(line.replace(/^\d+\. /, ""))}</li>`);
    }
    // Empty line
    else if (line.trim() === "") {
      // Skip
    }
    // Paragraph
    else {
      html.push(`<p class="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">${processInline(line)}</p>`);
    }
  }

  if (inList) html.push("</ul>");

  return html.join("\n");
}

// ---------- Component ----------

export default function TopicContentView({
  repoOwner,
  repoName,
  topicName,
  categoryName,
  subtopics,
  level,
  repoLanguage,
}: TopicContentViewProps) {
  const [state, setState] = useState<ContentState>({ status: "idle" });
  const [currentLevel, setCurrentLevel] = useState(level);

  const fetchContent = useCallback(
    async (targetLevel: string) => {
      setState({ status: "loading" });
      setCurrentLevel(targetLevel);

      try {
        const res = await fetch("/api/topic-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoOwner,
            repoName,
            topicName,
            categoryName,
            subtopics,
            level: targetLevel,
            repoLanguage,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setState({
            status: "error",
            message: data.message ?? `Failed to load content (${res.status})`,
          });
          return;
        }

        const data = await res.json();
        setState({ status: "ready", content: data.content, level: data.level });
      } catch (e) {
        setState({
          status: "error",
          message:
            e instanceof Error ? e.message : "Failed to load content",
        });
      }
    },
    [repoOwner, repoName, topicName, categoryName, subtopics, repoLanguage]
  );

  // Fetch on mount and when topic changes
  useEffect(() => {
    fetchContent(currentLevel);
  }, [topicName]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextLevel =
    currentLevel === "beginner"
      ? "intermediate"
      : currentLevel === "intermediate"
      ? "expert"
      : null;

  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="py-12 text-center" data-testid="content-loading">
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-primary animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-400">Generating content...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="py-12 text-center" data-testid="content-error">
        <span className="material-icons text-3xl text-red-400 mb-3">error_outline</span>
        <p className="text-sm text-slate-500 mb-4">{state.message}</p>
        <button
          onClick={() => fetchContent(currentLevel)}
          className="text-sm text-primary font-medium hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div data-testid="topic-content">
      {/* Level indicator */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Explanation Level:
        </span>
        {["beginner", "intermediate", "expert"].map((lvl) => (
          <button
            key={lvl}
            onClick={() => {
              if (lvl !== currentLevel) fetchContent(lvl);
            }}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              lvl === currentLevel
                ? "bg-primary text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
          </button>
        ))}
      </div>

      {/* Rendered content */}
      <div
        className="prose-custom"
        data-testid="rendered-content"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(state.content) }}
      />

      {/* Explain more button */}
      {nextLevel && (
        <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-icons text-primary">lightbulb</span>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Want more depth?
              </p>
              <p className="text-xs text-slate-500">
                Load the {nextLevel} level explanation
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchContent(nextLevel)}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Explain More
          </button>
        </div>
      )}
    </div>
  );
}

export { renderMarkdown };
