import { describe, expect, beforeEach, vi, it, afterEach, MockedFunction } from 'vitest';
import { UserRole, UserSource } from '@prisma/client';

vi.mock('@/lib/authz', () => ({
  requireRole: vi.fn(),
}));

vi.mock('@/lib/db/user', async () => {
  const actual = await vi.importActual<typeof import('@/lib/db/user')>('@/lib/db/user');
  return {
    ...actual,
    upsertOrgUser: vi.fn(),
    changeOrgUserRole: vi.fn(),
    findOrgUserById: vi.fn(),
  };
});

vi.mock('@/lib/email', () => ({
  sendSignInEmail: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

let inviteUser: typeof import('@/lib/server-actions/users').inviteUser;
let updateUserRole: typeof import('@/lib/server-actions/users').updateUserRole;
let sendResetLink: typeof import('@/lib/server-actions/users').sendResetLink;
type CreateMagicLinkForEmail = typeof import('@/lib/server-actions/users')['createMagicLinkForEmail'];
let createMagicLinkForEmailSpy: MockedFunction<CreateMagicLinkForEmail>;

let requireRoleMock: ReturnType<typeof vi.fn>;
let upsertOrgUserMock: ReturnType<typeof vi.fn>;
let changeOrgUserRoleMock: ReturnType<typeof vi.fn>;
let findOrgUserByIdMock: ReturnType<typeof vi.fn>;
let sendSignInEmailMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules();

  const usersModule = await import('@/lib/server-actions/users');
  inviteUser = usersModule.inviteUser;
  updateUserRole = usersModule.updateUserRole;
  sendResetLink = usersModule.sendResetLink;
  createMagicLinkForEmailSpy = vi
    .spyOn(usersModule, 'createMagicLinkForEmail')
    .mockResolvedValue({ url: 'https://example.com/magic', expires: new Date() });

  const authzModule = await import('@/lib/authz');
  requireRoleMock = vi.mocked(authzModule.requireRole);

  const dbModule = await import('@/lib/db/user');
  upsertOrgUserMock = vi.mocked(dbModule.upsertOrgUser);
  changeOrgUserRoleMock = vi.mocked(dbModule.changeOrgUserRole);
  findOrgUserByIdMock = vi.mocked(dbModule.findOrgUserById);

  const emailModule = await import('@/lib/email');
  sendSignInEmailMock = vi.mocked(emailModule.sendSignInEmail);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('admin user server actions', () => {
  it('inviteUser creates a user and sends a magic link email', async () => {
    requireRoleMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        orgId: 'org-1',
        role: UserRole.ADMIN,
      },
    } as any);

    const newUser = {
      id: 'user-1',
      name: 'Test Learner',
      email: 'learner@example.com',
      role: 'learner' as const,
      status: 'invited' as const,
      groups: [],
      lastSeenAt: null,
      createdAt: new Date().toISOString(),
    };

    upsertOrgUserMock.mockResolvedValue(newUser);

    const result = await inviteUser({
      email: 'learner@example.com',
      name: 'Test Learner',
      role: 'LEARNER',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user).toEqual(newUser);
    }

    expect(upsertOrgUserMock).toHaveBeenCalledWith({
      orgId: 'org-1',
      email: 'learner@example.com',
      name: 'Test Learner',
      role: UserRole.LEARNER,
      source: UserSource.invite,
    });

    expect(createMagicLinkForEmailSpy).toHaveBeenCalledWith('learner@example.com', {
      callbackPath: '/app',
    });
    expect(sendSignInEmailMock).toHaveBeenCalledWith('learner@example.com', 'https://example.com/magic');
  });

  it('updateUserRole throws when the session user is not an admin', async () => {
    requireRoleMock.mockResolvedValue({
      user: {
        id: 'user-99',
        orgId: 'org-1',
        role: UserRole.LEARNER,
      },
    } as any);

    await expect(updateUserRole({ userId: 'user-1', role: 'LEARNER' })).rejects.toThrow(
      'Only admins can perform this action.'
    );
    expect(changeOrgUserRoleMock).not.toHaveBeenCalled();
  });

  it('sendResetLink rejects when the user has no email address', async () => {
    requireRoleMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        orgId: 'org-1',
        role: UserRole.ADMIN,
      },
    } as any);

    findOrgUserByIdMock.mockResolvedValue({
      id: 'user-3',
      email: null,
      name: null,
      orgId: 'org-1',
    } as any);

    await expect(sendResetLink({ userId: 'user-3' })).rejects.toThrow(
      'User does not have an email address.'
    );
    expect(sendSignInEmailMock).not.toHaveBeenCalled();
  });
});
