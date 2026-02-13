/**
 * End-to-end test: Generate learning material for Karpathy's microGPT gist.
 * Run with: npx tsx scripts/test-generation.ts
 */

import { readFileSync } from "fs";
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  let value = trimmed.slice(eqIdx + 1);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_TOKEN!;
const MODEL = "gemini-2.0-flash";

// ---- Robust JSON extraction ----
function extractJson(text: string): any {
  let cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try { return JSON.parse(cleaned); } catch {}

  // Try to extract the outermost JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }

  throw new Error(`Failed to parse JSON from response (first 200 chars): ${cleaned.slice(0, 200)}`);
}

// ---- Fetch gist ----
async function fetchGist() {
  const gistId = "8627fe009c40f57531cb18360106ce95";
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Gist fetch failed: ${res.status}`);
  const gist = await res.json();
  const files = Object.values(gist.files) as any[];
  const code = files.map((f: any) => f.content).join("\n\n");
  const language = files[0]?.language?.toLowerCase() ?? "python";
  console.log(`✅ Fetched gist: ${gist.description} (${code.length} chars, ${language})\n`);
  return { code, language };
}

// ---- Gemini call with structured output (guarantees valid JSON) ----
async function geminiJson(ai: GoogleGenAI, prompt: string, schema: any, maxTokens: number, temp: number): Promise<any> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: maxTokens,
      temperature: temp,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });
  return JSON.parse(response.text ?? "{}");
}

// ---- Step 1: Feasibility ----
async function analyzeFeasibility(ai: GoogleGenAI, code: string, language: string) {
  console.log("🔍 Step 1: Feasibility analysis...");

  const schema = {
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

  const prompt = `You are an expert programming educator. Analyze this code for creating a learning course.

CODE (${language}):
\`\`\`
${code.slice(0, 15000)}
\`\`\`

Evaluate: Is it educational? Complexity? What prerequisites? Estimated hours per level?
Keep prerequisites to 3-5 max, focused on what's ESSENTIAL.
For estimatedHours: beginner 6-15h, intermediate 4-8h, advanced 2-5h. Be realistic for a SINGLE FILE.`;

  const result = await geminiJson(ai, prompt, schema, 800, 0.3);
  console.log("   Result:", JSON.stringify(result, null, 2));
  return result;
}

// ---- Step 2: Course Outline ----
async function generateOutline(ai: GoogleGenAI, code: string, language: string, feasibility: any) {
  console.log("\n📋 Step 2: Course outline...");

  const schema = {
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

  const prompt = `You are an expert programming educator. Create a BEGINNER course outline for this code.

CODE (${language}): ${feasibility.description}
COMPLEXITY: ${feasibility.complexity}

\`\`\`
${code.slice(0, 10000)}
\`\`\`

RULES:
- Create exactly 4-5 modules that build progressively
- Each module: exactly 2 lessons (keep it focused and concise)
- Keep descriptions under 20 words each
- Max 3 objectives per module, each under 10 words
- Target total: ${feasibility.estimatedHours.beginner} hours
- Beginner level: assume basic Python only, no math/CS background
- Be specific to THIS code — reference actual functions, classes, variables`;

  const result = await geminiJson(ai, prompt, schema, 6000, 0.5);

  console.log("   Title:", result.title);
  console.log("   Modules:", result.modules?.length);
  result.modules?.forEach((m: any) => {
    console.log(`     ${m.id}. ${m.title} (${m.estimatedMinutes} min, ${m.lessonCount} lessons)`);
  });
  return result;
}

// ---- Step 3: Lesson Content (one module at a time) ----
async function generateLessonContent(
  ai: GoogleGenAI, code: string, language: string, outline: any, moduleIndex: number
) {
  const mod = outline.modules[moduleIndex];
  console.log(`\n📖 Step 3: Lessons for Module ${mod.id}: "${mod.title}"...`);

  const schema = {
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

  const isFirst = moduleIndex === 0;
  const isLast = moduleIndex === outline.modules.length - 1;

  const prompt = `You are an expert programming educator writing BEGINNER lesson content.

COURSE: "${outline.title}"
MODULE ${moduleIndex + 1}/${outline.modules.length}: "${mod.title}"
DESCRIPTION: ${mod.description}
OBJECTIVES: ${mod.objectives.join("; ")}
WRITE EXACTLY ${mod.lessonCount} LESSONS.

SOURCE CODE (${language}):
\`\`\`
${code.slice(0, 12000)}
\`\`\`

STYLE RULES:
- Beginner level: basic Python only, no CS/math background assumed
- Heavy analogies (cooking recipes, Lego, GPS, everyday life)
- Line-by-line code walkthroughs
- Each lesson: 400-800 words of rich markdown with ## headers, paragraphs, code blocks
- Code walkthroughs: extract REAL code snippets from the source, explain each line
- 2-4 key takeaways per lesson
${isFirst ? '- Start with a compelling "Why does this matter?" hook connecting to ChatGPT, AI assistants, etc.' : ""}
${isLast ? "- End with a strong conclusion: what they built, what's next, celebrate their achievement" : "- End with a cliffhanger teasing the next module"}

Be SPECIFIC to this code. Reference actual variable names, functions, and patterns.`;

  const result = await geminiJson(ai, prompt, schema, 8000, 0.7);

  console.log(`   Lessons: ${result.lessons?.length}`);
  result.lessons?.forEach((l: any) => {
    const words = l.content?.split(/\s+/).length ?? 0;
    console.log(`     ${l.id}. "${l.title}" — ${words} words, ${l.codeWalkthroughs?.length} walkthroughs, ${l.keyTakeaways?.length} takeaways`);
  });
  return result;
}

// ---- Step 4: Assessments ----
async function generateAssessments(ai: GoogleGenAI, code: string, language: string, outline: any) {
  console.log("\n🧪 Step 4: Assessments...");

  const schema = {
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
                          properties: {
                            label: { type: Type.STRING },
                            text: { type: Type.STRING },
                          },
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
                    properties: {
                      label: { type: Type.STRING },
                      text: { type: Type.STRING },
                    },
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

  const moduleNames = outline.modules.map((m: any) => `${m.id}. ${m.title}`).join("\n");

  const prompt = `You are an expert programming educator creating assessments for a BEGINNER course.

COURSE: "${outline.title}"
MODULES:
${moduleNames}

SOURCE CODE (${language}):
\`\`\`
${code.slice(0, 8000)}
\`\`\`

CREATE:
- Per module: 3 quiz questions (mix multiple_choice, code_output, fill_in_code) + 1 coding challenge
- Final assessment: 8 comprehensive questions covering all modules
- Passing score: 70

RULES:
- All questions reference ACTUAL code from the source
- Wrong-answer explanations should teach the concept
- Challenges: provide starter code + hints + full solution
- Beginner friendly: "What does this print?", "Fill in the blank", etc.`;

  const result = await geminiJson(ai, prompt, schema, 8000, 0.5);

  console.log(`   Module assessments: ${result.moduleAssessments?.length}`);
  result.moduleAssessments?.forEach((a: any) => {
    console.log(`     Module ${a.moduleId}: ${a.quiz?.questions?.length} quiz Qs, challenge: "${a.challenge?.title}"`);
  });
  console.log(`   Final: ${result.finalAssessment?.questions?.length} Qs, passing: ${result.finalAssessment?.passingScore}%`);
  return result;
}

// ---- Main ----
async function main() {
  console.log("🚀 End-to-end generation: Karpathy microGPT gist, beginner level\n");

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const { code, language } = await fetchGist();

  // Step 1
  const feasibility = await analyzeFeasibility(ai, code, language);
  if (!feasibility.canLearn) {
    console.log("❌ Not suitable:", feasibility.reason);
    return;
  }

  // Step 2
  const outline = await generateOutline(ai, code, language, feasibility);

  // Step 3: all modules
  const allLessons: any[] = [];
  for (let i = 0; i < outline.modules.length; i++) {
    allLessons.push(await generateLessonContent(ai, code, language, outline, i));
  }

  // Step 4
  const assessments = await generateAssessments(ai, code, language, outline);

  // Assemble
  const course = {
    meta: {
      repoUrl: "https://gist.github.com/karpathy/8627fe009c40f57531cb18360106ce95",
      language,
      level: "beginner",
      title: outline.title,
      description: outline.description,
      prerequisites: outline.prerequisites,
      estimatedHours: outline.estimatedHours,
      moduleCount: outline.modules.length,
      generatedAt: new Date().toISOString(),
      aiModel: MODEL,
    },
    modules: outline.modules.map((mod: any, i: number) => {
      const assessment = assessments.moduleAssessments?.find((a: any) => a.moduleId === mod.id)
        ?? assessments.moduleAssessments?.[i];
      return {
        id: mod.id,
        title: mod.title,
        description: mod.description,
        estimatedMinutes: mod.estimatedMinutes,
        objectives: mod.objectives,
        lessons: allLessons[i]?.lessons ?? [],
        quiz: assessment?.quiz ?? { questions: [] },
        challenge: assessment?.challenge ?? { title: "", description: "", starterCode: "", hints: [], solution: "" },
      };
    }),
    finalAssessment: assessments.finalAssessment ?? { questions: [], passingScore: 70 },
  };

  const fs = await import("fs");
  fs.writeFileSync("scripts/generated-course-output.json", JSON.stringify(course, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("✅ GENERATION COMPLETE");
  console.log("=".repeat(60));
  console.log(`Modules: ${course.modules.length}`);
  console.log(`Lessons: ${course.modules.reduce((s: number, m: any) => s + (m.lessons?.length ?? 0), 0)}`);
  console.log(`Quiz Qs: ${course.modules.reduce((s: number, m: any) => s + (m.quiz?.questions?.length ?? 0), 0)}`);
  console.log(`Final Qs: ${course.finalAssessment.questions?.length}`);
  console.log(`JSON size: ${(JSON.stringify(course).length / 1024).toFixed(1)} KB`);
  console.log(`Written to: scripts/generated-course-output.json`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
