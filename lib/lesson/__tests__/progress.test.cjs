require('ts-node/register');

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  mergeSegments,
  computeUniqueSeconds,
  getCompletionRatio,
} = require('../progress');

const ZERO = 0;

const sanitizeForNaive = (segments, durationSec) => {
  if (!Number.isFinite(durationSec) || durationSec <= ZERO) {
    return [];
  }

  const limit = Math.max(durationSec, ZERO);
  const sanitized = [];

  for (const [a, b] of segments) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      continue;
    }

    const lower = Math.min(a, b);
    const upper = Math.max(a, b);

    const start = Math.min(Math.max(lower, ZERO), limit);
    const end = Math.min(Math.max(upper, ZERO), limit);

    if (end <= start) {
      continue;
    }

    sanitized.push([start, end]);
  }

  return sanitized;
};

const computeNaiveUnique = (segments, durationSec) => {
  const sanitized = sanitizeForNaive(segments, durationSec);
  if (sanitized.length === ZERO) {
    return ZERO;
  }

  const events = new Map();

  for (const [start, end] of sanitized) {
    events.set(start, (events.get(start) ?? ZERO) + 1);
    events.set(end, (events.get(end) ?? ZERO) - 1);
  }

  const points = Array.from(events.keys()).sort((a, b) => a - b);
  let active = ZERO;
  let previous = points[0];
  let total = ZERO;

  for (const point of points) {
    if (active > ZERO) {
      total += point - previous;
    }

    active += events.get(point);
    previous = point;
  }

  return Math.min(durationSec, total);
};

test('mergeSegments merges overlapping and nested segments', () => {
  const input = [
    [10, 20],
    [15, 25],
    [0, 5],
    [3, 7],
  ];

  const result = mergeSegments(input);

  assert.deepStrictEqual(result, [
    [0, 7],
    [10, 25],
  ]);
});

test('computeUniqueSeconds clamps segments to duration bounds', () => {
  const segments = [
    [-5, 5],
    [50, 120],
    [90, 150],
  ];

  const unique = computeUniqueSeconds(segments, 100);
  assert.equal(unique, 55);
});

test('computeUniqueSeconds respects duplicates and out-of-order input', () => {
  const segments = [
    [40, 80],
    [20, 50],
    [80, 100],
    [50, 60],
    [40, 80],
  ];

  const unique = computeUniqueSeconds(segments, 120);
  assert.equal(unique, 80);
});

test('getCompletionRatio returns normalized progress', () => {
  const ratio = getCompletionRatio({ durationSec: 200, uniqueSeconds: 150, thresholdPct: 0.75 });
  assert.equal(ratio, 1);

  const ratio2 = getCompletionRatio({ durationSec: 200, uniqueSeconds: 60, thresholdPct: 0.75 });
  assert.equal(ratio2, 0.4);

  const ratio3 = getCompletionRatio({ durationSec: 0, uniqueSeconds: 10, thresholdPct: 0.9 });
  assert.equal(ratio3, 0);
});

test('property: unique seconds matches naive coverage for random segments', () => {
  const runs = 200;

  for (let i = 0; i < runs; i += 1) {
    const duration = Math.max(1, Math.floor(Math.random() * 300));
    const count = Math.floor(Math.random() * 20) + 1;
    const segments = [];

    for (let index = 0; index < count; index += 1) {
      const start = (Math.random() - 0.5) * duration * 2;
      const length = Math.random() * duration;
      const end = start + length;

      if (Math.random() < 0.3) {
        segments.push([end, start]);
      } else {
        segments.push([start, end]);
      }

      if (Math.random() < 0.2) {
        segments.push(segments[segments.length - 1]);
      }
    }

    const expected = computeNaiveUnique(segments, duration);
    const actual = computeUniqueSeconds(segments, duration);

    assert.ok(Math.abs(actual - expected) < 1e-9);
  }
});

test('property: unique seconds handles partial overlaps and visibility gaps', () => {
  const runs = 120;

  for (let i = 0; i < runs; i += 1) {
    const duration = Math.max(1, Math.floor(Math.random() * 200));
    const base = Math.random() * duration;
    const segments = [];

    for (let index = 0; index < 10; index += 1) {
      const offset = (Math.random() - 0.5) * 40;
      const span = Math.random() * 20;
      const start = base + offset;
      const end = start + span;
      segments.push([start, end]);
    }

    const expected = computeNaiveUnique(segments, duration);
    const actual = computeUniqueSeconds(segments, duration);

    assert.ok(Math.abs(actual - expected) < 1e-9);
  }
});
