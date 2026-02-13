import { GoogleGenAI } from "@google/genai";
import { z } from "zod/v4";
import { getServerEnv } from "./env";
import type { RepoMetadata } from "./github";
import type { RepoType } from "./repo-analysis";
import type { UserPreferences } from "../components/proficiency-modal";
import type { Curriculum, CurriculumCategory } from "./curriculum-cache";

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

// ---------- Schemas ----------

const topicSchema = z.object({
  name: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "expert"]),
  estimatedMinutes: z.number(),
  prerequisites: z.array(z.string()),
  subtopics: z.array(z.string()),
});

const categorySchema = z.object({
  name: z.string(),
  description: z.string(),
  topics: z.array(topicSchema),
});

const curriculumResponseSchema = z.object({
  categories: z.array(categorySchema),
});

// ---------- Prompt builders ----------

const MODEL = "gemini-2.0-flash";
const MAX_OUTPUT_TOKENS = 4000;

function buildCurriculumPrompt(
  metadata: RepoMetadata,
  repoType: RepoType,
  readme: string,
  fileSnippets: Map<string, string>,
  preferences: UserPreferences
): string {
  const snippetText = Array.from(fileSnippets.entries())
    .slice(0, 5)
    .map(([path, content]) => `--- ${path} ---\n${content.slice(0, 1000)}`)
    .join("\n\n");

  return `You are an expert programming tutor. Generate a structured learning curriculum for the following GitHub repository.

REPOSITORY INFO:
- Name: ${metadata.fullName}
- Description: ${metadata.description ?? "No description"}
- Primary language: ${metadata.language ?? "Unknown"}
- Stars: ${metadata.stars}
- Type: ${repoType}

README (first 2000 chars):
${readme.slice(0, 2000)}

KEY FILES:
${snippetText}

LEARNER PROFILE:
- Experience: ${preferences.level}
- Goal: ${preferences.goal}
- Time commitment: ${preferences.timeCommitment}

INSTRUCTIONS:
1. Create 3-6 learning categories that cover the repository logically.
2. Each category has 2-5 topics ordered by difficulty.
3. Set difficulty based on learner level: for "${preferences.level}" learners, start at appropriate depth.
4. Estimate realistic minutes per topic (10-60 min range).
5. List prerequisites as topic names from within this curriculum.
6. Subtopics are 2-4 bullet points of what the topic covers.
7. For "${preferences.goal}" goal, emphasize ${
    preferences.goal === "understand"
      ? "conceptual explanations"
      : preferences.goal === "build"
      ? "implementation patterns and architecture"
      : preferences.goal === "deep-dive"
      ? "internal implementation details"
      : "high-level overview and key takeaways"
  }.

Respond with ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "categories": [
    {
      "name": "Category Name",
      "description": "What this category covers",
      "topics": [
        {
          "name": "Topic Name",
          "difficulty": "beginner" | "intermediate" | "expert",
          "estimatedMinutes": 30,
          "prerequisites": ["Other Topic Name"],
          "subtopics": ["Subtopic 1", "Subtopic 2"]
        }
      ]
    }
  ]
}`;
}

// ---------- Generation ----------

export interface GenerationResult {
  curriculum: Curriculum;
  model: string;
}

/**
 * Generate a curriculum for a repository using Gemini AI.
 * Validates the response against a Zod schema.
 * Retries once on parse failure with a stricter prompt.
 */
export async function generateCurriculum(
  metadata: RepoMetadata,
  repoType: RepoType,
  readme: string,
  fileSnippets: Map<string, string>,
  preferences: UserPreferences
): Promise<GenerationResult> {
  const ai = getClient();
  const prompt = buildCurriculumPrompt(
    metadata,
    repoType,
    readme,
    fileSnippets,
    preferences
  );

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const finalPrompt =
      attempt === 0
        ? prompt
        : `${prompt}\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY the JSON object, no markdown code fences, no explanation. Start with { and end with }.`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: finalPrompt,
      config: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: attempt === 0 ? 0.7 : 0.3,
      },
    });

    const text = response.text?.trim() ?? "";

    // Strip markdown code fences if present
    const jsonText = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(jsonText);
      const validated = curriculumResponseSchema.parse(parsed);

      return {
        curriculum: {
          repoOwner: metadata.owner,
          repoName: metadata.name,
          categories: validated.categories as CurriculumCategory[],
        },
        model: MODEL,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw new Error(
    `Failed to generate valid curriculum after 2 attempts: ${lastError?.message}`
  );
}

export { MODEL, MAX_OUTPUT_TOKENS, curriculumResponseSchema };
