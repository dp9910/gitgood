import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuizModal from "../components/quiz-modal";
import type { Quiz } from "../lib/quiz";

const mockQuiz: Quiz = {
  topicName: "Backpropagation",
  questions: [
    {
      question: "What is backpropagation?",
      options: [
        { label: "A", text: "A learning algorithm" },
        { label: "B", text: "A data structure" },
        { label: "C", text: "A programming language" },
        { label: "D", text: "A database query" },
      ],
      correctLabel: "A",
      explanation: "Backpropagation is a learning algorithm.",
    },
    {
      question: "What does the chain rule compute?",
      options: [
        { label: "A", text: "Sums" },
        { label: "B", text: "Products" },
        { label: "C", text: "Derivatives" },
        { label: "D", text: "Integrals" },
      ],
      correctLabel: "C",
      explanation: "The chain rule computes derivatives.",
    },
  ],
};

describe("QuizModal", () => {
  const onClose = vi.fn();
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderModal() {
    return render(
      <QuizModal quiz={mockQuiz} onClose={onClose} onComplete={onComplete} />
    );
  }

  it("renders quiz modal", () => {
    renderModal();
    expect(screen.getByTestId("quiz-modal")).toBeTruthy();
  });

  it("shows topic name in header", () => {
    renderModal();
    expect(
      screen.getByText("Knowledge Check: Backpropagation")
    ).toBeTruthy();
  });

  it("shows first question", () => {
    renderModal();
    expect(screen.getByText("What is backpropagation?")).toBeTruthy();
  });

  it("shows question progress", () => {
    renderModal();
    expect(screen.getByText("Question 1 of 2")).toBeTruthy();
  });

  it("shows 4 options", () => {
    renderModal();
    expect(screen.getByTestId("option-A")).toBeTruthy();
    expect(screen.getByTestId("option-B")).toBeTruthy();
    expect(screen.getByTestId("option-C")).toBeTruthy();
    expect(screen.getByTestId("option-D")).toBeTruthy();
  });

  it("disables next button when no answer selected", () => {
    renderModal();
    const nextBtn = screen.getByTestId("next-btn");
    expect(nextBtn.hasAttribute("disabled")).toBe(true);
  });

  it("enables next button after selecting an answer", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("option-A"));
    const nextBtn = screen.getByTestId("next-btn");
    expect(nextBtn.hasAttribute("disabled")).toBe(false);
  });

  it("advances to next question", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("option-A"));
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText("What does the chain rule compute?")).toBeTruthy();
    expect(screen.getByText("Question 2 of 2")).toBeTruthy();
  });

  it("shows Submit on last question", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("option-A"));
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByTestId("next-btn").textContent).toContain("Submit");
  });

  it("shows results after submitting", () => {
    renderModal();
    // Answer Q1
    fireEvent.click(screen.getByTestId("option-A"));
    fireEvent.click(screen.getByTestId("next-btn"));
    // Answer Q2
    fireEvent.click(screen.getByTestId("option-C"));
    fireEvent.click(screen.getByTestId("next-btn"));

    expect(screen.getByTestId("quiz-score")).toBeTruthy();
    expect(screen.getByText("2/2 Correct!")).toBeTruthy();
  });

  it("calls onComplete with result", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("option-A"));
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("option-C"));
    fireEvent.click(screen.getByTestId("next-btn"));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ score: 2, total: 2 })
    );
  });

  it("shows wrong answers review for incorrect answers", () => {
    renderModal();
    // Wrong answer for Q1
    fireEvent.click(screen.getByTestId("option-B"));
    fireEvent.click(screen.getByTestId("next-btn"));
    // Correct answer for Q2
    fireEvent.click(screen.getByTestId("option-C"));
    fireEvent.click(screen.getByTestId("next-btn"));

    expect(screen.getByTestId("wrong-answers")).toBeTruthy();
    expect(screen.getByText(/Backpropagation is a learning algorithm/)).toBeTruthy();
  });

  it("allows retake", () => {
    renderModal();
    // Submit answers
    fireEvent.click(screen.getByTestId("option-A"));
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("option-C"));
    fireEvent.click(screen.getByTestId("next-btn"));

    // Retake
    fireEvent.click(screen.getByTestId("retake-btn"));
    expect(screen.getByText("What is backpropagation?")).toBeTruthy();
    expect(screen.getByText("Question 1 of 2")).toBeTruthy();
  });

  it("calls onClose when close button clicked", () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("Close quiz"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Continue Learning clicked after results", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("option-A"));
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("option-C"));
    fireEvent.click(screen.getByTestId("next-btn"));

    fireEvent.click(screen.getByTestId("continue-btn"));
    expect(onClose).toHaveBeenCalled();
  });
});
