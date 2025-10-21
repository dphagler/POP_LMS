import { prisma } from "./prisma";
import { userBadgeByUserAndBadge } from "./prisma-helpers";

const STREAK_BADGE_CODE = "streak-3";
const STREAK_LENGTH = 3;

export async function computeStreak(userId: string) {
  const progresses = await prisma.progress.findMany({
    where: { userId },
    select: { lastHeartbeatAt: true },
    orderBy: { lastHeartbeatAt: "desc" }
  });
  const dates = progresses
    .map((p) => (p.lastHeartbeatAt ? new Date(p.lastHeartbeatAt) : null))
    .filter((d): d is Date => !!d)
    .map((d) => new Date(d.toDateString()));

  let streak = 0;
  let current = new Date(new Date().toDateString());

  const uniqueDates = Array.from(new Set(dates.map((d) => d.toISOString()))).map((iso) => new Date(iso));
  uniqueDates.sort((a, b) => b.getTime() - a.getTime());

  for (const date of uniqueDates) {
    if (date.getTime() === current.getTime()) {
      streak += 1;
      current.setDate(current.getDate() - 1);
    } else if (date.getTime() === current.getTime() - 24 * 60 * 60 * 1000) {
      streak += 1;
      current = date;
      current.setDate(current.getDate() - 1);
    } else if (date.getTime() < current.getTime()) {
      break;
    }
  }

  if (streak >= STREAK_LENGTH) {
    const badge = await prisma.badge.upsert({
      where: { code: STREAK_BADGE_CODE },
      update: {},
      create: {
        code: STREAK_BADGE_CODE,
        name: "3-Day Streak",
        criteria: { streak: STREAK_LENGTH }
      }
    });

    await prisma.userBadge.upsert({
      where: userBadgeByUserAndBadge(userId, badge.id),
      update: {},
      create: {
        userId,
        badgeId: badge.id
      }
    });
  }

  return streak;
}
