import { Redis } from "@upstash/redis";
import { getServerEnv } from "./env";

let redis: Redis | undefined;

export function getRedis(): Redis {
  if (redis) return redis;

  const env = getServerEnv();
  redis = new Redis({
    url: env.KV_REST_API_URL,
    token: env.KV_REST_API_TOKEN,
  });

  return redis;
}
