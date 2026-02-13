import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LearningInterface from "../components/learning-interface";
import type { TopicProgress } from "../components/curriculum-view";
import type { Curriculum } from "../lib/curriculum-cache";

// ---------- Fixtures ----------

const curriculum: Curriculum = {
  repoOwner: "karpathy",
  repoName: "micrograd",
  categories: [
    {
      name: "Foundations",
      description: "Core concepts",
      topics: [
        {
          name: "Value Class",
          difficulty: "beginner",
          estimatedMinutes: 20,
          prerequisites: [],
          subtopics: ["Wrapping scalars", "Operator overloading"],
        },
        {
          name: "Backpropagation",
          difficulty: "intermediate",
          estimatedMinutes: 45,
          prerequisites: ["Value Class"],
          subtopics: ["Chain rule", "Topological sort"],
        },
      ],
    },
    {
      name: "Advanced",
      description: "Advanced topics",
      topics: [
        {
          name: "Neural Net",
          difficulty: "expert",
          estimatedMinutes: 60,
          prerequisites: ["Backpropagation"],
          subtopics: ["Layers", "Training loop"],
        },
      ],
    },
  ],
};

const progress: TopicProgress = {
  "Value Class": "not_started",
  Backpropagation: "not_started",
  "Neural Net": "not_started",
};

const partialProgress: TopicProgress = {
  "Value Class": "completed",
  Backpropagation: "not_started",
  "Neural Net": "not_started",
};

// ---------- Tests ----------

describe("LearningInterface", () => {
  const onTopicSelect = vi.fn();
  const onTopicStatusChange = vi.fn();
  const onBackToOverview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderInterface(
    selectedTopic = { categoryIndex: 0, topicIndex: 0 },
    prog = progress
  ) {
    return render(
      <LearningInterface
        curriculum={curriculum}
        progress={prog}
        selectedTopic={selectedTopic}
        onTopicSelect={onTopicSelect}
        onTopicStatusChange={onTopicStatusChange}
        onBackToOverview={onBackToOverview}
      />
    );
  }

  it("renders three-panel layout", () => {
    renderInterface();
    expect(screen.getByTestId("learning-interface")).toBeTruthy();
  });

  it("shows Course Curriculum heading in sidebar", () => {
    renderInterface();
    expect(screen.getByText("Course Curriculum")).toBeTruthy();
  });

  it("shows selected topic name in content area", () => {
    renderInterface();
    // The topic name "Value Class" should appear in the content heading
    const headings = document.querySelectorAll("h1");
    const headingTexts = Array.from(headings).map((h) => h.textContent);
    expect(headingTexts).toContain("Value Class");
  });

  it("shows breadcrumb with category and topic", () => {
    renderInterface();
    const breadcrumbNav = screen.getByLabelText("Breadcrumb");
    expect(breadcrumbNav.textContent).toContain("Foundations");
    expect(breadcrumbNav.textContent).toContain("Value Class");
  });

  it("shows difficulty badge", () => {
    renderInterface();
    expect(screen.getByText("Easy")).toBeTruthy();
  });

  it("shows time estimate", () => {
    renderInterface();
    expect(screen.getByText("20 min")).toBeTruthy();
  });

  it("shows subtopics in What you'll learn", () => {
    renderInterface();
    expect(screen.getByText("Wrapping scalars")).toBeTruthy();
    expect(screen.getByText("Operator overloading")).toBeTruthy();
  });

  it("shows content placeholder", () => {
    renderInterface();
    expect(screen.getByTestId("content-placeholder")).toBeTruthy();
  });

  it("shows Previous button (disabled for first topic)", () => {
    renderInterface();
    const prevBtn = screen.getByText("Previous").closest("button")!;
    expect(prevBtn.disabled).toBe(true);
  });

  it("shows Complete & Continue button", () => {
    renderInterface();
    expect(screen.getByText("Complete & Continue")).toBeTruthy();
  });

  it("calls onTopicStatusChange on Complete & Continue", () => {
    renderInterface();
    fireEvent.click(screen.getByText("Complete & Continue"));
    expect(onTopicStatusChange).toHaveBeenCalledWith("Value Class", "completed");
  });

  it("shows AI Tutor panel when expanded", () => {
    renderInterface();
    // Click the chat toggle button (smart_toy icon)
    const openChatBtn = screen.getByLabelText("Open AI tutor");
    fireEvent.click(openChatBtn);
    expect(screen.getByTestId("chat-placeholder")).toBeTruthy();
    expect(screen.getByLabelText("Close AI tutor")).toBeTruthy();
  });

  it("can close AI Tutor panel", () => {
    renderInterface();
    // Open then close
    fireEvent.click(screen.getByLabelText("Open AI tutor"));
    fireEvent.click(screen.getByLabelText("Close AI tutor"));
    // Should be back to collapsed state
    expect(screen.getByLabelText("Open AI tutor")).toBeTruthy();
  });

  it("can collapse and expand sidebar", () => {
    renderInterface();
    // Collapse
    fireEvent.click(screen.getByLabelText("Collapse sidebar"));
    expect(screen.queryByText("Course Curriculum")).toBeNull();

    // Expand
    fireEvent.click(screen.getByLabelText("Expand sidebar"));
    expect(screen.getByText("Course Curriculum")).toBeTruthy();
  });

  it("shows category topics in sidebar", () => {
    renderInterface();
    // Categories should be listed in sidebar nav
    const nav = screen.getByLabelText("Course curriculum");
    expect(nav.textContent).toContain("Foundations");
    expect(nav.textContent).toContain("Advanced");
  });

  it("highlights selected topic in sidebar", () => {
    renderInterface();
    // The selected topic should have a play_circle icon
    const icons = document.querySelectorAll(".material-icons");
    const iconTexts = Array.from(icons).map((el) => el.textContent);
    expect(iconTexts).toContain("play_circle");
  });

  it("shows lock icon for locked topics in sidebar", () => {
    renderInterface();
    const icons = document.querySelectorAll(".material-icons");
    const iconTexts = Array.from(icons).map((el) => el.textContent);
    expect(iconTexts).toContain("lock");
  });

  it("navigates between topics using sidebar", () => {
    renderInterface(
      { categoryIndex: 0, topicIndex: 0 },
      partialProgress
    );

    // Click on Backpropagation (now unlocked since Value Class completed)
    const backpropButtons = screen.getAllByText("Backpropagation");
    fireEvent.click(backpropButtons[0]); // sidebar button
    expect(onTopicSelect).toHaveBeenCalledWith(0, 1);
  });

  it("shows prerequisites for topic that has them", () => {
    renderInterface({ categoryIndex: 0, topicIndex: 1 }, partialProgress);
    expect(screen.getByText("Prerequisites")).toBeTruthy();
    // "Value Class" appears in sidebar and prerequisites — use getAllByText
    const elements = screen.getAllByText("Value Class");
    expect(elements.length).toBeGreaterThanOrEqual(2); // sidebar + prereq badge
  });

  it("handles Escape key to go back to overview", () => {
    renderInterface();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onBackToOverview).toHaveBeenCalled();
  });

  it("handles / key to open chat", () => {
    renderInterface();
    fireEvent.keyDown(window, { key: "/" });
    // Chat should now be open (shows close button)
    expect(screen.getByLabelText("Close AI tutor")).toBeTruthy();
    expect(screen.getByTestId("chat-placeholder")).toBeTruthy();
  });
});
