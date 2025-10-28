import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  auditLog: {
    create: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

import { logAudit } from '@/lib/db/audit';

describe('logAudit', () => {
  beforeEach(() => {
    prismaMock.auditLog.create.mockReset();
    prismaMock.auditLog.create.mockResolvedValue({ id: 'audit-1' });
  });

  it('writes audit rows with the expected payload', async () => {
    await logAudit({
      orgId: 'org-1',
      actorId: 'user-1',
      action: 'user.invite',
      targetId: 'target-123',
      metadata: { email: 'person@example.com' },
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        orgId: 'org-1',
        action: 'user.invite',
        actorId: 'user-1',
        targetId: 'target-123',
        metadata: { email: 'person@example.com' },
      },
    });
  });

  it('stores large metadata payloads without modification', async () => {
    const largePayload = {
      blob: 'x'.repeat(256 * 1024),
      nested: { note: 'retain me' },
    };

    await logAudit({
      orgId: 'org-1',
      action: 'test.large-metadata',
      metadata: largePayload,
    });

    const callArgs = prismaMock.auditLog.create.mock.calls[0]?.[0];
    expect(callArgs).toMatchObject({
      data: { metadata: largePayload },
    });
  });
});
