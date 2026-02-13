"use client";

import { useState, useMemo } from "react";
import type { Note, Bookmark } from "@/lib/notes";
import {
  getNotes,
  getBookmarks,
  deleteNote,
  deleteBookmark,
  searchNotesAndBookmarks,
} from "@/lib/notes";

// ---------- Types ----------

export interface BookmarksViewProps {
  repoOwner: string;
  repoName: string;
  onNavigateToTopic?: (topicName: string) => void;
}

type Tab = "bookmarks" | "notes";

// ---------- Component ----------

export default function BookmarksView({
  repoOwner,
  repoName,
  onNavigateToTopic,
}: BookmarksViewProps) {
  const [tab, setTab] = useState<Tab>("bookmarks");
  const [query, setQuery] = useState("");
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>(() =>
    getBookmarks(repoOwner, repoName)
  );
  const [allNotes, setAllNotes] = useState<Note[]>(() =>
    getNotes(repoOwner, repoName)
  );

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return { notes: allNotes, bookmarks: allBookmarks };
    }
    return searchNotesAndBookmarks(repoOwner, repoName, query);
  }, [query, allNotes, allBookmarks, repoOwner, repoName]);

  function handleDeleteBookmark(id: string) {
    deleteBookmark(repoOwner, repoName, id);
    setAllBookmarks(getBookmarks(repoOwner, repoName));
  }

  function handleDeleteNote(id: string) {
    deleteNote(repoOwner, repoName, id);
    setAllNotes(getNotes(repoOwner, repoName));
  }

  const items = tab === "bookmarks" ? filtered.bookmarks : filtered.notes;

  return (
    <div className="max-w-3xl mx-auto" data-testid="bookmarks-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Bookmarks & Notes
        </h2>
        <span className="text-xs text-slate-400">
          {repoOwner}/{repoName}
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes and bookmarks..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          data-testid="search-input"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
        <button
          onClick={() => setTab("bookmarks")}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "bookmarks"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
          data-testid="tab-bookmarks"
        >
          Bookmarks ({filtered.bookmarks.length})
        </button>
        <button
          onClick={() => setTab("notes")}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "notes"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
          data-testid="tab-notes"
        >
          Notes ({filtered.notes.length})
        </button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-12" data-testid="empty-state">
          <span className="material-icons text-4xl text-slate-300 dark:text-slate-600 mb-3">
            {tab === "bookmarks" ? "bookmark_border" : "note"}
          </span>
          <p className="text-sm text-slate-400">
            {query
              ? `No ${tab} matching "${query}"`
              : `No ${tab} yet. Start learning to add some!`}
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="items-list">
          {tab === "bookmarks"
            ? filtered.bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-sm transition-shadow"
                  data-testid="bookmark-item"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons text-amber-500 text-sm">
                          bookmark
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {bm.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">
                        {bm.categoryName} &gt; {bm.topicName}
                      </p>
                      {bm.comment && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {bm.comment}
                        </p>
                      )}
                      {bm.codeSnippet && (
                        <pre className="mt-2 p-2 rounded bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 overflow-x-auto">
                          {bm.codeSnippet}
                        </pre>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {onNavigateToTopic && (
                        <button
                          onClick={() => onNavigateToTopic(bm.topicName)}
                          className="p-1 text-slate-400 hover:text-primary transition-colors"
                          title="Go to topic"
                          data-testid="goto-topic-btn"
                        >
                          <span className="material-icons text-sm">
                            open_in_new
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteBookmark(bm.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        data-testid="delete-bookmark-btn"
                      >
                        <span className="material-icons text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400">
                    {new Date(bm.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            : filtered.notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-sm transition-shadow"
                  data-testid="note-item"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons text-primary text-sm">
                          description
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {note.topicName}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">
                        {note.categoryName}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {onNavigateToTopic && (
                        <button
                          onClick={() => onNavigateToTopic(note.topicName)}
                          className="p-1 text-slate-400 hover:text-primary transition-colors"
                          title="Go to topic"
                          data-testid="goto-topic-btn"
                        >
                          <span className="material-icons text-sm">
                            open_in_new
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        data-testid="delete-note-btn"
                      >
                        <span className="material-icons text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
