'use server';

import {
  AdminAuditPropsSchema,
  AdminBrandingPropsSchema,
  AdminDomainsPropsSchema,
  AdminGroupsPropsSchema,
  AdminImportsPropsSchema,
  AdminUsersPropsSchema,
  DateRangeSchema,
  DomainConnectionTypeEnum,
  DomainStatusEnum,
  DomainVerificationTypeEnum,
  ImportSourceEnum,
  ImportStatusEnum,
  PaginationSchema,
  UserRoleEnum,
  UserStatusEnum
} from '@/lib/admin/contracts';
import type {
  AdminAuditProps,
  AdminBrandingProps,
  AdminDomainsProps,
  AdminGroupsProps,
  AdminImportsProps,
  AdminUsersProps
} from '@/lib/admin/contracts';
import { z } from 'zod';

type Pagination = z.infer<typeof PaginationSchema>;

type ListOptions = {
  orgId: string;
  page?: number;
  pageSize?: number;
};

type ListWithPaginationResult<T> = {
  props: T;
  pagination: Pagination;
};

type ListResult<T> = {
  props: T;
};

const DEFAULT_PAGE_SIZE = 10;

const brandingProps = AdminBrandingPropsSchema.parse({
  orgId: 'org_mock',
  branding: {
    organizationName: 'Pop Learning Co.',
    primaryColor: '#7c49ff',
    secondaryColor: '#23bdf2',
    accentColor: '#ff7849',
    loginMessage: 'Empower every learner with a personalized path.',
    supportEmail: 'support@poplearning.example',
    heroImageUrl: 'https://images.example.com/branding/hero.png'
  },
  assets: [
    {
      type: 'logo',
      url: 'https://images.example.com/branding/logo.svg',
      fileName: 'logo.svg',
      updatedAt: '2024-12-18T10:15:00.000Z',
      uploadedBy: {
        id: 'user_admin',
        name: 'Taylor Lee',
        email: 'taylor.lee@example.com'
      }
    },
    {
      type: 'favicon',
      url: 'https://images.example.com/branding/favicon.ico',
      fileName: 'favicon.ico',
      updatedAt: '2024-11-22T14:32:00.000Z',
      uploadedBy: {
        id: 'user_admin',
        name: 'Taylor Lee',
        email: 'taylor.lee@example.com'
      }
    },
    {
      type: 'background',
      url: 'https://images.example.com/branding/background.jpg',
      fileName: 'background.jpg',
      updatedAt: '2024-09-05T09:00:00.000Z',
      uploadedBy: {
        id: 'user_designer',
        name: 'Morgan Patel',
        email: 'morgan.patel@example.com'
      }
    }
  ],
  lastPublishedAt: '2024-12-20T16:42:00.000Z'
});

const domainRecords = [
  {
    id: 'domain-1',
    domain: 'lms.poplearning.example',
    status: DomainStatusEnum.enum.active,
    connectionType: DomainConnectionTypeEnum.enum.apex,
    lastCheckedAt: '2025-01-12T09:30:00.000Z',
    verificationRecords: [
      {
        type: DomainVerificationTypeEnum.enum.TXT,
        host: '@',
        value: 'v=spf1 include:_spf.google.com ~all'
      }
    ]
  },
  {
    id: 'domain-2',
    domain: 'training.poplearning.example',
    status: DomainStatusEnum.enum.verifying,
    connectionType: DomainConnectionTypeEnum.enum.subdomain,
    lastCheckedAt: '2025-01-11T18:05:00.000Z',
    verificationRecords: [
      {
        type: DomainVerificationTypeEnum.enum.CNAME,
        host: 'training',
        value: 'cname.poplearning.example'
      }
    ]
  },
  {
    id: 'domain-3',
    domain: 'academy.poplearning.example',
    status: DomainStatusEnum.enum.pending,
    connectionType: DomainConnectionTypeEnum.enum.subdomain,
    lastCheckedAt: null,
    verificationRecords: [
      {
        type: DomainVerificationTypeEnum.enum.CNAME,
        host: 'academy',
        value: 'cname.poplearning.example'
      }
    ]
  },
  {
    id: 'domain-4',
    domain: 'learn.poplearning.example',
    status: DomainStatusEnum.enum.failed,
    connectionType: DomainConnectionTypeEnum.enum.apex,
    lastCheckedAt: '2025-01-09T15:20:00.000Z',
    verificationRecords: [
      {
        type: DomainVerificationTypeEnum.enum.TXT,
        host: '@',
        value: 'poplearning-domain-verification=abc123'
      }
    ]
  },
  {
    id: 'domain-5',
    domain: 'legacy.poplearning.example',
    status: DomainStatusEnum.enum.removed,
    connectionType: DomainConnectionTypeEnum.enum.apex,
    lastCheckedAt: '2024-12-15T12:45:00.000Z',
    verificationRecords: [
      {
        type: DomainVerificationTypeEnum.enum.TXT,
        host: '@',
        value: 'legacy-verification-token'
      }
    ]
  }
] as const;

const userRecords = [
  {
    id: 'user-1',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    status: UserStatusEnum.enum.active,
    role: UserRoleEnum.enum.admin,
    groups: [
      { id: 'group-1', name: 'Customer Success' },
      { id: 'group-2', name: 'Sales Onboarding' }
    ],
    lastSeenAt: '2025-01-12T08:30:00.000Z',
    createdAt: '2024-02-15T10:00:00.000Z'
  },
  {
    id: 'user-2',
    name: 'Jordan Smith',
    email: 'jordan.smith@example.com',
    status: UserStatusEnum.enum.active,
    role: UserRoleEnum.enum.manager,
    groups: [{ id: 'group-3', name: 'Product Specialists' }],
    lastSeenAt: '2025-01-11T19:45:00.000Z',
    createdAt: '2024-04-10T09:15:00.000Z'
  },
  {
    id: 'user-3',
    name: 'Riley Chen',
    email: 'riley.chen@example.com',
    status: UserStatusEnum.enum.suspended,
    role: UserRoleEnum.enum.learner,
    groups: [
      { id: 'group-4', name: 'Spring 2025 Cohort' },
      { id: 'group-5', name: 'Accessibility Advocates' }
    ],
    lastSeenAt: '2024-12-29T14:05:00.000Z',
    createdAt: '2023-11-01T12:00:00.000Z'
  },
  {
    id: 'user-4',
    name: 'Jamie Rivera',
    email: 'jamie.rivera@example.com',
    status: UserStatusEnum.enum.active,
    role: UserRoleEnum.enum.manager,
    groups: [{ id: 'group-6', name: 'Regional Leads' }],
    lastSeenAt: '2025-01-10T17:20:00.000Z',
    createdAt: '2024-05-22T16:00:00.000Z'
  },
  {
    id: 'user-5',
    name: 'Morgan Patel',
    email: 'morgan.patel@example.com',
    status: UserStatusEnum.enum.invited,
    role: UserRoleEnum.enum.learner,
    groups: [],
    lastSeenAt: null,
    createdAt: '2025-01-08T11:30:00.000Z'
  },
  {
    id: 'user-6',
    name: 'Taylor Lee',
    email: 'taylor.lee@example.com',
    status: UserStatusEnum.enum.active,
    role: UserRoleEnum.enum.owner,
    groups: [
      { id: 'group-1', name: 'Customer Success' },
      { id: 'group-7', name: 'Executive Sponsors' }
    ],
    lastSeenAt: '2025-01-12T07:55:00.000Z',
    createdAt: '2023-07-19T09:45:00.000Z'
  },
  {
    id: 'user-7',
    name: 'Emerson Brooks',
    email: 'emerson.brooks@example.com',
    status: UserStatusEnum.enum.deactivated,
    role: UserRoleEnum.enum.learner,
    groups: [{ id: 'group-8', name: 'Legacy Program' }],
    lastSeenAt: '2024-06-02T10:00:00.000Z',
    createdAt: '2022-09-14T08:20:00.000Z'
  }
] as const;

const groupRecords = [
  {
    id: 'group-1',
    name: 'Customer Success',
    description: 'Customer support onboarding cohort',
    memberCount: 38,
    createdAt: '2023-08-01T12:00:00.000Z',
    updatedAt: '2025-01-02T09:30:00.000Z'
  },
  {
    id: 'group-2',
    name: 'Sales Onboarding',
    description: 'New hire ramp program',
    memberCount: 24,
    createdAt: '2024-01-15T15:45:00.000Z',
    updatedAt: '2024-12-18T10:15:00.000Z'
  },
  {
    id: 'group-3',
    name: 'Product Specialists',
    description: 'Product expertise guild',
    memberCount: 16,
    createdAt: '2023-10-05T08:30:00.000Z',
    updatedAt: '2024-11-25T14:22:00.000Z'
  },
  {
    id: 'group-4',
    name: 'Spring 2025 Cohort',
    description: 'Upcoming learner cohort',
    memberCount: 42,
    createdAt: '2024-12-01T09:00:00.000Z',
    updatedAt: '2025-01-09T11:10:00.000Z'
  },
  {
    id: 'group-5',
    name: 'Accessibility Advocates',
    description: 'Special interest group',
    memberCount: 12,
    createdAt: '2023-06-20T13:10:00.000Z',
    updatedAt: '2024-10-12T07:50:00.000Z'
  },
  {
    id: 'group-6',
    name: 'Regional Leads',
    description: 'Leaders by geography',
    memberCount: 9,
    createdAt: '2024-03-11T11:30:00.000Z',
    updatedAt: '2025-01-05T16:35:00.000Z'
  }
] as const;

const importRecords = [
  {
    id: 'import-1',
    source: ImportSourceEnum.enum.csv,
    fileName: 'january_enrollments.csv',
    status: ImportStatusEnum.enum.succeeded,
    processedCount: 150,
    successCount: 148,
    errorCount: 2,
    createdAt: '2025-01-10T14:20:00.000Z',
    completedAt: '2025-01-10T14:32:00.000Z',
    lastError: null
  },
  {
    id: 'import-2',
    source: ImportSourceEnum.enum.csv,
    fileName: 'group_memberships.csv',
    status: ImportStatusEnum.enum.failed,
    processedCount: 80,
    successCount: 60,
    errorCount: 20,
    createdAt: '2025-01-08T09:45:00.000Z',
    completedAt: '2025-01-08T09:50:00.000Z',
    lastError: 'Validation failed for 20 rows due to missing roles.'
  },
  {
    id: 'import-3',
    source: ImportSourceEnum.enum.csv,
    fileName: 'legacy_cleanup.csv',
    status: ImportStatusEnum.enum.cancelled,
    processedCount: 30,
    successCount: 0,
    errorCount: 0,
    createdAt: '2025-01-05T18:10:00.000Z',
    completedAt: '2025-01-05T18:15:00.000Z',
    lastError: 'Job cancelled by admin before completion.'
  },
  {
    id: 'import-4',
    source: ImportSourceEnum.enum.csv,
    fileName: 'q4_results.csv',
    status: ImportStatusEnum.enum.running,
    processedCount: 45,
    successCount: 45,
    errorCount: 0,
    createdAt: '2025-01-12T07:55:00.000Z',
    completedAt: null,
    lastError: null
  }
] as const;

const auditLogRecords = [
  {
    id: 'audit-1',
    actor: { id: 'user-6', name: 'Taylor Lee', email: 'taylor.lee@example.com' },
    action: 'org.brand.update',
    target: { id: 'org_mock', type: 'Organization', name: 'Pop Learning Co.' },
    changes: { primaryColor: '#7c49ff', accentColor: '#ff7849' },
    createdAt: '2025-01-12T09:45:00.000Z',
    ipAddress: '192.168.10.24',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2)'
  },
  {
    id: 'audit-2',
    actor: { id: 'user-1', name: 'Alex Johnson', email: 'alex.johnson@example.com' },
    action: 'user.invite.sent',
    target: { id: 'user-8', type: 'User', name: 'Jamie Rivera' },
    changes: { role: 'manager' },
    createdAt: '2025-01-11T17:20:00.000Z',
    ipAddress: '192.168.11.12',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  },
  {
    id: 'audit-3',
    actor: { id: 'user-6', name: 'Taylor Lee', email: 'taylor.lee@example.com' },
    action: 'domain.verify.requested',
    target: { id: 'domain-2', type: 'Domain', name: 'training.poplearning.example' },
    createdAt: '2025-01-10T13:05:00.000Z',
    ipAddress: '10.0.0.5',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2)'
  },
  {
    id: 'audit-4',
    actor: { id: 'user-2', name: 'Jordan Smith', email: 'jordan.smith@example.com' },
    action: 'group.members.import',
    target: { id: 'group-2', type: 'Group', name: 'Sales Onboarding' },
    changes: { processedCount: 80, successCount: 75 },
    createdAt: '2025-01-09T08:30:00.000Z',
    ipAddress: '172.16.0.55',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  },
  {
    id: 'audit-5',
    actor: { id: 'user-1', name: 'Alex Johnson', email: 'alex.johnson@example.com' },
    action: 'user.role.updated',
    target: { id: 'user-3', type: 'User', name: 'Riley Chen' },
    changes: { role: 'manager' },
    createdAt: '2025-01-07T11:12:00.000Z',
    ipAddress: '192.168.10.24',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2)'
  }
] as const;

export async function listBranding({ orgId }: { orgId: string }): Promise<ListResult<AdminBrandingProps>> {
  const parsed = AdminBrandingPropsSchema.parse({
    ...brandingProps,
    orgId,
    branding: {
      ...brandingProps.branding
    }
  });

  return { props: parsed };
}

export async function listDomains({
  orgId,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
}: ListOptions): Promise<ListWithPaginationResult<AdminDomainsProps>> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const slice = domainRecords.slice(start, end);

  const props = AdminDomainsPropsSchema.parse({
    orgId,
    domains: slice,
    filters: {}
  });

  const pagination = PaginationSchema.parse({
    page,
    pageSize,
    totalCount: domainRecords.length
  });

  return { props, pagination };
}

export async function listUsers({
  orgId,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
}: ListOptions): Promise<ListResult<AdminUsersProps>> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const slice = userRecords.slice(start, end);

  const props = AdminUsersPropsSchema.parse({
    orgId,
    users: slice,
    filters: {},
    pagination: {
      page,
      pageSize,
      totalCount: userRecords.length
    }
  });

  return { props };
}

export async function listGroups({
  orgId,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
}: ListOptions): Promise<ListResult<AdminGroupsProps>> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const slice = groupRecords.slice(start, end);

  const props = AdminGroupsPropsSchema.parse({
    orgId,
    groups: slice,
    filters: {},
    pagination: {
      page,
      pageSize,
      totalCount: groupRecords.length
    }
  });

  return { props };
}

export async function listImports({
  orgId,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
}: ListOptions): Promise<ListResult<AdminImportsProps>> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const slice = importRecords.slice(start, end);

  const props = AdminImportsPropsSchema.parse({
    orgId,
    imports: slice,
    filters: {},
    pagination: {
      page,
      pageSize,
      totalCount: importRecords.length
    }
  });

  return { props };
}

export async function listAuditLogs({
  orgId,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
}: ListOptions): Promise<ListResult<AdminAuditProps>> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const slice = auditLogRecords.slice(start, end);

  const props = AdminAuditPropsSchema.parse({
    orgId,
    logs: slice,
    filters: {
      actors: Array.from(new Set(auditLogRecords.map((entry) => entry.actor.id))).slice(0, 3),
      actions: Array.from(new Set(auditLogRecords.map((entry) => entry.action))).slice(0, 3),
      dateRange: DateRangeSchema.parse({ start: '2025-01-05T00:00:00.000Z', end: '2025-01-12T23:59:59.000Z' })
    },
    pagination: {
      page,
      pageSize,
      totalCount: auditLogRecords.length
    }
  });

  return { props };
}
