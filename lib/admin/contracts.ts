import { z } from "zod";

export const OrgScopedSchema = z.object({
  orgId: z.string().min(1, "orgId is required"),
});

export type OrgScope = z.infer<typeof OrgScopedSchema>;
export type OrgScoped<T extends Record<string, unknown>> = OrgScope & T;

export const HexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/u, "Expected a hex color value");

export const PaginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().nonnegative(),
});

export const DateRangeSchema = z.object({
  start: z.string().datetime().nullable(),
  end: z.string().datetime().nullable(),
});

export const UserReferenceSchema = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
});

/**
 * /admin/branding
 */
export const BrandingAssetTypeEnum = z.enum(["logo", "favicon", "background", "loginGraphic"]);

export const BrandingAssetSchema = z.object({
  type: BrandingAssetTypeEnum,
  url: z.string().url(),
  fileName: z.string(),
  updatedAt: z.string().datetime(),
  uploadedBy: UserReferenceSchema,
});

export const BrandingSettingsSchema = z.object({
  organizationName: z.string().min(1),
  primaryColor: HexColorSchema,
  secondaryColor: HexColorSchema,
  accentColor: HexColorSchema.nullable(),
  loginMessage: z.string().max(500).nullable(),
  supportEmail: z.string().email().nullable(),
  heroImageUrl: z.string().url().nullable(),
});

export const AdminBrandingPropsSchema = OrgScopedSchema.extend({
  branding: BrandingSettingsSchema,
  assets: z.array(BrandingAssetSchema),
  lastPublishedAt: z.string().datetime().nullable(),
});

export type AdminBrandingProps = OrgScoped<{
  branding: z.infer<typeof BrandingSettingsSchema>;
  assets: z.infer<typeof BrandingAssetSchema>[];
  lastPublishedAt: string | null;
}>;

export const UpdateBrandingInputSchema = OrgScopedSchema.extend({
  payload: BrandingSettingsSchema.partial(),
});

export const UpdateBrandingOutputSchema = OrgScopedSchema.extend({
  branding: BrandingSettingsSchema,
  updatedAt: z.string().datetime(),
});

export const UploadBrandingAssetInputSchema = OrgScopedSchema.extend({
  asset: BrandingAssetSchema.pick({ type: true, url: true, fileName: true }),
});

export const UploadBrandingAssetOutputSchema = OrgScopedSchema.extend({
  asset: BrandingAssetSchema,
});

export const AdminBrandingContractSchema = z.object({
  props: AdminBrandingPropsSchema,
  mutations: z.object({
    updateBranding: z.object({
      input: UpdateBrandingInputSchema,
      output: UpdateBrandingOutputSchema,
    }),
    uploadAsset: z.object({
      input: UploadBrandingAssetInputSchema,
      output: UploadBrandingAssetOutputSchema,
    }),
  }),
});

export type AdminBrandingContract = z.infer<typeof AdminBrandingContractSchema>;

/**
 * /admin/domains
 */
export const DomainVerificationTypeEnum = z.enum(["TXT", "CNAME"]);

export const DomainVerificationRecordSchema = z.object({
  type: DomainVerificationTypeEnum,
  host: z.string(),
  value: z.string(),
});

export const DomainStatusEnum = z.enum(["pending", "verifying", "active", "failed", "removed"]);
export const DomainConnectionTypeEnum = z.enum(["apex", "subdomain"]);

export const DomainRecordSchema = z.object({
  id: z.string(),
  domain: z.string().min(1),
  status: DomainStatusEnum,
  connectionType: DomainConnectionTypeEnum,
  lastCheckedAt: z.string().datetime().nullable(),
  verificationRecords: z.array(DomainVerificationRecordSchema),
});

export const DomainFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(DomainStatusEnum).optional(),
  connectionType: z.array(DomainConnectionTypeEnum).optional(),
});

export const AdminDomainsPropsSchema = OrgScopedSchema.extend({
  domains: z.array(DomainRecordSchema),
  filters: DomainFiltersSchema,
});

export type AdminDomainsProps = OrgScoped<{
  domains: z.infer<typeof DomainRecordSchema>[];
  filters: z.infer<typeof DomainFiltersSchema>;
}>;

export const ConnectDomainInputSchema = OrgScopedSchema.extend({
  domain: z.string().min(1),
  connectionType: DomainConnectionTypeEnum,
});

export const ConnectDomainOutputSchema = OrgScopedSchema.extend({
  domain: DomainRecordSchema,
});

export const RemoveDomainInputSchema = OrgScopedSchema.extend({
  domainId: z.string().min(1),
});

export const RemoveDomainOutputSchema = OrgScopedSchema.extend({
  domainId: z.string().min(1),
  removedAt: z.string().datetime(),
});

export const AdminDomainsContractSchema = z.object({
  props: AdminDomainsPropsSchema,
  mutations: z.object({
    connectDomain: z.object({
      input: ConnectDomainInputSchema,
      output: ConnectDomainOutputSchema,
    }),
    removeDomain: z.object({
      input: RemoveDomainInputSchema,
      output: RemoveDomainOutputSchema,
    }),
  }),
});

export type AdminDomainsContract = z.infer<typeof AdminDomainsContractSchema>;

/**
 * /admin/users
 */
export const UserStatusEnum = z.enum(["invited", "active", "suspended", "deactivated"]);
export const UserRoleEnum = z.enum(["learner", "manager", "admin", "owner"]);

export const UserListItemSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
  status: UserStatusEnum,
  role: UserRoleEnum,
  groups: z.array(z.object({ id: z.string(), name: z.string() })),
  lastSeenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const UserFiltersSchema = z.object({
  search: z.string().optional(),
  roles: z.array(UserRoleEnum).optional(),
  statuses: z.array(UserStatusEnum).optional(),
  groups: z.array(z.string()).optional(),
});

export const AdminUsersPropsSchema = OrgScopedSchema.extend({
  users: z.array(UserListItemSchema),
  filters: UserFiltersSchema,
  pagination: PaginationSchema,
});

export type AdminUsersProps = OrgScoped<{
  users: z.infer<typeof UserListItemSchema>[];
  filters: z.infer<typeof UserFiltersSchema>;
  pagination: z.infer<typeof PaginationSchema>;
}>;

export const InviteUserInputSchema = OrgScopedSchema.extend({
  email: z.string().email(),
  role: UserRoleEnum,
  groups: z.array(z.string()).default([]),
});

export const InviteUserOutputSchema = OrgScopedSchema.extend({
  user: UserListItemSchema,
});

export const UpdateUserRoleInputSchema = OrgScopedSchema.extend({
  userId: z.string(),
  role: UserRoleEnum,
});

export const UpdateUserRoleOutputSchema = OrgScopedSchema.extend({
  user: UserListItemSchema,
});

export const ToggleUserStatusInputSchema = OrgScopedSchema.extend({
  userId: z.string(),
  status: UserStatusEnum,
});

export const ToggleUserStatusOutputSchema = OrgScopedSchema.extend({
  user: UserListItemSchema,
});

export const AdminUsersContractSchema = z.object({
  props: AdminUsersPropsSchema,
  mutations: z.object({
    inviteUser: z.object({
      input: InviteUserInputSchema,
      output: InviteUserOutputSchema,
    }),
    updateUserRole: z.object({
      input: UpdateUserRoleInputSchema,
      output: UpdateUserRoleOutputSchema,
    }),
    toggleUserStatus: z.object({
      input: ToggleUserStatusInputSchema,
      output: ToggleUserStatusOutputSchema,
    }),
  }),
});

export type AdminUsersContract = z.infer<typeof AdminUsersContractSchema>;

/**
 * /admin/groups
 */
export const GroupListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  memberCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GroupFiltersSchema = z.object({
  search: z.string().optional(),
  minMembers: z.number().int().nonnegative().optional(),
  maxMembers: z.number().int().optional(),
});

export const AdminGroupsPropsSchema = OrgScopedSchema.extend({
  groups: z.array(GroupListItemSchema),
  filters: GroupFiltersSchema,
  pagination: PaginationSchema,
});

export type AdminGroupsProps = OrgScoped<{
  groups: z.infer<typeof GroupListItemSchema>[];
  filters: z.infer<typeof GroupFiltersSchema>;
  pagination: z.infer<typeof PaginationSchema>;
}>;

export const UpsertGroupInputSchema = OrgScopedSchema.extend({
  groupId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string()).default([]),
});

export const UpsertGroupOutputSchema = OrgScopedSchema.extend({
  group: GroupListItemSchema,
});

export const DeleteGroupInputSchema = OrgScopedSchema.extend({
  groupId: z.string(),
});

export const DeleteGroupOutputSchema = OrgScopedSchema.extend({
  groupId: z.string(),
  deletedAt: z.string().datetime(),
});

export const AdminGroupsContractSchema = z.object({
  props: AdminGroupsPropsSchema,
  mutations: z.object({
    upsertGroup: z.object({
      input: UpsertGroupInputSchema,
      output: UpsertGroupOutputSchema,
    }),
    deleteGroup: z.object({
      input: DeleteGroupInputSchema,
      output: DeleteGroupOutputSchema,
    }),
  }),
});

export type AdminGroupsContract = z.infer<typeof AdminGroupsContractSchema>;

/**
 * /admin/imports
 */
export const ImportSourceEnum = z.enum(["csv", "scorm", "xapi", "lrs"]);
export const ImportStatusEnum = z.enum(["queued", "running", "succeeded", "failed", "cancelled"]);

export const ImportJobSchema = z.object({
  id: z.string(),
  source: ImportSourceEnum,
  fileName: z.string(),
  status: ImportStatusEnum,
  processedCount: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  lastError: z.string().nullable(),
});

export const ImportFiltersSchema = z.object({
  status: z.array(ImportStatusEnum).optional(),
  source: z.array(ImportSourceEnum).optional(),
  dateRange: DateRangeSchema.optional(),
});

export const AdminImportsPropsSchema = OrgScopedSchema.extend({
  imports: z.array(ImportJobSchema),
  filters: ImportFiltersSchema,
  pagination: PaginationSchema,
});

export type AdminImportsProps = OrgScoped<{
  imports: z.infer<typeof ImportJobSchema>[];
  filters: z.infer<typeof ImportFiltersSchema>;
  pagination: z.infer<typeof PaginationSchema>;
}>;

export const CreateImportInputSchema = OrgScopedSchema.extend({
  source: ImportSourceEnum,
  fileName: z.string(),
  uploadUrl: z.string().url(),
});

export const CreateImportOutputSchema = OrgScopedSchema.extend({
  import: ImportJobSchema,
});

export const CancelImportInputSchema = OrgScopedSchema.extend({
  importId: z.string(),
});

export const CancelImportOutputSchema = OrgScopedSchema.extend({
  import: ImportJobSchema,
});

export const AdminImportsContractSchema = z.object({
  props: AdminImportsPropsSchema,
  mutations: z.object({
    createImport: z.object({
      input: CreateImportInputSchema,
      output: CreateImportOutputSchema,
    }),
    cancelImport: z.object({
      input: CancelImportInputSchema,
      output: CancelImportOutputSchema,
    }),
  }),
});

export type AdminImportsContract = z.infer<typeof AdminImportsContractSchema>;

/**
 * /admin/audit
 */
export const AuditLogEntrySchema = z.object({
  id: z.string(),
  actor: UserReferenceSchema,
  action: z.string(),
  target: z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().nullable(),
  }),
  changes: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});

export const AuditFiltersSchema = z.object({
  actors: z.array(z.string()).optional(),
  actions: z.array(z.string()).optional(),
  dateRange: DateRangeSchema.optional(),
  search: z.string().optional(),
});

export const AdminAuditPropsSchema = OrgScopedSchema.extend({
  logs: z.array(AuditLogEntrySchema),
  filters: AuditFiltersSchema,
  pagination: PaginationSchema,
});

export type AdminAuditProps = OrgScoped<{
  logs: z.infer<typeof AuditLogEntrySchema>[];
  filters: z.infer<typeof AuditFiltersSchema>;
  pagination: z.infer<typeof PaginationSchema>;
}>;

export const FetchAuditLogsInputSchema = OrgScopedSchema.extend({
  filters: AuditFiltersSchema.optional(),
  pagination: PaginationSchema.pick({ page: true, pageSize: true }).optional(),
});

export const FetchAuditLogsOutputSchema = OrgScopedSchema.extend({
  logs: z.array(AuditLogEntrySchema),
  pagination: PaginationSchema,
});

export const AdminAuditContractSchema = z.object({
  props: AdminAuditPropsSchema,
  queries: z.object({
    fetchLogs: z.object({
      input: FetchAuditLogsInputSchema,
      output: FetchAuditLogsOutputSchema,
    }),
  }),
});

export type AdminAuditContract = z.infer<typeof AdminAuditContractSchema>;

export const AdminContracts = {
  branding: AdminBrandingContractSchema,
  domains: AdminDomainsContractSchema,
  users: AdminUsersContractSchema,
  groups: AdminGroupsContractSchema,
  imports: AdminImportsContractSchema,
  audit: AdminAuditContractSchema,
} as const;

