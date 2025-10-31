import { prisma } from "@/lib/prisma";

const MAX_PER_HOUR = 3;
const WINDOW_MS = 60 * 60 * 1000;

type CheckQuotaInput = {
  userId: string;
  lessonId: string;
};

type CheckQuotaResult = {
  ok: boolean;
  remaining: number;
};

export async function checkAugmentQuota({
  userId,
  lessonId
}: CheckQuotaInput): Promise<CheckQuotaResult> {
  const cutoff = new Date(Date.now() - WINDOW_MS);

  const recentCount = await prisma.augmentationServed.count({
    where: {
      userId,
      lessonId,
      createdAt: { gt: cutoff }
    }
  });

  const remaining = Math.max(0, MAX_PER_HOUR - recentCount);

  return {
    ok: recentCount < MAX_PER_HOUR,
    remaining
  };
}
