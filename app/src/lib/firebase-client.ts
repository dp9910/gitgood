import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GithubAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApp();
    return app;
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !authDomain || !projectId) {
    throw new Error("Missing Firebase client environment variables");
  }

  app = initializeApp({ apiKey, authDomain, projectId });
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  return auth;
}

const githubProvider = new GithubAuthProvider();
githubProvider.addScope("repo");

export async function signInWithGitHub() {
  const authInstance = getFirebaseAuth();
  const result = await signInWithPopup(authInstance, githubProvider);
  const idToken = await result.user.getIdToken();

  // Extract GitHub OAuth access token from credential
  const credential = GithubAuthProvider.credentialFromResult(result);
  const githubAccessToken = credential?.accessToken ?? null;

  // Send token to server to create httpOnly session cookie + store GitHub token
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, githubAccessToken }),
  });

  if (!response.ok) {
    throw new Error("Failed to create session");
  }

  return result.user;
}

export async function signOut() {
  const authInstance = getFirebaseAuth();

  // Clear server-side session cookie
  await fetch("/api/auth/session", { method: "DELETE" });

  // Clear client-side Firebase state
  await firebaseSignOut(authInstance);
}

export function onAuthChange(callback: (user: User | null) => void) {
  const authInstance = getFirebaseAuth();
  return onAuthStateChanged(authInstance, callback);
}

export type { User };
