import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BookmarksView from "../components/bookmarks-view";
import { saveNote, addBookmark } from "../lib/notes";

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

function seedData() {
  addBookmark(OWNER, REPO, {
    title: "Backprop Basics",
    topicName: "Backpropagation",
    categoryName: "Neural Networks",
    comment: "Great explanation of chain rule",
  });
  addBookmark(OWNER, REPO, {
    title: "Value class",
    topicName: "Engine",
    categoryName: "Core",
    comment: "Key implementation detail",
    codeSnippet: "class Value { ... }",
  });
  saveNote(OWNER, REPO, {
    topicName: "Backpropagation",
    categoryName: "Neural Networks",
    content: "Backprop uses chain rule for gradients",
  });
  saveNote(OWNER, REPO, {
    topicName: "Neurons",
    categoryName: "Neural Networks",
    content: "Neurons are computational units",
  });
}

describe("BookmarksView", () => {
  it("renders bookmarks view", () => {
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    expect(screen.getByTestId("bookmarks-view")).toBeTruthy();
  });

  it("shows empty state when no data", () => {
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    expect(screen.getByTestId("empty-state")).toBeTruthy();
  });

  it("shows bookmarks tab by default", () => {
    seedData();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    expect(screen.getByTestId("tab-bookmarks").textContent).toContain("Bookmarks (2)");
  });

  it("displays bookmark items", () => {
    seedData();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    const items = screen.getAllByTestId("bookmark-item");
    expect(items).toHaveLength(2);
  });

  it("shows bookmark title and comment", () => {
    seedData();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    expect(screen.getByText("Backprop Basics")).toBeTruthy();
    expect(screen.getByText("Great explanation of chain rule")).toBeTruthy();
  });

  it("shows code snippet in bookmark", () => {
    seedData();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    expect(screen.getByText("class Value { ... }")).toBeTruthy();
  });

  it("switches to notes tab", () => {
    seedData();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    fireEvent.click(screen.getByTestId("tab-notes"));

    expect(screen.getByTestId("tab-notes").textContent).toContain("Notes (2)");
    const items = screen.getAllByTestId("note-item");
    expect(items).toHaveLength(2);
  });

  it("shows note content", () => {
    seedData();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    fireEvent.click(screen.getByTestId("tab-notes"));

    expect(screen.getByText("Backprop uses chain rule for gradients")).toBeTruthy();
  });

  it("filters by search query", () => {
    seedData();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "backprop" },
    });

    expect(screen.getByTestId("tab-bookmarks").textContent).toContain("Bookmarks (1)");
  });

  it("shows empty state for no search results", () => {
    seedData();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "zzzznonexistent" },
    });

    expect(screen.getByTestId("empty-state")).toBeTruthy();
  });

  it("deletes a bookmark", () => {
    seedData();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);

    const deleteBtns = screen.getAllByTestId("delete-bookmark-btn");
    fireEvent.click(deleteBtns[0]);

    expect(screen.getAllByTestId("bookmark-item")).toHaveLength(1);
  });

  it("deletes a note", () => {
    seedData();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    fireEvent.click(screen.getByTestId("tab-notes"));

    const deleteBtns = screen.getAllByTestId("delete-note-btn");
    fireEvent.click(deleteBtns[0]);

    expect(screen.getAllByTestId("note-item")).toHaveLength(1);
  });

  it("calls onNavigateToTopic when go-to button clicked", () => {
    seedData();
    const onNav = vi.fn();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} onNavigateToTopic={onNav} />);

    const gotoBtns = screen.getAllByTestId("goto-topic-btn");
    fireEvent.click(gotoBtns[0]);

    expect(onNav).toHaveBeenCalledWith("Backpropagation");
  });

  it("shows repo info in header", () => {
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    expect(screen.getByText("karpathy/micrograd")).toBeTruthy();
  });

  it("searches notes by content on notes tab", () => {
    seedData();
    render(<BookmarksView repoOwner={OWNER} repoName={REPO} />);
    fireEvent.click(screen.getByTestId("tab-notes"));
    fireEvent.change(screen.getByTestId("search-input"), {
      target: { value: "chain rule" },
    });

    expect(screen.getByTestId("tab-notes").textContent).toContain("Notes (1)");
  });
});
