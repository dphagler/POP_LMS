import { beforeEach, describe, expect, it } from 'vitest';

import {
  backfillAssignmentsEnrollments,
  bulkUpdateAssignmentsDueAt,
  createAssignmentWithEnrollments,
  withdrawAssignments,
} from '@/lib/db/assignment';

interface GroupMemberRecord {
  userId: string;
  user: { id: string; name: string | null; email: string | null };
}

interface GroupRecord {
  id: string;
  orgId: string;
  name: string;
  members: GroupMemberRecord[];
}

interface ModuleRecord {
  id: string;
  orgId: string;
  courseId: string;
  title: string;
}

interface CourseRecord {
  id: string;
  orgId: string;
  title: string;
}

interface AssignmentRecord {
  id: string;
  orgId: string;
  groupId: string;
  moduleId: string;
  courseId: string;
  dueAt: Date | null;
  label: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

function now() {
  return new Date();
}

function buildAssignment(
  store: FakeAssignmentStore,
  record: AssignmentRecord,
) {
  const group = store.groups.get(record.groupId);
  if (!group) {
    throw new Error('Group not found in store');
  }

  const moduleRecord = store.modules.get(record.moduleId) ?? null;
  const courseRecord = store.courses.get(record.courseId) ?? null;
  const enrollmentSet = store.enrollments.get(record.id) ?? new Set<string>();

  return {
    ...record,
    group: {
      id: group.id,
      name: group.name,
      members: group.members.map((member) => ({
        userId: member.userId,
        user: { ...member.user },
      })),
    },
    module: moduleRecord
      ? {
          id: moduleRecord.id,
          title: moduleRecord.title,
          course: courseRecord
            ? {
                id: courseRecord.id,
                title: courseRecord.title,
              }
            : null,
        }
      : null,
    course: courseRecord
      ? {
          id: courseRecord.id,
          title: courseRecord.title,
        }
      : null,
    enrollments: Array.from(enrollmentSet).map((userId) => ({ userId })),
  };
}

type AssignmentWhere = {
  orgId?: string;
  groupId?: string;
  moduleId?: string | null;
  deletedAt?: Date | null;
  id?: { in: string[] };
};

type AssignmentUpdateData = {
  dueAt?: Date | null;
  label?: string | null;
};

type AssignmentCreateData = {
  orgId: string;
  groupId: string;
  moduleId: string;
  courseId: string;
  dueAt: Date | null;
  label: string | null;
  createdBy: string;
};

class FakeAssignmentStore {
  assignments = new Map<string, AssignmentRecord>();
  groups = new Map<string, GroupRecord>();
  modules = new Map<string, ModuleRecord>();
  courses = new Map<string, CourseRecord>();
  enrollments = new Map<string, Set<string>>();
  groupMembers = new Map<string, GroupMemberRecord[]>();
  counter = 1;

  reset() {
    this.assignments.clear();
    this.groups.clear();
    this.modules.clear();
    this.courses.clear();
    this.enrollments.clear();
    this.groupMembers.clear();
    this.counter = 1;
  }

  seedCourse(course: CourseRecord) {
    this.courses.set(course.id, { ...course });
  }

  seedModule(module: ModuleRecord) {
    this.modules.set(module.id, { ...module });
  }

  seedGroup(group: GroupRecord) {
    this.groups.set(group.id, { ...group });
  }

  seedGroupMember(groupId: string, member: GroupMemberRecord) {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error('Group not seeded');
    }
    group.members.push(member);
  }

  ensureEnrollmentSet(assignmentId: string) {
    if (!this.enrollments.has(assignmentId)) {
      this.enrollments.set(assignmentId, new Set());
    }
    return this.enrollments.get(assignmentId)!;
  }

  createAssignment(data: AssignmentCreateData & { id?: string }) {
    const id = data.id ?? `assignment-${this.counter++}`;
    const record: AssignmentRecord = {
      id,
      orgId: data.orgId,
      groupId: data.groupId,
      moduleId: data.moduleId,
      courseId: data.courseId,
      dueAt: data.dueAt,
      label: data.label,
      createdBy: data.createdBy,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    this.assignments.set(id, record);
    this.ensureEnrollmentSet(id);
    return record;
  }

  updateAssignment(id: string, data: AssignmentUpdateData) {
    const record = this.assignments.get(id);
    if (!record) {
      throw new Error('Assignment not found');
    }
    const updated: AssignmentRecord = {
      ...record,
      ...data,
      updatedAt: now(),
    };
    this.assignments.set(id, updated);
    return updated;
  }

  findAssignments(where?: AssignmentWhere) {
    return Array.from(this.assignments.values()).filter((record) => {
      if (!where) return true;
      if (where.orgId && record.orgId !== where.orgId) return false;
      if (typeof where.groupId === 'string' && record.groupId !== where.groupId) return false;
      if (where.moduleId !== undefined) {
        if (where.moduleId === null) {
          if (record.moduleId !== null) return false;
        } else if (record.moduleId !== where.moduleId) {
          return false;
        }
      }
      if (where.deletedAt === null && record.deletedAt !== null) return false;
      if (where.id?.in && !where.id.in.includes(record.id)) return false;
      return true;
    });
  }
}

function createFakePrisma() {
  const store = new FakeAssignmentStore();

  const prisma = {
    orgGroup: {
      findFirst: async ({ where, include }: { where: { id: string; orgId: string }; include?: { members?: { select: { userId: true } } } }) => {
        const group = store.groups.get(where.id);
        if (!group || group.orgId !== where.orgId) {
          return null;
        }
        return {
          id: group.id,
          orgId: group.orgId,
          name: group.name,
          members: include?.members
            ? group.members.map((member) => ({ userId: member.userId }))
            : undefined,
        };
      },
    },
    module: {
      findFirst: async ({ where, select }: { where: { id: string; course: { orgId: string } }; select?: { id: boolean; courseId: boolean } }) => {
        const moduleRecord = store.modules.get(where.id);
        if (!moduleRecord) {
          return null;
        }
        const course = store.courses.get(moduleRecord.courseId);
        if (!course || course.orgId !== where.course.orgId) {
          return null;
        }
        if (select) {
          return {
            id: moduleRecord.id,
            courseId: moduleRecord.courseId,
          };
        }
        return moduleRecord;
      },
    },
    assignment: {
      findFirst: async ({ where }: { where: AssignmentWhere }) => {
        const records = store.findAssignments(where);
        const record = records[0];
        return record ? { ...record } : null;
      },
      create: async ({ data }: { data: AssignmentCreateData }) => {
        return store.createAssignment(data);
      },
      update: async ({ where, data }: { where: { id: string }; data: AssignmentUpdateData }) => {
        return store.updateAssignment(where.id, data);
      },
      findUnique: async ({ where }: { where: { id: string }; include: unknown }) => {
        const record = store.assignments.get(where.id);
        if (!record) {
          return null;
        }
        return buildAssignment(store, record);
      },
      findMany: async ({ where, include, orderBy }: { where?: AssignmentWhere; include?: unknown; orderBy?: { createdAt: 'asc' | 'desc' } }) => {
        let records = store.findAssignments(where);
        if (orderBy?.createdAt === 'desc') {
          records = records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return records.map((record) => buildAssignment(store, record));
      },
      updateMany: async ({ where, data }: { where: AssignmentWhere; data: AssignmentUpdateData }) => {
        const records = store.findAssignments(where);
        records.forEach((record) => {
          store.updateAssignment(record.id, data);
        });
        return { count: records.length };
      },
      deleteMany: async ({ where }: { where: AssignmentWhere }) => {
        const records = store.findAssignments(where);
        records.forEach((record) => {
          store.assignments.delete(record.id);
          store.enrollments.delete(record.id);
        });
        return { count: records.length };
      },
    },
    enrollment: {
      createMany: async ({ data, skipDuplicates }: { data: { assignmentId: string; userId: string }[]; skipDuplicates?: boolean }) => {
        let count = 0;
        data.forEach((entry) => {
          const set = store.ensureEnrollmentSet(entry.assignmentId);
          if (!skipDuplicates || !set.has(entry.userId)) {
            set.add(entry.userId);
            count += 1;
          }
        });
        return { count };
      },
      deleteMany: async ({ where }: { where: { assignmentId: { in: string[] } } }) => {
        where.assignmentId.in.forEach((id) => {
          store.enrollments.delete(id);
        });
        return { count: where.assignmentId.in.length };
      },
    },
    groupMember: {
      findMany: async ({ where }: { where: { groupId: string }; select?: { userId: boolean } }) => {
        const group = store.groups.get(where.groupId);
        if (!group) return [];
        return group.members.map((member) => ({ userId: member.userId }));
      },
    },
  };

  return { prisma: prisma as any, store };
}

const fake = createFakePrisma();

describe('assignment db helpers', () => {
  beforeEach(() => {
    fake.store.reset();
    fake.store.seedCourse({ id: 'course-1', orgId: 'org-1', title: 'Workplace Safety' });
    fake.store.seedModule({ id: 'module-1', orgId: 'org-1', courseId: 'course-1', title: 'Module A' });
    fake.store.seedGroup({ id: 'group-1', orgId: 'org-1', name: 'Team Alpha', members: [] });
    fake.store.seedGroupMember('group-1', {
      userId: 'user-1',
      user: { id: 'user-1', name: 'One', email: 'one@example.com' },
    });
    fake.store.seedGroupMember('group-1', {
      userId: 'user-2',
      user: { id: 'user-2', name: 'Two', email: 'two@example.com' },
    });
  });

  it('createAssignmentWithEnrollments upserts enrollments idempotently', async () => {
    const first = await createAssignmentWithEnrollments(
      {
        orgId: 'org-1',
        createdBy: 'admin-1',
        groupId: 'group-1',
        moduleId: 'module-1',
        dueAt: null,
        label: null,
      },
      fake.prisma,
    );

    expect(first.created).toBe(true);
    expect(first.enrollmentsCreated).toBe(2);
    expect(first.totalMembers).toBe(2);

    const second = await createAssignmentWithEnrollments(
      {
        orgId: 'org-1',
        createdBy: 'admin-1',
        groupId: 'group-1',
        moduleId: 'module-1',
        dueAt: null,
        label: null,
      },
      fake.prisma,
    );

    expect(second.created).toBe(false);
    expect(second.enrollmentsCreated).toBe(0);
    expect(fake.store.assignments.size).toBe(1);
  });

  it('bulkUpdateAssignmentsDueAt updates all selected assignments', async () => {
    const assignment = fake.store.createAssignment({
      orgId: 'org-1',
      groupId: 'group-1',
      moduleId: 'module-1',
      courseId: 'course-1',
      dueAt: null,
      label: null,
      createdBy: 'admin-1',
    });
    const assignment2 = fake.store.createAssignment({
      orgId: 'org-1',
      groupId: 'group-1',
      moduleId: 'module-1',
      courseId: 'course-1',
      dueAt: null,
      label: null,
      createdBy: 'admin-1',
    });

    const dueAt = new Date('2024-01-01T12:00:00Z');
    const updated = await bulkUpdateAssignmentsDueAt('org-1', [assignment.id, assignment2.id], dueAt, fake.prisma);

    expect(updated).toHaveLength(2);
    updated.forEach((item) => {
      expect(item.dueAt).toBe(dueAt.toISOString());
    });
  });

  it('withdrawAssignments removes assignments and ignores missing ids', async () => {
    const assignment = fake.store.createAssignment({
      orgId: 'org-1',
      groupId: 'group-1',
      moduleId: 'module-1',
      courseId: 'course-1',
      dueAt: null,
      label: null,
      createdBy: 'admin-1',
    });

    const result = await withdrawAssignments('org-1', [assignment.id, 'missing-id'], { leaveEnrollments: true }, fake.prisma);

    expect(result.removedIds).toEqual([assignment.id]);
    expect(fake.store.assignments.size).toBe(0);
  });

  it('backfillAssignmentsEnrollments enrolls missing members', async () => {
    const assignment = fake.store.createAssignment({
      orgId: 'org-1',
      groupId: 'group-1',
      moduleId: 'module-1',
      courseId: 'course-1',
      dueAt: null,
      label: null,
      createdBy: 'admin-1',
    });
    fake.store.ensureEnrollmentSet(assignment.id).add('user-1');

    const result = await backfillAssignmentsEnrollments('org-1', 'group-1', 'module-1', fake.prisma);

    expect(result.enrollmentsCreated).toBe(1);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].enrollments).toHaveLength(2);
  });
});
