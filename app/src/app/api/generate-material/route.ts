import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getRedis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  parseRepoUrl,
  parseGistUrl,
  getCacheOctokit,
  fetchGistContent,
  fetchFileContent,
} from "@/lib/github";
import {
  buildDocumentId,
  lookupMaterial,
  saveMaterial,
  markLevelGenerated,
  incrementAccess,
  type MaterialRecord,
  type ExpertiseLevel,
} from "@/lib/material-index";
import {
  fetchCourse,
  saveCourse,
  saveMeta,
} from "@/lib/material-storage";
import { generateFullCourse } from "@/lib/course-generator";

const VALID_LEVELS: ExpertiseLevel[] = ["beginner", "intermediate", "advanced"];

/**
 * POST /api/generate-material
 *
 * Orchestrates the full learning material generation flow:
 * 1. Auth + rate limit
 * 2. Parse URL (repo or gist)
 * 3. Firestore lookup → if level exists, fetch from GitHub repo → serve
 * 4. If not generated: fetch code, run Gemini pipeline, save everywhere
 */
export async function POST(request: NextRequest) {
  // 1. Auth
  const authResult = await requireAuth();
  if ("error" in authResult) return authResult.error;
  const { user } = authResult;

  // 2. Rate limit
  const redis = getRedis();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { result: rateLimitResult, headers: rateLimitHeaders } =
    await checkRateLimit(redis, user.uid, ip);

  if (!rateLimitResult.allowed) {
    return Response.json(
      {
        error: rateLimitResult.error,
        message: rateLimitResult.message,
        resetAt: rateLimitResult.resetAt,
        waitSeconds: rateLimitResult.waitSeconds,
      },
      { status: rateLimitResult.status ?? 429, headers: rateLimitHeaders }
    );
  }

  // 3. Parse request body
  let url: string;
  let level: ExpertiseLevel;

  try {
    const body = await request.json();
    url = body.url;
    level = body.level;

    if (!url || typeof url !== "string") {
      return Response.json(
        { error: "invalid_input", message: "Missing URL" },
        { status: 400 }
      );
    }

    if (!level || !VALID_LEVELS.includes(level)) {
      return Response.json(
        {
          error: "invalid_input",
          message: `Invalid level. Must be one of: ${VALID_LEVELS.join(", ")}`,
        },
        { status: 400 }
      );
    }
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // 4. Determine URL type (gist or repo)
  const gistInfo = parseGistUrl(url);
  const repoInfo = gistInfo ? null : parseRepoUrl(url);

  if (!gistInfo && !repoInfo) {
    return Response.json(
      {
        error: "invalid_url",
        message: "Invalid GitHub URL. Supports repo URLs and gist URLs.",
      },
      { status: 400 }
    );
  }

  const isGist = !!gistInfo;
  const owner = isGist ? gistInfo.owner : repoInfo!.owner;
  const name = isGist ? gistInfo.gistId : repoInfo!.repo;

  // 5. Firestore lookup
  let language = "python"; // default, updated after code fetch
  let docId = buildDocumentId(language, owner, name);
  let materialRecord = await lookupMaterial(docId);

  // If we have a record, use its language for consistent doc ID
  if (materialRecord) {
    language = materialRecord.language;
    docId = buildDocumentId(language, owner, name);
  }

  // 6. Cache hit — level already generated
  if (materialRecord?.levels[level]?.generated) {
    // Fetch the course JSON from GitHub
    const courseData = await fetchCourse(language, owner, name, level);

    if (courseData) {
      // Increment access counter (fire-and-forget)
      incrementAccess(docId).catch(() => {});

      return Response.json(
        {
          source: "cache",
          course: courseData,
          feasibility: materialRecord.feasibility,
        },
        { headers: rateLimitHeaders }
      );
    }
    // If GitHub fetch failed but Firestore says generated, fall through to regenerate
  }

  // 7. Cache miss — need to generate
  // Fetch source code
  let codeContent: string;
  let detectedLanguage: string;
  let description: string;

  try {
    if (isGist) {
      const octokit = getCacheOctokit();
      const gist = await fetchGistContent(octokit, gistInfo.gistId);
      codeContent = gist.files.map((f) => f.content).join("\n\n");
      detectedLanguage =
        gist.files[0]?.language?.toLowerCase() ?? "python";
      description = gist.description || `Gist by ${owner}`;
    } else {
      const octokit = getCacheOctokit();
      // Try to get the main file or README for content
      let mainContent = "";
      try {
        const readme = await fetchFileContent(
          octokit,
          owner,
          name,
          "README.md",
          { maxChars: 5000 }
        );
        mainContent = readme.content;
      } catch {
        // No README
      }

      // Try common entry points
      const entryPoints = [
        "main.py",
        "app.py",
        "index.py",
        "src/main.py",
        "index.js",
        "main.js",
        "src/index.ts",
        "main.go",
        "lib.rs",
      ];

      for (const entry of entryPoints) {
        try {
          const file = await fetchFileContent(octokit, owner, name, entry, {
            maxChars: 15000,
          });
          codeContent = file.content;
          break;
        } catch {
          continue;
        }
      }

      codeContent = codeContent! ?? mainContent;

      if (!codeContent) {
        return Response.json(
          {
            error: "no_code_found",
            message:
              "Could not find readable source code in this repository.",
          },
          { status: 422, headers: rateLimitHeaders }
        );
      }

      detectedLanguage = "python"; // Will be refined by feasibility analysis
      description = `Repository ${owner}/${name}`;
    }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch source code";
    return Response.json(
      { error: "fetch_failed", message },
      { status: 502, headers: rateLimitHeaders }
    );
  }

  // Update language and doc ID with detected language
  language = detectedLanguage;
  docId = buildDocumentId(language, owner, name);

  // Re-check Firestore with correct language-based doc ID
  if (!materialRecord) {
    materialRecord = await lookupMaterial(docId);
    if (materialRecord?.levels[level]?.generated) {
      const courseData = await fetchCourse(language, owner, name, level);
      if (courseData) {
        incrementAccess(docId).catch(() => {});
        return Response.json(
          {
            source: "cache",
            course: courseData,
            feasibility: materialRecord.feasibility,
          },
          { headers: rateLimitHeaders }
        );
      }
    }
  }

  // 8. Generate via Gemini pipeline
  let result;
  try {
    result = await generateFullCourse({
      codeContent,
      language,
      level,
      sourceUrl: url,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to generate course";
    return Response.json(
      { error: "generation_failed", message },
      { status: 502, headers: rateLimitHeaders }
    );
  }

  const { course, feasibility, model } = result;

  // 9. Save to GitHub repo (fire-and-forget)
  saveCourse(language, owner, name, level, course as unknown as Record<string, unknown>).catch(
    () => {}
  );
  saveMeta(language, owner, name, {
    feasibility,
    language,
    sourceUrl: url,
    owner,
    name,
    type: isGist ? "gist" : "repo",
  }).catch(() => {});

  // 10. Save/update Firestore
  const now = new Date().toISOString();

  if (materialRecord) {
    // Existing record — just mark the level as generated
    markLevelGenerated(docId, level).catch(() => {});
  } else {
    // New record
    const newRecord: MaterialRecord = {
      repoUrl: url,
      owner,
      name,
      language,
      type: isGist ? "gist" : "repo",
      description: feasibility.description || description,
      levels: {
        beginner: {
          generated: level === "beginner",
          generatedAt: level === "beginner" ? now : null,
        },
        intermediate: {
          generated: level === "intermediate",
          generatedAt: level === "intermediate" ? now : null,
        },
        advanced: {
          generated: level === "advanced",
          generatedAt: level === "advanced" ? now : null,
        },
      },
      feasibility: {
        canLearn: feasibility.canLearn,
        complexity: feasibility.complexity,
        prerequisites: feasibility.prerequisites,
        estimatedHours: feasibility.estimatedHours,
        reason: feasibility.reason,
      },
      timesAccessed: 1,
      createdAt: now,
      updatedAt: now,
    };

    saveMaterial(docId, newRecord).catch(() => {});
  }

  return Response.json(
    {
      source: "generated",
      course,
      feasibility,
      model,
    },
    { headers: rateLimitHeaders }
  );
}
