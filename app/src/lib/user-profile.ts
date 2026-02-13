import { getAdminFirestore } from "./firebase-admin";
import { encrypt, decrypt } from "./encryption";

// ---------- Types ----------

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  githubUsername: string | null;
  encryptedGithubToken: string | null;
  onboardingComplete: boolean;
  learningRepoCreated: boolean;
  learningRepoName: string | null;
  learningPaths: LearningPathEntry[];
  stats: UserStats;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  topicsCompleted: number;
  hoursInvested: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveAt: string | null;
}

export interface LearningPathEntry {
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  language: string;
  level: "beginner" | "intermediate" | "advanced";
  status: "to_learn" | "active" | "completed";
  modulesCompleted: number;
  modulesTotal: number;
  lastModuleTitle: string | null;
  lastAccessedAt: string;
  addedAt: string;
}

export const USERS_COLLECTION = "users";

// ---------- Helpers ----------

function usersCol() {
  return getAdminFirestore().collection(USERS_COLLECTION);
}

function defaultStats(): UserStats {
  return {
    topicsCompleted: 0,
    hoursInvested: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveAt: null,
  };
}

function buildDefaultProfile(
  uid: string,
  data?: {
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    githubUsername?: string | null;
    encryptedGithubToken?: string | null;
  }
): UserProfile {
  const now = new Date().toISOString();
  return {
    uid,
    email: data?.email ?? null,
    displayName: data?.displayName ?? null,
    photoURL: data?.photoURL ?? null,
    githubUsername: data?.githubUsername ?? null,
    encryptedGithubToken: data?.encryptedGithubToken ?? null,
    onboardingComplete: false,
    learningRepoCreated: false,
    learningRepoName: null,
    learningPaths: [],
    stats: defaultStats(),
    createdAt: now,
    updatedAt: now,
  };
}

// ---------- CRUD ----------

/**
 * Get a user profile, creating a default one if it doesn't exist.
 */
export async function getOrCreateProfile(
  uid: string,
  seed?: {
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    githubUsername?: string | null;
    encryptedGithubToken?: string | null;
  }
): Promise<UserProfile> {
  const doc = usersCol().doc(uid);
  const snap = await doc.get();

  if (snap.exists) {
    return snap.data() as UserProfile;
  }

  const profile = buildDefaultProfile(uid, seed);
  await doc.set(profile);
  return profile;
}

/**
 * Get a user profile. Returns null if not found.
 */
export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await usersCol().doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as UserProfile;
}

/**
 * Update specific fields on a user profile.
 */
export async function updateProfile(
  uid: string,
  updates: Partial<Omit<UserProfile, "uid" | "createdAt">>
): Promise<void> {
  await usersCol().doc(uid).update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Add a learning path to the user's profile.
 */
export async function addLearningPath(
  uid: string,
  entry: LearningPathEntry
): Promise<void> {
  const profile = await getProfile(uid);
  if (!profile) throw new Error("User profile not found");

  const exists = profile.learningPaths.some(
    (p) => p.repoOwner === entry.repoOwner && p.repoName === entry.repoName && p.level === entry.level
  );
  if (exists) throw new Error("Learning path already exists");

  const paths = [...profile.learningPaths, entry];
  await updateProfile(uid, { learningPaths: paths });
}

/**
 * Update an existing learning path by matching repoOwner+repoName+level.
 */
export async function updateLearningPath(
  uid: string,
  repoOwner: string,
  repoName: string,
  level: string,
  updates: Partial<LearningPathEntry>
): Promise<void> {
  const profile = await getProfile(uid);
  if (!profile) throw new Error("User profile not found");

  const paths = profile.learningPaths.map((p) => {
    if (p.repoOwner === repoOwner && p.repoName === repoName && p.level === level) {
      return { ...p, ...updates };
    }
    return p;
  });

  await updateProfile(uid, { learningPaths: paths });
}

/**
 * Get the user's decrypted GitHub token. Returns null if not stored.
 */
export async function getUserGithubToken(uid: string): Promise<string | null> {
  const profile = await getProfile(uid);
  if (!profile?.encryptedGithubToken) return null;
  return decrypt(profile.encryptedGithubToken);
}

/**
 * Store an encrypted GitHub token on the user profile.
 */
export async function storeGithubToken(uid: string, token: string): Promise<void> {
  const encryptedGithubToken = encrypt(token);
  await updateProfile(uid, { encryptedGithubToken });
}

/**
 * Increment topic stats and update streak.
 */
export async function incrementStats(
  uid: string,
  topicsToAdd: number,
  hoursToAdd: number
): Promise<void> {
  const profile = await getProfile(uid);
  if (!profile) throw new Error("User profile not found");

  const now = new Date().toISOString();
  const today = now.split("T")[0];
  const lastActive = profile.stats.lastActiveAt?.split("T")[0] ?? null;

  let { currentStreak, longestStreak } = profile.stats;

  if (lastActive !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (lastActive === yesterday) {
      currentStreak += 1;
    } else if (lastActive !== today) {
      currentStreak = 1;
    }
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }
  }

  await updateProfile(uid, {
    stats: {
      topicsCompleted: profile.stats.topicsCompleted + topicsToAdd,
      hoursInvested: profile.stats.hoursInvested + hoursToAdd,
      currentStreak,
      longestStreak,
      lastActiveAt: now,
    },
  });
}
