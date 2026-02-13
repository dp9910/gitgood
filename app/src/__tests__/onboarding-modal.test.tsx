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

  it("shows progress dots", () => {
    renderModal();
    // 3 dots for 3 steps
    const dots = document.querySelectorAll(".rounded-full.w-2");
    expect(dots.length).toBe(3);
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

  it("shows Get Started on last step", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByTestId("next-btn").textContent).toContain("Get Started");
  });

  it("calls onComplete when Get Started clicked", () => {
    renderModal();
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(onComplete).toHaveBeenCalled();
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

  it("navigates through all 3 steps", () => {
    renderModal();
    expect(screen.getByText(STEPS[0].title)).toBeTruthy();
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText(STEPS[1].title)).toBeTruthy();
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText(STEPS[2].title)).toBeTruthy();
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
