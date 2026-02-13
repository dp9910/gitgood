/**
 * Dashboard data types and streak calculation utilities.
 */

// ---------- Types ----------

export interface LearningPath {
  repoOwner: string;
  repoName: string;
  fullName: string;
  topicsCompleted: number;
  topicsTotal: number;
  lastTopic: string;
  lastAccessedAt: string;
  language: string;
}

export interface DashboardStats {
  topicsCompleted: number;
  topicsThisWeek: number;
  streakDays: number;
  hoursInvested: number;
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number; // topics completed that day
}

// ---------- Streak Calculation ----------

/**
 * Calculate the current learning streak in days.
 * A streak is maintained if the user completed at least 1 topic each day.
 */
export function calculateStreak(activityDates: string[]): number {
  if (activityDates.length === 0) return 0;

  // Sort dates descending
  const sorted = [...new Set(activityDates)]
    .sort((a, b) => b.localeCompare(a));

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Generate heatmap data for the last N weeks.
 */
export function generateHeatmapData(
  activityDates: string[],
  weeks: number = 12
): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const counts = new Map<string, number>();

  for (const date of activityDates) {
    const day = date.split("T")[0];
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const now = new Date();
  const totalDays = weeks * 7;

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      count: counts.get(dateStr) ?? 0,
    });
  }

  return days;
}

/**
 * Get heatmap cell color based on activity count.
 */
export function getHeatmapColor(count: number): string {
  if (count === 0) return "bg-slate-100 dark:bg-slate-800";
  if (count === 1) return "bg-green-200 dark:bg-green-900";
  if (count <= 3) return "bg-green-400 dark:bg-green-700";
  return "bg-green-600 dark:bg-green-500";
}

/**
 * Calculate total hours from minutes of completed topics.
 */
export function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return hours < 1 ? `${minutes}m` : `${hours.toFixed(1).replace(/\.0$/, "")}h`;
}
