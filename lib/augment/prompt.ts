export function buildAugmentPrompt({
  lesson,
  transcriptSnippet,
  lastUserMsg,
  progress
}: {
  lesson: { title: string; objectives?: any };
  transcriptSnippet?: string;
  lastUserMsg?: string;
  progress?: { uniqueSeconds?: number; durationS?: number };
}) {
  const sys =
    "You are POP Bot, a concise learning coach. Be supportive, specific, and brief. Ask at most one question.";
  const seen =
    progress?.uniqueSeconds && progress?.durationS
      ? Math.round((progress.uniqueSeconds / progress.durationS) * 100)
      : null;
  const user = [
    `Lesson: ${lesson.title}`,
    seen ? `Viewer progress: ~${seen}%` : null,
    transcriptSnippet ? `Excerpt: ${transcriptSnippet}` : null,
    lastUserMsg ? `Learner says: ${lastUserMsg}` : null,
    "Give one helpful reply with either a probing question or a concrete example tied to the lesson."
  ]
    .filter(Boolean)
    .join("\n");
  return { system: sys, user };
}
