import { requireRole } from '@/lib/authz';
import { listOrgGroups } from '@/lib/db/group';

import { AdminGroupsClient } from './groups-list';

export default async function AdminGroupsPage() {
  const session = await requireRole('ADMIN');
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error('Organization not found for admin user');
  }

  const groups = await listOrgGroups({ orgId });

  return <AdminGroupsClient initialGroups={groups} />;
}
