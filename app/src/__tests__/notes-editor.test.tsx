import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotesEditor from "../components/notes-editor";

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

const PROPS = {
  repoOwner: "karpathy",
  repoName: "micrograd",
  topicName: "Backprop",
  categoryName: "Neural Networks",
};

describe("NotesEditor", () => {
  it("renders notes editor", () => {
    render(<NotesEditor {...PROPS} />);
    expect(screen.getByTestId("notes-editor")).toBeTruthy();
  });

  it("shows Add Note button", () => {
    render(<NotesEditor {...PROPS} />);
    expect(screen.getByTestId("add-note-btn")).toBeTruthy();
  });

  it("shows Bookmark button", () => {
    render(<NotesEditor {...PROPS} />);
    expect(screen.getByTestId("bookmark-btn")).toBeTruthy();
    expect(screen.getByTestId("bookmark-btn").textContent).toContain("Bookmark");
  });

  it("opens editor when Add Note clicked", () => {
    render(<NotesEditor {...PROPS} />);
    fireEvent.click(screen.getByTestId("add-note-btn"));
    expect(screen.getByTestId("note-form")).toBeTruthy();
    expect(screen.getByTestId("note-textarea")).toBeTruthy();
  });

  it("saves a note", () => {
    render(<NotesEditor {...PROPS} />);
    fireEvent.click(screen.getByTestId("add-note-btn"));
    fireEvent.change(screen.getByTestId("note-textarea"), {
      target: { value: "My learning note" },
    });
    fireEvent.click(screen.getByTestId("save-note-btn"));

    expect(screen.getByTestId("notes-list")).toBeTruthy();
    expect(screen.getByText("My learning note")).toBeTruthy();
  });

  it("cancels editing", () => {
    render(<NotesEditor {...PROPS} />);
    fireEvent.click(screen.getByTestId("add-note-btn"));
    fireEvent.click(screen.getByTestId("cancel-note-btn"));

    expect(screen.queryByTestId("note-form")).toBeNull();
  });

  it("disables save when draft is empty", () => {
    render(<NotesEditor {...PROPS} />);
    fireEvent.click(screen.getByTestId("add-note-btn"));

    const saveBtn = screen.getByTestId("save-note-btn") as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("edits an existing note", () => {
    render(<NotesEditor {...PROPS} />);
    // Create a note
    fireEvent.click(screen.getByTestId("add-note-btn"));
    fireEvent.change(screen.getByTestId("note-textarea"), {
      target: { value: "Original note" },
    });
    fireEvent.click(screen.getByTestId("save-note-btn"));

    // Edit it
    fireEvent.click(screen.getByTestId("edit-note-btn"));
    expect(screen.getByTestId("note-textarea")).toBeTruthy();

    fireEvent.change(screen.getByTestId("note-textarea"), {
      target: { value: "Updated note" },
    });
    fireEvent.click(screen.getByTestId("save-note-btn"));

    expect(screen.getByText("Updated note")).toBeTruthy();
  });

  it("deletes a note", () => {
    render(<NotesEditor {...PROPS} />);
    // Create a note
    fireEvent.click(screen.getByTestId("add-note-btn"));
    fireEvent.change(screen.getByTestId("note-textarea"), {
      target: { value: "To be deleted" },
    });
    fireEvent.click(screen.getByTestId("save-note-btn"));

    // Delete it
    fireEvent.click(screen.getByTestId("delete-note-btn"));
    expect(screen.queryByText("To be deleted")).toBeNull();
  });

  it("toggles bookmark on", () => {
    render(<NotesEditor {...PROPS} />);
    fireEvent.click(screen.getByTestId("bookmark-btn"));

    expect(screen.getByTestId("bookmark-btn").textContent).toContain("Bookmarked");
  });

  it("toggles bookmark off", () => {
    render(<NotesEditor {...PROPS} />);
    fireEvent.click(screen.getByTestId("bookmark-btn"));
    fireEvent.click(screen.getByTestId("bookmark-btn"));

    expect(screen.getByTestId("bookmark-btn").textContent).toContain("Bookmark");
  });

  it("shows note count in header", () => {
    render(<NotesEditor {...PROPS} />);
    fireEvent.click(screen.getByTestId("add-note-btn"));
    fireEvent.change(screen.getByTestId("note-textarea"), {
      target: { value: "Note 1" },
    });
    fireEvent.click(screen.getByTestId("save-note-btn"));

    expect(screen.getByText("Your Notes (1)")).toBeTruthy();
  });

  it("shows Update button when editing", () => {
    render(<NotesEditor {...PROPS} />);
    fireEvent.click(screen.getByTestId("add-note-btn"));
    fireEvent.change(screen.getByTestId("note-textarea"), {
      target: { value: "A note" },
    });
    fireEvent.click(screen.getByTestId("save-note-btn"));

    fireEvent.click(screen.getByTestId("edit-note-btn"));
    expect(screen.getByTestId("save-note-btn").textContent).toContain("Update");
  });
});
