import { Prisma, type PrismaClient, type Progress } from "@prisma/client";

import { prisma } from "../prisma";
import { coerceSegments, computeUniqueSeconds } from "../lesson/progress";

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
  tickAt?: Date | null;
  segments?: number[][] | null;
  uniqueSeconds?: number | null;
  maybeCompletedAt?: Date | null;
  client?: ClientOrTx;
};

export async function saveSegments({
  userId,
  lessonId,
  tickAt,
  segments,
  uniqueSeconds,
  maybeCompletedAt,
  client,
}: SaveSegmentsParams): Promise<Progress> {
  const db = getClient(client);

  const updateData: Prisma.ProgressUpdateInput = {};

  if (tickAt !== undefined) {
    updateData.lastTickAt = tickAt;
  }

  if (segments !== undefined) {
    updateData.segments =
      segments === null
        ? Prisma.JsonNull
        : (segments as unknown as Prisma.InputJsonValue);
  }

  if (uniqueSeconds !== undefined) {
    updateData.uniqueSeconds = uniqueSeconds ?? undefined;
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
      lastTickAt: tickAt ?? undefined,
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

export function calcUniqueSeconds(rawSegments: unknown): number {
  const segments = coerceSegments(rawSegments);

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
