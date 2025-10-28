import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminAccess } from '@/lib/authz';
import { listOrgGroups } from '@/lib/db/group';

import { AdminGroupsClient } from './groups-list';

export default async function AdminGroupsPage() {
  const { session } = await requireAdminAccess(['ADMIN', 'MANAGER']);
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const groups = await listOrgGroups({ orgId });

  return (
    <AdminShell title="Groups" breadcrumb={[{ label: 'Groups' }]}> 
      <AdminGroupsClient initialGroups={groups} />
    </AdminShell>
  );
}
