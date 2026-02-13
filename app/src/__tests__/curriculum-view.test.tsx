import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CurriculumView, {
  isTopicUnlocked,
  findNextRecommended,
  type TopicProgress,
} from "../components/curriculum-view";
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
        {
          name: "Neural Net",
          difficulty: "expert",
          estimatedMinutes: 60,
          prerequisites: ["Backpropagation"],
          subtopics: ["Layers", "Training loop"],
        },
      ],
    },
    {
      name: "Advanced",
      description: "Advanced topics",
      topics: [
        {
          name: "Optimization",
          difficulty: "expert",
          estimatedMinutes: 30,
          prerequisites: ["Neural Net"],
          subtopics: ["SGD", "Adam"],
        },
      ],
    },
  ],
};

const emptyProgress: TopicProgress = {
  "Value Class": "not_started",
  Backpropagation: "not_started",
  "Neural Net": "not_started",
  Optimization: "not_started",
};

const partialProgress: TopicProgress = {
  "Value Class": "completed",
  Backpropagation: "not_started",
  "Neural Net": "not_started",
  Optimization: "not_started",
};

// ---------- Helper tests ----------

describe("isTopicUnlocked", () => {
  it("unlocks topic with no prerequisites", () => {
    const topic = curriculum.categories[0].topics[0]; // Value Class
    expect(isTopicUnlocked(topic, emptyProgress)).toBe(true);
  });

  it("locks topic when prerequisite incomplete", () => {
    const topic = curriculum.categories[0].topics[1]; // Backpropagation
    expect(isTopicUnlocked(topic, emptyProgress)).toBe(false);
  });

  it("unlocks topic when prerequisite completed", () => {
    const topic = curriculum.categories[0].topics[1]; // Backpropagation
    expect(isTopicUnlocked(topic, partialProgress)).toBe(true);
  });
});

describe("findNextRecommended", () => {
  it("returns first unlocked incomplete topic", () => {
    expect(findNextRecommended(curriculum.categories, emptyProgress)).toBe(
      "Value Class"
    );
  });

  it("returns next unlocked after completion", () => {
    expect(findNextRecommended(curriculum.categories, partialProgress)).toBe(
      "Backpropagation"
    );
  });

  it("returns null when all completed", () => {
    const allDone: TopicProgress = {
      "Value Class": "completed",
      Backpropagation: "completed",
      "Neural Net": "completed",
      Optimization: "completed",
    };
    expect(findNextRecommended(curriculum.categories, allDone)).toBe(null);
  });
});

// ---------- Component tests ----------

describe("CurriculumView", () => {
  const onTopicSelect = vi.fn();
  const onTopicStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderView(progress: TopicProgress = emptyProgress) {
    return render(
      <CurriculumView
        curriculum={curriculum}
        progress={progress}
        onTopicSelect={onTopicSelect}
        onTopicStatusChange={onTopicStatusChange}
      />
    );
  }

  it("renders repo name in heading", () => {
    renderView();
    expect(screen.getByText("Learning karpathy/micrograd")).toBeTruthy();
  });

  it("shows overall progress percentage", () => {
    renderView(partialProgress);
    // 1 of 4 completed = 25%
    expect(screen.getByText("25% complete")).toBeTruthy();
    expect(screen.getByText(/1 of 4 topics completed/)).toBeTruthy();
  });

  it("renders category names", () => {
    renderView();
    expect(screen.getByText("Foundations")).toBeTruthy();
    expect(screen.getByText("Advanced")).toBeTruthy();
  });

  it("shows category description", () => {
    renderView();
    expect(screen.getByText("Core concepts")).toBeTruthy();
  });

  it("shows topics in expanded category", () => {
    renderView();
    // First category is expanded by default
    expect(screen.getByText("Value Class")).toBeTruthy();
    expect(screen.getByText("Backpropagation")).toBeTruthy();
  });

  it("shows difficulty badges", () => {
    renderView();
    expect(screen.getByText("Easy")).toBeTruthy();
    expect(screen.getByText("Medium")).toBeTruthy();
    expect(screen.getByText("Hard")).toBeTruthy();
  });

  it("shows time estimates", () => {
    renderView();
    expect(screen.getByText("20m")).toBeTruthy();
    expect(screen.getByText("45m")).toBeTruthy();
  });

  it("shows 'Next' badge on recommended topic", () => {
    renderView();
    expect(screen.getByText("Next")).toBeTruthy();
  });

  it("shows lock icon for locked topics", () => {
    renderView();
    // Backpropagation is locked (prereq: Value Class not done)
    const lockIcons = document.querySelectorAll(".material-icons");
    const lockTexts = Array.from(lockIcons).map((el) => el.textContent);
    expect(lockTexts).toContain("lock");
  });

  it("shows check_circle for completed topics", () => {
    renderView(partialProgress);
    const icons = document.querySelectorAll(".material-icons");
    const texts = Array.from(icons).map((el) => el.textContent);
    expect(texts).toContain("check_circle");
  });

  it("calls onTopicSelect when clicking unlocked topic", () => {
    renderView();
    fireEvent.click(screen.getByText("Value Class"));
    expect(onTopicSelect).toHaveBeenCalledWith(0, 0);
  });

  it("does not call onTopicSelect for locked topics", () => {
    renderView();
    // Neural Net is locked
    fireEvent.click(screen.getByText("Neural Net"));
    expect(onTopicSelect).not.toHaveBeenCalled();
  });

  it("calls onTopicStatusChange when clicking status button", () => {
    renderView();
    // Click the circle icon for "Value Class" to mark complete
    const completeBtn = screen.getByLabelText("Mark Value Class as complete");
    fireEvent.click(completeBtn);
    expect(onTopicStatusChange).toHaveBeenCalledWith("Value Class", "completed");
  });

  it("toggles category expansion on click", () => {
    renderView();
    // Advanced is collapsed, click to expand
    fireEvent.click(screen.getByText("Advanced"));
    expect(screen.getByText("Optimization")).toBeTruthy();
  });

  it("filters by incomplete", () => {
    renderView(partialProgress);
    fireEvent.click(screen.getByText("Incomplete"));
    // Value Class should be hidden (it's completed)
    expect(screen.queryByText("Value Class")).toBeNull();
    expect(screen.getByText("Backpropagation")).toBeTruthy();
  });

  it("sorts by difficulty", () => {
    renderView();
    fireEvent.click(screen.getByText("Difficulty"));
    // Topics should be in order: Easy, Medium, Hard
    const topicElements = screen
      .getAllByText(/Easy|Medium|Hard/)
      .map((el) => el.textContent);
    expect(topicElements).toEqual(["Easy", "Medium", "Hard"]);
  });

  it("shows subtopics", () => {
    renderView();
    expect(screen.getByText(/Wrapping scalars/)).toBeTruthy();
  });

  it("shows remaining time", () => {
    renderView(partialProgress);
    // Total: 155m, completed: 20m, remaining: 135m
    expect(screen.getByText(/~135 min remaining/)).toBeTruthy();
  });
});
