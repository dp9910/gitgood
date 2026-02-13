import {
  getCacheOctokit,
  fetchFileContent,
  commitFile,
} from "./github";
import type { ExpertiseLevel } from "./material-index";

const MATERIAL_REPO_OWNER = "dp9910";
const MATERIAL_REPO_NAME = "gitgood-learning-material";

// ---------- Path building ----------

/**
 * Build the directory path for a material in the GitHub repo.
 * Repos: "{language}/{owner}--{repo}/"
 * Gists: "{language}/{owner}--{gistId}/"
 */
export function buildMaterialPath(
  language: string,
  owner: string,
  name: string
): string {
  const lang = language.toLowerCase();
  const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "-");
  return `${lang}/${owner}--${safeName}`;
}

/**
 * Build the full file path for a specific course level JSON.
 */
export function buildCoursePath(
  language: string,
  owner: string,
  name: string,
  level: ExpertiseLevel
): string {
  return `${buildMaterialPath(language, owner, name)}/${level}.json`;
}

/**
 * Build the path for the meta.json file.
 */
export function buildMetaPath(
  language: string,
  owner: string,
  name: string
): string {
  return `${buildMaterialPath(language, owner, name)}/meta.json`;
}

// ---------- Read ----------

/**
 * Fetch a course JSON from the material repo.
 * Returns null on 404.
 */
export async function fetchCourse(
  language: string,
  owner: string,
  name: string,
  level: ExpertiseLevel
): Promise<Record<string, unknown> | null> {
  const octokit = getCacheOctokit();
  const path = buildCoursePath(language, owner, name, level);

  try {
    const result = await fetchFileContent(
      octokit,
      MATERIAL_REPO_OWNER,
      MATERIAL_REPO_NAME,
      path,
      { maxChars: 2_000_000 }
    );
    return JSON.parse(result.content);
  } catch {
    return null;
  }
}

/**
 * Fetch meta.json for a material.
 * Returns null on 404.
 */
export async function fetchMeta(
  language: string,
  owner: string,
  name: string
): Promise<Record<string, unknown> | null> {
  const octokit = getCacheOctokit();
  const path = buildMetaPath(language, owner, name);

  try {
    const result = await fetchFileContent(
      octokit,
      MATERIAL_REPO_OWNER,
      MATERIAL_REPO_NAME,
      path,
      { maxChars: 50_000 }
    );
    return JSON.parse(result.content);
  } catch {
    return null;
  }
}

// ---------- Write ----------

/**
 * Save a course JSON to the material repo.
 */
export async function saveCourse(
  language: string,
  owner: string,
  name: string,
  level: ExpertiseLevel,
  course: Record<string, unknown>
): Promise<void> {
  const octokit = getCacheOctokit();
  const path = buildCoursePath(language, owner, name, level);

  // Try to get existing file SHA for update
  let existingSha: string | undefined;
  try {
    const response = await octokit.rest.repos.getContent({
      owner: MATERIAL_REPO_OWNER,
      repo: MATERIAL_REPO_NAME,
      path,
    });
    const data = response.data;
    if (!Array.isArray(data) && "sha" in data) {
      existingSha = data.sha;
    }
  } catch {
    // File doesn't exist yet — create new
  }

  await commitFile(
    octokit,
    MATERIAL_REPO_OWNER,
    MATERIAL_REPO_NAME,
    path,
    JSON.stringify(course, null, 2),
    `Add ${level} course for ${owner}/${name}`,
    { sha: existingSha }
  );
}

/**
 * Save meta.json to the material repo.
 */
export async function saveMeta(
  language: string,
  owner: string,
  name: string,
  meta: Record<string, unknown>
): Promise<void> {
  const octokit = getCacheOctokit();
  const path = buildMetaPath(language, owner, name);

  let existingSha: string | undefined;
  try {
    const response = await octokit.rest.repos.getContent({
      owner: MATERIAL_REPO_OWNER,
      repo: MATERIAL_REPO_NAME,
      path,
    });
    const data = response.data;
    if (!Array.isArray(data) && "sha" in data) {
      existingSha = data.sha;
    }
  } catch {
    // File doesn't exist yet
  }

  await commitFile(
    octokit,
    MATERIAL_REPO_OWNER,
    MATERIAL_REPO_NAME,
    path,
    JSON.stringify(meta, null, 2),
    `Update meta for ${owner}/${name}`,
    { sha: existingSha }
  );
}

export { MATERIAL_REPO_OWNER, MATERIAL_REPO_NAME };
