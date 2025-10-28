import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminAccess } from '@/lib/authz';
import { getOrgUsers } from '@/lib/db/user';

import { AdminUsersClient } from './users-client';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ modal?: string }>;
}) {
  const { session } = await requireAdminAccess(['ADMIN']);
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const autoOpenInvite = resolvedSearchParams.modal === 'invite';

  const users = await getOrgUsers({ orgId });

  return (
    <AdminShell title="Users" breadcrumb={[{ label: 'Users' }]}> 
      <AdminUsersClient
        currentUserId={session.user.id}
        initialUsers={users}
        autoOpenInvite={autoOpenInvite}
      />
    </AdminShell>
  );
}
