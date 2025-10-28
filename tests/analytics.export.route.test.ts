import { describe, expect, it, beforeEach, vi } from 'vitest';

const requireRoleMock = vi.fn();
const findManyMock = vi.fn();

vi.mock('@/lib/authz', () => ({
  requireRole: requireRoleMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    progress: {
      findMany: findManyMock,
    },
  },
}));

const decoder = new TextDecoder();

async function readResponseBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return '';
  }

  let result = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    result += decoder.decode(value, { stream: true });
  }

  return result;
}

describe('analytics export route', () => {
  beforeEach(() => {
    requireRoleMock.mockReset();
    findManyMock.mockReset();
    requireRoleMock.mockResolvedValue({
      user: { id: 'admin-1', orgId: 'org-1' },
    });
  });

  it('streams CSV rows with lesson progress', async () => {
    const { GET } = await import('@/app/admin/analytics/export/route');

    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-02T00:00:00.000Z');

    findManyMock
      .mockResolvedValueOnce([
        {
          id: 'progress-1',
          userId: 'user-1',
          lessonId: 'lesson-1',
          uniqueSeconds: 180,
          createdAt,
          updatedAt,
          isComplete: true,
          lesson: { id: 'lesson-1', title: 'Lesson One', durationS: 300 },
          user: {
            id: 'user-1',
            email: 'user1@example.com',
            groupMemberships: [
              { groupId: 'group-a', group: { orgId: 'org-1' } },
              { groupId: 'group-b', group: { orgId: 'other-org' } },
            ],
          },
        },
        {
          id: 'progress-2',
          userId: 'user-2',
          lessonId: 'lesson-2',
          uniqueSeconds: 45,
          createdAt,
          updatedAt,
          isComplete: false,
          lesson: { id: 'lesson-2', title: 'Lesson Two', durationS: 200 },
          user: {
            id: 'user-2',
            email: null,
            groupMemberships: [],
          },
        },
      ])
      .mockResolvedValueOnce([]);

    const response = await GET(new Request('https://example.com/admin/analytics/export'));
    const csv = await readResponseBody(response as unknown as Response);

    const [header, rowOne, rowTwo, ...rest] = csv.trim().split('\n');
    expect(header).toBe(
      'userId,userEmail,lessonId,lessonTitle,startedAt,completedAt,uniqueSeconds,durationS,percent,orgId,groupIds',
    );
    expect(rowOne).toContain('user-1,user1@example.com,lesson-1,Lesson One');
    expect(rowOne).toContain('group-a');
    expect(rowTwo).toContain('user-2,,lesson-2,Lesson Two');
    expect(rowTwo).toContain(',0.2250,org-1,');
    expect(rest.every((line) => line.length === 0)).toBe(true);
  });

  it('applies query filters when fetching progress', async () => {
    const { GET } = await import('@/app/admin/analytics/export/route');

    findManyMock.mockResolvedValueOnce([]);

    const response = await GET(
      new Request('https://example.com/admin/analytics/export?groupId=group-a&start=2024-01-01&end=2024-01-31'),
    );
    await readResponseBody(response as unknown as Response);

    expect(findManyMock).toHaveBeenCalled();
    const callArgs = findManyMock.mock.calls[0][0];
    expect(callArgs.where.user).toMatchObject({
      orgId: 'org-1',
      groupMemberships: { some: { groupId: 'group-a' } },
    });
    expect(callArgs.where.updatedAt.gte).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    expect(callArgs.where.updatedAt.lte).toEqual(new Date('2024-01-31T23:59:59.999Z'));
  });
});
