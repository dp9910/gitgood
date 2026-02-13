import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OnboardingModal, {
  useOnboarding,
  ONBOARDING_KEY,
  STEPS,
} from "../components/onboarding-modal";
import { renderHook, act } from "@testing-library/react";

// ---------- localStorage mock ----------

const storage: Record<string, string> = {};

beforeEach(() => {
  vi.clearAllMocks();
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

describe("OnboardingModal", () => {
  const onComplete = vi.fn();
  const onSkip = vi.fn();

  function renderModal() {
    return render(
      <OnboardingModal onComplete={onComplete} onSkip={onSkip} />
    );
  }

  it("renders modal", () => {
    renderModal();
    expect(screen.getByTestId("onboarding-modal")).toBeTruthy();
  });

  it("shows welcome header", () => {
    renderModal();
    expect(screen.getByText("Welcome to GitGood!")).toBeTruthy();
  });

  it("shows first step", () => {
    renderModal();
    expect(screen.getByText(STEPS[0].title)).toBeTruthy();
    expect(screen.getByText(STEPS[0].description)).toBeTruthy();
  });

  it("shows progress dots for 4 steps", () => {
    renderModal();
    const dots = document.querySelectorAll(".rounded-full.w-2");
    expect(dots.length).toBe(4);
  });

  it("disables back button on first step", () => {
    renderModal();
    const backBtn = screen.getByTestId("back-btn");
    expect(backBtn.hasAttribute("disabled")).toBe(true);
  });

  it("advances to next step", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText(STEPS[1].title)).toBeTruthy();
  });

  it("goes back to previous step", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("back-btn"));
    expect(screen.getByText(STEPS[0].title)).toBeTruthy();
  });

  it("shows repo creation options on last step (step 4)", () => {
    renderModal();
    // Advance to step 4 (index 3)
    fireEvent.click(screen.getByTestId("next-btn")); // step 2
    fireEvent.click(screen.getByTestId("next-btn")); // step 3
    fireEvent.click(screen.getByTestId("next-btn")); // step 4

    expect(screen.getByText(STEPS[3].title)).toBeTruthy();
    expect(screen.getByTestId("create-repo-btn")).toBeTruthy();
    expect(screen.getByTestId("skip-repo-btn")).toBeTruthy();
  });

  it("calls onComplete with createRepo: true when Create Repo clicked", () => {
    renderModal();
    // Navigate to last step
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));

    fireEvent.click(screen.getByTestId("create-repo-btn"));
    expect(onComplete).toHaveBeenCalledWith({ createRepo: true });
  });

  it("calls onComplete with createRepo: false when Skip for now clicked", () => {
    renderModal();
    // Navigate to last step
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));

    fireEvent.click(screen.getByTestId("skip-repo-btn"));
    expect(onComplete).toHaveBeenCalledWith({ createRepo: false });
  });

  it("calls onSkip when Skip clicked", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("skip-btn"));
    expect(onSkip).toHaveBeenCalled();
  });

  it("shows tips on each step", () => {
    renderModal();
    expect(screen.getByText(STEPS[0].tip)).toBeTruthy();
  });

  it("navigates through all 4 steps", () => {
    renderModal();
    expect(screen.getByText(STEPS[0].title)).toBeTruthy();
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText(STEPS[1].title)).toBeTruthy();
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText(STEPS[2].title)).toBeTruthy();
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText(STEPS[3].title)).toBeTruthy();
  });

  it("step 4 has Save your progress title", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText("Save your progress")).toBeTruthy();
  });

  it("step 4 mentions gitgood-learning repo", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText(/gitgood-learning/)).toBeTruthy();
  });

  it("does not show Next button on last step", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.queryByTestId("next-btn")).toBeNull();
  });

  it("has 4 steps total", () => {
    expect(STEPS.length).toBe(4);
  });
});

describe("useOnboarding", () => {
  it("returns not complete initially", () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.isComplete()).toBe(false);
  });

  it("returns complete after marking", () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.markComplete();
    });
    expect(result.current.isComplete()).toBe(true);
  });

  it("stores in localStorage", () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.markComplete();
    });
    expect(storage[ONBOARDING_KEY]).toBe("true");
  });
});
