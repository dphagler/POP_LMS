import { notFound } from 'next/navigation';

import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdminAccess } from '@/lib/authz';
import { getGroupDetail } from '@/lib/db/group';

import { GroupDetailClient } from './group-detail-client';

type GroupPageParams = {
  groupId: string;
};

export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<GroupPageParams>;
}) {
  const { groupId } = await params;
  const { session } = await requireAdminAccess(['ADMIN', 'MANAGER']);
  const orgId = session.user.orgId;

  if (!orgId) {
    notFound();
  }

  const group = await getGroupDetail({ orgId, groupId });

  if (!group) {
    notFound();
  }

  return (
    <AdminShell
      title={group.name}
      breadcrumb={[
        { label: 'Groups', href: '/admin/groups' },
        { label: group.name }
      ]}
    >
      <GroupDetailClient
        groupId={group.id}
        initialName={group.name}
        initialDescription={group.description}
        initialMembers={group.members}
        currentUserId={session.user.id}
      />
    </AdminShell>
  );
}
