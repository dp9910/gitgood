import { Octokit } from "octokit";
import {
  getCacheOctokit,
  fetchFileContent,
  commitFile,
} from "./github";

/**
 * Central cache repo where shared curricula are stored.
 * Format: repos/{owner}-{repo}/curriculum.json
 */
const CACHE_REPO_OWNER = "gitgood-platform";
const CACHE_REPO_NAME = "learning-curricula";

export interface CurriculumTopic {
  name: string;
  difficulty: "beginner" | "intermediate" | "expert";
  estimatedMinutes: number;
  prerequisites: string[];
  subtopics: string[];
}

export interface CurriculumCategory {
  name: string;
  description: string;
  topics: CurriculumTopic[];
}

export interface Curriculum {
  repoOwner: string;
  repoName: string;
  categories: CurriculumCategory[];
}

export interface CacheMetadata {
  repoCommitSha: string;
  createdAt: string;
  timesUsed: number;
  averageRating: number | null;
  aiModel: string;
}

export interface CacheHitResult {
  hit: true;
  curriculum: Curriculum;
  metadata: CacheMetadata;
}

export interface CacheMissResult {
  hit: false;
}

export type CacheCheckResult = CacheHitResult | CacheMissResult;

/**
 * Build the cache key path for a given repo.
 * e.g. "karpathy/micrograd" → "repos/karpathy-micrograd"
 */
export function buildCacheKey(owner: string, repo: string): string {
  return `repos/${owner}-${repo}`;
}

/**
 * Check the central cache for an existing curriculum.
 * Returns the curriculum and metadata on hit, or { hit: false } on miss.
 */
export async function checkCache(
  owner: string,
  repo: string
): Promise<CacheCheckResult> {
  const octokit = getCacheOctokit();
  const basePath = buildCacheKey(owner, repo);

  try {
    const [curriculumResult, metadataResult] = await Promise.all([
      fetchFileContent(
        octokit,
        CACHE_REPO_OWNER,
        CACHE_REPO_NAME,
        `${basePath}/curriculum.json`,
        { maxChars: 500_000 }
      ),
      fetchFileContent(
        octokit,
        CACHE_REPO_OWNER,
        CACHE_REPO_NAME,
        `${basePath}/metadata.json`,
        { maxChars: 10_000 }
      ),
    ]);

    const curriculum: Curriculum = JSON.parse(curriculumResult.content);
    const metadata: CacheMetadata = JSON.parse(metadataResult.content);

    return { hit: true, curriculum, metadata };
  } catch {
    // 404 or parse error = cache miss
    return { hit: false };
  }
}

/**
 * Save a newly generated curriculum to the central cache.
 * Called after AI generation so future users get instant results.
 */
export async function saveToCache(
  curriculum: Curriculum,
  repoCommitSha: string,
  aiModel: string
): Promise<void> {
  const octokit = getCacheOctokit();
  const basePath = buildCacheKey(curriculum.repoOwner, curriculum.repoName);

  const metadata: CacheMetadata = {
    repoCommitSha,
    createdAt: new Date().toISOString(),
    timesUsed: 1,
    averageRating: null,
    aiModel,
  };

  // Save both files (order doesn't matter, run in parallel)
  await Promise.all([
    commitFile(
      octokit,
      CACHE_REPO_OWNER,
      CACHE_REPO_NAME,
      `${basePath}/curriculum.json`,
      JSON.stringify(curriculum, null, 2),
      `Add curriculum for ${curriculum.repoOwner}/${curriculum.repoName}`
    ),
    commitFile(
      octokit,
      CACHE_REPO_OWNER,
      CACHE_REPO_NAME,
      `${basePath}/metadata.json`,
      JSON.stringify(metadata, null, 2),
      `Add metadata for ${curriculum.repoOwner}/${curriculum.repoName}`
    ),
  ]);
}

/**
 * Increment the times_used counter for a cached curriculum.
 * Called when a user loads a cached curriculum.
 */
export async function incrementCacheUsage(
  owner: string,
  repo: string,
  currentMetadata: CacheMetadata
): Promise<void> {
  const octokit = getCacheOctokit();
  const basePath = buildCacheKey(owner, repo);
  const metadataPath = `${basePath}/metadata.json`;

  // Fetch the current file SHA (needed for updates)
  let fileSha: string | undefined;
  try {
    const response = await octokit.rest.repos.getContent({
      owner: CACHE_REPO_OWNER,
      repo: CACHE_REPO_NAME,
      path: metadataPath,
    });
    const data = response.data;
    if (!Array.isArray(data) && "sha" in data) {
      fileSha = data.sha;
    }
  } catch {
    // File doesn't exist — nothing to increment
    return;
  }

  const updated: CacheMetadata = {
    ...currentMetadata,
    timesUsed: currentMetadata.timesUsed + 1,
  };

  await commitFile(
    octokit,
    CACHE_REPO_OWNER,
    CACHE_REPO_NAME,
    metadataPath,
    JSON.stringify(updated, null, 2),
    `Update usage count for ${owner}/${repo}`,
    { sha: fileSha }
  );
}

/**
 * Clone a cached curriculum into the user's learning-tracker repo.
 * Creates: {repo}-learning/curriculum.json, progress.json, metadata.json
 */
export async function cloneToUserRepo(
  userOctokit: Octokit,
  username: string,
  curriculum: Curriculum,
  cacheMetadata: CacheMetadata,
  userPreferences: { level: string; goal: string; timeCommitment: string }
): Promise<void> {
  const repoName = "learning-tracker";
  const folder = `${curriculum.repoOwner}-${curriculum.repoName}`;

  // Build initial progress (all topics "not_started")
  const progress: Record<string, string> = {};
  for (const category of curriculum.categories) {
    for (const topic of category.topics) {
      progress[topic.name] = "not_started";
    }
  }

  const userMetadata = {
    source: "cache",
    cacheCommitSha: cacheMetadata.repoCommitSha,
    startedAt: new Date().toISOString(),
    preferences: userPreferences,
  };

  // Commit all three files (sequential — GitHub content API doesn't support batch)
  await commitFile(
    userOctokit,
    username,
    repoName,
    `${folder}/curriculum.json`,
    JSON.stringify(curriculum, null, 2),
    `Start learning ${curriculum.repoOwner}/${curriculum.repoName}`
  );

  await commitFile(
    userOctokit,
    username,
    repoName,
    `${folder}/progress.json`,
    JSON.stringify(progress, null, 2),
    `Initialize progress for ${curriculum.repoOwner}/${curriculum.repoName}`
  );

  await commitFile(
    userOctokit,
    username,
    repoName,
    `${folder}/metadata.json`,
    JSON.stringify(userMetadata, null, 2),
    `Add metadata for ${curriculum.repoOwner}/${curriculum.repoName}`
  );
}

export { CACHE_REPO_OWNER, CACHE_REPO_NAME };
