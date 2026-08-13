import { expect, test } from "vitest";

import type { Event } from "@/app/events";
import { withGaps } from "./LogPage";

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
