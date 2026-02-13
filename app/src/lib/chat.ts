import { GoogleGenAI } from "@google/genai";
import { getServerEnv } from "./env";

const MODEL = "gemini-2.0-flash";
const MAX_OUTPUT_TOKENS = 1000;

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

// ---------- Quick actions ----------

const ACTION_PROMPTS: Record<string, string> = {
  quiz: "Generate 3 multiple choice questions testing understanding (not memorization) of this topic. Format each with a question, 4 options (A-D), and the correct answer with a brief explanation.",
  eli5: "Explain this topic like I'm 5 years old. Use everyday analogies, avoid technical jargon, and keep it fun and memorable.",
  example: "Show a practical code example that demonstrates this topic. Include comments explaining each step. Keep it concise and runnable.",
  challenge: "Create a small coding challenge related to this topic. Include: the problem statement, a hint, and the solution in a collapsible section.",
};

// ---------- Types ----------

export interface ChatRequest {
  message: string;
  topicName: string;
  categoryName: string;
  repoFullName: string;
  level: string;
  action?: string;
}

// ---------- Generation ----------

export async function generateChatResponse(
  request: ChatRequest
): Promise<string> {
  const ai = getClient();

  const actionPrompt = request.action
    ? ACTION_PROMPTS[request.action] ?? ""
    : "";

  const userMessage = actionPrompt || request.message;

  const systemContext = `You are an expert AI programming tutor helping a student learn from the GitHub repository "${request.repoFullName}".

CONTEXT:
- Current topic: ${request.topicName}
- Category: ${request.categoryName}
- Student level: ${request.level}

GUIDELINES:
- Be concise and focused (keep responses under 300 words unless showing code)
- Use code examples when helpful
- Reference the specific repository when relevant
- Match the explanation depth to the student's level (${request.level})
- If asked something unrelated to programming or the repository, gently redirect back to the topic
- Use markdown formatting for readability`;

  const prompt = `${systemContext}\n\nStudent: ${userMessage}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.7,
    },
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    throw new Error("AI returned empty response");
  }

  return text;
}

export { MODEL, MAX_OUTPUT_TOKENS, ACTION_PROMPTS };
