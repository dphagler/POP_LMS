import { NextResponse } from "next/server";
import type { ImportStatus } from "@prisma/client";

import { requireRole } from "@/lib/authz";
import type { CsvImportResults } from "@/lib/imports";
import { createRequestLogger, serializeError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

function formatStatus(status: ImportStatus) {
  return status;
}

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const { logger, requestId } = createRequestLogger(request, { route: "admin.import_results" });
  const jobId = params?.jobId;

  if (!jobId) {
    return NextResponse.json({ error: "Import job ID is required.", requestId }, { status: 400 });
  }

  try {
    const session = await requireRole("ADMIN");
    const orgId = session.user.orgId;

    if (!orgId) {
      logger.warn({
        event: "admin.import_results.missing_org",
        requestId,
        jobId
      });
      return NextResponse.json({ error: "Organization required.", requestId }, { status: 403 });
    }

    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        orgId: true,
        source: true,
        status: true,
        fileName: true,
        processedCount: true,
        successCount: true,
        errorCount: true,
        createdAt: true,
        completedAt: true,
        lastError: true,
        resultsJson: true
      }
    });

    if (!job || job.orgId !== orgId) {
      logger.warn({
        event: "admin.import_results.not_found",
        jobId,
        orgId,
        requestId
      });
      return NextResponse.json({ error: "Import job not found.", requestId }, { status: 404 });
    }

    const results = (job.resultsJson ?? null) as CsvImportResults | null;

    logger.info({
      event: "admin.import_results.success",
      jobId,
      orgId,
      status: job.status,
      requestId
    });

    return NextResponse.json({
      requestId,
      job: {
        id: job.id,
        orgId: job.orgId,
        source: job.source,
        status: formatStatus(job.status),
        fileName: job.fileName,
        counts: {
          processed: job.processedCount,
          succeeded: job.successCount,
          failed: job.errorCount
        },
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        lastError: job.lastError,
        results
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      logger.warn({
        event: "admin.import_results.forbidden",
        jobId,
        requestId
      });
      return NextResponse.json({ error: "Forbidden", requestId }, { status: 403 });
    }

    logger.error({
      event: "admin.import_results.error",
      jobId,
      requestId,
      error: serializeError(error)
    });
    return NextResponse.json({ error: "Unable to load import results.", requestId }, { status: 500 });
  }
}
