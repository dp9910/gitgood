import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";

// Track the auth state change callback
let authCallback: ((user: unknown) => void) | null = null;

vi.mock("@/lib/firebase-client", () => ({
  onAuthChange: vi.fn((cb: (user: unknown) => void) => {
    authCallback = cb;
    return vi.fn(); // unsubscribe
  }),
  signInWithGitHub: vi.fn(),
  signOut: vi.fn(),
}));

import { AuthProvider, useAuth } from "@/lib/auth-context";

function TestConsumer() {
  const { user, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.uid : "null"}</span>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authCallback = null;
});

afterEach(() => {
  cleanup();
});

describe("AuthProvider", () => {
  it("starts in loading state", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("loading").textContent).toBe("true");
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("provides user when auth state changes to signed in", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Simulate Firebase reporting a signed-in user
    await act(async () => {
      authCallback?.({ uid: "user-789", email: "test@test.com" });
    });

    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("user-789");
  });

  it("provides null user when auth state changes to signed out", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Simulate Firebase reporting no user
    await act(async () => {
      authCallback?.(null);
    });

    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("user").textContent).toBe("null");
  });
});

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );

    consoleSpy.mockRestore();
  });
});
