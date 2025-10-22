"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { createLogger, serializeError } from "@/lib/logger";

const GROUPS_PATH = "/admin/groups";
const logger = createLogger({ component: "admin.groups" });

const groupNameSchema = (value: unknown) => {
  if (typeof value !== "string") {
    return { success: false, error: "Group name is required." } as const;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { success: false, error: "Group name is required." } as const;
  }
  if (trimmed.length > 120) {
    return { success: false, error: "Group name must be 120 characters or fewer." } as const;
  }
  return { success: true, data: trimmed } as const;
};

export async function createGroupAction(orgId: string, formData: FormData) {
  const session = await requireRole("ADMIN");
  const sessionOrgId = session.user.orgId;
  if (!sessionOrgId || sessionOrgId !== orgId) {
    throw new Error("Unauthorized");
  }

  const parsedName = groupNameSchema(formData.get("name"));
  if (!parsedName.success) {
    throw new Error(parsedName.error);
  }

  await prisma.orgGroup.create({
    data: {
      orgId: sessionOrgId,
      name: parsedName.data
    }
  });

  revalidatePath(GROUPS_PATH);
  redirect(GROUPS_PATH);
}

export async function renameGroupAction(orgId: string, formData: FormData) {
  const session = await requireRole("ADMIN");
  const sessionOrgId = session.user.orgId;
  if (!sessionOrgId || sessionOrgId !== orgId) {
    throw new Error("Unauthorized");
  }

  const groupId = formData.get("groupId");
  if (typeof groupId !== "string" || !groupId) {
    throw new Error("Group not found");
  }

  const parsedName = groupNameSchema(formData.get("name"));
  if (!parsedName.success) {
    throw new Error(parsedName.error);
  }

  const group = await prisma.orgGroup.findUnique({
    where: { id: groupId },
    select: { orgId: true }
  });

  if (!group || group.orgId !== sessionOrgId) {
    throw new Error("Group not found");
  }

  await prisma.orgGroup.update({
    where: { id: groupId },
    data: { name: parsedName.data }
  });

  revalidatePath(GROUPS_PATH);
  redirect(GROUPS_PATH);
}

export async function deleteGroupAction(orgId: string, formData: FormData) {
  const session = await requireRole("ADMIN");
  const sessionOrgId = session.user.orgId;
  if (!sessionOrgId || sessionOrgId !== orgId) {
    throw new Error("Unauthorized");
  }

  const groupId = formData.get("groupId");
  if (typeof groupId !== "string" || !groupId) {
    throw new Error("Group not found");
  }

  const group = await prisma.orgGroup.findUnique({
    where: { id: groupId },
    select: { orgId: true }
  });

  if (!group || group.orgId !== sessionOrgId) {
    throw new Error("Group not found");
  }

  await prisma.orgGroup.delete({ where: { id: groupId } });

  revalidatePath(GROUPS_PATH);
  redirect(GROUPS_PATH);
}

export type ImportRowError = {
  rowNumber: number;
  email: string;
  message: string;
};

export type ImportResultState = {
  errors: ImportRowError[];
  formError?: string;
  success?: {
    totalRows: number;
    createdUsers: number;
    updatedUsers: number;
    addedMemberships: number;
    skippedRows: number;
  };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ParsedCsvRow = {
  rowNumber: number;
  email: string;
  name: string;
};

type CsvParseResult = {
  rows: ParsedCsvRow[];
  error?: string;
};

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function parseCsv(content: string): CsvParseResult {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], error: "CSV file was empty." };
  }

  const headerLine = lines[0];
  const headers = splitCsvLine(headerLine).map((header) => header.trim().toLowerCase());
  const emailIndex = headers.indexOf("email");
  const nameIndex = headers.indexOf("name");

  if (emailIndex === -1 || nameIndex === -1) {
    return { rows: [], error: 'CSV must include "email" and "name" columns.' };
  }

  const rows: ParsedCsvRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1; // account for header row
    const values = splitCsvLine(lines[i]).map((value) => value.trim());
    rows.push({
      rowNumber,
      email: values[emailIndex] ?? "",
      name: values[nameIndex] ?? ""
    });
  }

  return { rows };
}

export async function importGroupMembersAction(
  orgId: string,
  prevState: ImportResultState,
  formData: FormData
): Promise<ImportResultState> {
  const session = await requireRole("ADMIN");
  const sessionOrgId = session.user.orgId;
  if (!sessionOrgId || sessionOrgId !== orgId) {
    return { errors: [], formError: "Unauthorized." };
  }

  const groupId = formData.get("groupId");
  if (typeof groupId !== "string" || !groupId) {
    return { errors: [], formError: "Group is required." };
  }

  const group = await prisma.orgGroup.findUnique({
    where: { id: groupId },
    select: { orgId: true }
  });

  if (!group || group.orgId !== sessionOrgId) {
    return { errors: [], formError: "Group not found." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { errors: [], formError: "CSV file is required." };
  }

  const csvText = (await file.text()).trim();
  if (!csvText) {
    return { errors: [], formError: "CSV file was empty." };
  }

  const parsed = parseCsv(csvText);
  if (parsed.error) {
    return { errors: [], formError: parsed.error };
  }

  const rowErrors: ImportRowError[] = [];
  const processedEmails = new Set<string>();
  let createdUsers = 0;
  let updatedUsers = 0;
  let addedMemberships = 0;
  let skippedRows = 0;

  for (const row of parsed.rows) {
    const normalizedEmail = row.email.trim().toLowerCase();
    const normalizedName = row.name.trim();

    if (!normalizedEmail) {
      rowErrors.push({ rowNumber: row.rowNumber, email: "", message: "Email is required." });
      skippedRows += 1;
      continue;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        email: normalizedEmail,
        message: "Email is invalid."
      });
      skippedRows += 1;
      continue;
    }

    if (processedEmails.has(normalizedEmail)) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        email: normalizedEmail,
        message: "Duplicate email in file."
      });
      skippedRows += 1;
      continue;
    }
    processedEmails.add(normalizedEmail);

    try {
      let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: normalizedName || null,
            orgId: sessionOrgId
          }
        });
        createdUsers += 1;
      } else if (user.orgId !== sessionOrgId) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          email: normalizedEmail,
          message: "Email belongs to a user in another organization."
        });
        skippedRows += 1;
        continue;
      } else if (normalizedName && normalizedName !== (user.name ?? "")) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: normalizedName }
        });
        updatedUsers += 1;
      }

      const existingMembership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: user.id } }
      });

      if (!existingMembership) {
        await prisma.groupMember.create({
          data: {
            groupId,
            userId: user.id
          }
        });
        addedMemberships += 1;
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        skippedRows += 1;
        continue;
      }

      logger.error({
        event: "admin.groups.import_failed",
        rowNumber: row.rowNumber,
        email: normalizedEmail,
        error: serializeError(error)
      });
      rowErrors.push({
        rowNumber: row.rowNumber,
        email: normalizedEmail,
        message: "Unexpected error while importing row."
      });
      skippedRows += 1;
    }
  }

  if (createdUsers > 0 || addedMemberships > 0 || updatedUsers > 0) {
    revalidatePath(GROUPS_PATH);
  }

  return {
    errors: rowErrors,
    success: {
      totalRows: parsed.rows.length,
      createdUsers,
      updatedUsers,
      addedMemberships,
      skippedRows
    }
  };
}
