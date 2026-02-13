import { describe, it, expect, beforeEach } from "vitest";
import {
  getProgressData,
  exportProgressAsJson,
  exportNotesForRepo,
  exportBookmarksAsJson,
  exportAllData,
} from "../lib/data-export";
import { saveNote, addBookmark } from "../lib/notes";

beforeEach(() => {
  localStorage.clear();
});

describe("getProgressData", () => {
  it("returns empty array with no progress", () => {
    expect(getProgressData()).toHaveLength(0);
  });

  it("reads progress from localStorage", () => {
    localStorage.setItem(
      "gitgood_progress_karpathy_micrograd",
      JSON.stringify({ completed: ["topic1", "topic2"], total: 5, lastStudied: "2025-01-01" })
    );
    const data = getProgressData();
    expect(data).toHaveLength(1);
    expect(data[0].owner).toBe("karpathy");
    expect(data[0].repo).toBe("micrograd");
    expect(data[0].completedTopics).toEqual(["topic1", "topic2"]);
    expect(data[0].percentage).toBe(40);
  });

  it("handles multiple repos", () => {
    localStorage.setItem(
      "gitgood_progress_owner1_repo1",
      JSON.stringify({ completed: ["t1"], total: 2 })
    );
    localStorage.setItem(
      "gitgood_progress_owner2_repo2",
      JSON.stringify({ completed: ["t1", "t2"], total: 2 })
    );
    expect(getProgressData()).toHaveLength(2);
  });

  it("skips non-progress keys", () => {
    localStorage.setItem("other_key", "value");
    localStorage.setItem("gitgood_notes_x_y", "[]");
    expect(getProgressData()).toHaveLength(0);
  });

  it("handles corrupt entries", () => {
    localStorage.setItem("gitgood_progress_o_r", "not json");
    expect(getProgressData()).toHaveLength(0);
  });
});

describe("exportProgressAsJson", () => {
  it("returns valid JSON with metadata", () => {
    localStorage.setItem(
      "gitgood_progress_owner_repo",
      JSON.stringify({ completed: ["t1"], total: 5 })
    );
    const json = exportProgressAsJson();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("1.0");
    expect(parsed.exportedAt).toBeTruthy();
    expect(parsed.repos).toHaveLength(1);
  });

  it("returns empty repos array with no data", () => {
    const parsed = JSON.parse(exportProgressAsJson());
    expect(parsed.repos).toHaveLength(0);
  });
});

describe("exportNotesForRepo", () => {
  it("returns markdown with notes", () => {
    saveNote("owner", "repo", { topicName: "Topic 1", categoryName: "Cat A", content: "My note content" });
    const md = exportNotesForRepo("owner", "repo");
    expect(md).toContain("Topic 1");
    expect(md).toContain("My note content");
  });

  it("returns empty string for repo with no notes", () => {
    const md = exportNotesForRepo("owner", "repo");
    expect(md).toBe("");
  });
});

describe("exportBookmarksAsJson", () => {
  it("returns valid JSON with bookmarks", () => {
    addBookmark("owner", "repo", { title: "BM Title", topicName: "Topic", categoryName: "Category" });
    const json = exportBookmarksAsJson("owner", "repo");
    const parsed = JSON.parse(json);
    expect(parsed.repo).toBe("owner/repo");
    expect(parsed.bookmarks).toHaveLength(1);
    expect(parsed.exportedAt).toBeTruthy();
  });

  it("returns empty bookmarks for no data", () => {
    const parsed = JSON.parse(exportBookmarksAsJson("o", "r"));
    expect(parsed.bookmarks).toHaveLength(0);
  });
});

describe("exportAllData", () => {
  it("returns full export with all sections", () => {
    localStorage.setItem(
      "gitgood_progress_owner_repo",
      JSON.stringify({ completed: ["t1"], total: 3 })
    );
    saveNote("owner", "repo", { topicName: "Topic", categoryName: "Cat", content: "Note content" });
    addBookmark("owner", "repo", { title: "BM", topicName: "Topic", categoryName: "Cat" });

    const json = exportAllData("owner", "repo");
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("1.0");
    expect(parsed.progress).toHaveLength(1);
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.bookmarks).toHaveLength(1);
  });
});
