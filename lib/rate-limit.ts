import { env } from "./env";

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number | null;
};

type RedisCommand = [command: string, ...args: Array<string | number>];

async function executePipeline(commands: RedisCommand[]) {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const response = await fetch(`${env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ pipeline: commands })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    console.error("Failed to execute Redis pipeline", response.status, message);
    return null;
  }

  const data = (await response.json()) as { result?: Array<{ result: number | string | null }> };
  return data.result ?? null;
}

export async function enforceRateLimit(key: string, limit: number, windowInSeconds: number): Promise<RateLimitResult> {
  if (limit <= 0) {
    return { success: false, limit, remaining: 0, reset: null };
  }

  const result = await executePipeline([
    ["INCR", key],
    ["EXPIRE", key, windowInSeconds, "NX"],
    ["TTL", key]
  ]);

  if (!result) {
    return { success: true, limit, remaining: limit, reset: null };
  }

  const counter = Number(result[0]?.result ?? 0);
  const ttl = Number(result[2]?.result ?? windowInSeconds);
  const remaining = Math.max(0, limit - counter);
  const success = counter <= limit;
  const reset = Number.isFinite(ttl) && ttl > 0 ? Date.now() + ttl * 1000 : null;

  return {
    success,
    limit,
    remaining,
    reset
  };
}
