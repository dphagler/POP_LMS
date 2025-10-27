import { requireRole } from '@/lib/authz';
import { getOrgUsers } from '@/lib/db/user';

import { AdminUsersClient } from './users-client';

export default async function AdminUsersPage() {
  const session = await requireRole('ADMIN');
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const users = await getOrgUsers({ orgId });

  return (
    <AdminUsersClient
      currentUserId={session.user.id}
      initialUsers={users}
    />
  );
}
