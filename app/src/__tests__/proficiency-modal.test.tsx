import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProficiencyModal from "../components/proficiency-modal";

describe("ProficiencyModal", () => {
  const onComplete = vi.fn();
  const onCancel = vi.fn();

  function renderModal() {
    return render(
      <ProficiencyModal onComplete={onComplete} onCancel={onCancel} />
    );
  }

  it("renders step 1 (experience level) initially", () => {
    renderModal();
    expect(screen.getByText("What's your experience level?")).toBeTruthy();
    expect(screen.getByText("Novice")).toBeTruthy();
    expect(screen.getByText("Intermediate")).toBeTruthy();
    expect(screen.getByText("Expert")).toBeTruthy();
  });

  it("shows step indicator as 1 of 3", () => {
    renderModal();
    expect(screen.getByText("1 of 3")).toBeTruthy();
  });

  it("disables Next button when nothing selected", () => {
    renderModal();
    const nextBtn = screen.getByText("Next").closest("button")!;
    expect(nextBtn.disabled).toBe(true);
  });

  it("enables Next button after selecting an option", () => {
    renderModal();
    fireEvent.click(screen.getByText("Intermediate"));
    const nextBtn = screen.getByText("Next").closest("button")!;
    expect(nextBtn.disabled).toBe(false);
  });

  it("advances to step 2 (learning goal) on Next", () => {
    renderModal();
    fireEvent.click(screen.getByText("Expert"));
    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText("What's your learning goal?")).toBeTruthy();
    expect(screen.getByText("2 of 3")).toBeTruthy();
    expect(screen.getByText("Understand Concepts")).toBeTruthy();
    expect(screen.getByText("Deep Dive")).toBeTruthy();
  });

  it("advances to step 3 (time commitment)", () => {
    renderModal();
    // Step 1
    fireEvent.click(screen.getByText("Novice"));
    fireEvent.click(screen.getByText("Next"));
    // Step 2
    fireEvent.click(screen.getByText("Quick Overview"));
    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText("How much time can you commit?")).toBeTruthy();
    expect(screen.getByText("3 of 3")).toBeTruthy();
    expect(screen.getByText("15-30 min/day")).toBeTruthy();
  });

  it("calls onComplete with all preferences on final submit", () => {
    renderModal();
    // Step 1
    fireEvent.click(screen.getByText("Intermediate"));
    fireEvent.click(screen.getByText("Next"));
    // Step 2
    fireEvent.click(screen.getByText("Build Something Similar"));
    fireEvent.click(screen.getByText("Next"));
    // Step 3
    fireEvent.click(screen.getByText("1-2 hours/day"));
    fireEvent.click(screen.getByText("Start Learning"));

    expect(onComplete).toHaveBeenCalledWith({
      level: "intermediate",
      goal: "build",
      timeCommitment: "moderate",
    });
  });

  it("goes back to previous step on Back button", () => {
    renderModal();
    fireEvent.click(screen.getByText("Expert"));
    fireEvent.click(screen.getByText("Next"));

    // Now on step 2
    expect(screen.getByText("What's your learning goal?")).toBeTruthy();

    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("What's your experience level?")).toBeTruthy();
  });

  it("calls onCancel when Cancel clicked on step 1", () => {
    renderModal();
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel when backdrop clicked", () => {
    renderModal();
    const backdrop = document.querySelector(".backdrop-blur-sm")!;
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows check_circle icon on selected option", () => {
    renderModal();
    fireEvent.click(screen.getByText("Expert"));
    // The selected option should have a check_circle icon
    const expertBtn = screen.getByText("Expert").closest("button")!;
    expect(expertBtn.textContent).toContain("check_circle");
  });

  it("shows Cancel on step 1 and Back on step 2+", () => {
    renderModal();
    expect(screen.getByText("Cancel")).toBeTruthy();

    fireEvent.click(screen.getByText("Novice"));
    fireEvent.click(screen.getByText("Next"));

    expect(screen.queryByText("Cancel")).toBeNull();
    expect(screen.getByText("Back")).toBeTruthy();
  });

  it("shows Start Learning instead of Next on final step", () => {
    renderModal();
    fireEvent.click(screen.getByText("Novice"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Understand Concepts"));
    fireEvent.click(screen.getByText("Next"));

    expect(screen.queryByText("Next")).toBeNull();
    expect(screen.getByText("Start Learning")).toBeTruthy();
  });
});
