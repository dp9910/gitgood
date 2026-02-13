/**
 * Client-side analytics event tracking.
 * Prepares events for PostHog/Mixpanel integration.
 * In MVP, events are stored in localStorage for debugging.
 */

// ---------- Types ----------

export type EventCategory =
  | "navigation"
  | "learning"
  | "ai"
  | "engagement"
  | "error"
  | "system";

export interface AnalyticsEvent {
  name: string;
  category: EventCategory;
  properties: Record<string, string | number | boolean>;
  timestamp: string;
  sessionId: string;
}

export interface SessionInfo {
  id: string;
  startedAt: string;
  pageViews: number;
  events: number;
}

// ---------- Event Names ----------

export const EVENTS = {
  // Navigation
  PAGE_VIEW: "page_view",
  NAV_CLICK: "nav_click",

  // Learning
  CURRICULUM_GENERATED: "curriculum_generated",
  TOPIC_STARTED: "topic_started",
  TOPIC_COMPLETED: "topic_completed",
  QUIZ_STARTED: "quiz_started",
  QUIZ_COMPLETED: "quiz_completed",
  CHALLENGE_STARTED: "challenge_started",
  LEVEL_CHANGED: "level_changed",

  // AI
  CHAT_MESSAGE_SENT: "chat_message_sent",
  QUICK_ACTION_USED: "quick_action_used",
  CONTENT_GENERATED: "content_generated",

  // Engagement
  NOTE_CREATED: "note_created",
  BOOKMARK_ADDED: "bookmark_added",
  REPO_SEARCHED: "repo_searched",
  EXPORT_DATA: "export_data",
  SETTINGS_CHANGED: "settings_changed",

  // Error
  API_ERROR: "api_error",
  RATE_LIMITED: "rate_limited",

  // System
  CACHE_HIT: "cache_hit",
  CACHE_MISS: "cache_miss",
  SESSION_START: "session_start",
  SESSION_END: "session_end",
} as const;

// ---------- Session ----------

const SESSION_KEY = "gitgood_analytics_session";
const EVENTS_KEY = "gitgood_analytics_events";
const MAX_STORED_EVENTS = 500;

let currentSessionId: string | null = null;

export function getSessionId(): string {
  if (currentSessionId) return currentSessionId;

  if (typeof window === "undefined") return "server";

  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      const session: SessionInfo = JSON.parse(stored);
      currentSessionId = session.id;
      return session.id;
    } catch {
      // Corrupt, create new
    }
  }

  // New session
  currentSessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session: SessionInfo = {
    id: currentSessionId,
    startedAt: new Date().toISOString(),
    pageViews: 0,
    events: 0,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return currentSessionId;
}

export function getSession(): SessionInfo | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function updateSessionCounters(isPageView: boolean): void {
  const session = getSession();
  if (!session) return;
  session.events += 1;
  if (isPageView) session.pageViews += 1;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// ---------- Track ----------

export function track(
  name: string,
  category: EventCategory,
  properties: Record<string, string | number | boolean> = {}
): AnalyticsEvent {
  const event: AnalyticsEvent = {
    name,
    category,
    properties,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
  };

  // Store locally for debugging / future batch upload
  if (typeof window !== "undefined") {
    const events = getStoredEvents();
    events.push(event);
    // Trim to max
    const trimmed = events.slice(-MAX_STORED_EVENTS);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
    updateSessionCounters(name === EVENTS.PAGE_VIEW);
  }

  return event;
}

// ---------- Convenience Trackers ----------

export function trackPageView(path: string): AnalyticsEvent {
  return track(EVENTS.PAGE_VIEW, "navigation", { path });
}

export function trackCurriculumGenerated(repo: string, cached: boolean): AnalyticsEvent {
  return track(EVENTS.CURRICULUM_GENERATED, "learning", { repo, cached });
}

export function trackTopicCompleted(repo: string, topic: string): AnalyticsEvent {
  return track(EVENTS.TOPIC_COMPLETED, "learning", { repo, topic });
}

export function trackApiError(endpoint: string, status: number): AnalyticsEvent {
  return track(EVENTS.API_ERROR, "error", { endpoint, status });
}

export function trackCacheHit(repo: string): AnalyticsEvent {
  return track(EVENTS.CACHE_HIT, "system", { repo });
}

export function trackCacheMiss(repo: string): AnalyticsEvent {
  return track(EVENTS.CACHE_MISS, "system", { repo });
}

// ---------- Retrieval ----------

export function getStoredEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(EVENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getEventsByCategory(category: EventCategory): AnalyticsEvent[] {
  return getStoredEvents().filter((e) => e.category === category);
}

export function getEventCount(): number {
  return getStoredEvents().length;
}

export function clearEvents(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(EVENTS_KEY);
  }
}

export function resetSession(): void {
  currentSessionId = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

// ---------- Metrics ----------

export function getCacheHitRate(): number {
  const events = getStoredEvents();
  const hits = events.filter((e) => e.name === EVENTS.CACHE_HIT).length;
  const misses = events.filter((e) => e.name === EVENTS.CACHE_MISS).length;
  const total = hits + misses;
  if (total === 0) return 0;
  return Math.round((hits / total) * 100);
}
