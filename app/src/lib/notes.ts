/**
 * Notes & bookmarks storage utilities.
 * Uses localStorage for persistence with per-repo namespacing.
 */

// ---------- Types ----------

export interface Note {
  id: string;
  topicName: string;
  categoryName: string;
  content: string; // markdown
  createdAt: number;
  updatedAt: number;
}

export interface Bookmark {
  id: string;
  title: string;
  topicName: string;
  categoryName: string;
  comment: string;
  codeSnippet?: string;
  githubUrl?: string;
  createdAt: number;
}

// ---------- Storage Keys ----------

function notesKey(repoOwner: string, repoName: string): string {
  return `gitgood_notes_${repoOwner}_${repoName}`;
}

function bookmarksKey(repoOwner: string, repoName: string): string {
  return `gitgood_bookmarks_${repoOwner}_${repoName}`;
}

// ---------- Notes CRUD ----------

export function getNotes(repoOwner: string, repoName: string): Note[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(notesKey(repoOwner, repoName));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Note[];
  } catch {
    return [];
  }
}

export function getNotesForTopic(
  repoOwner: string,
  repoName: string,
  topicName: string
): Note[] {
  return getNotes(repoOwner, repoName).filter(
    (n) => n.topicName === topicName
  );
}

export function saveNote(
  repoOwner: string,
  repoName: string,
  note: Omit<Note, "id" | "createdAt" | "updatedAt">
): Note {
  const notes = getNotes(repoOwner, repoName);
  const now = Date.now();
  const newNote: Note = {
    ...note,
    id: `note_${now}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  notes.push(newNote);
  localStorage.setItem(notesKey(repoOwner, repoName), JSON.stringify(notes));
  return newNote;
}

export function updateNote(
  repoOwner: string,
  repoName: string,
  noteId: string,
  content: string
): Note | null {
  const notes = getNotes(repoOwner, repoName);
  const idx = notes.findIndex((n) => n.id === noteId);
  if (idx === -1) return null;
  notes[idx] = { ...notes[idx], content, updatedAt: Date.now() };
  localStorage.setItem(notesKey(repoOwner, repoName), JSON.stringify(notes));
  return notes[idx];
}

export function deleteNote(
  repoOwner: string,
  repoName: string,
  noteId: string
): boolean {
  const notes = getNotes(repoOwner, repoName);
  const filtered = notes.filter((n) => n.id !== noteId);
  if (filtered.length === notes.length) return false;
  localStorage.setItem(
    notesKey(repoOwner, repoName),
    JSON.stringify(filtered)
  );
  return true;
}

// ---------- Bookmarks CRUD ----------

export function getBookmarks(repoOwner: string, repoName: string): Bookmark[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(bookmarksKey(repoOwner, repoName));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Bookmark[];
  } catch {
    return [];
  }
}

export function addBookmark(
  repoOwner: string,
  repoName: string,
  bookmark: Omit<Bookmark, "id" | "createdAt">
): Bookmark {
  const bookmarks = getBookmarks(repoOwner, repoName);
  const now = Date.now();
  const newBookmark: Bookmark = {
    ...bookmark,
    id: `bm_${now}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
  };
  bookmarks.push(newBookmark);
  localStorage.setItem(
    bookmarksKey(repoOwner, repoName),
    JSON.stringify(bookmarks)
  );
  return newBookmark;
}

export function deleteBookmark(
  repoOwner: string,
  repoName: string,
  bookmarkId: string
): boolean {
  const bookmarks = getBookmarks(repoOwner, repoName);
  const filtered = bookmarks.filter((b) => b.id !== bookmarkId);
  if (filtered.length === bookmarks.length) return false;
  localStorage.setItem(
    bookmarksKey(repoOwner, repoName),
    JSON.stringify(filtered)
  );
  return true;
}

export function isBookmarked(
  repoOwner: string,
  repoName: string,
  topicName: string
): boolean {
  return getBookmarks(repoOwner, repoName).some(
    (b) => b.topicName === topicName
  );
}

// ---------- Search ----------

export function searchNotesAndBookmarks(
  repoOwner: string,
  repoName: string,
  query: string
): { notes: Note[]; bookmarks: Bookmark[] } {
  const q = query.toLowerCase().trim();
  if (!q) return { notes: [], bookmarks: [] };

  const notes = getNotes(repoOwner, repoName).filter(
    (n) =>
      n.content.toLowerCase().includes(q) ||
      n.topicName.toLowerCase().includes(q) ||
      n.categoryName.toLowerCase().includes(q)
  );

  const bookmarks = getBookmarks(repoOwner, repoName).filter(
    (b) =>
      b.title.toLowerCase().includes(q) ||
      b.comment.toLowerCase().includes(q) ||
      b.topicName.toLowerCase().includes(q) ||
      b.categoryName.toLowerCase().includes(q) ||
      (b.codeSnippet?.toLowerCase().includes(q) ?? false)
  );

  return { notes, bookmarks };
}

// ---------- Export ----------

export function exportNotesAsMarkdown(
  repoOwner: string,
  repoName: string
): string {
  const notes = getNotes(repoOwner, repoName);
  if (notes.length === 0) return "";

  const grouped = new Map<string, Note[]>();
  for (const note of notes) {
    const key = note.topicName;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(note);
  }

  let md = `# Notes for ${repoOwner}/${repoName}\n\n`;
  for (const [topic, topicNotes] of grouped) {
    md += `## ${topic}\n\n`;
    for (const note of topicNotes) {
      md += `${note.content}\n\n`;
    }
  }

  return md;
}
