import { describe, expect, it } from "vitest";

import { MIN_DRAG_PX } from "@/lib/timeline";

import { track, type Tracked } from "./gesture";

/** A press that landed at 100, having reached nothing and travelled nowhere. */
const pressedAt = (clientX: number): Tracked => ({
  downClientX: clientX,
  current: 0,
  moved: false,
});

describe("track", () => {
  it("commits where the pointer had been, whether or not the gesture is a drag yet", () => {
    const record = pressedAt(100);
    track(record, 101, 0.25);
    expect(record.current).toBe(0.25);
    expect(record.moved).toBe(false);
    track(record, 100, 0.5);
    expect(record.current).toBe(0.5);
  });

  it("tells a click from a drag at the one threshold both surfaces share (0147)", () => {
    const short = pressedAt(100);
    track(short, 100 + MIN_DRAG_PX - 1, 0);
    expect(short.moved).toBe(false);
    const long = pressedAt(100);
    track(long, 100 + MIN_DRAG_PX, 0);
    expect(long.moved).toBe(true);
  });

  it("measures the travel in either direction, from where the press landed", () => {
    const back = pressedAt(100);
    track(back, 100 - MIN_DRAG_PX, 0);
    expect(back.moved).toBe(true);
  });

  it("keeps a gesture a drag once it is one, however far back the pointer comes", () => {
    const record = pressedAt(100);
    track(record, 200, 0.9);
    expect(record.moved).toBe(true);
    // A flick out and back is one gesture and not two: a release at the press point still
    // commits, because what the surface is deciding is whether a hand moved at all.
    track(record, 100, 0.1);
    expect(record.moved).toBe(true);
    expect(record.current).toBe(0.1);
  });
});
