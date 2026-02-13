/**
 * Data export & portability utilities.
 * Export learning progress, notes, bookmarks as JSON or Markdown.
 */

import { getNotes, getBookmarks, exportNotesAsMarkdown } from "./notes";

// ---------- Types ----------

export interface ProgressExport {
  exportedAt: string;
  version: string;
  repos: RepoProgress[];
}

export interface RepoProgress {
  owner: string;
  repo: string;
  completedTopics: string[];
  totalTopics: number;
  percentage: number;
  lastStudied: string;
}

export interface FullExport {
  exportedAt: string;
  version: string;
  progress: RepoProgress[];
  notes: ReturnType<typeof getNotes>;
  bookmarks: ReturnType<typeof getBookmarks>;
}

// ---------- Progress from localStorage ----------

const PROGRESS_PREFIX = "gitgood_progress_";

export function getProgressData(): RepoProgress[] {
  if (typeof window === "undefined") return [];

  const repos: RepoProgress[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PROGRESS_PREFIX)) continue;

    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const data = JSON.parse(raw);
      const parts = key.replace(PROGRESS_PREFIX, "").split("_");
      if (parts.length < 2) continue;

      const owner = parts[0];
      const repo = parts.slice(1).join("_");
      const completedTopics = Array.isArray(data.completed) ? data.completed : [];
      const totalTopics = typeof data.total === "number" ? data.total : completedTopics.length;

      repos.push({
        owner,
        repo,
        completedTopics,
        totalTopics,
        percentage: totalTopics > 0 ? Math.round((completedTopics.length / totalTopics) * 100) : 0,
        lastStudied: data.lastStudied || new Date().toISOString(),
      });
    } catch {
      // Skip corrupt entries
    }
  }

  return repos;
}

// ---------- Export Functions ----------

export function exportProgressAsJson(): string {
  const data: ProgressExport = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    repos: getProgressData(),
  };
  return JSON.stringify(data, null, 2);
}

export function exportNotesForRepo(owner: string, repo: string): string {
  return exportNotesAsMarkdown(owner, repo);
}

export function exportBookmarksAsJson(owner: string, repo: string): string {
  const bookmarks = getBookmarks(owner, repo);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      repo: `${owner}/${repo}`,
      bookmarks,
    },
    null,
    2
  );
}

export function exportAllData(owner: string, repo: string): string {
  const data: FullExport = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    progress: getProgressData(),
    notes: getNotes(owner, repo),
    bookmarks: getBookmarks(owner, repo),
  };
  return JSON.stringify(data, null, 2);
}

// ---------- Download Helper ----------

export function downloadAsFile(content: string, filename: string, mimeType: string = "application/json"): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadProgress(): void {
  const json = exportProgressAsJson();
  downloadAsFile(json, "gitgood-progress.json");
}

export function downloadNotes(owner: string, repo: string): void {
  const md = exportNotesForRepo(owner, repo);
  downloadAsFile(md, `gitgood-notes-${owner}-${repo}.md`, "text/markdown");
}

export function downloadBookmarks(owner: string, repo: string): void {
  const json = exportBookmarksAsJson(owner, repo);
  downloadAsFile(json, `gitgood-bookmarks-${owner}-${repo}.json`);
}

export function downloadAllData(owner: string, repo: string): void {
  const json = exportAllData(owner, repo);
  downloadAsFile(json, "gitgood-export-all.json");
}
