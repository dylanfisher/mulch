/**
 * @role Pure tests for gap detection, the fixed window a live feed selects from the ring, and
 *   the JSONL the ring leaves as.
 */
import { expect, test } from "vitest";

import type { Event } from "@/app/events";
import { EVENT_LOG_FILE, eventDetail, eventLogFile, eventLogJsonl, withGaps } from "./eventFeed";

const event = (seq: number): Event => ({ seq, at: seq, wall: seq, t: "error", detail: "x" });

test("a gapless stream renders newest first", () => {
  expect(withGaps([event(0), event(1), event(2)])).toEqual([event(2), event(1), event(0)]);
});

test("a hole in seq renders as a break, never silently", () => {
  expect(withGaps([event(0), event(3)])).toEqual([event(3), { gap: 2, beforeSeq: 3 }, event(0)]);
});

test("events fallen off the ring's head render as a break too", () => {
  expect(withGaps([event(2), event(3)])).toEqual([event(3), event(2), { gap: 2, beforeSeq: 2 }]);
});

test("a window holds the newest rows, newest first", () => {
  const events = [event(0), event(1), event(2), event(3)];
  expect(withGaps(events, 2)).toEqual([event(3), event(2)]);
  expect(withGaps(events, 1)).toEqual([event(3)]);
});

test("a window smaller than the stream never grows with it", () => {
  const events = Array.from({ length: 4096 }, (_, seq) => event(seq));
  expect(withGaps(events, 8)).toHaveLength(8);
  expect(withGaps(events, 8).at(0)).toEqual(event(4095));
  expect(withGaps(events, 8).at(-1)).toEqual(event(4088));
});

test("a window wider than the stream is the whole stream", () => {
  expect(withGaps([event(0), event(1)], 99)).toEqual(withGaps([event(0), event(1)]));
});

test("a break inside the window costs a row, like any other", () => {
  expect(withGaps([event(0), event(5)], 2)).toEqual([event(5), { gap: 4, beforeSeq: 5 }]);
  expect(withGaps([event(0), event(5)], 3)).toEqual([event(5), { gap: 4, beforeSeq: 5 }, event(0)]);
});

test("a break older than the window is not shown inside it", () => {
  expect(withGaps([event(0), event(5), event(6)], 2)).toEqual([event(6), event(5)]);
});

/** The break belongs to the event whose seq jumped, on the older side of it. */
test("a break sits under the event it is missing from", () => {
  expect(withGaps([event(0), event(1), event(4), event(5)])).toEqual([
    event(5),
    event(4),
    { gap: 2, beforeSeq: 4 },
    event(1),
    event(0),
  ]);
});

test("an empty window is a refusal, not an empty feed", () => {
  expect(() => withGaps([event(0)], 0)).toThrow(/at least one row/u);
});

test("detail carries the event's own fields and none of its stamps", () => {
  expect(eventDetail(event(7))).toBe(JSON.stringify({ detail: "x" }));
});

/** P30: the export writes one line per ring event, oldest first, and nothing else. */
test("the log writes one line per ring event", () => {
  const events = [event(0), event(1), event(2)];
  const lines = eventLogJsonl(events).split("\n");
  // Three records and the terminator of the third: no header, no summary, no blank row.
  expect(lines).toHaveLength(events.length + 1);
  expect(lines.at(-1)).toBe("");
  expect(lines.slice(0, -1)).toEqual(events.map((one) => JSON.stringify(one)));
});

/** Every stamp survives: the file is the log, not the feed's columns. */
test("a line is the whole event, stamps included", () => {
  expect(eventLogJsonl([event(4)]).trimEnd()).toBe(JSON.stringify(event(4)));
});

/** A drop is the first line's seq, not a row that is not an event (0060). */
test("what fell off the ring is the first line's seq, not a break row", () => {
  const lines = eventLogJsonl([event(9), event(10)])
    .trimEnd()
    .split("\n");
  expect(lines).toHaveLength(2);
  expect(lines[0]).toBe(JSON.stringify(event(9)));
});

/** An empty ring is an empty file: a trailing newline terminates a record, and there is none. */
test("an empty ring writes no lines at all", () => {
  expect(eventLogJsonl([])).toBe("");
});

test("the file carries the log's one name and media type", async () => {
  const file = eventLogFile([event(0)]);
  expect(file.name).toBe(EVENT_LOG_FILE.name);
  expect(file.name.endsWith(EVENT_LOG_FILE.extension)).toBe(true);
  expect(file.type).toBe(EVENT_LOG_FILE.mediaType);
  expect(await file.text()).toBe(eventLogJsonl([event(0)]));
});
