const ZERO = 0;

export type Segment = [number, number];
export type Seg = { s: number; e: number };

const normalizeSeg = (segment: Seg): Seg | null => {
  if (!Number.isFinite(segment.s) || !Number.isFinite(segment.e)) {
    return null;
  }

  const start = Math.min(segment.s, segment.e);
  const end = Math.max(segment.s, segment.e);

  if (end <= start) {
    return null;
  }

  return { s: start, e: end };
};

const mergeNormalizedSegments = (segments: Seg[]): Seg[] => {
  if (segments.length === ZERO) {
    return [];
  }

  const sorted = [...segments].sort((a, b) => {
    if (a.s === b.s) {
      return a.e - b.e;
    }

    return a.s - b.s;
  });

  const merged: Seg[] = [{ ...sorted[0] }];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const last = merged[merged.length - 1];

    if (current.s <= last.e) {
      last.e = Math.max(last.e, current.e);
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
};

const normalizeSegList = (segments: Seg[]): Seg[] => {
  const normalized: Seg[] = [];

  for (const segment of segments) {
    const normalizedSeg = normalizeSeg(segment);

    if (normalizedSeg) {
      normalized.push(normalizedSeg);
    }
  }

  return normalized;
};

const tupleToSeg = (segment: Segment): Seg => ({ s: segment[0], e: segment[1] });
const segToTuple = (segment: Seg): Segment => [segment.s, segment.e];

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

export function mergeSegments(segments: Segment[]): Segment[];
export function mergeSegments(existing: Seg[], incoming: Seg): Seg[];
export function mergeSegments(
  segmentsOrExisting: Segment[] | Seg[],
  maybeIncoming?: Seg,
): Segment[] | Seg[] {
  if (maybeIncoming === undefined) {
    const tupleSegments = segmentsOrExisting as Segment[];
    if (tupleSegments.length === ZERO) {
      return [];
    }

    const normalized = normalizeSegList(tupleSegments.map(tupleToSeg));
    const merged = mergeNormalizedSegments(normalized);

    return merged.map(segToTuple);
  }

  const existingSegments = normalizeSegList(segmentsOrExisting as Seg[]);
  const normalizedIncoming = normalizeSeg(maybeIncoming);

  if (normalizedIncoming) {
    existingSegments.push(normalizedIncoming);
  }

  return mergeNormalizedSegments(existingSegments);
}

export const sumSegments = (segments: Seg[]): number =>
  segments.reduce((total, segment) => total + (segment.e - segment.s), ZERO);

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

