"use client";

import { useState, useEffect } from "react";
import type { Note } from "@/lib/notes";
import {
  getNotesForTopic,
  saveNote,
  updateNote,
  deleteNote,
  addBookmark,
  isBookmarked,
  deleteBookmark,
  getBookmarks,
} from "@/lib/notes";

// ---------- Types ----------

export interface NotesEditorProps {
  repoOwner: string;
  repoName: string;
  topicName: string;
  categoryName: string;
}

// ---------- Component ----------

export default function NotesEditor({
  repoOwner,
  repoName,
  topicName,
  categoryName,
}: NotesEditorProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setNotes(getNotesForTopic(repoOwner, repoName, topicName));
    setBookmarked(isBookmarked(repoOwner, repoName, topicName));
    setIsEditing(false);
    setEditingId(null);
    setDraft("");
  }, [repoOwner, repoName, topicName]);

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    if (editingId) {
      updateNote(repoOwner, repoName, editingId, trimmed);
    } else {
      saveNote(repoOwner, repoName, {
        topicName,
        categoryName,
        content: trimmed,
      });
    }

    setNotes(getNotesForTopic(repoOwner, repoName, topicName));
    setIsEditing(false);
    setEditingId(null);
    setDraft("");
  }

  function handleEdit(note: Note) {
    setEditingId(note.id);
    setDraft(note.content);
    setIsEditing(true);
  }

  function handleDelete(noteId: string) {
    deleteNote(repoOwner, repoName, noteId);
    setNotes(getNotesForTopic(repoOwner, repoName, topicName));
  }

  function handleToggleBookmark() {
    if (bookmarked) {
      const bms = getBookmarks(repoOwner, repoName);
      const bm = bms.find((b) => b.topicName === topicName);
      if (bm) deleteBookmark(repoOwner, repoName, bm.id);
    } else {
      addBookmark(repoOwner, repoName, {
        title: topicName,
        topicName,
        categoryName,
        comment: "",
      });
    }
    setBookmarked(!bookmarked);
  }

  return (
    <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-6" data-testid="notes-editor">
      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-4">
        {!isEditing && (
          <button
            onClick={() => {
              setIsEditing(true);
              setEditingId(null);
              setDraft("");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            data-testid="add-note-btn"
          >
            <span className="material-icons text-sm">edit_note</span>
            Add Note
          </button>
        )}
        <button
          onClick={handleToggleBookmark}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            bookmarked
              ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
              : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
          data-testid="bookmark-btn"
        >
          <span className="material-icons text-sm">
            {bookmarked ? "bookmark" : "bookmark_border"}
          </span>
          {bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
      </div>

      {/* Editor */}
      {isEditing && (
        <div className="mb-4 space-y-2" data-testid="note-form">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write your note (markdown supported)..."
            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            rows={4}
            data-testid="note-textarea"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!draft.trim()}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              data-testid="save-note-btn"
            >
              {editingId ? "Update" : "Save Note"}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditingId(null);
                setDraft("");
              }}
              className="px-4 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              data-testid="cancel-note-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length > 0 && (
        <div className="space-y-3" data-testid="notes-list">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Your Notes ({notes.length})
          </h4>
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              data-testid="note-item"
            >
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {note.content}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-slate-400">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(note)}
                    className="p-1 text-slate-400 hover:text-primary transition-colors"
                    data-testid="edit-note-btn"
                  >
                    <span className="material-icons text-sm">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    data-testid="delete-note-btn"
                  >
                    <span className="material-icons text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
