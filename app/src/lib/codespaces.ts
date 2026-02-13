/**
 * GitHub Codespaces integration utilities.
 * Generates deep links for opening repos in Codespaces.
 */

export interface CodespaceConfig {
  owner: string;
  repo: string;
  branch?: string;
  filePath?: string;
}

/**
 * Generate a Codespace URL using GitHub's official deep link format.
 * This opens a new Codespace for the given repository.
 */
export function getCodespaceUrl(config: CodespaceConfig): string {
  const { owner, repo, branch = "main" } = config;
  const base = `https://codespaces.new/${owner}/${repo}`;
  const params = new URLSearchParams({ quickstart: "1", ref: branch });
  return `${base}?${params.toString()}`;
}

/**
 * Generate a GitHub.dev URL (lightweight browser editor, no compute).
 * Opens the repo in VS Code for the web — instant, no Codespace needed.
 */
export function getGithubDevUrl(config: CodespaceConfig): string {
  const { owner, repo, branch = "main", filePath } = config;
  const base = `https://github.dev/${owner}/${repo}`;
  if (filePath) {
    return `${base}/blob/${branch}/${filePath}`;
  }
  return `${base}/tree/${branch}`;
}

/**
 * Generate the standard GitHub repo URL.
 */
export function getGithubUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`;
}

/**
 * Estimate user's free Codespace hours remaining.
 * GitHub Free: 60 core-hours/month, Pro: 120 core-hours/month.
 */
export function estimateFreeHours(plan: "free" | "pro" = "free"): {
  totalHours: number;
  machineType: string;
  description: string;
} {
  const totalCoreHours = plan === "pro" ? 120 : 60;
  // 2-core machine is default
  const totalHours = totalCoreHours / 2;
  return {
    totalHours,
    machineType: "2-core",
    description: `${totalHours} hours/month free on a ${plan === "pro" ? "Pro" : "Free"} plan (2-core machine)`,
  };
}

/**
 * Check if Codespaces is supported for a repo.
 * Public repos are always supported.
 */
export function isCodespacesSupported(isPublic: boolean): boolean {
  return isPublic;
}
