import { getAdminFirestore } from "./firebase-admin";

// ---------- Types ----------

export interface LevelStatus {
  generated: boolean;
  generatedAt: string | null;
}

export interface MaterialRecord {
  repoUrl: string;
  owner: string;
  name: string;
  language: string;
  type: "repo" | "gist";
  description: string;
  levels: {
    beginner: LevelStatus;
    intermediate: LevelStatus;
    advanced: LevelStatus;
  };
  feasibility: {
    canLearn: boolean;
    complexity: "simple" | "moderate" | "complex" | "too_complex";
    prerequisites: string[];
    estimatedHours: { beginner: number; intermediate: number; advanced: number };
    reason: string | null;
  };
  timesAccessed: number;
  createdAt: string;
  updatedAt: string;
}

export type ExpertiseLevel = "beginner" | "intermediate" | "advanced";

const COLLECTION = "materials";

// ---------- Document ID ----------

/**
 * Build a deterministic Firestore document ID from a material's properties.
 * e.g. "python_karpathy_8627fe009c40f57531cb18360106ce95"
 */
export function buildDocumentId(
  language: string,
  owner: string,
  name: string
): string {
  const sanitize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${sanitize(language)}_${sanitize(owner)}_${sanitize(name)}`;
}

// ---------- CRUD ----------

/**
 * Look up a material record by its document ID.
 * Returns null if not found.
 */
export async function lookupMaterial(
  docId: string
): Promise<MaterialRecord | null> {
  const db = getAdminFirestore();
  const snap = await db.collection(COLLECTION).doc(docId).get();
  if (!snap.exists) return null;
  return snap.data() as MaterialRecord;
}

/**
 * Save or overwrite a material record.
 */
export async function saveMaterial(
  docId: string,
  record: MaterialRecord
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(docId).set(record);
}

/**
 * Mark a specific level as generated and update the timestamp.
 */
export async function markLevelGenerated(
  docId: string,
  level: ExpertiseLevel
): Promise<void> {
  const db = getAdminFirestore();
  await db
    .collection(COLLECTION)
    .doc(docId)
    .update({
      [`levels.${level}.generated`]: true,
      [`levels.${level}.generatedAt`]: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
}

/**
 * Increment the access counter for a material.
 */
export async function incrementAccess(docId: string): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(docId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const current = (snap.data() as MaterialRecord).timesAccessed;
    tx.update(ref, {
      timesAccessed: current + 1,
      updatedAt: new Date().toISOString(),
    });
  });
}

export { COLLECTION };
