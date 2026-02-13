import { describe, it, expect, beforeEach } from "vitest";
import {
  track,
  trackPageView,
  trackCurriculumGenerated,
  trackTopicCompleted,
  trackApiError,
  trackCacheHit,
  trackCacheMiss,
  getStoredEvents,
  getEventsByCategory,
  getEventCount,
  clearEvents,
  getCacheHitRate,
  getSessionId,
  getSession,
  resetSession,
  EVENTS,
} from "../lib/analytics";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetSession();
});

describe("track", () => {
  it("creates an event with correct fields", () => {
    const event = track("test_event", "navigation", { page: "/home" });
    expect(event.name).toBe("test_event");
    expect(event.category).toBe("navigation");
    expect(event.properties.page).toBe("/home");
    expect(event.timestamp).toBeTruthy();
    expect(event.sessionId).toContain("s_");
  });

  it("stores events in localStorage", () => {
    track("event1", "navigation");
    track("event2", "learning");
    expect(getStoredEvents()).toHaveLength(2);
  });

  it("trims events to max 500", () => {
    for (let i = 0; i < 510; i++) {
      track(`event_${i}`, "system");
    }
    expect(getStoredEvents()).toHaveLength(500);
  });
});

describe("trackPageView", () => {
  it("tracks a page view event", () => {
    const event = trackPageView("/dashboard");
    expect(event.name).toBe(EVENTS.PAGE_VIEW);
    expect(event.category).toBe("navigation");
    expect(event.properties.path).toBe("/dashboard");
  });

  it("increments session page views", () => {
    trackPageView("/home");
    trackPageView("/browse");
    const session = getSession();
    expect(session?.pageViews).toBe(2);
  });
});

describe("trackCurriculumGenerated", () => {
  it("tracks with repo and cache status", () => {
    const event = trackCurriculumGenerated("karpathy/micrograd", true);
    expect(event.name).toBe(EVENTS.CURRICULUM_GENERATED);
    expect(event.properties.repo).toBe("karpathy/micrograd");
    expect(event.properties.cached).toBe(true);
  });
});

describe("trackTopicCompleted", () => {
  it("tracks topic completion", () => {
    const event = trackTopicCompleted("karpathy/micrograd", "backprop");
    expect(event.name).toBe(EVENTS.TOPIC_COMPLETED);
    expect(event.properties.topic).toBe("backprop");
  });
});

describe("trackApiError", () => {
  it("tracks API errors", () => {
    const event = trackApiError("/api/chat", 429);
    expect(event.name).toBe(EVENTS.API_ERROR);
    expect(event.category).toBe("error");
    expect(event.properties.status).toBe(429);
  });
});

describe("getEventsByCategory", () => {
  it("filters by category", () => {
    track("nav1", "navigation");
    track("learn1", "learning");
    track("nav2", "navigation");
    track("err1", "error");
    expect(getEventsByCategory("navigation")).toHaveLength(2);
    expect(getEventsByCategory("learning")).toHaveLength(1);
    expect(getEventsByCategory("error")).toHaveLength(1);
  });
});

describe("getEventCount", () => {
  it("returns total event count", () => {
    track("a", "system");
    track("b", "system");
    track("c", "system");
    expect(getEventCount()).toBe(3);
  });

  it("returns 0 with no events", () => {
    expect(getEventCount()).toBe(0);
  });
});

describe("clearEvents", () => {
  it("removes all stored events", () => {
    track("a", "system");
    track("b", "system");
    clearEvents();
    expect(getStoredEvents()).toHaveLength(0);
  });
});

describe("session management", () => {
  it("creates a session ID", () => {
    const id = getSessionId();
    expect(id).toContain("s_");
  });

  it("returns the same session ID within a session", () => {
    const id1 = getSessionId();
    const id2 = getSessionId();
    expect(id1).toBe(id2);
  });

  it("tracks session events count", () => {
    track("event1", "system");
    track("event2", "system");
    const session = getSession();
    expect(session?.events).toBe(2);
  });
});

describe("getCacheHitRate", () => {
  it("calculates percentage", () => {
    trackCacheHit("repo1");
    trackCacheHit("repo2");
    trackCacheHit("repo3");
    trackCacheMiss("repo4");
    expect(getCacheHitRate()).toBe(75);
  });

  it("returns 0 with no cache events", () => {
    expect(getCacheHitRate()).toBe(0);
  });

  it("returns 100 with all hits", () => {
    trackCacheHit("repo1");
    trackCacheHit("repo2");
    expect(getCacheHitRate()).toBe(100);
  });
});

describe("EVENTS", () => {
  it("has all expected event names", () => {
    expect(EVENTS.PAGE_VIEW).toBe("page_view");
    expect(EVENTS.CURRICULUM_GENERATED).toBe("curriculum_generated");
    expect(EVENTS.TOPIC_COMPLETED).toBe("topic_completed");
    expect(EVENTS.CHAT_MESSAGE_SENT).toBe("chat_message_sent");
    expect(EVENTS.CACHE_HIT).toBe("cache_hit");
    expect(EVENTS.API_ERROR).toBe("api_error");
    expect(EVENTS.SESSION_START).toBe("session_start");
  });
});
