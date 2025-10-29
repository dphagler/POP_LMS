const ZERO = 0;

export type Segment = [number, number];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const sanitizeSegments = (
  segments: Array<Segment>,
  durationSec: number,
): Segment[] => {
  if (!Number.isFinite(durationSec) || durationSec <= ZERO) {
    return [];
  }

  const limit = Math.max(durationSec, ZERO);
  const sanitized: Segment[] = [];

  for (const [rawA, rawB] of segments) {
    if (!Number.isFinite(rawA) || !Number.isFinite(rawB)) {
      continue;
    }

    const lower = Math.min(rawA, rawB);
    const upper = Math.max(rawA, rawB);

    const start = clamp(lower, ZERO, limit);
    const end = clamp(upper, ZERO, limit);

    if (end <= start) {
      continue;
    }

    sanitized.push([start, end]);
  }

  return sanitized;
};

export const coerceSegments = (value: unknown): Segment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const segments: Segment[] = [];

  for (const entry of value) {
    if (Array.isArray(entry)) {
      const [start, end] = entry;
      if (isFiniteNumber(start) && isFiniteNumber(end)) {
        segments.push([start, end]);
      }
      continue;
    }

    if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const start = record.start ?? record.s ?? record["0"];
      const end = record.end ?? record.e ?? record["1"];

      if (isFiniteNumber(start) && isFiniteNumber(end)) {
        segments.push([start, end]);
      }
    }
  }

  return segments;
};

export const mergeSegments = (segments: Segment[]): Segment[] => {
  if (segments.length === ZERO) {
    return [];
  }

  const sorted = [...segments].sort((a, b) => {
    if (a[0] === b[0]) {
      return a[1] - b[1];
    }

    return a[0] - b[0];
  });

  const merged: Segment[] = [];
  let [currentStart, currentEnd] = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const [nextStart, nextEnd] = sorted[index];

    if (nextStart <= currentEnd) {
      currentEnd = Math.max(currentEnd, nextEnd);
      continue;
    }

    merged.push([currentStart, currentEnd]);
    currentStart = nextStart;
    currentEnd = nextEnd;
  }

  merged.push([currentStart, currentEnd]);

  return merged;
};

export const computeUniqueSeconds = (
  segments: Segment[],
  durationSec: number,
): number => {
  if (!Number.isFinite(durationSec) || durationSec <= ZERO) {
    return ZERO;
  }

  const sanitized = sanitizeSegments(segments, durationSec);
  if (sanitized.length === ZERO) {
    return ZERO;
  }

  const merged = mergeSegments(sanitized);

  const total = merged.reduce((sum, [start, end]) => sum + (end - start), ZERO);

  return Math.min(durationSec, total);
};

export type CompletionRatioInput = {
  durationSec: number;
  uniqueSeconds: number;
  thresholdPct: number;
};

export const getCompletionRatio = ({
  durationSec,
  uniqueSeconds,
  thresholdPct,
}: CompletionRatioInput): number => {
  if (!Number.isFinite(durationSec) || durationSec <= ZERO) {
    return ZERO;
  }

  const safeDuration = Math.max(durationSec, ZERO);
  const requiredPct = Number.isFinite(thresholdPct) ? thresholdPct : ZERO;
  const requiredSeconds = safeDuration * Math.max(requiredPct, ZERO);

  if (requiredSeconds <= ZERO) {
    return ZERO;
  }

  const watched = Math.max(ZERO, Math.min(uniqueSeconds, safeDuration));
  return Math.max(ZERO, Math.min(1, watched / requiredSeconds));
};

