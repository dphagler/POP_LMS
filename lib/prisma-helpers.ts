import type { Prisma } from "@prisma/client";

export function userBadgeByUserAndBadge(userId: string, badgeId: string): Prisma.UserBadgeWhereUniqueInput {
  return {
    userId_badgeId: {
      userId,
      badgeId
    }
  } as unknown as Prisma.UserBadgeWhereUniqueInput;
}
