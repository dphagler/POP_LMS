import { randomUUID } from "crypto";

import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { buildAugmentPrompt } from "@/lib/augment/prompt";
import { checkAugmentQuota } from "@/lib/augment/rate-limit";
import { assertSameOrg, getSessionUser } from "@/lib/authz";
import { coerceSegments } from "@/lib/lesson/progress";
import { createRequestLogger, serializeError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const requestSchema = z.object({
  lessonId: z.string().min(1),
  kind: z.enum(["probe", "remediation", "reflection"]).default("probe"),
  message: z.string().optional(),
  transcriptSnippet: z.string().optional()
});

type AugmentRequest = z.infer<typeof requestSchema>;

type ProgressRow = {
  uniqueSeconds: number | null;
  segments: unknown;
};

type RuntimeSnapshotRow = {
  runtimeJson: unknown;
};

const extractObjectives = (snapshot: RuntimeSnapshotRow | null): unknown => {
  if (!snapshot) {
    return undefined;
  }

  const { runtimeJson } = snapshot;
  if (
    !runtimeJson ||
    typeof runtimeJson !== "object" ||
    Array.isArray(runtimeJson)
  ) {
    return undefined;
  }

  const record = runtimeJson as Record<string, unknown>;
  return record.objectives;
};

const createMockResponse = (
  promptUser: string,
  lessonTitle: string
): string => {
  const lines = promptUser.split("\n").map((line) => line.trim());
  const objectiveLine =
    lines.find((line) => line.startsWith("Objectives:")) ?? "";
  const progressLine = lines.find((line) => line.startsWith("Progress:"));
  const cuesLine = lines.find((line) => line.startsWith("Confusion cues:"));

  const objectiveSummary =
    objectiveLine
      .replace(/^Objectives:\s*/, "")
      .split(/[.;]/)[0]
      ?.trim() || "the main objective";
  const focus =
    objectiveSummary.length > 0 ? objectiveSummary : "the main idea";

  const question = `What part of ${focus} feels most clear right now, and how would you explain it in your own words?`;

  let nudge: string;
  if (cuesLine && !cuesLine.includes("none detected")) {
    const cueDetail = cuesLine.replace(/^Confusion cues:\s*/, "");
    nudge = `Since you're feeling ${cueDetail}, try revisiting the key example and note one insight before you answer.`;
  } else {
    nudge = `If anything still feels fuzzy, jot down the step you'd review next after answering.`;
  }

  const opening = `Quick check-in on "${lessonTitle}"${progressLine ? ` — ${progressLine.replace(/^Progress:\s*/, "")}` : ""}.`;

  return `${opening} ${question} ${nudge}`.trim();
};

const generateAssistantMessage = async (
  prompt: { system: string; user: string },
  lessonTitle: string
): Promise<{
  content: string;
  usedMock: boolean;
  details?: Record<string, unknown>;
}> => {
  if (!env.MODEL_API_KEY) {
    return {
      content: createMockResponse(prompt.user, lessonTitle),
      usedMock: true,
      details: { reason: "missing_api_key" }
    };
  }

  try {
    // Placeholder for model integration; replace with actual call when available.
    return {
      content: createMockResponse(prompt.user, lessonTitle),
      usedMock: false
    };
  } catch (error) {
    return {
      content: createMockResponse(prompt.user, lessonTitle),
      usedMock: true,
      details: { reason: "model_call_failed", error: serializeError(error) }
    };
  }
};

export async function POST(request: Request) {
  const { logger, requestId } = createRequestLogger(request, {
    route: "augment.generate"
  });

  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      logger.warn({ event: "augment.unauthorized" });
      return NextResponse.json(
        { error: "Unauthorized", requestId },
        { status: 401 }
      );
    }

    let payload: AugmentRequest;
    try {
      const json = await request.json();
      payload = requestSchema.parse(json);
    } catch (error) {
      logger.warn({
        event: "augment.invalid_payload",
        error: serializeError(error)
      });
      return NextResponse.json(
        { error: "Invalid payload", requestId },
        { status: 400 }
      );
    }

    const { lessonId } = payload;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        durationS: true,
        module: {
          select: {
            course: {
              select: {
                orgId: true
              }
            }
          }
        }
      }
    });

    if (!lesson) {
      logger.warn({ event: "augment.lesson_not_found", lessonId });
      return NextResponse.json(
        { error: "Lesson not found", requestId },
        { status: 404 }
      );
    }

    const lessonOrgId = lesson.module?.course?.orgId ?? null;
    assertSameOrg(lessonOrgId, sessionUser.orgId ?? null);

    const orgId = lessonOrgId ?? sessionUser.orgId;
    if (!orgId) {
      logger.error({
        event: "augment.org_unresolved",
        lessonId,
        userId: sessionUser.id
      });
      return NextResponse.json(
        { error: "Organization not resolved", requestId },
        { status: 403 }
      );
    }

    const quota = await checkAugmentQuota({ userId: sessionUser.id, lessonId });
    if (!quota.ok) {
      logger.info({
        event: "augment.quota_exceeded",
        lessonId,
        userId: sessionUser.id
      });
      return NextResponse.json(
        {
          ok: false,
          error: "quota_exceeded",
          remaining: quota.remaining,
          requestId
        },
        { status: 429 }
      );
    }

    const [progressRow, runtimeSnapshot] = await Promise.all([
      prisma.progress.findUnique({
        where: { userId_lessonId: { userId: sessionUser.id, lessonId } },
        select: {
          uniqueSeconds: true,
          segments: true
        }
      }) as Promise<ProgressRow | null>,
      prisma.lessonRuntimeSnapshot.findFirst({
        where: { lessonId, orgId },
        orderBy: { version: "desc" },
        select: { runtimeJson: true }
      }) as Promise<RuntimeSnapshotRow | null>
    ]);

    const objectives = extractObjectives(runtimeSnapshot);
    const segments = coerceSegments(progressRow?.segments ?? undefined);

    const prompt = buildAugmentPrompt({
      lesson: { title: lesson.title, objectives },
      progress: {
        uniqueSeconds: progressRow?.uniqueSeconds ?? undefined,
        durationS: lesson.durationS,
        segments
      },
      transcriptSnippet: payload.transcriptSnippet?.trim(),
      lastUserMsg: payload.message?.trim()
    });

    const assistant = await generateAssistantMessage(prompt, lesson.title);

    const augmentationId = `adhoc:${randomUUID()}`;

    const result = await prisma.$transaction(async (tx) => {
      const served = await tx.augmentationServed.create({
        data: {
          orgId,
          userId: sessionUser.id,
          lessonId,
          kind: payload.kind,
          augmentationId,
          objectiveId: `${lessonId}:adhoc`,
          assetRef: "adhoc",
          ruleIndex: -1
        },
        select: { id: true }
      });

      await tx.augmentationMessage.create({
        data: {
          orgId,
          userId: sessionUser.id,
          lessonId,
          role: "system",
          content: prompt.system,
          evidence: {
            source: "augment_route",
            kind: payload.kind,
            promptInputs: {
              transcriptSnippet: payload.transcriptSnippet?.trim() ?? null,
              lastUserMsg: payload.message?.trim() ?? null
            }
          }
        }
      });

      const assistantDetails = assistant.details
        ? (assistant.details as Prisma.JsonValue)
        : null;

      const assistantMessage = await tx.augmentationMessage.create({
        data: {
          orgId,
          userId: sessionUser.id,
          lessonId,
          role: "assistant",
          content: assistant.content,
          evidence: {
            source: "augment_route",
            kind: payload.kind,
            usedMock: assistant.usedMock,
            prompt,
            details: assistantDetails
          }
        },
        select: { id: true }
      });

      return { servedId: served.id, assistantMessageId: assistantMessage.id };
    });

    const responsePayload = {
      ok: true,
      content: assistant.content,
      kind: payload.kind,
      servedId: result.servedId,
      requestId,
      ...(assistant.usedMock ? { __mock: true } : {})
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    logger.error({ event: "augment.error", error: serializeError(error) });
    return NextResponse.json(
      { error: "Internal Server Error", requestId },
      { status: 500 }
    );
  }
}
