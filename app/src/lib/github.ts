import { Octokit } from "octokit";
import { getServerEnv } from "./env";

const RATE_LIMIT_WARNING_THRESHOLD = 500;

// ---------- Client factories ----------

let cacheOctokit: Octokit | undefined;

/** Octokit using server PAT — only for central cache repo operations. */
export function getCacheOctokit(): Octokit {
  if (cacheOctokit) return cacheOctokit;
  const env = getServerEnv();
  cacheOctokit = new Octokit({ auth: env.GITHUB_PERSONAL_TOKEN });
  return cacheOctokit;
}

/** Octokit using a user's token — for user-scoped operations. */
export function getUserOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

// ---------- Types ----------

export interface RepoMetadata {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  size: number;
  defaultBranch: string;
  updatedAt: string;
  topics: string[];
}

export interface FileTreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  warning: boolean;
}

// ---------- Parse ----------

/**
 * Extract owner and repo name from a GitHub URL.
 * Supports: github.com/owner/repo, with optional .git, branches, etc.
 */
export function parseRepoUrl(
  url: string
): { owner: string; repo: string } | null {
  // Handle "owner/repo" shorthand
  const shorthandMatch = url.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (shorthandMatch) {
    return { owner: shorthandMatch[1], repo: shorthandMatch[2] };
  }

  // Handle full URLs
  const urlMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/
  );
  if (!urlMatch) return null;

  // Strip .git suffix if present
  const repo = urlMatch[2].replace(/\.git$/, "");
  return { owner: urlMatch[1], repo };
}

// ---------- Rate limit ----------

function extractRateLimit(
  headers: Record<string, string | undefined>
): RateLimitInfo {
  const limit = parseInt(headers["x-ratelimit-limit"] ?? "5000", 10);
  const remaining = parseInt(headers["x-ratelimit-remaining"] ?? "5000", 10);
  const resetEpoch = parseInt(headers["x-ratelimit-reset"] ?? "0", 10);

  return {
    limit,
    remaining,
    resetAt: new Date(resetEpoch * 1000),
    warning: remaining < RATE_LIMIT_WARNING_THRESHOLD,
  };
}

// ---------- API methods ----------

/**
 * Fetch repository metadata.
 */
export async function fetchRepoMetadata(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<{ data: RepoMetadata; rateLimit: RateLimitInfo }> {
  const response = await octokit.rest.repos.get({ owner, repo });

  const rateLimit = extractRateLimit(
    response.headers as Record<string, string | undefined>
  );

  return {
    data: {
      owner: response.data.owner.login,
      name: response.data.name,
      fullName: response.data.full_name,
      description: response.data.description,
      language: response.data.language,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      size: response.data.size,
      defaultBranch: response.data.default_branch,
      updatedAt: response.data.updated_at,
      topics: response.data.topics ?? [],
    },
    rateLimit,
  };
}

/**
 * Fetch the file tree for a repository.
 * Uses recursive git tree API for efficiency.
 * Limits to maxEntries to avoid massive repos flooding memory.
 */
export async function fetchFileTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  options?: { sha?: string; maxEntries?: number }
): Promise<{ entries: FileTreeEntry[]; truncated: boolean; rateLimit: RateLimitInfo }> {
  const sha = options?.sha ?? "HEAD";
  const maxEntries = options?.maxEntries ?? 1000;

  const response = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: sha,
    recursive: "true",
  });

  const rateLimit = extractRateLimit(
    response.headers as Record<string, string | undefined>
  );

  const allEntries: FileTreeEntry[] = (response.data.tree ?? []).map(
    (item) => ({
      path: item.path ?? "",
      type: item.type as "blob" | "tree",
      size: item.size,
    })
  );

  const limited = allEntries.slice(0, maxEntries);

  return {
    entries: limited,
    truncated:
      (response.data.truncated ?? false) || allEntries.length > maxEntries,
    rateLimit,
  };
}

/**
 * Fetch the contents of a single file.
 * Returns the decoded UTF-8 content, truncated to maxChars.
 */
export async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  options?: { maxChars?: number; ref?: string }
): Promise<{ content: string; truncated: boolean; rateLimit: RateLimitInfo }> {
  const maxChars = options?.maxChars ?? 10000;

  const response = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ref: options?.ref,
  });

  const rateLimit = extractRateLimit(
    response.headers as Record<string, string | undefined>
  );

  const data = response.data;

  // getContent can return file or directory
  if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
    throw new Error(`Path "${path}" is not a file`);
  }

  const decoded = Buffer.from(data.content, "base64").toString("utf-8");
  const truncated = decoded.length > maxChars;

  return {
    content: truncated ? decoded.slice(0, maxChars) : decoded,
    truncated,
    rateLimit,
  };
}

/**
 * Create a repository in the user's account.
 */
export async function createRepo(
  octokit: Octokit,
  name: string,
  options?: { description?: string; isPrivate?: boolean }
): Promise<{ fullName: string; rateLimit: RateLimitInfo }> {
  const response = await octokit.rest.repos.createForAuthenticatedUser({
    name,
    description: options?.description,
    private: options?.isPrivate ?? true,
    auto_init: true,
  });

  const rateLimit = extractRateLimit(
    response.headers as Record<string, string | undefined>
  );

  return {
    fullName: response.data.full_name,
    rateLimit,
  };
}

/**
 * Create or update a file in a repo.
 */
export async function commitFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  options?: { sha?: string; branch?: string }
): Promise<{ sha: string; rateLimit: RateLimitInfo }> {
  const response = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    sha: options?.sha,
    branch: options?.branch,
  });

  const rateLimit = extractRateLimit(
    response.headers as Record<string, string | undefined>
  );

  return {
    sha: response.data.content?.sha ?? "",
    rateLimit,
  };
}

// ---------- Gist support ----------

export interface GistInfo {
  owner: string;
  gistId: string;
}

export interface GistContent {
  owner: string;
  gistId: string;
  description: string;
  files: { filename: string; language: string | null; content: string }[];
}

/**
 * Parse a GitHub Gist URL into owner and gist ID.
 * Supports: gist.github.com/owner/id, with optional file hash.
 */
export function parseGistUrl(url: string): GistInfo | null {
  const match = url.match(
    /(?:https?:\/\/)?gist\.github\.com\/([a-zA-Z0-9_.-]+)\/([a-f0-9]+)/
  );
  if (!match) return null;
  return { owner: match[1], gistId: match[2] };
}

/**
 * Fetch all files from a gist.
 */
export async function fetchGistContent(
  octokit: Octokit,
  gistId: string
): Promise<GistContent> {
  const response = await octokit.rest.gists.get({ gist_id: gistId });
  const gist = response.data;

  const owner = gist.owner?.login ?? "unknown";
  const description = gist.description ?? "";
  const files = Object.values(gist.files ?? {})
    .filter((f): f is NonNullable<typeof f> => f != null)
    .map((f) => ({
      filename: f.filename ?? "unknown",
      language: f.language ?? null,
      content: f.content ?? "",
    }));

  return { owner, gistId, description, files };
}

export { RATE_LIMIT_WARNING_THRESHOLD };
