/** @role Pure tests for gap detection and the fixed window a live feed selects from the ring. */
import { expect, test } from "vitest";

import type { Event } from "@/app/events";
import { eventDetail, withGaps } from "./eventFeed";

const event = (seq: number): Event => ({ seq, at: seq, wall: seq, t: "error", detail: "x" });

test("a gapless stream renders no breaks", () => {
  expect(withGaps([event(0), event(1), event(2)])).toEqual([event(0), event(1), event(2)]);
});

test("a hole in seq renders as a break, never silently", () => {
  expect(withGaps([event(0), event(3)])).toEqual([event(0), { gap: 2, beforeSeq: 3 }, event(3)]);
});

test("events fallen off the ring's head render as a break too", () => {
  expect(withGaps([event(2), event(3)])).toEqual([{ gap: 2, beforeSeq: 2 }, event(2), event(3)]);
});

test("a window holds the newest rows, oldest first", () => {
  const events = [event(0), event(1), event(2), event(3)];
  expect(withGaps(events, 2)).toEqual([event(2), event(3)]);
  expect(withGaps(events, 1)).toEqual([event(3)]);
});

test("a window smaller than the stream never grows with it", () => {
  const events = Array.from({ length: 4096 }, (_, seq) => event(seq));
  expect(withGaps(events, 8)).toHaveLength(8);
  expect(withGaps(events, 8).at(0)).toEqual(event(4088));
});

test("a window wider than the stream is the whole stream", () => {
  expect(withGaps([event(0), event(1)], 99)).toEqual(withGaps([event(0), event(1)]));
});

test("a break inside the window costs a row, like any other", () => {
  expect(withGaps([event(0), event(5)], 2)).toEqual([{ gap: 4, beforeSeq: 5 }, event(5)]);
  expect(withGaps([event(0), event(5)], 3)).toEqual([event(0), { gap: 4, beforeSeq: 5 }, event(5)]);
});

test("a break above the window is not shown as one below it", () => {
  expect(withGaps([event(0), event(5), event(6)], 2)).toEqual([event(5), event(6)]);
});

test("an empty window is a refusal, not an empty feed", () => {
  expect(() => withGaps([event(0)], 0)).toThrow(/at least one row/u);
});

test("detail carries the event's own fields and none of its stamps", () => {
  expect(eventDetail(event(7))).toBe(JSON.stringify({ detail: "x" }));
});
