import { describe, expect, it } from "vitest";

import { mergeSegments, sumSegments, type Seg } from "../lib/lesson/progress";

describe("mergeSegments", () => {
  it("merges disjoint segments while preserving order", () => {
    const initial: Seg[] = [];
    const first = mergeSegments(initial, { s: 10, e: 20 });

    expect(first).toEqual([{ s: 10, e: 20 }]);

    const second = mergeSegments(first, { s: 0, e: 5 });

    expect(second).toEqual([
      { s: 0, e: 5 },
      { s: 10, e: 20 },
    ]);

    const third = mergeSegments(second, { s: 30, e: 40 });

    expect(third).toEqual([
      { s: 0, e: 5 },
      { s: 10, e: 20 },
      { s: 30, e: 40 },
    ]);
  });

  it("coalesces overlaps and touching edges", () => {
    const existing: Seg[] = [
      { s: 10, e: 15 },
      { s: 0, e: 5 },
    ];

    const merged = mergeSegments(existing, { s: 5, e: 10 });

    expect(merged).toEqual([{ s: 0, e: 15 }]);

    const expanded = mergeSegments(merged, { s: 15, e: 25 });

    expect(expanded).toEqual([{ s: 0, e: 25 }]);
  });

  it("normalizes out-of-order and overlapping inserts", () => {
    const existing: Seg[] = [
      { s: 30, e: 10 },
      { s: 80, e: 60 },
    ];

    const merged = mergeSegments(existing, { s: 45, e: 75 });

    expect(merged).toEqual([
      { s: 10, e: 30 },
      { s: 45, e: 80 },
    ]);

    const combined = mergeSegments(merged, { s: 25, e: 55 });

    expect(combined).toEqual([
      { s: 10, e: 80 },
    ]);
  });

  it("is idempotent when merging the same segment twice", () => {
    const first = mergeSegments([], { s: 5, e: 25 });
    const second = mergeSegments(first, { s: 5, e: 25 });

    expect(second).toEqual([{ s: 5, e: 25 }]);
    expect(mergeSegments(second, { s: 5, e: 25 })).toEqual(second);
  });
});

describe("sumSegments", () => {
  it("computes total coverage after merging", () => {
    const merged = mergeSegments([], { s: 0, e: 10 });
    const next = mergeSegments(merged, { s: 8, e: 20 });
    const final = mergeSegments(next, { s: 30, e: 40 });

    expect(final).toEqual([
      { s: 0, e: 20 },
      { s: 30, e: 40 },
    ]);
    expect(sumSegments(final)).toBe(30);
  });
});
