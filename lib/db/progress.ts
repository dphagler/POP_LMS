import { Prisma, type PrismaClient, type Progress } from "@prisma/client";

import { prisma } from "../prisma";
import { computeUniqueSeconds, type Segment } from "../lesson/progress";

type ClientOrTx = PrismaClient | Prisma.TransactionClient;

type ProgressDefaults = Omit<
  Prisma.ProgressCreateInput,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "user"
  | "lesson"
  | "userId"
  | "lessonId"
>;

function getClient(client?: ClientOrTx): ClientOrTx {
  return client ?? prisma;
}

export async function getOrCreate(
  userId: string,
  lessonId: string,
  defaults: ProgressDefaults = {},
  client?: ClientOrTx,
): Promise<Progress> {
  const db = getClient(client);

  return db.progress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {},
    create: {
      userId,
      lessonId,
      ...defaults,
    },
  });
}

export type SaveSegmentsParams = {
  userId: string;
  lessonId: string;
  provider?: string | null;
  tickAt?: Date | null;
  segments?: number[][] | null;
  uniqueSeconds?: number | null;
  maybeCompletedAt?: Date | null;
  client?: ClientOrTx;
};

export async function saveSegments({
  userId,
  lessonId,
  provider,
  tickAt,
  segments,
  uniqueSeconds,
  maybeCompletedAt,
  client,
}: SaveSegmentsParams): Promise<Progress> {
  const db = getClient(client);

  const updateData: Prisma.ProgressUpdateInput = {};

  if (provider !== undefined) {
    updateData.provider = provider;
  }

  if (tickAt !== undefined) {
    updateData.lastTickAt = tickAt;
    updateData.lastHeartbeatAt = tickAt;
  }

  if (segments !== undefined) {
    updateData.segments =
      segments === null
        ? Prisma.JsonNull
        : (segments as unknown as Prisma.InputJsonValue);
  }

  if (uniqueSeconds !== undefined) {
    updateData.uniqueSeconds = uniqueSeconds;
  }

  if (maybeCompletedAt !== undefined) {
    updateData.completedAt = maybeCompletedAt;
  }

  return db.progress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: updateData,
    create: {
      userId,
      lessonId,
      provider: provider ?? undefined,
      lastTickAt: tickAt ?? undefined,
      lastHeartbeatAt: tickAt ?? undefined,
      segments:
        segments === undefined
          ? undefined
          : segments === null
            ? Prisma.JsonNull
            : (segments as unknown as Prisma.InputJsonValue),
      uniqueSeconds: uniqueSeconds ?? undefined,
      completedAt: maybeCompletedAt ?? undefined,
    },
  });
}

export function calcUniqueSeconds(rawSegments: number[][]): number {
  if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
    return 0;
  }

  const segments: Segment[] = [];

  for (const entry of rawSegments) {
    if (!Array.isArray(entry) || entry.length < 2) {
      continue;
    }

    const [start, end] = entry;

    if (typeof start !== "number" || typeof end !== "number") {
      continue;
    }

    segments.push([start, end]);
  }

  if (segments.length === 0) {
    return 0;
  }

  const duration = segments.reduce((max, [, end]) => Math.max(max, end), 0);

  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  const unique = computeUniqueSeconds(segments, duration);
  return Math.max(0, Math.round(unique));
}
