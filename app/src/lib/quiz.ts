import { GoogleGenAI } from "@google/genai";
import { getServerEnv } from "./env";

const MODEL = "gemini-2.0-flash";
const MAX_OUTPUT_TOKENS = 2000;

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

// ---------- Types ----------

export interface QuizOption {
  label: string; // "A", "B", "C", "D"
  text: string;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
  correctLabel: string; // "A", "B", "C", or "D"
  explanation: string;
}

export interface Quiz {
  topicName: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  topicName: string;
  score: number;
  total: number;
  answers: { questionIndex: number; selectedLabel: string; correct: boolean }[];
  completedAt: string;
}

export interface ChallengeData {
  topicName: string;
  title: string;
  description: string;
  starterCode: string;
  hint: string;
  solution: string;
  language: string;
}

export interface QuizRequest {
  topicName: string;
  categoryName: string;
  repoFullName: string;
  level: string;
  type: "quiz" | "challenge";
}

// ---------- Quiz Generation ----------

export async function generateQuiz(request: QuizRequest): Promise<Quiz> {
  const ai = getClient();

  const prompt = `You are an expert programming tutor creating a knowledge check quiz.

CONTEXT:
- Repository: ${request.repoFullName}
- Topic: ${request.topicName}
- Category: ${request.categoryName}
- Student level: ${request.level}

Generate exactly 5 multiple choice questions that test UNDERSTANDING (not memorization) of "${request.topicName}".

Rules:
- Each question has exactly 4 options labeled A, B, C, D
- One correct answer per question
- Include a brief explanation for the correct answer
- Match difficulty to ${request.level} level
- Focus on concepts, not trivia

Return ONLY valid JSON in this exact format (no markdown fences):
{
  "questions": [
    {
      "question": "What is...",
      "options": [
        {"label": "A", "text": "Option text"},
        {"label": "B", "text": "Option text"},
        {"label": "C", "text": "Option text"},
        {"label": "D", "text": "Option text"}
      ],
      "correctLabel": "B",
      "explanation": "B is correct because..."
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.6,
    },
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    throw new Error("AI returned empty response");
  }

  return parseQuizResponse(text, request.topicName);
}

// ---------- Challenge Generation ----------

export async function generateChallenge(
  request: QuizRequest
): Promise<ChallengeData> {
  const ai = getClient();

  const prompt = `You are an expert programming tutor creating a coding challenge.

CONTEXT:
- Repository: ${request.repoFullName}
- Topic: ${request.topicName}
- Category: ${request.categoryName}
- Student level: ${request.level}

Create a small coding challenge (10-30 lines) related to "${request.topicName}".

Rules:
- The challenge should test practical understanding
- Include starter code with TODO comments
- Include a hint
- Include the complete solution
- Match difficulty to ${request.level} level
- Use Python unless the repository suggests another language

Return ONLY valid JSON in this exact format (no markdown fences):
{
  "title": "Challenge title",
  "description": "Problem description explaining what to implement",
  "starterCode": "def solve():\\n    # TODO: implement",
  "hint": "Think about...",
  "solution": "def solve():\\n    return 42",
  "language": "python"
}`;

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

  return parseChallengeResponse(text, request.topicName);
}

// ---------- Parsing ----------

/**
 * Parse and validate AI quiz response.
 * Strips markdown fences and validates structure.
 */
export function parseQuizResponse(text: string, topicName: string): Quiz {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  let parsed: { questions: QuizQuestion[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse quiz JSON");
  }

  if (
    !parsed.questions ||
    !Array.isArray(parsed.questions) ||
    parsed.questions.length === 0
  ) {
    throw new Error("Quiz has no questions");
  }

  // Validate each question
  for (const q of parsed.questions) {
    if (!q.question || !q.options || !q.correctLabel || !q.explanation) {
      throw new Error("Quiz question missing required fields");
    }
    if (q.options.length !== 4) {
      throw new Error("Each question must have exactly 4 options");
    }
    if (!["A", "B", "C", "D"].includes(q.correctLabel)) {
      throw new Error("correctLabel must be A, B, C, or D");
    }
  }

  return { topicName, questions: parsed.questions };
}

/**
 * Parse and validate AI challenge response.
 */
export function parseChallengeResponse(
  text: string,
  topicName: string
): ChallengeData {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  let parsed: Omit<ChallengeData, "topicName">;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse challenge JSON");
  }

  if (!parsed.title || !parsed.description || !parsed.starterCode || !parsed.solution) {
    throw new Error("Challenge missing required fields");
  }

  return {
    topicName,
    title: parsed.title,
    description: parsed.description,
    starterCode: parsed.starterCode,
    hint: parsed.hint ?? "",
    solution: parsed.solution,
    language: parsed.language ?? "python",
  };
}

// ---------- Scoring ----------

export function scoreQuiz(
  quiz: Quiz,
  answers: Record<number, string>
): QuizResult {
  const results: QuizResult["answers"] = [];
  let score = 0;

  for (let i = 0; i < quiz.questions.length; i++) {
    const selected = answers[i] ?? "";
    const correct = selected === quiz.questions[i].correctLabel;
    if (correct) score++;
    results.push({
      questionIndex: i,
      selectedLabel: selected,
      correct,
    });
  }

  return {
    topicName: quiz.topicName,
    score,
    total: quiz.questions.length,
    answers: results,
    completedAt: new Date().toISOString(),
  };
}

export { MODEL, MAX_OUTPUT_TOKENS };
