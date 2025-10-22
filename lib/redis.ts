import { env } from "./env";
import { createLogger, serializeError } from "./logger";

const logger = createLogger({ component: "redis" });

type LeaderboardEntry = {
  userId: string;
  score: number;
};

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return [];
  }
  const res = await fetch(`${env.UPSTASH_REDIS_REST_URL}/get/leaderboard`, {
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`
    },
    cache: "no-store"
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { result?: string };
  if (!data.result) return [];
  try {
    return JSON.parse(data.result) as LeaderboardEntry[];
  } catch (error) {
    logger.error({
      event: "redis.leaderboard_parse_failed",
      error: serializeError(error)
    });
    return [];
  }
}

export async function bumpUserScore(userId: string, delta = 1) {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return;
  }
  await fetch(`${env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      pipeline: [
        ["GET", "leaderboard"],
        ["SET", "leaderboard", JSON.stringify([{ userId, score: delta }])]
      ]
    })
  }).catch((error) => {
    logger.error({
      event: "redis.leaderboard_update_failed",
      error: serializeError(error)
    });
  });
}
