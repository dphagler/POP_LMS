import { prisma } from "@/lib/prisma";

function parseId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.split("/")[1] || null;
    if (u.searchParams.has("v")) return u.searchParams.get("v");
    return null;
  } catch {
    return null;
  }
}

async function main() {
  // pick the first lesson missing provider/videoUrl
  const lesson = await prisma.lesson.findFirst({ where: { provider: null } });
  if (!lesson) {
    console.log("No lesson to backfill");
    return;
  }

  const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // replace with your test video
  const id = parseId(url);
  if (!id) throw new Error("Bad YouTube URL");

  await prisma.lesson.update({
    where: { id: lesson.id },
    data: {
      provider: "youtube",
      videoUrl: url,
      // keep streamId null for pure YouTube
      posterUrl: null,
      // keep existing durationS or set a small test value
      durationS: lesson.durationS > 0 ? lesson.durationS : 90,
    },
  });
  console.log("Backfilled as YouTube:", lesson.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
