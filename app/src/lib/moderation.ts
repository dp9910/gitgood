/**
 * Content moderation report system.
 * Allows users to flag inappropriate curricula with reasons.
 */

export type ReportReason =
  | "harmful_content"
  | "inaccurate_content"
  | "copyright_violation"
  | "offensive_language"
  | "spam"
  | "other";

export interface ContentReport {
  id: string;
  repoOwner: string;
  repoName: string;
  reason: ReportReason;
  description: string;
  reportedBy: string; // GitHub username
  createdAt: string;
  status: "pending" | "reviewed" | "dismissed";
}

export const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  {
    value: "harmful_content",
    label: "Harmful Content",
    description: "Repository contains malware, exploits, or dangerous instructions",
  },
  {
    value: "inaccurate_content",
    label: "Inaccurate Content",
    description: "AI-generated curriculum contains significant factual errors",
  },
  {
    value: "copyright_violation",
    label: "Copyright Violation",
    description: "Content infringes on intellectual property rights",
  },
  {
    value: "offensive_language",
    label: "Offensive Language",
    description: "Contains hate speech, discriminatory, or inappropriate content",
  },
  {
    value: "spam",
    label: "Spam or Misleading",
    description: "Repository is spam, empty, or misleading about its contents",
  },
  {
    value: "other",
    label: "Other",
    description: "Another issue not listed above",
  },
];

const REPORTS_KEY = "gitgood_content_reports";

// ---------- CRUD ----------

export function getReports(): ContentReport[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(REPORTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getReportsForRepo(owner: string, repo: string): ContentReport[] {
  return getReports().filter(
    (r) => r.repoOwner === owner && r.repoName === repo
  );
}

export function submitReport(
  repoOwner: string,
  repoName: string,
  reason: ReportReason,
  description: string,
  reportedBy: string
): ContentReport {
  if (!description.trim()) {
    throw new Error("Description is required");
  }
  if (description.length > 1000) {
    throw new Error("Description must be under 1000 characters");
  }

  const report: ContentReport = {
    id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    repoOwner,
    repoName,
    reason,
    description: description.trim(),
    reportedBy,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  const reports = getReports();
  reports.push(report);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  return report;
}

export function hasUserReportedRepo(
  owner: string,
  repo: string,
  username: string
): boolean {
  return getReports().some(
    (r) =>
      r.repoOwner === owner &&
      r.repoName === repo &&
      r.reportedBy === username &&
      r.status === "pending"
  );
}

export function getReportCount(): number {
  return getReports().filter((r) => r.status === "pending").length;
}

export function clearReports(): void {
  localStorage.removeItem(REPORTS_KEY);
}
