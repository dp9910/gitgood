import { GoogleGenAI } from "@google/genai";
import { getServerEnv } from "./env";

const MODEL = "gemini-2.0-flash";
const MAX_OUTPUT_TOKENS = 1500;

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

export interface TopicContentRequest {
  repoOwner: string;
  repoName: string;
  topicName: string;
  categoryName: string;
  subtopics: string[];
  level: string;
  repoLanguage: string;
}

/**
 * Generate educational content for a topic at the specified proficiency level.
 * Returns markdown string.
 */
export async function getTopicContent(
  request: TopicContentRequest
): Promise<string> {
  const ai = getClient();

  const levelGuidance =
    request.level === "beginner"
      ? "Use simple language, lots of analogies, and avoid jargon. Include step-by-step breakdowns."
      : request.level === "expert"
      ? "Go deep into implementation details, performance considerations, and edge cases. Assume strong programming background."
      : "Balance theory and practice. Include code examples and explain the 'why' behind design decisions.";

  const prompt = `You are an expert programming tutor creating educational content about a specific topic from a GitHub repository.

REPOSITORY: ${request.repoOwner}/${request.repoName} (${request.repoLanguage})
CATEGORY: ${request.categoryName}
TOPIC: ${request.topicName}
SUBTOPICS TO COVER: ${request.subtopics.join(", ") || "General overview"}
LEVEL: ${request.level}

${levelGuidance}

Write a concise, educational explanation in Markdown format. Include:
1. A clear introduction explaining what this topic is and why it matters
2. Key concepts with code examples in ${request.repoLanguage || "the project's language"}
3. How this relates to the ${request.repoOwner}/${request.repoName} codebase specifically
4. A "Key Takeaways" section with 2-3 bullet points

Keep it focused and practical. Use code blocks with language tags for syntax highlighting.
Do NOT include a title heading (the UI already shows the topic name).
Keep total length under 800 words.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.5,
    },
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    throw new Error("AI returned empty content");
  }

  return text;
}

const LEVEL_PROGRESSION: Record<string, string> = {
  beginner: "intermediate",
  intermediate: "expert",
  expert: "expert",
};

export function getNextLevel(currentLevel: string): string | null {
  const next = LEVEL_PROGRESSION[currentLevel];
  if (!next || next === currentLevel) return null;
  return next;
}

export { MODEL, MAX_OUTPUT_TOKENS };
