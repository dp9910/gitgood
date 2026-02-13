import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatPanel from "../components/chat-panel";

describe("ChatPanel", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  function renderPanel() {
    return render(
      <ChatPanel
        topicName="Backpropagation"
        categoryName="Foundations"
        repoFullName="karpathy/micrograd"
        level="intermediate"
        onClose={onClose}
      />
    );
  }

  it("renders chat panel", () => {
    renderPanel();
    expect(screen.getByTestId("chat-panel")).toBeTruthy();
  });

  it("shows AI Tutor header", () => {
    renderPanel();
    expect(screen.getByText("AI Tutor")).toBeTruthy();
  });

  it("shows welcome message with topic name", () => {
    renderPanel();
    expect(screen.getByText(/Backpropagation/)).toBeTruthy();
  });

  it("shows quick action buttons", () => {
    renderPanel();
    expect(screen.getByText("Quiz me")).toBeTruthy();
    expect(screen.getByText("ELI5")).toBeTruthy();
    expect(screen.getByText("Example")).toBeTruthy();
    expect(screen.getByText("Challenge")).toBeTruthy();
  });

  it("shows text input", () => {
    renderPanel();
    expect(screen.getByPlaceholderText("Ask anything...")).toBeTruthy();
  });

  it("calls onClose when close button clicked", () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText("Close AI tutor"));
    expect(onClose).toHaveBeenCalled();
  });

  it("sends message on enter key", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: "AI says hello", remaining: 99 }),
    });

    renderPanel();
    const textarea = screen.getByPlaceholderText("Ask anything...");
    fireEvent.change(textarea, { target: { value: "test question" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    // Should show user message
    expect(screen.getByText("test question")).toBeTruthy();
  });

  it("shows send button", () => {
    renderPanel();
    const sendBtns = document.querySelectorAll(".material-icons");
    const sendTexts = Array.from(sendBtns).map((el) => el.textContent);
    expect(sendTexts).toContain("send");
  });

  it("has message area", () => {
    renderPanel();
    expect(screen.getByTestId("chat-messages")).toBeTruthy();
  });
});
