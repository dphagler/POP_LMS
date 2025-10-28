import {
  PrismaClient,
  Prisma,
  UserRole,
  OrgRole,
  EnrollmentStatus,
  QuestionType
} from "@prisma/client";

const prisma = new PrismaClient();
const POP_INITIATIVE_ID = "pop-initiative";
const ASSIGNMENT_LABEL = "Workplace Readiness Assignment";

type QuizQuestionSeed = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: Prisma.InputJsonValue;
  correctKey: string | null;
};

async function ensureQuiz(lessonId: string, questions: QuizQuestionSeed[]) {
  const quiz = await prisma.quiz.upsert({
    where: { lessonId },
    update: {},
    create: { lessonId }
  });

  const questionIds = questions.map((question) => question.id);

  for (const question of questions) {
    await prisma.quizQuestion.upsert({
      where: { id: question.id },
      update: {
        quizId: quiz.id,
        type: question.type,
        prompt: question.prompt,
        options: question.options,
        correctKey: question.correctKey ?? undefined
      },
      create: {
        id: question.id,
        quizId: quiz.id,
        type: question.type,
        prompt: question.prompt,
        options: question.options,
        correctKey: question.correctKey ?? undefined
      }
    });
  }

  await prisma.quizQuestion.deleteMany({
    where: { quizId: quiz.id, id: { notIn: questionIds } }
  });

  return quiz;
}

async function ensureGroupMembers(groupId: string, userIds: string[]) {
  for (const userId of userIds) {
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {},
      create: { groupId, userId }
    });
  }

  await prisma.groupMember.deleteMany({
    where: { groupId, userId: { notIn: userIds } }
  });
}

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: POP_INITIATIVE_ID },
    update: {
      name: "POP Initiative",
      themePrimary: "#1f2937",
      themeAccent: "#f97316",
      loginBlurb: "Choose how you’d like to sign in to your POP Initiative account. Your progress syncs across web and mobile."
    },
    create: {
      id: POP_INITIATIVE_ID,
      name: "POP Initiative",
      themePrimary: "#1f2937",
      themeAccent: "#f97316",
      loginBlurb: "Choose how you’d like to sign in to your POP Initiative account. Your progress syncs across web and mobile."
    }
  });

  const now = new Date();

  await prisma.domain.upsert({
    where: { value: "poplms.dev" },
    update: { orgId: organization.id, verifiedAt: now },
    create: {
      orgId: organization.id,
      value: "poplms.dev",
      verifiedAt: now
    }
  });

  const userSeeds: Array<{
    email: string;
    name: string;
    userRole: UserRole;
    orgRole: OrgRole;
  }> = [
    {
      email: "admin@poplms.dev",
      name: "POP Admin",
      userRole: UserRole.ADMIN,
      orgRole: OrgRole.ADMIN
    },
    {
      email: "instructor@poplms.dev",
      name: "POP Instructor",
      userRole: UserRole.INSTRUCTOR,
      orgRole: OrgRole.INSTRUCTOR
    },
    ...Array.from({ length: 6 }).map((_, index) => ({
      email: `learner${index + 1}@poplms.dev`,
      name: `Learner ${index + 1}`,
      userRole: UserRole.LEARNER,
      orgRole: OrgRole.LEARNER
    }))
  ];

  const usersByEmail = new Map<string, { id: string; role: UserRole }>();

  for (const seed of userSeeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        name: seed.name,
        orgId: organization.id,
        role: seed.userRole
      },
      create: {
        email: seed.email,
        name: seed.name,
        orgId: organization.id,
        role: seed.userRole
      }
    });

    usersByEmail.set(seed.email, { id: user.id, role: user.role });

    await prisma.orgMembership.upsert({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId: organization.id
        }
      },
      update: {
        role: seed.orgRole
      },
      create: {
        userId: user.id,
        orgId: organization.id,
        role: seed.orgRole
      }
    });
  }

  const adminUserId = usersByEmail.get("admin@poplms.dev")?.id;
  const instructorUserId = usersByEmail.get("instructor@poplms.dev")?.id;
  if (!adminUserId || !instructorUserId) {
    throw new Error("Admin and instructor users must be created before proceeding.");
  }

  const learnerUserIds = Array.from({ length: 6 }).map((_, index) => {
    const user = usersByEmail.get(`learner${index + 1}@poplms.dev`);
    if (!user) {
      throw new Error(`Learner ${index + 1} was not created successfully.`);
    }
    return user.id;
  });

  const roboticsGroup = await prisma.orgGroup.upsert({
    where: { id: "group-robotics-pathway" },
    update: {
      name: "Robotics Pathway",
      orgId: organization.id
    },
    create: {
      id: "group-robotics-pathway",
      orgId: organization.id,
      name: "Robotics Pathway"
    }
  });

  const itGroup = await prisma.orgGroup.upsert({
    where: { id: "group-it-pathway" },
    update: {
      name: "IT Pathway",
      orgId: organization.id
    },
    create: {
      id: "group-it-pathway",
      orgId: organization.id,
      name: "IT Pathway"
    }
  });

  await ensureGroupMembers(
    roboticsGroup.id,
    [instructorUserId, ...learnerUserIds.slice(0, 3)]
  );
  await ensureGroupMembers(
    itGroup.id,
    [instructorUserId, ...learnerUserIds.slice(3)]
  );

  const course = await prisma.course.upsert({
    where: { id: "course-workplace-readiness" },
    update: {
      title: "Workplace Readiness",
      description: "Build practical habits to excel in early career roles."
    },
    create: {
      id: "course-workplace-readiness",
      orgId: organization.id,
      title: "Workplace Readiness",
      description: "Build practical habits to excel in early career roles."
    }
  });

  const module = await prisma.module.upsert({
    where: { id: "module-professional-habits" },
    update: {
      title: "Professional Habits",
      order: 1,
      courseId: course.id
    },
    create: {
      id: "module-professional-habits",
      title: "Professional Habits",
      order: 1,
      courseId: course.id
    }
  });

  const lessonSeeds = [
    {
      id: "lesson-work-ethic-basics",
      title: "Work Ethic Basics",
      streamId: "stream-work-ethic-basics",
      durationS: 100
    },
    {
      id: "lesson-communication-skills",
      title: "Communication Skills",
      streamId: "stream-communication-skills",
      durationS: 120
    },
    {
      id: "lesson-team-collaboration",
      title: "Team Collaboration",
      streamId: "stream-team-collaboration",
      durationS: 90
    }
  ];

  const lessonRecords: { id: string; title: string }[] = [];

  for (const seed of lessonSeeds) {
    const lesson = await prisma.lesson.upsert({
      where: { id: seed.id },
      update: {
        moduleId: module.id,
        title: seed.title,
        streamId: seed.streamId,
        durationS: seed.durationS
      },
      create: {
        id: seed.id,
        moduleId: module.id,
        title: seed.title,
        streamId: seed.streamId,
        durationS: seed.durationS
      }
    });

    lessonRecords.push({ id: lesson.id, title: lesson.title });
  }

  const workEthicLessonId = lessonRecords.find(
    (lesson) => lesson.id === "lesson-work-ethic-basics"
  )?.id;
  const communicationLessonId = lessonRecords.find(
    (lesson) => lesson.id === "lesson-communication-skills"
  )?.id;
  const collaborationLessonId = lessonRecords.find(
    (lesson) => lesson.id === "lesson-team-collaboration"
  )?.id;

  if (!workEthicLessonId || !communicationLessonId || !collaborationLessonId) {
    throw new Error("All lessons must be created successfully.");
  }

  await ensureQuiz(workEthicLessonId, [
    {
      id: "quiz-work-ethic-q1",
      type: QuestionType.MCQ,
      prompt: "What is a key component of a strong work ethic?",
      options: [
        { key: "A", text: "Consistency and reliability" },
        { key: "B", text: "Ignoring deadlines" },
        { key: "C", text: "Avoiding feedback" }
      ],
      correctKey: "A"
    },
    {
      id: "quiz-work-ethic-q2",
      type: QuestionType.MCQ,
      prompt: "Which action best demonstrates personal accountability at work?",
      options: [
        { key: "A", text: "Waiting for others to remind you of tasks" },
        { key: "B", text: "Owning mistakes and communicating next steps" },
        { key: "C", text: "Delaying tasks until the last minute" }
      ],
      correctKey: "B"
    }
  ]);

  await ensureQuiz(collaborationLessonId, [
    {
      id: "quiz-collaboration-q1",
      type: QuestionType.MCQ,
      prompt: "Select the behaviors that help a team collaborate effectively.",
      options: [
        { key: "A", text: "Sharing clear progress updates" },
        { key: "B", text: "Holding back information" },
        { key: "C", text: "Offering support when teammates are blocked" },
        { key: "D", text: "Competing for personal recognition" }
      ],
      correctKey: "A,C"
    }
  ]);

  const assignmentTargets = [
    { id: "assignment-workplace-readiness", groupId: roboticsGroup.id },
    { id: "assignment-workplace-readiness-it", groupId: itGroup.id }
  ];

  for (const target of assignmentTargets) {
    const assignment = await prisma.assignment.upsert({
      where: { id: target.id },
      update: {
        orgId: organization.id,
        groupId: target.groupId,
        courseId: course.id,
        moduleId: module.id,
        label: ASSIGNMENT_LABEL,
        createdBy: adminUserId,
        deletedAt: null
      },
      create: {
        id: target.id,
        orgId: organization.id,
        groupId: target.groupId,
        courseId: course.id,
        moduleId: module.id,
        label: ASSIGNMENT_LABEL,
        createdBy: adminUserId
      }
    });

    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId: target.groupId },
      select: { userId: true }
    });
    const memberIds = groupMembers.map((member) => member.userId);

    for (const userId of memberIds) {
      await prisma.enrollment.upsert({
        where: { assignmentId_userId: { assignmentId: assignment.id, userId } },
        update: {
          status: EnrollmentStatus.ACTIVE,
          deletedAt: null
        },
        create: {
          assignmentId: assignment.id,
          userId,
          status: EnrollmentStatus.ACTIVE
        }
      });
    }

    await prisma.enrollment.deleteMany({
      where: {
        assignmentId: assignment.id,
        userId: { notIn: memberIds }
      }
    });
  }

  const [
    groupCount,
    adminCount,
    instructorCount,
    learnerCount,
    lessonCount,
    assignmentCount,
    enrollmentCount
  ] = await Promise.all([
    prisma.orgGroup.count({ where: { orgId: organization.id } }),
    prisma.user.count({ where: { orgId: organization.id, role: UserRole.ADMIN } }),
    prisma.user.count({ where: { orgId: organization.id, role: UserRole.INSTRUCTOR } }),
    prisma.user.count({ where: { orgId: organization.id, role: UserRole.LEARNER } }),
    prisma.lesson.count({ where: { moduleId: module.id } }),
    prisma.assignment.count({ where: { orgId: organization.id } }),
    prisma.enrollment.count({ where: { assignment: { orgId: organization.id } } })
  ]);

  console.log(
    `Seed summary: org=${organization.id}, admins=${adminCount}, instructors=${instructorCount}, learners=${learnerCount}, groups=${groupCount}`
  );
  console.log(
    `Assignments created: ${assignmentCount} total with ${enrollmentCount} enrollments.`
  );
  console.log(
    `Lessons: ${lessonRecords.map((lesson) => lesson.title).join(", ")}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
