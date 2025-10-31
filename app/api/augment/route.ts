import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildAugmentPrompt } from "@/lib/augment/prompt";
import { checkAugmentQuota } from "@/lib/augment/rate-limit";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  try {
    if (env.AUGMENT_ENABLE === "false")
      return NextResponse.json(
        { ok: false, error: "disabled" },
        { status: 404 }
      );

    const session = await auth();
    if (!session?.user?.id || !session.user.orgId)
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );

    const {
      lessonId,
      kind = "probe",
      message = "",
      transcriptSnippet
    } = await req.json();
    if (!lessonId)
      return NextResponse.json(
        { ok: false, error: "lessonId required" },
        { status: 400 }
      );

    const orgId = session.user.orgId as string;
    const userId = session.user.id as string;

    const quota = await checkAugmentQuota(
      orgId,
      userId,
      lessonId,
      Number(env.AUGMENT_MAX_PER_HOUR)
    );
    if (!quota.ok)
      return NextResponse.json(
        { ok: false, error: "rate_limited", remaining: quota.remaining },
        { status: 429 }
      );

    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson)
      return NextResponse.json(
        { ok: false, error: "lesson not found" },
        { status: 404 }
      );

    const progress = await prisma.progress.findFirst({
      where: { orgId, userId, lessonId }
    });
    const { system, user } = buildAugmentPrompt({
      lesson: { title: lesson.title },
      transcriptSnippet,
      lastUserMsg: message,
      progress: {
        uniqueSeconds: progress?.uniqueSeconds ?? undefined,
        durationS: lesson.durationS ?? undefined
      }
    });
    const augmentationId = `adhoc:${randomUUID()}`;

    if (!process.env.MODEL_API_KEY) {
      const mock =
        "Nice work pushing through this lesson. What’s one sentence you could use tomorrow to show active listening?";
      await prisma.augmentationMessage.createMany({
        data: [
          { orgId, userId, lessonId, role: "system", content: system },
          {
            orgId,
            userId,
            lessonId,
            role: "user",
            content: message || "(no message)"
          },
          { orgId, userId, lessonId, role: "assistant", content: mock }
        ]
      });
      await prisma.augmentationServed.create({
        data: {
          orgId,
          userId,
          lessonId,
          kind,
          augmentationId,
          objectiveId: `${lessonId}:adhoc`,
          assetRef: "adhoc",
          ruleIndex: -1
        }
      });
      return NextResponse.json({ ok: true, content: mock, kind, __mock: true });
    }

    const content = await fetch("https://example-model-endpoint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MODEL_API_KEY}`
      },
      body: JSON.stringify({ system, user })
    })
      .then((r) => r.json())
      .then(
        (j) =>
          j.output || "Thanks for learning! What’s one way you’ll apply this?"
      );

    await prisma.augmentationMessage.createMany({
      data: [
        { orgId, userId, lessonId, role: "system", content: system },
        {
          orgId,
          userId,
          lessonId,
          role: "user",
          content: message || "(no message)"
        },
        { orgId, userId, lessonId, role: "assistant", content }
      ]
    });
    await prisma.augmentationServed.create({
      data: {
        orgId,
        userId,
        lessonId,
        kind,
        augmentationId,
        objectiveId: `${lessonId}:adhoc`,
        assetRef: "adhoc",
        ruleIndex: -1
      }
    });

    return NextResponse.json({ ok: true, content, kind });
  } catch (e) {
    console.error("[augment] error", e);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
