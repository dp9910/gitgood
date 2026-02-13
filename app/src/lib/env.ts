import { z } from "zod/v4";

/**
 * Server-side environment variables.
 * These are NEVER exposed to the client bundle.
 * Validated at server startup — missing or empty values crash immediately.
 */
const serverSchema = z.object({
  GEMINI_API_KEY: z
    .string()
    .min(1, "GEMINI_API_KEY is required"),
  GITHUB_PERSONAL_TOKEN: z
    .string()
    .min(1, "GITHUB_PERSONAL_TOKEN is required"),
  FIREBASE_PROJECT_ID: z
    .string()
    .min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_CLIENT_EMAIL: z
    .string()
    .min(1, "FIREBASE_CLIENT_EMAIL is required"),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .min(1, "FIREBASE_PRIVATE_KEY is required"),
  KV_REST_API_URL: z
    .string()
    .min(1, "KV_REST_API_URL is required"),
  KV_REST_API_TOKEN: z
    .string()
    .min(1, "KV_REST_API_TOKEN is required"),
});

/**
 * Client-side environment variables.
 * Must be prefixed with NEXT_PUBLIC_ to be included in the browser bundle.
 * Only non-secret configuration belongs here.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_FIREBASE_API_KEY is required"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z
    .string()
    .min(1, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z
    .string()
    .min(1, "NEXT_PUBLIC_FIREBASE_PROJECT_ID is required"),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

/**
 * Validate and return server environment variables.
 * Call this in API routes / server components only.
 * Throws on missing or empty values.
 */
export function getServerEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    throw new Error(
      `Missing or invalid server environment variables:\n${formatted}`
    );
  }
  return result.data;
}

/**
 * Validate and return client environment variables.
 * Safe to call anywhere — only contains NEXT_PUBLIC_ values.
 */
export function getClientEnv(): ClientEnv {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_FIREBASE_API_KEY:
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    throw new Error(
      `Missing or invalid client environment variables:\n${formatted}`
    );
  }
  return result.data;
}

/** All required environment variable keys (for .env.example validation) */
export const ALL_REQUIRED_KEYS = [
  ...Object.keys(serverSchema.shape),
  ...Object.keys(clientSchema.shape),
] as const;
