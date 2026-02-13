import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChallengeModal from "../components/challenge-modal";
import type { ChallengeData } from "../lib/quiz";

const mockChallenge: ChallengeData = {
  topicName: "Backpropagation",
  title: "Implement Forward Pass",
  description: "Write a function that computes the forward pass of a neural network.",
  starterCode: "def forward(x):\n    # TODO: implement",
  hint: "Think about matrix multiplication and bias terms.",
  solution: "def forward(x):\n    return x @ W + b",
  language: "python",
};

describe("ChallengeModal", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderModal() {
    return render(
      <ChallengeModal challenge={mockChallenge} onClose={onClose} />
    );
  }

  it("renders challenge modal", () => {
    renderModal();
    expect(screen.getByTestId("challenge-modal")).toBeTruthy();
  });

  it("shows challenge title", () => {
    renderModal();
    expect(screen.getByText("Implement Forward Pass")).toBeTruthy();
  });

  it("shows topic name", () => {
    renderModal();
    expect(screen.getByText("Backpropagation")).toBeTruthy();
  });

  it("shows problem description", () => {
    renderModal();
    expect(
      screen.getByText(/Write a function that computes the forward pass/)
    ).toBeTruthy();
  });

  it("shows code editor with starter code", () => {
    renderModal();
    const editor = screen.getByTestId("code-editor") as HTMLTextAreaElement;
    expect(editor.value).toBe("def forward(x):\n    # TODO: implement");
  });

  it("shows language badge", () => {
    renderModal();
    expect(screen.getByText("python")).toBeTruthy();
  });

  it("shows hint when clicked", () => {
    renderModal();
    expect(screen.queryByTestId("hint-text")).toBeNull();
    fireEvent.click(screen.getByTestId("show-hint"));
    expect(screen.getByTestId("hint-text")).toBeTruthy();
    expect(screen.getByText(/matrix multiplication/)).toBeTruthy();
  });

  it("shows solution when clicked", () => {
    renderModal();
    expect(screen.queryByTestId("solution-code")).toBeNull();
    fireEvent.click(screen.getByTestId("show-solution"));
    expect(screen.getByTestId("solution-code")).toBeTruthy();
  });

  it("resets code to starter code", () => {
    renderModal();
    const editor = screen.getByTestId("code-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "modified code" } });
    expect(editor.value).toBe("modified code");

    fireEvent.click(screen.getByTestId("reset-btn"));
    expect(editor.value).toBe("def forward(x):\n    # TODO: implement");
  });

  it("calls onClose when close button clicked", () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Close challenge"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Done button clicked", () => {
    renderModal();
    fireEvent.click(screen.getByText("Done"));
    expect(onClose).toHaveBeenCalled();
  });

  it("allows editing code", () => {
    renderModal();
    const editor = screen.getByTestId("code-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "new code here" } });
    expect(editor.value).toBe("new code here");
  });
});
