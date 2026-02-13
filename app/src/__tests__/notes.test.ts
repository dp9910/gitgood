import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getNotes,
  getNotesForTopic,
  saveNote,
  updateNote,
  deleteNote,
  getBookmarks,
  addBookmark,
  deleteBookmark,
  isBookmarked,
  searchNotesAndBookmarks,
  exportNotesAsMarkdown,
} from "../lib/notes";

// ---------- localStorage mock ----------

const storage: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key];

  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
    },
    writable: true,
    configurable: true,
  });
});

const OWNER = "karpathy";
const REPO = "micrograd";

describe("getNotes", () => {
  it("returns empty array when no notes", () => {
    expect(getNotes(OWNER, REPO)).toEqual([]);
  });

  it("returns parsed notes from localStorage", () => {
    const notes = [
      { id: "n1", topicName: "Topic 1", categoryName: "Cat", content: "hello", createdAt: 1, updatedAt: 1 },
    ];
    storage[`gitgood_notes_${OWNER}_${REPO}`] = JSON.stringify(notes);
    expect(getNotes(OWNER, REPO)).toEqual(notes);
  });

  it("returns empty array for invalid JSON", () => {
    storage[`gitgood_notes_${OWNER}_${REPO}`] = "not json";
    expect(getNotes(OWNER, REPO)).toEqual([]);
  });
});

describe("saveNote", () => {
  it("creates a note with generated id and timestamps", () => {
    const note = saveNote(OWNER, REPO, {
      topicName: "Backprop",
      categoryName: "Neural Networks",
      content: "My note content",
    });

    expect(note.id).toMatch(/^note_/);
    expect(note.topicName).toBe("Backprop");
    expect(note.content).toBe("My note content");
    expect(note.createdAt).toBeGreaterThan(0);
    expect(note.updatedAt).toBe(note.createdAt);

    const stored = getNotes(OWNER, REPO);
    expect(stored).toHaveLength(1);
  });

  it("appends to existing notes", () => {
    saveNote(OWNER, REPO, { topicName: "T1", categoryName: "C", content: "A" });
    saveNote(OWNER, REPO, { topicName: "T2", categoryName: "C", content: "B" });
    expect(getNotes(OWNER, REPO)).toHaveLength(2);
  });
});

describe("getNotesForTopic", () => {
  it("filters notes by topic name", () => {
    saveNote(OWNER, REPO, { topicName: "T1", categoryName: "C", content: "A" });
    saveNote(OWNER, REPO, { topicName: "T2", categoryName: "C", content: "B" });
    saveNote(OWNER, REPO, { topicName: "T1", categoryName: "C", content: "C" });

    expect(getNotesForTopic(OWNER, REPO, "T1")).toHaveLength(2);
    expect(getNotesForTopic(OWNER, REPO, "T2")).toHaveLength(1);
  });
});

describe("updateNote", () => {
  it("updates content and updatedAt", () => {
    const note = saveNote(OWNER, REPO, { topicName: "T", categoryName: "C", content: "old" });
    const updated = updateNote(OWNER, REPO, note.id, "new content");

    expect(updated).not.toBeNull();
    expect(updated!.content).toBe("new content");
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(note.createdAt);
  });

  it("returns null for non-existent note", () => {
    expect(updateNote(OWNER, REPO, "fake_id", "content")).toBeNull();
  });
});

describe("deleteNote", () => {
  it("removes a note by id", () => {
    const note = saveNote(OWNER, REPO, { topicName: "T", categoryName: "C", content: "x" });
    expect(deleteNote(OWNER, REPO, note.id)).toBe(true);
    expect(getNotes(OWNER, REPO)).toHaveLength(0);
  });

  it("returns false for non-existent note", () => {
    expect(deleteNote(OWNER, REPO, "fake_id")).toBe(false);
  });
});

describe("getBookmarks", () => {
  it("returns empty array when no bookmarks", () => {
    expect(getBookmarks(OWNER, REPO)).toEqual([]);
  });
});

describe("addBookmark", () => {
  it("creates a bookmark with generated id", () => {
    const bm = addBookmark(OWNER, REPO, {
      title: "Backprop Basics",
      topicName: "Backprop",
      categoryName: "Neural Networks",
      comment: "Great explanation",
    });

    expect(bm.id).toMatch(/^bm_/);
    expect(bm.title).toBe("Backprop Basics");
    expect(bm.createdAt).toBeGreaterThan(0);
    expect(getBookmarks(OWNER, REPO)).toHaveLength(1);
  });

  it("stores optional codeSnippet and githubUrl", () => {
    const bm = addBookmark(OWNER, REPO, {
      title: "Code example",
      topicName: "T",
      categoryName: "C",
      comment: "",
      codeSnippet: "const x = 1;",
      githubUrl: "https://github.com/owner/repo/blob/main/file.ts#L10",
    });

    expect(bm.codeSnippet).toBe("const x = 1;");
    expect(bm.githubUrl).toContain("github.com");
  });
});

describe("deleteBookmark", () => {
  it("removes a bookmark by id", () => {
    const bm = addBookmark(OWNER, REPO, {
      title: "T",
      topicName: "T",
      categoryName: "C",
      comment: "",
    });
    expect(deleteBookmark(OWNER, REPO, bm.id)).toBe(true);
    expect(getBookmarks(OWNER, REPO)).toHaveLength(0);
  });

  it("returns false for non-existent bookmark", () => {
    expect(deleteBookmark(OWNER, REPO, "fake_id")).toBe(false);
  });
});

describe("isBookmarked", () => {
  it("returns false when not bookmarked", () => {
    expect(isBookmarked(OWNER, REPO, "Topic")).toBe(false);
  });

  it("returns true when bookmarked", () => {
    addBookmark(OWNER, REPO, {
      title: "Topic",
      topicName: "Topic",
      categoryName: "C",
      comment: "",
    });
    expect(isBookmarked(OWNER, REPO, "Topic")).toBe(true);
  });
});

describe("searchNotesAndBookmarks", () => {
  it("returns empty for empty query", () => {
    const result = searchNotesAndBookmarks(OWNER, REPO, "");
    expect(result.notes).toEqual([]);
    expect(result.bookmarks).toEqual([]);
  });

  it("searches notes by content", () => {
    saveNote(OWNER, REPO, { topicName: "T", categoryName: "C", content: "gradient descent" });
    saveNote(OWNER, REPO, { topicName: "T", categoryName: "C", content: "something else" });

    const result = searchNotesAndBookmarks(OWNER, REPO, "gradient");
    expect(result.notes).toHaveLength(1);
  });

  it("searches bookmarks by title", () => {
    addBookmark(OWNER, REPO, {
      title: "Backprop explained",
      topicName: "T",
      categoryName: "C",
      comment: "",
    });

    const result = searchNotesAndBookmarks(OWNER, REPO, "backprop");
    expect(result.bookmarks).toHaveLength(1);
  });

  it("searches notes by topic name", () => {
    saveNote(OWNER, REPO, { topicName: "Gradient Descent", categoryName: "C", content: "note" });

    const result = searchNotesAndBookmarks(OWNER, REPO, "gradient");
    expect(result.notes).toHaveLength(1);
  });

  it("search is case insensitive", () => {
    saveNote(OWNER, REPO, { topicName: "T", categoryName: "C", content: "UPPERCASE content" });

    const result = searchNotesAndBookmarks(OWNER, REPO, "uppercase");
    expect(result.notes).toHaveLength(1);
  });
});

describe("exportNotesAsMarkdown", () => {
  it("returns empty string when no notes", () => {
    expect(exportNotesAsMarkdown(OWNER, REPO)).toBe("");
  });

  it("exports notes grouped by topic", () => {
    saveNote(OWNER, REPO, { topicName: "Backprop", categoryName: "C", content: "Note 1" });
    saveNote(OWNER, REPO, { topicName: "Backprop", categoryName: "C", content: "Note 2" });
    saveNote(OWNER, REPO, { topicName: "Neurons", categoryName: "C", content: "Note 3" });

    const md = exportNotesAsMarkdown(OWNER, REPO);
    expect(md).toContain("# Notes for karpathy/micrograd");
    expect(md).toContain("## Backprop");
    expect(md).toContain("## Neurons");
    expect(md).toContain("Note 1");
    expect(md).toContain("Note 2");
    expect(md).toContain("Note 3");
  });
});
