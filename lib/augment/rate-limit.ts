import { prisma } from "@/lib/prisma";

export async function checkAugmentQuota(
  orgId: string,
  userId: string,
  lessonId: string,
  max = 3
) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.augmentationServed.count({
    where: {
      orgId,
      userId,
      lessonId,
      createdAt: { gte: since }
    }
  });
  return { ok: count < max, remaining: Math.max(0, max - count) };
}
