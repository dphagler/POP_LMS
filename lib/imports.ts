import {
  ImportSource,
  ImportStatus,
  MembershipSource,
  OrgRole,
  Prisma,
  UserRole
} from "@prisma/client";

import { prisma } from "./prisma";
import { createLogger, serializeError } from "./logger";
import { env } from "./env";
import { sendImportResultsEmail } from "./email";
import { logAudit } from "./db/audit";

const logger = createLogger({ component: "csv-import" });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ImportCsvArgs = {
  orgId: string;
  file: File;
};

export type CsvImportResults = {
  jobId: string;
  totals: {
    processed: number;
    succeeded: number;
    failed: number;
  };
  errors: Array<{
    row: number;
    email: string;
    reason: string;
  }>;
  createdIds: {
    users: string[];
    memberships: string[];
    groups: string[];
    groupMembers: string[];
  };
};

type ParsedCsvRow = {
  rowNumber: number;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  groups?: string;
};

type ProcessRowResult = {
  userId: string;
  membershipId: string;
  createdUser?: boolean;
  createdMembership?: boolean;
  createdGroupIds: string[];
  createdGroupMemberIds: string[];
};

class CsvRowError extends Error {
  constructor(
    message: string,
    public readonly rowNumber: number,
    public readonly email: string
  ) {
    super(message);
    this.name = "CsvRowError";
  }
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
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

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findHeaderIndex(headers: string[], candidates: string[]) {
  for (const candidate of candidates) {
    const normalized = candidate
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const index = headers.findIndex((header) => header === normalized);
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

function parseCsvBuffer(buffer: Buffer | Uint8Array): ParsedCsvRow[] {
  const text = Buffer.from(buffer).toString("utf-8").replace(/^\ufeff/, "");
  const rawLines = text.split(/\r?\n/);

  let headerIndex = -1;
  for (let i = 0; i < rawLines.length; i += 1) {
    if (rawLines[i].trim().length > 0) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error("CSV file was empty.");
  }

  const headerLine = rawLines[headerIndex];
  const headers = splitCsvLine(headerLine).map((header) => normalizeHeader(header));

  const emailIndex = findHeaderIndex(headers, ["email"]);
  const firstNameIndex = findHeaderIndex(headers, ["firstname", "first_name", "first name"]);
  const lastNameIndex = findHeaderIndex(headers, ["lastname", "last_name", "last name"]);
  const roleIndex = findHeaderIndex(headers, ["role", "orgrole", "membershiprole"]);
  const groupsIndex = findHeaderIndex(headers, ["groups", "group", "cohorts"]);

  if (emailIndex === -1 || firstNameIndex === -1 || lastNameIndex === -1) {
    throw new Error('CSV must include "email", "firstName", and "lastName" columns.');
  }

  const rows: ParsedCsvRow[] = [];

  for (let i = headerIndex + 1; i < rawLines.length; i += 1) {
    const line = rawLines[i];
    if (typeof line !== "string" || line.trim().length === 0) {
      continue;
    }

    const values = splitCsvLine(line).map((value) => value.trim());
    const isEmptyRow = values.every((value) => value.trim().length === 0);
    if (isEmptyRow) {
      continue;
    }

    rows.push({
      rowNumber: i + 1,
      email: values[emailIndex] ?? "",
      firstName: values[firstNameIndex] ?? "",
      lastName: values[lastNameIndex] ?? "",
      role: roleIndex !== -1 ? values[roleIndex] ?? "" : undefined,
      groups: groupsIndex !== -1 ? values[groupsIndex] ?? "" : undefined
    });
  }

  return rows;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeRole(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) {
    return OrgRole.LEARNER;
  }

  const normalized = candidate.replace(/[^a-z]/gi, "").toLowerCase();

  switch (normalized) {
    case "admin":
      return OrgRole.ADMIN;
    case "owner":
      return OrgRole.OWNER;
    case "instructor":
    case "coach":
      return OrgRole.INSTRUCTOR;
    case "learner":
    case "student":
    case "member":
    case "participant":
      return OrgRole.LEARNER;
    default:
      throw new Error(`Unrecognized role: ${candidate}`);
  }
}

const USER_ROLE_RANK: Record<UserRole, number> = {
  [UserRole.LEARNER]: 0,
  [UserRole.INSTRUCTOR]: 1,
  [UserRole.ADMIN]: 2
};

function mapOrgRoleToUserRole(role: OrgRole): UserRole {
  switch (role) {
    case OrgRole.OWNER:
    case OrgRole.ADMIN:
      return UserRole.ADMIN;
    case OrgRole.INSTRUCTOR:
      return UserRole.INSTRUCTOR;
    case OrgRole.LEARNER:
    default:
      return UserRole.LEARNER;
  }
}

function parseGroupNames(raw?: string) {
  if (!raw) {
    return [];
  }

  const groups = raw
    .split(/[|;]/)
    .map((group) => group.trim())
    .filter((group) => group.length > 0);

  const unique = new Map<string, string>();
  for (const group of groups) {
    const key = group.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, group);
    }
  }

  return Array.from(unique.values());
}

function resolveAppBaseUrl() {
  const candidate =
    env.NEXTAUTH_URL ??
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";

  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    return candidate;
  }

  return `https://${candidate}`;
}

async function processRow(jobId: string, orgId: string, row: ParsedCsvRow): Promise<ProcessRowResult> {
  const normalizedEmail = normalizeEmail(row.email);

  if (!normalizedEmail) {
    throw new CsvRowError("Email is required.", row.rowNumber, row.email ?? "");
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new CsvRowError("Email is invalid.", row.rowNumber, normalizedEmail);
  }

  let role: OrgRole;
  try {
    role = normalizeRole(row.role);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid role specified.";
    throw new CsvRowError(message, row.rowNumber, normalizedEmail || row.email || "");
  }
  const groupNames = parseGroupNames(row.groups);
  const userRole = mapOrgRoleToUserRole(role);
  const fullName = [row.firstName?.trim(), row.lastName?.trim()].filter(Boolean).join(" ") || null;

  return prisma.$transaction(async (tx) => {
    const createdGroupIds: string[] = [];
    const createdGroupMemberIds: string[] = [];

    let user = await tx.user.findUnique({ where: { email: normalizedEmail } });
    let createdUser = false;

    if (!user) {
      user = await tx.user.create({
        data: {
          email: normalizedEmail,
          orgId,
          role: userRole,
          name: fullName
        }
      });
      createdUser = true;
    } else if (user.orgId !== orgId) {
      throw new CsvRowError("Email belongs to another organization.", row.rowNumber, normalizedEmail);
    } else {
      const updateData: Prisma.UserUpdateInput = {};
      if (fullName && user.name !== fullName) {
        updateData.name = fullName;
      }

      const existingRank = USER_ROLE_RANK[user.role];
      const desiredRank = USER_ROLE_RANK[userRole];
      if (desiredRank > existingRank) {
        updateData.role = userRole;
      }

      if (Object.keys(updateData).length > 0) {
        user = await tx.user.update({
          where: { id: user.id },
          data: updateData
        });
      }
    }

    let membership = await tx.orgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId
        }
      }
    });
    let createdMembership = false;

    if (!membership) {
      membership = await tx.orgMembership.create({
        data: {
          userId: user.id,
          orgId,
          role,
          source: MembershipSource.csv
        }
      });
      createdMembership = true;
    } else {
      const membershipUpdate: Prisma.OrgMembershipUpdateInput = {
        role,
        source: MembershipSource.csv
      };
      membership = await tx.orgMembership.update({
        where: { id: membership.id },
        data: membershipUpdate
      });
    }

    for (const groupName of groupNames) {
      let group = await tx.orgGroup.findFirst({
        where: {
          orgId,
          name: {
            equals: groupName,
            mode: "insensitive"
          }
        }
      });

      if (!group) {
        group = await tx.orgGroup.create({
          data: {
            orgId,
            name: groupName
          }
        });
        createdGroupIds.push(group.id);
      } else if (group.deletedAt) {
        group = await tx.orgGroup.update({
          where: { id: group.id },
          data: { deletedAt: null }
        });
      }

      const existingMember = await tx.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId: user.id
          }
        }
      });

      if (!existingMember) {
        const createdMember = await tx.groupMember.create({
          data: {
            groupId: group.id,
            userId: user.id
          }
        });
        createdGroupMemberIds.push(createdMember.id);
      }
    }

    await logAudit({
      orgId,
      action: "import.csv.row.success",
      targetId: jobId,
      metadata: {
        jobId,
        rowNumber: row.rowNumber,
        email: normalizedEmail,
        userId: user.id,
        membershipId: membership.id,
        createdUser,
        createdMembership,
        createdGroupIds,
        createdGroupMemberIds
      },
      client: tx,
    });

    return {
      userId: user.id,
      membershipId: membership.id,
      createdUser,
      createdMembership,
      createdGroupIds,
      createdGroupMemberIds
    } satisfies ProcessRowResult;
  });
}

export async function importCsv({ orgId, file }: ImportCsvArgs) {
  if (!orgId) {
    throw new Error("Organization ID is required.");
  }

  if (!(file instanceof File)) {
    throw new Error("A CSV file is required.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length) {
    throw new Error("CSV file was empty.");
  }

  const job = await prisma.importJob.create({
    data: {
      orgId,
      source: ImportSource.csv,
      fileName: file.name || "import.csv",
      fileData: buffer,
      status: ImportStatus.queued
    },
    select: { id: true }
  });

  logger.info({
    event: "csv_import.job_created",
    orgId,
    jobId: job.id,
    fileName: file.name,
    fileSize: buffer.length
  });

  return { jobId: job.id };
}

export async function processCsv(jobId: string) {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: {
      org: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!job) {
    throw new Error(`Import job ${jobId} not found.`);
  }

  if (!job.fileData) {
    throw new Error("Import job is missing CSV data.");
  }

  const jobLogger = logger.child({ jobId, orgId: job.orgId });

  await prisma.$transaction(async (tx) => {
    await tx.importJob.update({
      where: { id: jobId },
      data: {
        status: ImportStatus.running,
        lastError: null,
        processedCount: 0,
        successCount: 0,
        errorCount: 0
      }
    });

    await logAudit({
      orgId: job.orgId,
      action: "import.csv.start",
      targetId: jobId,
      metadata: {
        jobId,
        fileName: job.fileName,
        source: job.source
      },
      client: tx,
    });
  });

  const processedEmails = new Set<string>();
  const createdUserIds = new Set<string>();
  const createdMembershipIds = new Set<string>();
  const createdGroupIds = new Set<string>();
  const createdGroupMemberIds = new Set<string>();
  const errors: CsvImportResults["errors"] = [];

  const results: CsvImportResults = {
    jobId,
    totals: {
      processed: 0,
      succeeded: 0,
      failed: 0
    },
    errors,
    createdIds: {
      users: [],
      memberships: [],
      groups: [],
      groupMembers: []
    }
  };

  let status: ImportStatus = ImportStatus.succeeded;
  let lastError: string | null = null;

  try {
    const rows = parseCsvBuffer(job.fileData);
    jobLogger.info({ event: "csv_import.processing", rowCount: rows.length });

    for (const row of rows) {
      const normalizedEmail = normalizeEmail(row.email);

      if (processedEmails.has(normalizedEmail)) {
        const reason = "Duplicate email in file.";
        errors.push({ row: row.rowNumber, email: normalizedEmail, reason });
        results.totals.processed += 1;
        results.totals.failed += 1;
        await logAudit({
          orgId: job.orgId,
          action: "import.csv.row.error",
          targetId: jobId,
          metadata: {
            jobId,
            rowNumber: row.rowNumber,
            email: normalizedEmail,
            reason
          },
        });
        continue;
      }

      try {
        const result = await processRow(jobId, job.orgId, row);
        processedEmails.add(normalizedEmail);
        results.totals.processed += 1;
        results.totals.succeeded += 1;

        if (result.createdUser) {
          createdUserIds.add(result.userId);
        }
        if (result.createdMembership) {
          createdMembershipIds.add(result.membershipId);
        }
        for (const groupId of result.createdGroupIds) {
          createdGroupIds.add(groupId);
        }
        for (const memberId of result.createdGroupMemberIds) {
          createdGroupMemberIds.add(memberId);
        }
      } catch (error) {
        const message = error instanceof CsvRowError ? error.message : "Unexpected error while processing row.";
        const rowNumber = error instanceof CsvRowError ? error.rowNumber : row.rowNumber;
        const email = error instanceof CsvRowError ? error.email : normalizeEmail(row.email);

        errors.push({ row: rowNumber, email, reason: message });
        results.totals.processed += 1;
        results.totals.failed += 1;

        await logAudit({
          orgId: job.orgId,
          action: "import.csv.row.error",
          targetId: jobId,
          metadata: {
            jobId,
            rowNumber,
            email,
            reason: message,
            error: serializeError(error)
          },
        });

        jobLogger.warn({
          event: "csv_import.row_error",
          rowNumber,
          email,
          error: serializeError(error)
        });
      }
    }
  } catch (error) {
    status = ImportStatus.failed;
    lastError = error instanceof Error ? error.message : "Unknown error";
    errors.push({ row: 0, email: "", reason: lastError });
    results.totals.failed += 1;
    jobLogger.error({
      event: "csv_import.failed",
      error: serializeError(error)
    });
  }

  results.createdIds.users = Array.from(createdUserIds);
  results.createdIds.memberships = Array.from(createdMembershipIds);
  results.createdIds.groups = Array.from(createdGroupIds);
  results.createdIds.groupMembers = Array.from(createdGroupMemberIds);

  const completedAt = new Date();

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status,
      processedCount: results.totals.processed,
      successCount: results.totals.succeeded,
      errorCount: results.totals.failed,
      completedAt,
      lastError,
      fileData: null,
      resultsJson: results as unknown as Prisma.JsonObject
    }
  });

  await logAudit({
    orgId: job.orgId,
    action: "import.csv.complete",
    targetId: jobId,
    metadata: {
      jobId,
      status,
      processedCount: results.totals.processed,
      successCount: results.totals.succeeded,
      errorCount: results.totals.failed,
      lastError
    },
  });

  try {
    const admins = await prisma.orgMembership.findMany({
      where: {
        orgId: job.orgId,
        role: {
          in: [OrgRole.ADMIN, OrgRole.OWNER]
        }
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    const recipients = Array.from(
      new Set(
        admins
          .map((membership) => membership.user?.email?.trim().toLowerCase())
          .filter((email): email is string => Boolean(email))
      )
    );

    if (recipients.length > 0) {
      const baseUrl = resolveAppBaseUrl();
      const resultsUrl = `${baseUrl.replace(/\/$/, "")}/admin/imports/${jobId}/results`;

      await sendImportResultsEmail({
        to: recipients,
        orgName: job.org.name ?? "Your organization",
        resultsUrl,
        status,
        processedCount: results.totals.processed,
        successCount: results.totals.succeeded,
        errorCount: results.totals.failed,
        fileName: job.fileName
      });
    } else {
      jobLogger.warn({
        event: "csv_import.no_admin_recipients",
        message: "Skipping results email; no admin recipients found."
      });
    }
  } catch (error) {
    jobLogger.error({
      event: "csv_import.email_failed",
      error: serializeError(error)
    });
  }

  jobLogger.info({
    event: "csv_import.completed",
    status,
    processedCount: results.totals.processed,
    successCount: results.totals.succeeded,
    errorCount: results.totals.failed
  });

  return results;
}
