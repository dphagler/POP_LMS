import type { Prisma } from "@prisma/client";

export function progressByUserAndLesson(userId: string, lessonId: string): Prisma.ProgressWhereUniqueInput {
  return {
    userId_lessonId: {
      userId,
      lessonId
    }
  } as unknown as Prisma.ProgressWhereUniqueInput;
}

export function userBadgeByUserAndBadge(userId: string, badgeId: string): Prisma.UserBadgeWhereUniqueInput {
  return {
    userId_badgeId: {
      userId,
      badgeId
    }
  } as unknown as Prisma.UserBadgeWhereUniqueInput;
}
