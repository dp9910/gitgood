import { GoogleGenAI, Type } from "@google/genai";
import { getServerEnv } from "./env";
import { getAdminFirestore } from "./firebase-admin";
import { CURATED_REPOS, type CuratedRepo } from "./curated-repos";

// ---------- Client ----------

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  if (client) return client;
  const env = getServerEnv();
  client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

/** Reset singleton — only for testing. */
export function _resetClient() {
  client = undefined;
}

// ---------- Constants ----------

const MODEL = "gemini-2.0-flash";
const SUMMARY_MAX_TOKENS = 800;
const README_MAX_CHARS = 6000;
const COLLECTION = "summaries";

/** Bump this when the summary generation logic changes significantly. */
const SUMMARY_VERSION = 3;

// ---------- Types ----------

export interface CourseSummary {
  tagline: string;
  about: string;
  whyLearn: string;
  youWillLearn: string[];
  prerequisites: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  language: string;
  estimatedMinutes: number;
}

export interface SummaryRecord {
  owner: string;
  name: string;
  repoUrl: string;
  summary: CourseSummary;
  generatedAt: string;
  version?: number;
}

// ---------- Schema ----------

const summarySchema = {
  type: Type.OBJECT,
  properties: {
    tagline: { type: Type.STRING },
    about: { type: Type.STRING },
    whyLearn: { type: Type.STRING },
    youWillLearn: { type: Type.ARRAY, items: { type: Type.STRING } },
    prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
    difficulty: {
      type: Type.STRING,
      enum: ["beginner", "intermediate", "advanced"],
    },
    language: { type: Type.STRING },
    estimatedMinutes: { type: Type.NUMBER },
  },
  required: [
    "tagline",
    "about",
    "whyLearn",
    "youWillLearn",
    "prerequisites",
    "difficulty",
    "language",
    "estimatedMinutes",
  ],
};

// ---------- Document ID ----------

export function buildSummaryDocId(owner: string, name: string): string {
  const sanitize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  return `${sanitize(owner)}_${sanitize(name)}`;
}

// ---------- Firestore CRUD ----------

export async function lookupSummary(
  docId: string
): Promise<SummaryRecord | null> {
  const db = getAdminFirestore();
  const snap = await db.collection(COLLECTION).doc(docId).get();
  if (!snap.exists) return null;
  return snap.data() as SummaryRecord;
}

export async function saveSummary(
  docId: string,
  record: SummaryRecord
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(docId).set(record);
}

// ---------- Curated Repo Shortcut ----------

/**
 * Find a curated repo by owner/name (case-insensitive).
 * Returns null if the repo is not in the curated list.
 */
export function findCuratedRepo(
  owner: string,
  name: string
): CuratedRepo | null {
  return (
    CURATED_REPOS.find(
      (r) =>
        r.owner.toLowerCase() === owner.toLowerCase() &&
        r.name.toLowerCase() === name.toLowerCase()
    ) ?? null
  );
}

/**
 * Build a CourseSummary from curated repo metadata — no Gemini needed.
 * Uses the pre-authored description, topics, difficulty, and language.
 */
export function buildSummaryFromCurated(repo: CuratedRepo): CourseSummary {
  const starLabel =
    repo.stars >= 100000
      ? `${Math.round(repo.stars / 1000)}k+`
      : `${(repo.stars / 1000).toFixed(1)}k`;

  const youWillLearn = [
    ...repo.topics.map(
      (t) => `${t.charAt(0).toUpperCase() + t.slice(1)} concepts and implementation`
    ),
    `${repo.language} best practices from production code`,
    `Reading and navigating real-world codebases`,
  ].slice(0, 6);

  const prerequisites: string[] = [`Basic ${repo.language} syntax`];
  if (repo.difficulty === "intermediate") {
    prerequisites.push(
      `Familiarity with ${repo.topics[0] || repo.category.toLowerCase()}`
    );
    prerequisites.push("Command line basics");
  } else if (repo.difficulty === "advanced") {
    prerequisites.push(`Strong ${repo.language} experience`);
    prerequisites.push(
      `Understanding of ${repo.topics[0] || repo.category.toLowerCase()}`
    );
    prerequisites.push("Software engineering fundamentals");
  }

  return {
    tagline: repo.description,
    about: `${repo.description}. This ${repo.difficulty}-level ${repo.language} repository covers ${repo.topicCount} topics including ${repo.topics.join(", ")}, making it an excellent resource for learning ${repo.language}.`,
    whyLearn: `With ${starLabel} GitHub stars, this is one of the most trusted ${repo.category.toLowerCase()} resources. Studying real-world ${repo.language} codebases builds practical skills that tutorials alone cannot provide.`,
    youWillLearn,
    prerequisites,
    difficulty: repo.difficulty,
    language: repo.language,
    estimatedMinutes: repo.estimatedHours * 60,
  };
}

// ---------- Content Fetching ----------

const CODE_EXTENSIONS = [
  ".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".rs", ".rb", ".java",
  ".c", ".cpp", ".h", ".swift", ".kt", ".scala", ".r", ".jl",
];

export async function fetchReadme(
  owner: string,
  name: string
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${name}/HEAD/README.md`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, README_MAX_CHARS);
  } catch {
    return null;
  }
}

/**
 * Fetch repo metadata + top-level code files from GitHub API.
 * Used as fallback when no README exists.
 * Returns a text blob with repo description + code snippets.
 */
export async function fetchCodeContext(
  owner: string,
  name: string
): Promise<string | null> {
  const env = getServerEnv();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "gitgood",
  };
  if (env.GITHUB_PERSONAL_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_PERSONAL_TOKEN}`;
  }

  try {
    // 1. Get repo metadata (description, language, topics)
    const repoRes = await fetch(
      `https://api.github.com/repos/${owner}/${name}`,
      { headers }
    );

    let description = "";
    let language = "";
    let topics: string[] = [];

    if (repoRes.ok) {
      const repo = await repoRes.json();
      description = repo.description ?? "";
      language = repo.language ?? "";
      topics = repo.topics ?? [];
    }

    // 2. Get top-level file listing
    const contentsRes = await fetch(
      `https://api.github.com/repos/${owner}/${name}/contents/`,
      { headers }
    );

    if (!contentsRes.ok) return null;

    const files = (await contentsRes.json()) as {
      name: string;
      type: string;
      size: number;
      download_url: string | null;
    }[];

    // 3. Pick code files to sample (prefer small files, max 3)
    const codeFiles = files
      .filter(
        (f) =>
          f.type === "file" &&
          f.download_url &&
          CODE_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
      )
      .sort((a, b) => a.size - b.size)
      .slice(0, 3);

    if (codeFiles.length === 0 && !description) return null;

    // 4. Fetch code content
    const codeSnippets: string[] = [];
    for (const file of codeFiles) {
      try {
        const codeRes = await fetch(file.download_url!);
        if (codeRes.ok) {
          const code = await codeRes.text();
          codeSnippets.push(
            `--- ${file.name} ---\n${code.slice(0, 2000)}`
          );
        }
      } catch {
        // skip this file
      }
    }

    // Build context string
    const parts: string[] = [];
    if (description) parts.push(`Description: ${description}`);
    if (language) parts.push(`Language: ${language}`);
    if (topics.length > 0) parts.push(`Topics: ${topics.join(", ")}`);
    if (codeSnippets.length > 0) {
      parts.push(`\nCode files:\n${codeSnippets.join("\n\n")}`);
    }

    const context = parts.join("\n");
    return context.slice(0, README_MAX_CHARS);
  } catch {
    return null;
  }
}

// ---------- Gist Support ----------

/**
 * Detect if a repo name is actually a GitHub Gist ID (32+ char hex string).
 */
export function isGistId(name: string): boolean {
  return /^[0-9a-f]{20,}$/i.test(name);
}

/**
 * Fetch gist metadata and file contents from the GitHub Gist API.
 * Gists use a different API endpoint than repos.
 */
export async function fetchGistContext(gistId: string): Promise<string | null> {
  const env = getServerEnv();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "gitgood",
  };
  if (env.GITHUB_PERSONAL_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_PERSONAL_TOKEN}`;
  }

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers,
    });
    if (!res.ok) return null;

    const gist = (await res.json()) as {
      description: string | null;
      files: Record<
        string,
        { filename: string; language: string | null; content: string; size: number }
      >;
    };

    const parts: string[] = [];
    if (gist.description) {
      parts.push(`Description: ${gist.description}`);
    }

    // Collect all files, sorted by size (smallest first)
    const files = Object.values(gist.files)
      .sort((a, b) => a.size - b.size)
      .slice(0, 5);

    if (files.length > 0) {
      const language = files.find((f) => f.language)?.language;
      if (language) parts.push(`Language: ${language}`);

      const codeSnippets = files.map(
        (f) => `--- ${f.filename} ---\n${f.content.slice(0, 2000)}`
      );
      parts.push(`\nCode files:\n${codeSnippets.join("\n\n")}`);
    }

    if (parts.length === 0) return null;

    return parts.join("\n").slice(0, README_MAX_CHARS);
  } catch {
    return null;
  }
}

// ---------- Prompts ----------

export function buildSummaryPrompt(
  readme: string,
  owner: string,
  name: string
): string {
  return `You are a concise technical educator. Analyze this GitHub repository README and generate a course summary.

REPO: ${owner}/${name}

README:
${readme}

RULES:
- tagline: One compelling sentence (max 15 words)
- about: 2-3 sentences about what this project does and why it matters
- whyLearn: 2-3 sentences about why a developer should study this codebase
- youWillLearn: Exactly 4-6 bullet points of specific skills/concepts
- prerequisites: 2-4 practical prerequisites (e.g. "Basic Python syntax", not "PhD in CS")
- difficulty: beginner/intermediate/advanced based on code complexity
- language: Primary programming language
- estimatedMinutes: Realistic study time in minutes (120-1800 range)
- Be specific to THIS repo, not generic programming advice

EXAMPLE OUTPUT (for a different repo):
{
  "tagline": "Build neural networks from scratch with just Python and math",
  "about": "micrograd is a tiny autograd engine that implements backpropagation over a dynamically built DAG. It demonstrates how modern deep learning frameworks compute gradients, distilled into under 200 lines of readable Python.",
  "whyLearn": "Understanding automatic differentiation is fundamental to modern AI. This codebase strips away all framework complexity to reveal the core algorithm, making it the perfect entry point for anyone serious about deep learning.",
  "youWillLearn": ["Automatic differentiation and computational graphs", "Backpropagation algorithm implementation", "Building neural network layers from scratch", "Python operator overloading for math operations"],
  "prerequisites": ["Basic Python syntax", "High school calculus (derivatives)", "Understanding of basic neural network concepts"],
  "difficulty": "beginner",
  "language": "Python",
  "estimatedMinutes": 480
}`;
}

export function buildCodeSummaryPrompt(
  codeContext: string,
  owner: string,
  name: string
): string {
  return `You are a concise technical educator. Analyze this GitHub repository's code and metadata to generate a course summary. There is no README, so analyze the actual code.

REPO: ${owner}/${name}

${codeContext}

RULES:
- tagline: One compelling sentence about what this code does (max 15 words)
- about: 2-3 sentences about what this project does, based on the actual code
- whyLearn: 2-3 sentences about why a developer should study this codebase
- youWillLearn: Exactly 4-6 bullet points of specific skills/concepts from the code
- prerequisites: 2-4 practical prerequisites
- difficulty: beginner/intermediate/advanced based on code complexity
- language: Primary programming language (detect from the code)
- estimatedMinutes: Realistic study time in minutes (120-1800 range)
- Be specific about what the code actually does, not generic

EXAMPLE OUTPUT (for a different repo):
{
  "tagline": "A minimal HTTP server built from raw TCP sockets",
  "about": "This project implements an HTTP/1.1 server from scratch using only the standard library socket module. It handles routing, headers, and response codes without any framework dependency.",
  "whyLearn": "Building a server from raw sockets teaches you what frameworks like Express or Flask abstract away. You'll understand the HTTP protocol at a level most developers never reach.",
  "youWillLearn": ["TCP socket programming fundamentals", "HTTP/1.1 protocol parsing", "Request routing and middleware patterns", "Concurrent connection handling"],
  "prerequisites": ["Basic Python syntax", "Understanding of client-server architecture"],
  "difficulty": "intermediate",
  "language": "Python",
  "estimatedMinutes": 360
}`;
}

// ---------- Generation ----------

export async function generateSummary(
  owner: string,
  name: string,
  content: string | null,
  contentType: "readme" | "code"
): Promise<CourseSummary> {
  if (!content) {
    const hint = isGistId(name)
      ? "This GitHub Gist may be private, deleted, or temporarily unavailable."
      : "The repository may be private, empty, or temporarily unavailable.";
    throw new Error(
      `Could not fetch content for ${owner}/${name}. ${hint}`
    );
  }

  const ai = getClient();

  const prompt =
    contentType === "readme"
      ? buildSummaryPrompt(content, owner, name)
      : buildCodeSummaryPrompt(content, owner, name);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: SUMMARY_MAX_TOKENS,
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: summarySchema,
    },
  });

  const text = response.text?.trim() ?? "{}";
  return JSON.parse(text) as CourseSummary;
}

// ---------- Full Pipeline ----------

export async function getOrGenerateSummary(
  owner: string,
  name: string
): Promise<{ summary: SummaryRecord; source: "cache" | "generated" | "curated" }> {
  const docId = buildSummaryDocId(owner, name);

  // 1. Check Firestore cache — only use if version is current
  const existing = await lookupSummary(docId);
  if (existing && (existing.version ?? 0) >= SUMMARY_VERSION) {
    return { summary: existing, source: "cache" };
  }

  // 2. Check if this is a curated repo — skip Gemini entirely
  const curated = findCuratedRepo(owner, name);
  if (curated) {
    const summaryData = buildSummaryFromCurated(curated);
    const record: SummaryRecord = {
      owner,
      name,
      repoUrl: `https://github.com/${owner}/${name}`,
      summary: summaryData,
      generatedAt: new Date().toISOString(),
      version: SUMMARY_VERSION,
    };
    await saveSummary(docId, record);
    return { summary: record, source: "curated" };
  }

  // 3. Generate via Gemini — try multiple content sources
  let content: string | null = null;
  let contentType: "readme" | "code" = "readme";

  if (isGistId(name)) {
    // Gists use a completely different API — repos API will always 404
    content = await fetchGistContext(name);
    contentType = "code";
  } else {
    // 3a. Try README first
    content = await fetchReadme(owner, name);

    // 3b. Fall back to repo code context
    if (!content) {
      content = await fetchCodeContext(owner, name);
      contentType = "code";
    }
  }

  const summaryData = await generateSummary(owner, name, content, contentType);

  const record: SummaryRecord = {
    owner,
    name,
    repoUrl: `https://github.com/${owner}/${name}`,
    summary: summaryData,
    generatedAt: new Date().toISOString(),
    version: SUMMARY_VERSION,
  };

  // Save to Firestore
  await saveSummary(docId, record);

  return { summary: record, source: "generated" };
}

export { COLLECTION, SUMMARY_VERSION };
