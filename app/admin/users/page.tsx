import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminAccess } from '@/lib/authz';
import { getOrgUsers } from '@/lib/db/user';

import { AdminUsersClient } from './users-client';

export default async function AdminUsersPage() {
  const { session } = await requireAdminAccess(['ADMIN']);
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const users = await getOrgUsers({ orgId });

  return (
    <AdminShell title="Users" breadcrumb={[{ label: 'Users' }]}> 
      <AdminUsersClient
        currentUserId={session.user.id}
        initialUsers={users}
      />
    </AdminShell>
  );
}
