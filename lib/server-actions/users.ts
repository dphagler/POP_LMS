"use server";

import { createHash, randomBytes } from "crypto";

import { UserRole, UserSource } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/authz";
import {
  OrgUserListItem,
  UserOrgConflictError,
  changeOrgUserRole,
  findOrgUserById,
  mapUiRoleToUserRole,
  upsertOrgUser,
} from "@/lib/db/user";
import { sendSignInEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/db/audit";

const InviteUserSchema = z.object({
  email: z.string().email(),
  name: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  role: z.enum(["LEARNER", "MANAGER", "ADMIN"]).default("LEARNER"),
});

const UpdateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["LEARNER", "MANAGER", "ADMIN"]),
});

const SendResetLinkSchema = z.object({
  userId: z.string().min(1),
});

type MagicLinkOptions = {
  callbackPath?: string;
};

type MagicLinkResult = {
  url: string;
  expires: Date;
};

function resolveAuthLocation() {
  const explicitUrl =
    env.NEXTAUTH_URL ??
    env.AUTH_URL ??
    env.APP_BASE_URL ??
    env.NEXT_PUBLIC_APP_URL ??
    env.VERCEL_URL ??
    "http://localhost:3000";

  const candidate = explicitUrl.startsWith("http")
    ? explicitUrl
    : `https://${explicitUrl}`;

  let origin = "http://localhost:3000";
  let basePath = "/api/auth";

  try {
    const parsed = new URL(candidate);
    origin = `${parsed.protocol}//${parsed.host}`;
    if (parsed.pathname && parsed.pathname !== "/") {
      basePath = parsed.pathname;
    }
  } catch {
    origin = "http://localhost:3000";
  }

  if (!basePath.startsWith("/")) {
    basePath = `/${basePath}`;
  }

  basePath = basePath.replace(/\/$/, "");

  if (basePath.length === 0) {
    basePath = "/api/auth";
  }

  return { origin, basePath };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function createMagicLinkForEmail(
  email: string,
  options: MagicLinkOptions = {}
): Promise<MagicLinkResult> {
  const normalizedEmail = normalizeEmail(email);
  const { origin, basePath } = resolveAuthLocation();
  const callbackPath = options.callbackPath ?? "/app";
  const token = randomBytes(32).toString("hex");
  const secret = env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required to create magic links.");
  }
  const hashedToken = createHash("sha256")
    .update(`${token}${secret}`)
    .digest("hex");
  const expires = new Date(Date.now() + env.AUTH_EMAIL_TOKEN_MAX_AGE * 1000);

  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token: hashedToken,
      expires,
    },
  });

  const authBase = new URL(`${basePath}/`, origin);
  const callbackEndpoint = new URL("callback/resend", authBase);
  const redirectUrl = new URL(callbackPath, origin).toString();

  const params = new URLSearchParams({
    callbackUrl: redirectUrl,
    token,
    email: normalizedEmail,
  });

  const url = `${callbackEndpoint.toString()}?${params.toString()}`;

  return { url, expires };
}

type InviteUserInput = z.infer<typeof InviteUserSchema>;

type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

type SendResetLinkInput = z.infer<typeof SendResetLinkSchema>;

type ServerActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? {} : { user: T }))
  | { ok: false; error: string };

function ensureAdminSession(sessionRole: UserRole | null | undefined) {
  if (sessionRole !== UserRole.ADMIN) {
    throw new Error("Only admins can perform this action.");
  }
}

export async function inviteUser(rawInput: InviteUserInput): Promise<ServerActionResult<OrgUserListItem>> {
  const session = await requireRole("ADMIN");
  ensureAdminSession(session.user.role);

  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  const input = InviteUserSchema.parse(rawInput);
  const userRole = mapUiRoleToUserRole(input.role);

  try {
    const user = await upsertOrgUser({
      orgId,
      email: input.email,
      name: input.name,
      role: userRole,
      source: UserSource.invite,
    });

    const { url } = await createMagicLinkForEmail(user.email, {
      callbackPath: "/app",
    });

    await sendSignInEmail(user.email, url);

    await logAudit({
      orgId,
      actorId: session.user.id,
      action: "user.invite",
      targetId: user.id,
      metadata: {
        email: user.email,
        role: input.role,
      },
    });

    revalidatePath("/admin/users");

    return { ok: true, user };
  } catch (error) {
    if (error instanceof UserOrgConflictError) {
      return { ok: false, error: "Email already belongs to another org" };
    }
    throw error;
  }
}

export async function updateUserRole(
  rawInput: UpdateUserRoleInput
): Promise<ServerActionResult<OrgUserListItem>> {
  const session = await requireRole("ADMIN");
  ensureAdminSession(session.user.role);

  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  const input = UpdateUserRoleSchema.parse(rawInput);

  if (session.user.id === input.userId && input.role !== "ADMIN") {
    throw new Error("You cannot remove your own admin access.");
  }

  const userRole = mapUiRoleToUserRole(input.role);

  const user = await changeOrgUserRole({
    orgId,
    userId: input.userId,
    role: userRole,
  });

  await logAudit({
    orgId,
    actorId: session.user.id,
    action: "role.update",
    targetId: user.id,
    metadata: {
      role: input.role,
    },
  });

  revalidatePath("/admin/users");

  return { ok: true, user };
}

export async function sendResetLink(
  rawInput: SendResetLinkInput
): Promise<ServerActionResult> {
  const session = await requireRole("ADMIN");
  ensureAdminSession(session.user.role);

  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  const input = SendResetLinkSchema.parse(rawInput);

  if (session.user.id === input.userId) {
    throw new Error("You cannot send a reset link to yourself.");
  }

  const user = await findOrgUserById({ orgId, userId: input.userId });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.email) {
    throw new Error("User does not have an email address.");
  }

  const { url } = await createMagicLinkForEmail(user.email, {
    callbackPath: "/app",
  });

  await sendSignInEmail(user.email, url, {
    subject: "Reset access to POP LMS",
  });

  revalidatePath("/admin/users");

  return { ok: true };
}
