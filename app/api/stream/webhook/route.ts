import { createHmac, timingSafeEqual } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { createRequestLogger, serializeError } from "@/lib/logger";
import type { Segment } from "@/lib/lesson/progress";

const SIGNATURE_HEADER = "x-stream-signature";

const rawStreamEventSchema = z.object({
  type: z.enum(["play", "pause", "ended"]),
  streamId: z.string().min(1, "streamId is required"),
  lessonId: z.string().min(1, "lessonId is required"),
  userId: z.string().min(1, "userId is required"),
  position: z.coerce
    .number({ invalid_type_error: "position must be a number" })
    .refine(Number.isFinite, "position must be a finite number")
    .min(0, "position must be non-negative"),
  occurredAt: z.coerce.date().optional(),
  sessionId: z.string().optional(),
  requestId: z.string().optional(),
  raw: z.unknown().optional()
});

const payloadSchema = z.union([
  rawStreamEventSchema,
  z.array(rawStreamEventSchema).min(1, "events array must contain at least one event"),
  z.object({
    events: z.array(rawStreamEventSchema).min(1, "events array must contain at least one event")
  })
]);

type RawStreamEvent = z.infer<typeof rawStreamEventSchema>;

type NormalizedEvent = RawStreamEvent & { segments: Segment[] };

type RecordProgressJob = {
  userId: string;
  lessonId: string;
  segments: Segment[];
  streamId: string;
  eventType: RawStreamEvent["type"];
};

function verifySignature(signatureHeader: string | null, payload: string): boolean {
  const secret = env.STREAM_WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }

  const signature = signatureHeader?.trim();
  if (!signature || !/^[0-9a-f]+$/i.test(signature)) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

function normalizePayload(payload: unknown): NormalizedEvent[] {
  const parsed = payloadSchema.safeParse(payload);

  if (!parsed.success) {
    throw parsed.error;
  }

  const value = parsed.data;

  const rawEvents: RawStreamEvent[] = Array.isArray(value)
    ? value
    : Array.isArray((value as { events?: RawStreamEvent[] }).events)
      ? (value as { events: RawStreamEvent[] }).events
      : [value as RawStreamEvent];

  return rawEvents.map((event) => ({
    ...event,
    segments: translateEventToSegments(event)
  }));
}

function translateEventToSegments(event: RawStreamEvent): Segment[] {
  // TODO: Implement full segment math in Phase 4.
  return [];
}

async function enqueueRecordProgress(job: RecordProgressJob): Promise<void> {
  // TODO: Wire up actual queueing logic in Phase 4.
  void job;
}

export async function POST(request: Request) {
  const { logger, requestId } = createRequestLogger(request, { route: "stream.webhook" });

  try {
    const rawBody = await request.text();

    const signatureHeader = request.headers.get(SIGNATURE_HEADER);
    const isSignatureValid = verifySignature(signatureHeader, rawBody);

    if (!isSignatureValid) {
      logger.warn({
        event: "stream.webhook.invalid_signature",
        requestId,
        signatureHeader
      });
      return NextResponse.json({ error: "Invalid signature", requestId }, { status: 401 });
    }

    let payload: unknown;
    try {
      payload = rawBody.length > 0 ? JSON.parse(rawBody) : {};
    } catch (error) {
      logger.warn({
        event: "stream.webhook.invalid_json",
        requestId,
        error: serializeError(error)
      });
      return NextResponse.json({ error: "Invalid JSON body", requestId }, { status: 400 });
    }

    let events: NormalizedEvent[];
    try {
      events = normalizePayload(payload);
    } catch (error) {
      logger.warn({
        event: "stream.webhook.invalid_payload",
        requestId,
        error: serializeError(error)
      });
      return NextResponse.json({ error: "Invalid payload", requestId }, { status: 400 });
    }

    logger.info({
      event: "stream.webhook.received",
      requestId,
      eventCount: events.length,
      events
    });

    const jobs: RecordProgressJob[] = events
      .filter((event) => event.segments.length > 0)
      .map((event) => ({
        userId: event.userId,
        lessonId: event.lessonId,
        segments: event.segments,
        streamId: event.streamId,
        eventType: event.type
      }));

    if (jobs.length > 0) {
      await Promise.all(jobs.map((job) => enqueueRecordProgress(job)));
      logger.info({
        event: "stream.webhook.enqueued",
        requestId,
        jobCount: jobs.length
      });
    }

    return NextResponse.json({ ok: true, requestId });
  } catch (error) {
    logger.error({
      event: "stream.webhook.error",
      requestId,
      error: serializeError(error)
    });
    return NextResponse.json({ error: "An unexpected error occurred.", requestId }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
