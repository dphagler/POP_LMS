import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyStreamSignature } from "@/lib/cloudflare/signature";
import { env } from "@/lib/env";
import { createRequestLogger, serializeError } from "@/lib/logger";
import { mergeSegments } from "@/lib/lesson/progress";

const eventSchema = z.object({
  type: z.enum(["play", "paused", "ended"]),
  streamId: z.string().min(1),
  lessonId: z.string().min(1),
  userId: z.string().min(1),
  at: z.coerce.number().refine(Number.isFinite, "at must be a finite number"),
});

const payloadSchema = z.union([
  eventSchema,
  z.array(eventSchema).min(1),
  z.object({ events: z.array(eventSchema).min(1) }),
]);

type StreamEvent = z.infer<typeof eventSchema>;

type ParsedPayload = z.infer<typeof payloadSchema>;

function extractEvents(value: ParsedPayload): StreamEvent[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray((value as { events?: StreamEvent[] }).events)) {
    return (value as { events: StreamEvent[] }).events;
  }

  return [value as StreamEvent];
}

function normalizeSecond(at: number): number {
  if (!Number.isFinite(at)) {
    return 0;
  }

  return Math.max(0, Math.floor(at));
}

export async function POST(request: Request) {
  const { logger, requestId } = createRequestLogger(request, { route: "stream.webhook" });

  const streamEnabled = env.streamEnabled;
  const webhookSecret = env.STREAM_WEBHOOK_SECRET;

  if (!streamEnabled || !webhookSecret) {
    logger.debug({
      event: "stream.webhook.disabled",
      requestId,
    });
    return NextResponse.json({ ok: true, disabled: true });
  }

  try {
    const rawBody = await request.text();

    const signatureHeader =
      request.headers.get("x-webhook-signature") ?? request.headers.get("x-signature");

    const signatureValid = verifyStreamSignature({
      payload: rawBody,
      signature: signatureHeader,
      secret: webhookSecret,
    });

    if (!signatureValid) {
      logger.warn({
        event: "stream.webhook.invalid_signature",
        requestId,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let parsedBody: unknown;

    try {
      parsedBody = rawBody.length > 0 ? JSON.parse(rawBody) : {};
    } catch (error) {
      logger.warn({
        event: "stream.webhook.invalid_json",
        requestId,
        error: serializeError(error),
      });
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = payloadSchema.safeParse(parsedBody);

    if (!parsed.success) {
      logger.warn({
        event: "stream.webhook.invalid_payload",
        requestId,
        issues: parsed.error.issues,
      });
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const events = extractEvents(parsed.data);

    for (const event of events) {
      const second = normalizeSecond(event.at);
      void mergeSegments([[second, second + 1]]);
    }

    logger.info({
      event: "stream.webhook.accepted",
      requestId,
      count: events.length,
    });

    return NextResponse.json({ ok: true, received: events.length });
  } catch (error) {
    logger.error({
      event: "stream.webhook.error",
      requestId,
      error: serializeError(error),
    });

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
