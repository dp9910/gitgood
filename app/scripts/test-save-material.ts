/**
 * End-to-end test: Generate + Save to Firestore + Push to GitHub repo.
 * Run with: npx tsx scripts/test-save-material.ts
 *
 * If scripts/generated-course-output.json exists, uses it to skip LLM calls.
 * Otherwise generates fresh via Gemini.
 */

import { readFileSync, existsSync, writeFileSync } from "fs";

// -- Load .env.local --
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
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const GITHUB_TOKEN = process.env.GITHUB_PERSONAL_TOKEN!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = "gemini-2.0-flash";

const GIST_ID = "8627fe009c40f57531cb18360106ce95";
const GIST_OWNER = "karpathy";
const LEVEL = "beginner";
const MATERIAL_REPO_OWNER = "dp9910";
const MATERIAL_REPO_NAME = "gitgood-learning-material";
const COLLECTION = "materials";

// ---- Firebase init ----
let db: ReturnType<typeof getFirestore>;
let firestoreAvailable = false;
try {
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
  db = getFirestore(app);
} catch (err: any) {
  console.log(`⚠️ Firebase init issue: ${err.message?.split("\n")[0]}`);
}

// ---- Helpers ----
function buildDocumentId(language: string, owner: string, name: string): string {
  const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${sanitize(language)}_${sanitize(owner)}_${sanitize(name)}`;
}

const ghHeaders: Record<string, string> = {
  Authorization: `token ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github.v3+json",
  "Content-Type": "application/json",
};

async function ghGetFile(path: string): Promise<{ content: string; sha: string } | null> {
  const url = `https://api.github.com/repos/${MATERIAL_REPO_OWNER}/${MATERIAL_REPO_NAME}/contents/${path}`;
  const res = await fetch(url, { headers: ghHeaders });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${path}: ${res.status}`);
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha };
}

async function ghPutFile(path: string, content: string, message: string, sha?: string): Promise<void> {
  const url = `https://api.github.com/repos/${MATERIAL_REPO_OWNER}/${MATERIAL_REPO_NAME}/contents/${path}`;
  const body: Record<string, any> = { message, content: Buffer.from(content).toString("base64") };
  if (sha) body.sha = sha;
  const res = await fetch(url, { method: "PUT", headers: ghHeaders, body: JSON.stringify(body) });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GitHub PUT ${path}: ${res.status} — ${errBody.slice(0, 200)}`);
  }
}

async function geminiJson(ai: GoogleGenAI, prompt: string, schema: any, maxTokens: number, temp: number): Promise<any> {
  const response = await ai.models.generateContent({
    model: MODEL, contents: prompt,
    config: { maxOutputTokens: maxTokens, temperature: temp, responseMimeType: "application/json", responseSchema: schema },
  });
  return JSON.parse(response.text ?? "{}");
}

// ---- Generation steps (used only when no cached output) ----
async function generateFresh(): Promise<{ course: any; feasibility: any; language: string }> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Fetch gist
  const gistRes = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });
  if (!gistRes.ok) throw new Error(`Gist fetch failed: ${gistRes.status}`);
  const gist = await gistRes.json();
  const files = Object.values(gist.files) as any[];
  const code = files.map((f: any) => f.content).join("\n\n");
  const language = files[0]?.language?.toLowerCase() ?? "python";
  console.log(`✅ Fetched gist (${code.length} chars, ${language})`);

  // Step 1: Feasibility
  console.log("🔍 Step 1: Feasibility...");
  const feasSchema = {
    type: Type.OBJECT,
    properties: {
      canLearn: { type: Type.BOOLEAN }, complexity: { type: Type.STRING, enum: ["simple", "moderate", "complex", "too_complex"] },
      prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
      estimatedHours: { type: Type.OBJECT, properties: { beginner: { type: Type.NUMBER }, intermediate: { type: Type.NUMBER }, advanced: { type: Type.NUMBER } }, required: ["beginner", "intermediate", "advanced"] },
      reason: { type: Type.STRING, nullable: true }, language: { type: Type.STRING }, description: { type: Type.STRING },
    },
    required: ["canLearn", "complexity", "prerequisites", "estimatedHours", "language", "description"],
  };
  const feasibility = await geminiJson(ai, `Analyze this code for a learning course.\nCODE (${language}):\n\`\`\`\n${code.slice(0, 15000)}\n\`\`\`\nPrerequisites: 3-5 max, practical only. estimatedHours: beginner 6-15h, intermediate 4-8h, advanced 2-5h.`, feasSchema, 1000, 0.3);
  console.log(`   ${feasibility.complexity} | canLearn: ${feasibility.canLearn}`);
  if (!feasibility.canLearn) throw new Error(`Not suitable: ${feasibility.reason}`);

  // Step 2: Outline
  console.log("📋 Step 2: Outline...");
  const outSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING }, description: { type: Type.STRING },
      prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } }, estimatedHours: { type: Type.NUMBER },
      modules: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
        id: { type: Type.NUMBER }, title: { type: Type.STRING }, description: { type: Type.STRING },
        estimatedMinutes: { type: Type.NUMBER }, objectives: { type: Type.ARRAY, items: { type: Type.STRING } }, lessonCount: { type: Type.NUMBER },
      }, required: ["id", "title", "description", "estimatedMinutes", "objectives", "lessonCount"] } },
    },
    required: ["title", "description", "prerequisites", "estimatedHours", "modules"],
  };
  const outline = await geminiJson(ai, `Create a BEGINNER course outline for this ${language} code. ${feasibility.description}. Complexity: ${feasibility.complexity}.\n\`\`\`\n${code.slice(0, 10000)}\n\`\`\`\nRULES: exactly 4-5 modules, exactly 2 lessons each, under 20 word descriptions, max 3 objectives each under 10 words, target ${feasibility.estimatedHours.beginner}h. Reference actual code.`, outSchema, 6000, 0.5);
  console.log(`   "${outline.title}" — ${outline.modules?.length} modules`);

  // Step 3: Lessons
  const lessonSchema = {
    type: Type.OBJECT,
    properties: { lessons: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
      id: { type: Type.NUMBER }, title: { type: Type.STRING }, content: { type: Type.STRING },
      codeWalkthroughs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { code: { type: Type.STRING }, language: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["code", "language", "explanation"] } },
      keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
    }, required: ["id", "title", "content", "codeWalkthroughs", "keyTakeaways"] } } },
    required: ["lessons"],
  };
  const allLessons: any[] = [];
  for (let i = 0; i < outline.modules.length; i++) {
    const mod = outline.modules[i];
    console.log(`📖 Step 3.${i + 1}: "${mod.title}"...`);
    const isFirst = i === 0, isLast = i === outline.modules.length - 1;
    const result = await geminiJson(ai, `Write BEGINNER lessons for MODULE ${i + 1}/${outline.modules.length}: "${mod.title}".\nObjectives: ${mod.objectives.join("; ")}. Write exactly ${mod.lessonCount} lessons.\n\`\`\`\n${code.slice(0, 12000)}\n\`\`\`\nEach lesson: 400-800 words markdown, 2-3 code walkthroughs from REAL source, 3-4 takeaways. Heavy analogies.${isFirst ? ' Open with "Why does this matter?"' : ""}${isLast ? " End with celebration." : " End with cliffhanger."}`, lessonSchema, 8000, 0.7);
    result.lessons?.forEach((l: any) => console.log(`     "${l.title}" — ${l.content?.split(/\s+/).length ?? 0} words`));
    allLessons.push(result);
  }

  // Step 4: Assessments
  console.log("🧪 Step 4: Assessments...");
  const assessSchema = {
    type: Type.OBJECT,
    properties: {
      moduleAssessments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
        moduleId: { type: Type.NUMBER },
        quiz: { type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
          type: { type: Type.STRING, enum: ["multiple_choice", "code_output", "fill_in_code"] },
          question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["label", "text"] } },
          correctAnswer: { type: Type.STRING }, explanation: { type: Type.STRING },
        }, required: ["type", "question", "correctAnswer", "explanation"] } } }, required: ["questions"] },
        challenge: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, starterCode: { type: Type.STRING }, hints: { type: Type.ARRAY, items: { type: Type.STRING } }, solution: { type: Type.STRING } }, required: ["title", "description", "starterCode", "hints", "solution"] },
      }, required: ["moduleId", "quiz", "challenge"] } },
      finalAssessment: { type: Type.OBJECT, properties: { questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
        type: { type: Type.STRING, enum: ["multiple_choice", "code_output", "fill_in_code"] },
        question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["label", "text"] } },
        correctAnswer: { type: Type.STRING }, explanation: { type: Type.STRING },
      }, required: ["type", "question", "correctAnswer", "explanation"] } }, passingScore: { type: Type.NUMBER } }, required: ["questions", "passingScore"] },
    },
    required: ["moduleAssessments", "finalAssessment"],
  };
  const moduleNames = outline.modules.map((m: any) => `${m.id}. ${m.title}`).join("\n");
  const assessments = await geminiJson(ai, `Create assessments for BEGINNER course "${outline.title}".\nModules:\n${moduleNames}\n\`\`\`\n${code.slice(0, 8000)}\n\`\`\`\nPer module: 3 quiz Qs (mix types) + 1 challenge. Final: 8 Qs, passing 70. Reference actual code.`, assessSchema, 8000, 0.5);
  console.log(`   ${assessments.moduleAssessments?.length} module assessments, ${assessments.finalAssessment?.questions?.length} final Qs`);

  // Assemble
  const now = new Date().toISOString();
  const course = {
    meta: {
      repoUrl: `https://gist.github.com/${GIST_OWNER}/${GIST_ID}`,
      language, level: LEVEL, title: outline.title, description: outline.description,
      prerequisites: outline.prerequisites, estimatedHours: outline.estimatedHours,
      moduleCount: outline.modules.length, generatedAt: now, aiModel: MODEL,
    },
    modules: outline.modules.map((mod: any, i: number) => {
      const a = assessments.moduleAssessments?.find((x: any) => x.moduleId === mod.id) ?? assessments.moduleAssessments?.[i];
      return {
        id: mod.id, title: mod.title, description: mod.description,
        estimatedMinutes: mod.estimatedMinutes, objectives: mod.objectives,
        lessons: allLessons[i]?.lessons ?? [],
        quiz: a?.quiz ?? { questions: [] },
        challenge: a?.challenge ?? { title: "", description: "", starterCode: "", hints: [], solution: "" },
      };
    }),
    finalAssessment: assessments.finalAssessment ?? { questions: [], passingScore: 70 },
  };

  writeFileSync("scripts/generated-course-output.json", JSON.stringify(course, null, 2));
  return { course, feasibility, language };
}

// ---- Main ----
async function main() {
  console.log("🚀 E2E: Generate → GitHub Push → Firestore Save → Verify\n");

  const docId = buildDocumentId("python", GIST_OWNER, GIST_ID);
  const coursePath = `python/${GIST_OWNER}--${GIST_ID}/${LEVEL}.json`;
  const metaPath = `python/${GIST_OWNER}--${GIST_ID}/meta.json`;
  console.log(`Doc ID:  ${docId}`);
  console.log(`GitHub:  ${coursePath}\n`);

  // ---- 1. Check GitHub cache first (faster than Firestore) ----
  console.log("📋 Step 0: Checking GitHub for existing course...");
  const cachedGH = await ghGetFile(coursePath);
  if (cachedGH) {
    const c = JSON.parse(cachedGH.content);
    console.log(`✅ Already exists in GitHub!`);
    console.log(`   Title: ${c.meta?.title}`);
    console.log(`   Modules: ${c.modules?.length}`);
    console.log(`   Size: ${(cachedGH.content.length / 1024).toFixed(1)} KB`);
    console.log("\n🎉 Deduplication working! Course already pushed. Skipping.\n");

    // Test Firestore check too
    if (db) {
      try {
        const snap = await db.collection(COLLECTION).doc(docId).get();
        if (snap.exists) {
          const d = snap.data() as any;
          console.log(`✅ Firestore record also exists: beginner=${d.levels?.beginner?.generated}, accessed=${d.timesAccessed}`);
          // Increment access
          await db.collection(COLLECTION).doc(docId).update({
            timesAccessed: (d.timesAccessed ?? 0) + 1,
            updatedAt: new Date().toISOString(),
          });
          console.log(`   Access count incremented to ${(d.timesAccessed ?? 0) + 1}`);
        } else {
          console.log("⚠️ Firestore record missing — will create from cached GitHub data.");
          // Could create Firestore record from GitHub data here
        }
      } catch (err: any) {
        console.log(`⚠️ Firestore: ${err.message?.split("\n")[0]}`);
      }
    }
    return;
  }
  console.log("   Not found. Will generate and push.\n");

  // ---- 2. Get or generate course ----
  let course: any, feasibility: any, language: string;

  if (existsSync("scripts/generated-course-output.json")) {
    console.log("📂 Using locally cached generation output...");
    const cached = readFileSync("scripts/generated-course-output.json", "utf-8");
    course = JSON.parse(cached);
    language = course.meta?.language ?? "python";
    feasibility = {
      canLearn: true, complexity: "complex",
      prerequisites: course.meta?.prerequisites ?? [],
      estimatedHours: { beginner: course.meta?.estimatedHours ?? 8, intermediate: 5, advanced: 3 },
      reason: null, language, description: course.meta?.description ?? "",
    };
    console.log(`   "${course.meta?.title}" — ${course.modules?.length} modules\n`);
  } else {
    console.log("🤖 Generating via Gemini...\n");
    const result = await generateFresh();
    course = result.course;
    feasibility = result.feasibility;
    language = result.language;
  }

  const courseJson = JSON.stringify(course, null, 2);
  console.log(`\n📦 Course: ${(courseJson.length / 1024).toFixed(1)} KB`);

  // ---- 3. Push to GitHub ----
  console.log(`\n🔼 Pushing to GitHub: ${MATERIAL_REPO_OWNER}/${MATERIAL_REPO_NAME}...`);

  // Push course JSON
  const existingCourse = await ghGetFile(coursePath);
  await ghPutFile(coursePath, courseJson, `Add ${LEVEL} course for ${GIST_OWNER}/${GIST_ID}`, existingCourse?.sha);
  console.log(`   ✅ ${coursePath}`);

  // Push meta.json
  const now = new Date().toISOString();
  const meta: any = {
    repoUrl: course.meta.repoUrl, language,
    description: feasibility.description, complexity: feasibility.complexity,
    prerequisites: feasibility.prerequisites, estimatedHours: feasibility.estimatedHours,
    generatedLevels: [LEVEL], lastUpdated: now,
  };
  const existingMeta = await ghGetFile(metaPath);
  if (existingMeta) {
    const prev = JSON.parse(existingMeta.content);
    meta.generatedLevels = [...new Set([...(prev.generatedLevels ?? []), LEVEL])];
  }
  await ghPutFile(metaPath, JSON.stringify(meta, null, 2), `Update meta for ${GIST_OWNER}/${GIST_ID}`, existingMeta?.sha);
  console.log(`   ✅ ${metaPath}`);

  // ---- 4. Save to Firestore ----
  if (db) {
    console.log(`\n🔥 Saving to Firestore...`);
    try {
      const record = {
        repoUrl: `https://gist.github.com/${GIST_OWNER}/${GIST_ID}`,
        owner: GIST_OWNER, name: GIST_ID, language, type: "gist",
        description: feasibility.description,
        levels: {
          beginner: { generated: LEVEL === "beginner", generatedAt: LEVEL === "beginner" ? now : null },
          intermediate: { generated: LEVEL === "intermediate", generatedAt: LEVEL === "intermediate" ? now : null },
          advanced: { generated: LEVEL === "advanced", generatedAt: LEVEL === "advanced" ? now : null },
        },
        feasibility: {
          canLearn: feasibility.canLearn, complexity: feasibility.complexity,
          prerequisites: feasibility.prerequisites, estimatedHours: feasibility.estimatedHours,
          reason: feasibility.reason ?? null,
        },
        timesAccessed: 1, createdAt: now, updatedAt: now,
      };
      await db.collection(COLLECTION).doc(docId).set(record);
      console.log(`   ✅ Document saved: materials/${docId}`);
    } catch (err: any) {
      console.log(`   ⚠️ Firestore save failed: ${err.message?.split("\n")[0]}`);
      console.log("   Enable Firestore API at: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=gitgood-dff6e");
    }
  } else {
    console.log("\n⚠️ Skipping Firestore (not available)");
  }

  // ---- 5. Verify GitHub ----
  console.log(`\n🔍 Verifying GitHub...`);
  const verify = await ghGetFile(coursePath);
  if (verify) {
    const c = JSON.parse(verify.content);
    console.log(`   ✅ "${c.meta?.title}" | ${c.modules?.length} modules | ${(verify.content.length / 1024).toFixed(1)} KB`);
  } else {
    console.log(`   ❌ NOT found!`);
  }

  // ---- Summary ----
  console.log("\n" + "=".repeat(60));
  console.log("✅ E2E TEST COMPLETE");
  console.log("=".repeat(60));
  console.log(`Course: "${course.meta.title}"`);
  console.log(`Modules: ${course.modules.length}`);
  console.log(`Lessons: ${course.modules.reduce((s: number, m: any) => s + (m.lessons?.length ?? 0), 0)}`);
  console.log(`Size: ${(courseJson.length / 1024).toFixed(1)} KB`);
  console.log(`GitHub: ${coursePath}`);
  console.log(`Firestore: materials/${docId}`);
  console.log("\nRun again to test deduplication (should hit cache).");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
