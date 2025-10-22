import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { loadOrgAnalyticsSnapshot } from "@/lib/admin-analytics";
import { capturePosthogEvent } from "@/lib/posthog";

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value ?? "");
  if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export async function GET() {
  const session = await requireRole("ADMIN");
  const { id: userId, orgId } = session.user;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  const snapshot = await loadOrgAnalyticsSnapshot(orgId);

  await capturePosthogEvent({
    event: "admin.analytics_snapshot_exported",
    distinctId: userId,
    properties: {
      orgId,
      assignmentCount: snapshot.assignmentCount,
      rowCount: snapshot.assignments.length
    }
  });

  const header = [
    "assignment_id",
    "target_type",
    "course_title",
    "module_title",
    "enrollment_count",
    "lesson_count",
    "total_lesson_targets",
    "completed_lesson_targets",
    "completion_rate"
  ];

  const rows = snapshot.assignments.map((assignment) => [
    assignment.assignmentId,
    assignment.targetType.toLowerCase(),
    assignment.courseTitle,
    assignment.moduleTitle ?? "",
    assignment.enrollmentCount,
    assignment.lessonCount,
    assignment.totalLessonTargets,
    assignment.completedLessonTargets,
    assignment.completionRate
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=analytics-snapshot.csv"
    }
  });
}
