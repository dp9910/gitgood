import { Redis } from "@upstash/redis";
import { getServerEnv } from "./env";

let redis: Redis | undefined;

export function isRedisConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN);
}

export function getRedis(): Redis | null {
  if (!isRedisConfigured()) return null;
  if (redis) return redis;

  const env = getServerEnv();
  redis = new Redis({
    url: env.KV_REST_API_URL,
    token: env.KV_REST_API_TOKEN,
  });

  return redis;
}
