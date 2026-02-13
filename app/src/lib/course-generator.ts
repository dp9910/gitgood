import { GoogleGenAI, Type } from "@google/genai";
import { getServerEnv } from "./env";
import type { ExpertiseLevel } from "./material-index";

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
const FEASIBILITY_MAX_TOKENS = 1000;
const OUTLINE_MAX_TOKENS = 6000;
const LESSON_MAX_TOKENS = 8000;
const ASSESSMENT_MAX_TOKENS = 8000;

// ---------- Types ----------

export interface CodeWalkthrough {
  code: string;
  language: string;
  explanation: string;
}

export interface Lesson {
  id: number;
  title: string;
  content: string;
  codeWalkthroughs: CodeWalkthrough[];
  keyTakeaways: string[];
}

export interface QuizQuestion {
  type: "multiple_choice" | "code_output" | "fill_in_code";
  question: string;
  options?: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  questions: QuizQuestion[];
}

export interface Challenge {
  title: string;
  description: string;
  starterCode: string;
  hints: string[];
  solution: string;
}

export interface Module {
  id: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  objectives: string[];
  lessons: Lesson[];
  quiz: Quiz;
  challenge: Challenge;
}

export interface Assessment {
  questions: QuizQuestion[];
  passingScore: number;
}

export interface CourseMeta {
  repoUrl: string;
  language: string;
  level: ExpertiseLevel;
  title: string;
  description: string;
  prerequisites: string[];
  estimatedHours: number;
  moduleCount: number;
  generatedAt: string;
  aiModel: string;
}

export interface Course {
  meta: CourseMeta;
  modules: Module[];
  finalAssessment: Assessment;
}

export interface FeasibilityResult {
  canLearn: boolean;
  complexity: "simple" | "moderate" | "complex" | "too_complex";
  prerequisites: string[];
  estimatedHours: { beginner: number; intermediate: number; advanced: number };
  reason: string | null;
  language: string;
  description: string;
}

export interface CourseOutline {
  title: string;
  description: string;
  prerequisites: string[];
  estimatedHours: number;
  modules: {
    id: number;
    title: string;
    description: string;
    estimatedMinutes: number;
    objectives: string[];
    lessonCount: number;
  }[];
}

// ---------- Schemas for Structured Output ----------

const feasibilitySchema = {
  type: Type.OBJECT,
  properties: {
    canLearn: { type: Type.BOOLEAN },
    complexity: { type: Type.STRING, enum: ["simple", "moderate", "complex", "too_complex"] },
    prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
    estimatedHours: {
      type: Type.OBJECT,
      properties: {
        beginner: { type: Type.NUMBER },
        intermediate: { type: Type.NUMBER },
        advanced: { type: Type.NUMBER },
      },
      required: ["beginner", "intermediate", "advanced"],
    },
    reason: { type: Type.STRING, nullable: true },
    language: { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ["canLearn", "complexity", "prerequisites", "estimatedHours", "language", "description"],
};

const outlineSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
    estimatedHours: { type: Type.NUMBER },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.NUMBER },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          estimatedMinutes: { type: Type.NUMBER },
          objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          lessonCount: { type: Type.NUMBER },
        },
        required: ["id", "title", "description", "estimatedMinutes", "objectives", "lessonCount"],
      },
    },
  },
  required: ["title", "description", "prerequisites", "estimatedHours", "modules"],
};

const lessonSchema = {
  type: Type.OBJECT,
  properties: {
    lessons: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.NUMBER },
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          codeWalkthroughs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                code: { type: Type.STRING },
                language: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["code", "language", "explanation"],
            },
          },
          keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["id", "title", "content", "codeWalkthroughs", "keyTakeaways"],
      },
    },
  },
  required: ["lessons"],
};

const assessmentSchema = {
  type: Type.OBJECT,
  properties: {
    moduleAssessments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          moduleId: { type: Type.NUMBER },
          quiz: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["multiple_choice", "code_output", "fill_in_code"] },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: { label: { type: Type.STRING }, text: { type: Type.STRING } },
                        required: ["label", "text"],
                      },
                    },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ["type", "question", "correctAnswer", "explanation"],
                },
              },
            },
            required: ["questions"],
          },
          challenge: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              starterCode: { type: Type.STRING },
              hints: { type: Type.ARRAY, items: { type: Type.STRING } },
              solution: { type: Type.STRING },
            },
            required: ["title", "description", "starterCode", "hints", "solution"],
          },
        },
        required: ["moduleId", "quiz", "challenge"],
      },
    },
    finalAssessment: {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["multiple_choice", "code_output", "fill_in_code"] },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { label: { type: Type.STRING }, text: { type: Type.STRING } },
                  required: ["label", "text"],
                },
              },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ["type", "question", "correctAnswer", "explanation"],
          },
        },
        passingScore: { type: Type.NUMBER },
      },
      required: ["questions", "passingScore"],
    },
  },
  required: ["moduleAssessments", "finalAssessment"],
};

// ---------- Prompt Builders ----------

const LEVEL_GUIDANCE: Record<ExpertiseLevel, string> = {
  beginner: `LEVEL: Beginner
- Assumes: Basic Python only, no CS/math background
- Analogies: Heavy (cooking, Lego, GPS, everyday life)
- Code walkthrough: Line-by-line, explain every concept
- Tone: Encouraging, patient, celebratory at milestones`,

  intermediate: `LEVEL: Intermediate
- Assumes: Comfortable with Python, knows data structures, basic algorithms
- Analogies: Moderate (design patterns, real-world tools)
- Code walkthrough: Block-by-block, focus on design decisions
- Tone: Collegial, technical but accessible`,

  advanced: `LEVEL: Advanced
- Assumes: CS fundamentals, math notation OK, has built projects
- Analogies: Rare (references papers and advanced concepts instead)
- Code walkthrough: Architecture-level, focus on tradeoffs and alternatives
- Tone: Peer-to-peer, concise, assumes intelligence`,
};

export function buildFeasibilityPrompt(
  codeContent: string,
  language: string,
  sourceUrl: string
): string {
  return `You are an expert programming educator. Analyze this code for creating a learning course.

SOURCE: ${sourceUrl}
LANGUAGE: ${language}

CODE:
\`\`\`
${codeContent.slice(0, 15000)}
\`\`\`

Evaluate: Is this code educational/learnable?
Keep prerequisites to 3-5 max, focused on PRACTICAL skills (e.g. "Basic Python syntax" not "Calculus").
For estimatedHours: beginner 6-15h, intermediate 4-8h, advanced 2-5h. Be realistic for the code size.`;
}

export function buildOutlinePrompt(
  codeContent: string,
  language: string,
  level: ExpertiseLevel,
  feasibility: FeasibilityResult,
  sourceUrl: string
): string {
  return `You are an expert programming educator. Create a ${level.toUpperCase()} course outline.

SOURCE: ${sourceUrl}
LANGUAGE: ${language}
DESCRIPTION: ${feasibility.description}
COMPLEXITY: ${feasibility.complexity}

\`\`\`
${codeContent.slice(0, 10000)}
\`\`\`

${LEVEL_GUIDANCE[level]}

RULES:
- Create exactly 4-5 modules that build progressively
- Each module: exactly 2 lessons (focused and digestible)
- Keep descriptions under 20 words each
- Max 3 objectives per module, each under 10 words
- Target total: ${feasibility.estimatedHours[level]} hours
- Be specific to THIS code — reference actual functions, classes, variables`;
}

export function buildLessonPrompt(
  codeContent: string,
  language: string,
  level: ExpertiseLevel,
  moduleOutline: CourseOutline["modules"][number],
  courseTitle: string,
  moduleIndex: number,
  totalModules: number
): string {
  const isFirst = moduleIndex === 0;
  const isLast = moduleIndex === totalModules - 1;

  return `You are an expert programming educator writing ${level.toUpperCase()} lesson content.

COURSE: "${courseTitle}"
MODULE ${moduleIndex + 1}/${totalModules}: "${moduleOutline.title}"
DESCRIPTION: ${moduleOutline.description}
OBJECTIVES: ${moduleOutline.objectives.join("; ")}
WRITE EXACTLY ${moduleOutline.lessonCount} LESSONS.

SOURCE CODE (${language}):
\`\`\`
${codeContent.slice(0, 12000)}
\`\`\`

${LEVEL_GUIDANCE[level]}

CONTENT REQUIREMENTS:
- Each lesson "content" field: 400-800 words of rich markdown with ## headers, paragraphs, inline code
- Include code blocks in the content using \`\`\` fences
- 2-3 code walkthroughs per lesson extracting REAL snippets from the source
- Each walkthrough explanation: 50-150 words
- 3-4 key takeaways per lesson
- Use analogies: cooking recipes, Lego bricks, GPS navigation, everyday life
${isFirst ? '- Open with a "Why does this matter?" hook connecting to real AI tools (ChatGPT, etc.)' : ""}
${isLast ? "- End with a celebration of what they built and what to explore next" : "- End with a cliffhanger teasing the next module"}

Be SPECIFIC to this code. Reference actual variable names, functions, and patterns.`;
}

export function buildAssessmentPrompt(
  codeContent: string,
  language: string,
  level: ExpertiseLevel,
  outline: CourseOutline
): string {
  const moduleNames = outline.modules.map((m) => `${m.id}. ${m.title}`).join("\n");

  return `You are an expert programming educator creating assessments.

COURSE: "${outline.title}"
MODULES:
${moduleNames}
LANGUAGE: ${language}

SOURCE CODE:
\`\`\`${language}
${codeContent.slice(0, 8000)}
\`\`\`

${LEVEL_GUIDANCE[level]}

CREATE:
- Per module: 3 quiz questions (mix multiple_choice, code_output, fill_in_code) + 1 coding challenge
- Final assessment: 8 comprehensive questions covering all modules
- Passing score: 70

RULES:
- All questions reference ACTUAL code from the source — not generic questions
- Wrong-answer explanations should teach the concept
- Challenges: provide starter code + hints + full solution
${level === "beginner" ? "- Beginner friendly: 'What does this print?', 'Fill in the blank', etc." : ""}
${level === "advanced" ? "- Include design thinking and edge case analysis questions." : ""}`;
}

// ---------- JSON Parsing Helpers ----------

/**
 * Strip markdown code fences and parse JSON.
 * Retries with progressively more aggressive cleanup.
 */
export function parseJsonResponse(text: string): unknown {
  let cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    return JSON.parse(cleaned);
  }
}

// ---------- Structured Output Helper ----------

async function geminiStructured(
  prompt: string,
  schema: unknown,
  maxTokens: number,
  temperature: number
): Promise<unknown> {
  const ai = getClient();

  for (let attempt = 0; attempt < 2; attempt++) {
    const finalPrompt = attempt === 0
      ? prompt
      : `${prompt}\n\nIMPORTANT: Ensure all content is complete and well-formed.`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: finalPrompt,
      config: {
        maxOutputTokens: maxTokens,
        temperature: attempt === 0 ? temperature : temperature * 0.5,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text?.trim() ?? "{}";
    try {
      return JSON.parse(text);
    } catch {
      // On structured output, JSON.parse shouldn't fail, but handle it
      try {
        return parseJsonResponse(text);
      } catch {
        if (attempt === 1) throw new Error(`Failed to parse structured response`);
      }
    }
  }

  throw new Error("Unreachable");
}

// ---------- Generation Steps ----------

export async function analyzeFeasibility(
  codeContent: string,
  language: string,
  sourceUrl: string
): Promise<FeasibilityResult> {
  const prompt = buildFeasibilityPrompt(codeContent, language, sourceUrl);
  return await geminiStructured(prompt, feasibilitySchema, FEASIBILITY_MAX_TOKENS, 0.3) as FeasibilityResult;
}

export async function generateOutline(
  codeContent: string,
  language: string,
  level: ExpertiseLevel,
  feasibility: FeasibilityResult,
  sourceUrl: string
): Promise<CourseOutline> {
  const prompt = buildOutlinePrompt(codeContent, language, level, feasibility, sourceUrl);
  return await geminiStructured(prompt, outlineSchema, OUTLINE_MAX_TOKENS, 0.5) as CourseOutline;
}

export async function generateModuleContent(
  codeContent: string,
  language: string,
  level: ExpertiseLevel,
  moduleOutline: CourseOutline["modules"][number],
  courseTitle: string,
  moduleIndex: number,
  totalModules: number
): Promise<Lesson[]> {
  const prompt = buildLessonPrompt(
    codeContent, language, level, moduleOutline, courseTitle, moduleIndex, totalModules
  );
  const result = await geminiStructured(prompt, lessonSchema, LESSON_MAX_TOKENS, 0.7) as { lessons: Lesson[] };
  return result.lessons;
}

export async function generateAssessments(
  codeContent: string,
  language: string,
  level: ExpertiseLevel,
  outline: CourseOutline
): Promise<{
  moduleAssessments: { moduleId: number; quiz: Quiz; challenge: Challenge }[];
  finalAssessment: Assessment;
}> {
  const prompt = buildAssessmentPrompt(codeContent, language, level, outline);
  return await geminiStructured(prompt, assessmentSchema, ASSESSMENT_MAX_TOKENS, 0.5) as {
    moduleAssessments: { moduleId: number; quiz: Quiz; challenge: Challenge }[];
    finalAssessment: Assessment;
  };
}

// ---------- Full Pipeline ----------

export interface GenerateCourseInput {
  codeContent: string;
  language: string;
  level: ExpertiseLevel;
  sourceUrl: string;
}

export interface GenerateCourseResult {
  course: Course;
  feasibility: FeasibilityResult;
  model: string;
}

/**
 * Run the full multi-step Gemini pipeline to generate a complete course.
 *
 * Steps:
 * 1. Feasibility analysis
 * 2. Course outline generation
 * 3. Lesson content generation (per module, sequential)
 * 4. Assessment generation (quizzes + challenges)
 * 5. Assembly into final Course object
 */
export async function generateFullCourse(
  input: GenerateCourseInput
): Promise<GenerateCourseResult> {
  const { codeContent, language, level, sourceUrl } = input;

  // Step 1: Feasibility
  const feasibility = await analyzeFeasibility(codeContent, language, sourceUrl);

  if (!feasibility.canLearn) {
    throw new Error(
      `This code is not suitable for learning: ${feasibility.reason}`
    );
  }

  // Step 2: Outline
  const outline = await generateOutline(codeContent, language, level, feasibility, sourceUrl);

  // Step 3: Lesson content (sequential per module to avoid rate limits)
  const moduleLessons: Lesson[][] = [];
  for (let i = 0; i < outline.modules.length; i++) {
    const lessons = await generateModuleContent(
      codeContent, language, level, outline.modules[i], outline.title, i, outline.modules.length
    );
    moduleLessons.push(lessons);
  }

  // Step 4: Assessments
  const assessments = await generateAssessments(codeContent, language, level, outline);

  // Step 5: Assemble
  const modules: Module[] = outline.modules.map((mod, i) => {
    const assessment = assessments.moduleAssessments.find(
      (a) => a.moduleId === mod.id
    ) ?? assessments.moduleAssessments[i];

    return {
      id: mod.id,
      title: mod.title,
      description: mod.description,
      estimatedMinutes: mod.estimatedMinutes,
      objectives: mod.objectives,
      lessons: moduleLessons[i] ?? [],
      quiz: assessment?.quiz ?? { questions: [] },
      challenge: assessment?.challenge ?? {
        title: "Practice",
        description: "Apply what you learned",
        starterCode: "",
        hints: [],
        solution: "",
      },
    };
  });

  const course: Course = {
    meta: {
      repoUrl: sourceUrl,
      language,
      level,
      title: outline.title,
      description: outline.description,
      prerequisites: outline.prerequisites,
      estimatedHours: outline.estimatedHours,
      moduleCount: modules.length,
      generatedAt: new Date().toISOString(),
      aiModel: MODEL,
    },
    modules,
    finalAssessment: assessments.finalAssessment ?? {
      questions: [],
      passingScore: 70,
    },
  };

  return { course, feasibility, model: MODEL };
}

export { MODEL, FEASIBILITY_MAX_TOKENS, OUTLINE_MAX_TOKENS, LESSON_MAX_TOKENS, ASSESSMENT_MAX_TOKENS };
