import { Octokit } from "octokit";
import {
  fetchRepoMetadata,
  fetchFileTree,
  fetchFileContent,
  type RepoMetadata,
  type FileTreeEntry,
} from "./github";

// ---------- Size classification ----------

export type RepoSize = "small" | "medium" | "large" | "massive";

export interface SizeClassification {
  size: RepoSize;
  fileCount: number;
  estimatedLOC: number;
  blocked: boolean;
  message: string;
}

/**
 * Classify a repo based on file count and estimated lines of code.
 * Small: <50 files, <5k LOC
 * Medium: 50-200 files, 5k-20k LOC
 * Large: 200-500 files, 20k-50k LOC
 * Massive: >500 files or >50k LOC
 */
export function classifyRepoSize(
  fileCount: number,
  estimatedLOC: number
): SizeClassification {
  if (fileCount > 500 || estimatedLOC > 50_000) {
    return {
      size: "massive",
      fileCount,
      estimatedLOC,
      blocked: true,
      message:
        "This project is too large for a single learning path. Try one of the smaller alternatives below.",
    };
  }

  if (fileCount > 200 || estimatedLOC > 20_000) {
    return {
      size: "large",
      fileCount,
      estimatedLOC,
      blocked: false,
      message:
        "This is a large project. AI will focus on core modules only (estimated 2-4 weeks).",
    };
  }

  if (fileCount > 50 || estimatedLOC > 5_000) {
    return {
      size: "medium",
      fileCount,
      estimatedLOC,
      blocked: false,
      message: "Good size for learning. Full curriculum will cover all major components.",
    };
  }

  return {
    size: "small",
    fileCount,
    estimatedLOC,
    blocked: false,
    message: "Perfect size for learning. Comprehensive curriculum incoming.",
  };
}

// ---------- Repo type detection ----------

export type RepoType = "tutorial" | "library" | "application" | "research" | "tool";

/**
 * Detect the likely type of repository from metadata and file tree.
 */
export function detectRepoType(
  metadata: RepoMetadata,
  entries: FileTreeEntry[]
): RepoType {
  const desc = (metadata.description ?? "").toLowerCase();
  const topics = metadata.topics.map((t) => t.toLowerCase());
  const paths = entries.map((e) => e.path.toLowerCase());

  // Check for tutorial indicators
  const tutorialSignals = ["tutorial", "course", "learn", "lesson", "workshop", "example"];
  if (tutorialSignals.some((s) => desc.includes(s) || topics.includes(s))) {
    return "tutorial";
  }

  // Check for research/paper indicators
  const researchSignals = ["paper", "arxiv", "research", "experiment", "reproduce"];
  if (researchSignals.some((s) => desc.includes(s) || topics.includes(s))) {
    return "research";
  }

  // Check for CLI/tool indicators
  const toolSignals = ["cli", "tool", "utility", "command-line"];
  const hasBinDir = paths.some((p) => p.startsWith("bin/") || p === "cli.js" || p === "cli.ts");
  if (toolSignals.some((s) => desc.includes(s) || topics.includes(s)) || hasBinDir) {
    return "tool";
  }

  // Check for application indicators (has routes, pages, views)
  const appPaths = ["routes/", "pages/", "views/", "controllers/", "app/", "src/app/"];
  if (appPaths.some((p) => paths.some((fp) => fp.startsWith(p)))) {
    return "application";
  }

  // Default to library
  return "library";
}

// ---------- File selection strategy ----------

/** Files to always skip when analyzing repos. */
const IGNORE_PATTERNS = [
  /^\./, // dotfiles
  /node_modules\//,
  /vendor\//,
  /dist\//,
  /build\//,
  /\.min\./,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.map$/,
  /\.d\.ts$/,
  /__pycache__\//,
  /\.pyc$/,
  /\.egg-info\//,
];

/** Priority files to always fetch when they exist. */
const PRIORITY_FILES = [
  "README.md",
  "readme.md",
  "package.json",
  "requirements.txt",
  "setup.py",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "Makefile",
];

function shouldIgnore(path: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(path));
}

export interface SelectedFiles {
  /** Files to fetch full content for. */
  fetch: string[];
  /** Total code files found (for size estimation). */
  totalCodeFiles: number;
  /** Estimated LOC based on file sizes. */
  estimatedLOC: number;
}

/**
 * Select which files to fetch based on repo size.
 * Small (<20 files): all code files
 * Medium (20-100 files): priority files + representative samples per directory
 * Large (>100 files): priority files + src/lib only
 */
export function selectFilesToFetch(
  entries: FileTreeEntry[],
  size: RepoSize
): SelectedFiles {
  const codeFiles = entries.filter(
    (e) => e.type === "blob" && !shouldIgnore(e.path)
  );

  // Estimate LOC: ~25 LOC per KB average
  const totalBytes = codeFiles.reduce((sum, f) => sum + (f.size ?? 0), 0);
  const estimatedLOC = Math.round((totalBytes / 1024) * 25);

  const fetch: string[] = [];

  // Always include priority files
  for (const pf of PRIORITY_FILES) {
    if (codeFiles.some((e) => e.path === pf || e.path.endsWith(`/${pf}`))) {
      const match = codeFiles.find((e) => e.path === pf || e.path.endsWith(`/${pf}`));
      if (match) fetch.push(match.path);
    }
  }

  if (size === "small") {
    // Fetch everything (up to 50 files)
    for (const f of codeFiles.slice(0, 50)) {
      if (!fetch.includes(f.path)) fetch.push(f.path);
    }
  } else if (size === "medium") {
    // Sample: first 2 files from each top-level directory + all root files
    const dirs = new Map<string, FileTreeEntry[]>();
    for (const f of codeFiles) {
      const dir = f.path.includes("/") ? f.path.split("/")[0] : ".";
      if (!dirs.has(dir)) dirs.set(dir, []);
      dirs.get(dir)!.push(f);
    }
    for (const [, files] of dirs) {
      for (const f of files.slice(0, 2)) {
        if (!fetch.includes(f.path)) fetch.push(f.path);
      }
    }
  } else {
    // Large/massive: only src/ and lib/ directories
    const coreDirs = ["src/", "lib/", "core/", "pkg/"];
    const coreFiles = codeFiles.filter((f) =>
      coreDirs.some((d) => f.path.startsWith(d))
    );
    // Take first 3 files from each core subdirectory
    const dirs = new Map<string, FileTreeEntry[]>();
    for (const f of coreFiles) {
      const parts = f.path.split("/");
      const dir = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
      if (!dirs.has(dir)) dirs.set(dir, []);
      dirs.get(dir)!.push(f);
    }
    for (const [, files] of dirs) {
      for (const f of files.slice(0, 3)) {
        if (!fetch.includes(f.path)) fetch.push(f.path);
      }
    }
  }

  return {
    fetch: fetch.slice(0, 80), // Hard cap at 80 files
    totalCodeFiles: codeFiles.length,
    estimatedLOC,
  };
}

// ---------- Alternative repo suggestions ----------

export interface AlternativeRepo {
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
}

/**
 * Search for smaller alternative repos when the requested one is too large.
 * Searches by the repo's topics, filtered to manageable size.
 */
export async function findAlternatives(
  octokit: Octokit,
  metadata: RepoMetadata
): Promise<AlternativeRepo[]> {
  const topics = metadata.topics.slice(0, 3);
  const language = metadata.language;

  // Build search query
  let query = topics.length > 0
    ? `topic:${topics.join(" topic:")}`
    : metadata.name;

  if (language) query += ` language:${language}`;
  query += " size:<10000"; // < ~10k KB

  try {
    const response = await octokit.rest.search.repos({
      q: query,
      sort: "stars",
      order: "desc",
      per_page: 5,
    });

    return response.data.items
      .filter((r) => r.full_name !== metadata.fullName)
      .slice(0, 5)
      .map((r) => ({
        fullName: r.full_name,
        description: r.description,
        stars: r.stargazers_count,
        language: r.language,
      }));
  } catch {
    return [];
  }
}

// ---------- Full analysis pipeline ----------

export interface RepoAnalysis {
  metadata: RepoMetadata;
  classification: SizeClassification;
  repoType: RepoType;
  selectedFiles: SelectedFiles;
  alternatives: AlternativeRepo[];
  fileContents: Map<string, string>;
}

/**
 * Run the full repo analysis pipeline:
 * 1. Fetch metadata
 * 2. Fetch file tree
 * 3. Classify size
 * 4. Detect type
 * 5. Select files to fetch
 * 6. If blocked (massive), find alternatives
 * 7. If not blocked, fetch selected file contents
 */
export async function analyzeRepo(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<RepoAnalysis> {
  // Step 1-2: parallel metadata + file tree
  const [metaResult, treeResult] = await Promise.all([
    fetchRepoMetadata(octokit, owner, repo),
    fetchFileTree(octokit, owner, repo),
  ]);

  const metadata = metaResult.data;
  const entries = treeResult.entries;

  // Step 3-5: classify, detect type, select files
  const selected = selectFilesToFetch(entries, "small"); // preliminary to get LOC
  const classification = classifyRepoSize(selected.totalCodeFiles, selected.estimatedLOC);
  const repoType = detectRepoType(metadata, entries);

  // Re-select with proper size classification
  const finalSelected = selectFilesToFetch(entries, classification.size);

  // Step 6: if massive, find alternatives and skip file fetching
  if (classification.blocked) {
    const alternatives = await findAlternatives(octokit, metadata);
    return {
      metadata,
      classification,
      repoType,
      selectedFiles: finalSelected,
      alternatives,
      fileContents: new Map(),
    };
  }

  // Step 7: fetch selected file contents (sequential to respect rate limits)
  const fileContents = new Map<string, string>();
  for (const filePath of finalSelected.fetch) {
    try {
      const result = await fetchFileContent(octokit, owner, repo, filePath, {
        maxChars: filePath.toLowerCase().includes("readme") ? 2000 : 5000,
      });
      fileContents.set(filePath, result.content);
    } catch {
      // Skip files that can't be fetched (binary, too large, etc.)
    }
  }

  return {
    metadata,
    classification,
    repoType,
    selectedFiles: finalSelected,
    alternatives: [],
    fileContents,
  };
}
