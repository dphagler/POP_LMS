import { z } from "zod";

const ThemeColorValueSchema = z.string().min(1, "Theme color values must be non-empty strings");

const ThemeAccentsSchema = z.record(z.string(), ThemeColorValueSchema);

export const ThemeJsonSchema = z
  .object({
    primary: ThemeColorValueSchema.optional(),
    secondary: ThemeColorValueSchema.optional(),
    accents: ThemeAccentsSchema.optional(),
    logoUrl: z.string().url().optional(),
    faviconUrl: z.string().url().optional(),
  })
  .strict();

export type ThemeJson = z.infer<typeof ThemeJsonSchema>;

export const CreateOrganizationActionInputSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required"),
  themeJson: ThemeJsonSchema.optional(),
});

export const CreateOrganizationActionOutputSchema = z.object({
  orgId: z.string(),
});

const BaseAuditLogDescriptorSchema = z.object({
  entity: z.literal("Organization"),
});

export const CreateOrganizationAuditLogSchema = BaseAuditLogDescriptorSchema.extend({
  action: z.literal("org.create"),
});

export const UpdateBrandingAuditLogSchema = BaseAuditLogDescriptorSchema.extend({
  action: z.literal("org.brand.update"),
});

export const UpdateBrandingActionInputSchema = z.object({
  orgId: z.string().trim().min(1, "orgId is required"),
  themeJson: ThemeJsonSchema,
});

export const UpdateBrandingActionOutputSchema = z.object({
  ok: z.literal(true),
});

export const ServerActionsContractSchema = z.object({
  createOrganization: z.object({
    input: CreateOrganizationActionInputSchema,
    output: CreateOrganizationActionOutputSchema,
    auditLog: CreateOrganizationAuditLogSchema,
  }),
  updateBranding: z.object({
    input: UpdateBrandingActionInputSchema,
    output: UpdateBrandingActionOutputSchema,
    auditLog: UpdateBrandingAuditLogSchema,
  }),
});

export type ServerActionsContract = z.infer<typeof ServerActionsContractSchema>;
