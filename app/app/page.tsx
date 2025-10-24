import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  Heading,
  Icon,
  Progress,
  SimpleGrid,
  Stack,
  Text
} from "@chakra-ui/react";
import { CheckCircle2, Clock, PlayCircle, Target } from "lucide-react";

import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";

import type { Lesson as LessonModel, Progress as ProgressModel } from "@prisma/client";

function getLessonCta(progress: ProgressModel | undefined) {
  if (progress?.isComplete) {
    return { label: "Review", description: "Review lesson" } as const;
  }

  if (progress && progress.watchedSeconds > 0) {
    return { label: "Resume", description: "Resume lesson" } as const;
  }

  return { label: "Start", description: "Start lesson" } as const;
}

function getLessonProgressPercent(lesson: LessonModel, progress: ProgressModel | undefined) {
  if (!progress) {
    return 0;
  }

  if (progress.isComplete) {
    return 100;
  }

  if (!lesson.durationS) {
    return progress.watchedSeconds > 0 ? 50 : 0;
  }

  const ratio = (progress.watchedSeconds / lesson.durationS) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
}

function formatLessonDuration(durationS: number) {
  if (!durationS) {
    return "Under a minute";
  }

  if (durationS < 60) {
    return `${durationS} sec`;
  }

  const minutes = Math.round(durationS / 60);
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

export default async function LearnerDashboard() {
  const session = await requireUser();
  const { id: userId, orgId } = session.user;

  if (!orgId) {
    throw new Error("Organization not found for learner");
  }

  const [assignments, badges, progresses] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        orgId,
        enrollments: {
          some: { userId }
        }
      },
      include: {
        module: {
          include: {
            lessons: true,
            course: true
          }
        },
        course: {
          include: {
            modules: {
              include: {
                lessons: true
              }
            }
          }
        }
      }
    }),
    prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true }
    }),
    prisma.progress.findMany({
      where: { userId },
      include: { lesson: true }
    })
  ]);

  const lessonMap = new Map<string, LessonModel>();

  assignments.forEach((assignment) => {
    if (assignment.module) {
      assignment.module.lessons.forEach((lesson) => {
        lessonMap.set(lesson.id, lesson);
      });
    } else if (assignment.course) {
      assignment.course.modules.forEach((module) => {
        module.lessons.forEach((lesson) => {
          lessonMap.set(lesson.id, lesson);
        });
      });
    }
  });

  const lessons = Array.from(lessonMap.values());
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const relevantProgresses = progresses.filter((item) => lessonIds.has(item.lessonId));

  const streak = await computeStreak(userId);
  const progressByLesson = new Map(relevantProgresses.map((item) => [item.lessonId, item]));
  const prioritizedLessons = [...lessons].sort((a, b) => {
    const progressA = progressByLesson.get(a.id);
    const progressB = progressByLesson.get(b.id);

    const orderA = progressA?.isComplete
      ? 2
      : progressA && progressA.watchedSeconds > 0
        ? 0
        : 1;
    const orderB = progressB?.isComplete
      ? 2
      : progressB && progressB.watchedSeconds > 0
        ? 0
        : 1;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.title.localeCompare(b.title);
  });
  const sortedLessons = prioritizedLessons.slice(0, 5);
  const upNext = sortedLessons[0];
  const completion = relevantProgresses.reduce((acc, item) => acc + (item.isComplete ? 1 : 0), 0);
  const totalLessons = lessons.length;
  const percent = totalLessons === 0 ? 0 : Math.round((completion / totalLessons) * 100);
  const completedLessons = relevantProgresses
    .filter((item) => item.isComplete)
    .sort((a, b) => a.lesson.title.localeCompare(b.lesson.title))
    .slice(0, 6);
  const isAdmin = session.user.role === "ADMIN";
  const allLessonsComplete = totalLessons > 0 && completion === totalLessons;
  const upNextProgress = upNext ? progressByLesson.get(upNext.id) : undefined;
  const upNextCta = upNext ? getLessonCta(upNextProgress) : null;
  const hasAssignments = totalLessons > 0;
  const upNextPercent = upNext ? getLessonProgressPercent(upNext, upNextProgress) : 0;
  const queueLessons = sortedLessons.filter((lesson) => lesson.id !== upNext?.id);
  const progressLabel = hasAssignments
    ? `${completion} of ${totalLessons} lessons complete`
    : "Progress will appear once a lesson is assigned.";

  return (
    <Stack spacing={10} align="flex-start">
      <Stack spacing={3} align="flex-start">
        <Heading size="lg">Your learning</Heading>
        <Text color="fg.muted" fontSize="sm">
          Track today&apos;s priorities, keep momentum with what&apos;s next, and revisit your wins.
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} w="full">
        <Card id="today" gridColumn={{ base: "auto", lg: "span 2" }}>
          <CardHeader>
            <Flex align="flex-start" gap={4} wrap="wrap">
              <Flex
                align="center"
                justify="center"
                boxSize={12}
                borderRadius="full"
                bg="primary.50"
                color="primary.500"
                _dark={{ bg: "primary.900", color: "primary.200" }}
              >
                <Icon as={Target} boxSize={6} />
              </Flex>
              <Stack spacing={2} flex="1" minW="220px">
                <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.28em" color="primary.500">
                  Today
                </Text>
                <Heading size="md">Make today count</Heading>
                <Text fontSize="sm" color="fg.muted">
                  Focus on the priority assignment to keep your streak alive.
                </Text>
              </Stack>
              <Badge alignSelf="flex-start" colorScheme="primary" borderRadius="full" px={3} py={1} fontSize="xs">
                Streak: {streak} day{streak === 1 ? "" : "s"}
              </Badge>
            </Flex>
          </CardHeader>
          <CardBody>
            <Stack spacing={6}>
              {hasAssignments ? (
                upNext ? (
                  <Stack spacing={3} borderWidth="1px" borderRadius="xl" p={5}>
                    <Flex direction={{ base: "column", md: "row" }} gap={4} justify="space-between" align={{ base: "flex-start", md: "center" }}>
                      <Stack spacing={1}>
                        <Text fontSize="sm" fontWeight="semibold">
                          {upNext.title}
                        </Text>
                        <Flex align="center" gap={2} color="fg.muted" fontSize="xs">
                          <Icon as={Clock} boxSize={3} />
                          {formatLessonDuration(upNext.durationS)}
                        </Flex>
                      </Stack>
                      <Button
                        as={Link}
                        href={`/app/lesson/${upNext.id}`}
                        colorScheme="primary"
                        size="sm"
                        aria-label={`${upNextCta?.description ?? "Open lesson"}: ${upNext.title}`}
                      >
                        {upNextCta?.label ?? "Start"}
                      </Button>
                    </Flex>
                    <Stack spacing={2}>
                      <Progress value={upNextPercent} colorScheme="primary" borderRadius="full" />
                      <Text fontSize="sm" color="fg.muted">
                        {upNextProgress?.isComplete
                          ? "Completed — review to stay sharp."
                          : upNextProgress && upNextProgress.watchedSeconds > 0
                            ? "Resume where you left off to build momentum."
                            : "Start fresh and make today count."}
                      </Text>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={3} borderWidth="1px" borderStyle="dashed" borderRadius="xl" p={6} textAlign="left">
                    <Heading size="sm">All caught up</Heading>
                    <Text fontSize="sm" color="fg.muted">
                      Everything assigned is complete—new lessons will drop here when they&apos;re ready.
                    </Text>
                    {isAdmin ? (
                      <Button as={Link} href="/admin/assign" variant="outline" size="sm" alignSelf="flex-start">
                        Assign a lesson
                      </Button>
                    ) : null}
                  </Stack>
                )
              ) : (
                <Stack spacing={3} borderWidth="1px" borderStyle="dashed" borderRadius="xl" p={6} textAlign="left">
                  <Heading size="sm">No assignments yet</Heading>
                  <Text fontSize="sm" color="fg.muted">
                    We&apos;ll add your first lesson as soon as your organization assigns one.
                  </Text>
                  {isAdmin ? (
                    <Button as={Link} href="/admin/assign" variant="outline" size="sm" alignSelf="flex-start">
                      Assign a lesson
                    </Button>
                  ) : null}
                </Stack>
              )}

              <Stack spacing={3} borderWidth="1px" borderRadius="xl" p={5}>
                <Flex justify="space-between" align="center" fontSize="sm" fontWeight="medium">
                  <Text>Overall progress</Text>
                  <Text color="fg.muted">{hasAssignments ? `${percent}% complete` : "0% complete"}</Text>
                </Flex>
                <Progress value={hasAssignments ? percent : 0} colorScheme="primary" borderRadius="full" />
                <Text fontSize="xs" color="fg.muted">
                  {progressLabel}
                </Text>
              </Stack>
            </Stack>
          </CardBody>
        </Card>

        <Card id="up-next">
          <CardHeader>
            <Flex align="center" gap={4}>
              <Flex
                align="center"
                justify="center"
                boxSize={10}
                borderRadius="full"
                bg="secondary.50"
                color="secondary.500"
                _dark={{ bg: "secondary.900", color: "secondary.200" }}
              >
                <Icon as={PlayCircle} boxSize={5} />
              </Flex>
              <Stack spacing={1}>
                <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.28em" color="secondary.500">
                  Up next
                </Text>
                <Heading size="sm">Keep your flow</Heading>
              </Stack>
            </Flex>
          </CardHeader>
          <CardBody>
            <Stack spacing={4}>
              {queueLessons.length > 0 ? (
                queueLessons.map((lesson) => {
                  const lessonProgress = progressByLesson.get(lesson.id);
                  const lessonCta = getLessonCta(lessonProgress);
                  const lessonPercent = getLessonProgressPercent(lesson, lessonProgress);
                  const helperText =
                    lessonCta.label === "Resume"
                      ? "Pick up where you paused."
                      : lessonCta.label === "Review"
                        ? "Revisit this lesson anytime."
                        : "Preview what&apos;s coming up.";

                  return (
                    <Stack key={lesson.id} spacing={3} borderWidth="1px" borderRadius="lg" p={4}>
                      <Flex direction={{ base: "column", md: "row" }} gap={3} justify="space-between" align={{ base: "flex-start", md: "center" }}>
                        <Stack spacing={1}>
                          <Text fontSize="sm" fontWeight="semibold">
                            {lesson.title}
                          </Text>
                          <Flex align="center" gap={2} color="fg.muted" fontSize="xs">
                            <Icon as={Clock} boxSize={3} />
                            {formatLessonDuration(lesson.durationS)}
                          </Flex>
                        </Stack>
                        <Button
                          as={Link}
                          href={`/app/lesson/${lesson.id}`}
                          size="sm"
                          variant={lessonCta.label === "Review" ? "outline" : "solid"}
                          colorScheme={lessonCta.label === "Review" ? "gray" : "secondary"}
                          aria-label={`${lessonCta.description}: ${lesson.title}`}
                        >
                          {lessonCta.label}
                        </Button>
                      </Flex>
                      <Stack spacing={2}>
                        <Progress value={lessonPercent} colorScheme="secondary" borderRadius="full" />
                        <Text fontSize="sm" color="fg.muted">
                          {helperText}
                        </Text>
                      </Stack>
                    </Stack>
                  );
                })
              ) : (
                <Stack spacing={3} borderWidth="1px" borderStyle="dashed" borderRadius="lg" p={6}>
                  <Heading size="sm">No lessons queued</Heading>
                  <Text fontSize="sm" color="fg.muted">
                    {allLessonsComplete
                      ? "Enjoy the breather—new lessons will appear once they&apos;re assigned."
                      : hasAssignments
                        ? "As soon as another lesson is assigned, it will land here for a quick resume."
                        : "Lessons will appear here after your organization assigns them."}
                  </Text>
                  {!hasAssignments && isAdmin ? (
                    <Button as={Link} href="/admin/assign" variant="outline" size="sm" alignSelf="flex-start">
                      Assign a lesson
                    </Button>
                  ) : null}
                </Stack>
              )}
            </Stack>
          </CardBody>
        </Card>

        <Card id="completed" gridColumn={{ base: "auto", lg: "span 2" }}>
          <CardHeader>
            <Flex align="center" gap={4}>
              <Flex
                align="center"
                justify="center"
                boxSize={10}
                borderRadius="full"
                bg="green.50"
                color="green.500"
                _dark={{ bg: "green.900", color: "green.200" }}
              >
                <Icon as={CheckCircle2} boxSize={5} />
              </Flex>
              <Stack spacing={1}>
                <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="0.28em" color="green.500">
                  Completed
                </Text>
                <Heading size="sm">Celebrate your wins</Heading>
              </Stack>
            </Flex>
          </CardHeader>
          <CardBody>
            {completedLessons.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
                {completedLessons.map((progress) => (
                  <Stack key={progress.id} spacing={2} borderWidth="1px" borderRadius="lg" p={4}>
                    <Text fontSize="sm" fontWeight="semibold">
                      {progress.lesson.title}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      Completed lesson review anytime.
                    </Text>
                    <Button
                      as={Link}
                      href={`/app/lesson/${progress.lessonId}`}
                      size="sm"
                      variant="outline"
                      leftIcon={<Icon as={PlayCircle} boxSize={4} />}
                    >
                      Review
                    </Button>
                  </Stack>
                ))}
              </SimpleGrid>
            ) : (
              <Stack spacing={3} borderWidth="1px" borderStyle="dashed" borderRadius="lg" p={6} textAlign="left">
                <Heading size="sm">Finish lessons to unlock badges</Heading>
                <Text fontSize="sm" color="fg.muted">
                  Completed lessons will appear here for quick refreshers. Earn badges as you complete pathways.
                </Text>
                {badges.length > 0 ? (
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    {badges.map((badge) => (
                      <Badge key={badge.id} colorScheme="primary" borderRadius="full" px={3} py={1}>
                        {badge.badge.name}
                      </Badge>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            )}
          </CardBody>
          <CardFooter>
            <Button as={Link} href="/app/profile" variant="ghost" size="sm">
              View profile & badges
            </Button>
          </CardFooter>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
