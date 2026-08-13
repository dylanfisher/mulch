import { expect, test } from "vitest";

import { contextClock, manualClock } from "./clock";

test("manualClock moves only when set", () => {
  const clock = manualClock(1);
  expect(clock.now()).toBe(1);
  clock.set(2.5);
  expect(clock.now()).toBe(2.5);
});

test("contextClock reads the context's own time, in seconds, live", () => {
  // A stand-in for the one member of BaseAudioContext this adapter touches: under Node there is
  // no Web Audio at all, and whether real audio time advances is a claim only a browser can
  // settle — ./scripts/drive settles it on every run of the gate.
  const ctx = { currentTime: 0 };
  const clock = contextClock(ctx);
  expect(clock.now()).toBe(0);
  ctx.currentTime = 2.5;
  // Read through, not captured: a clock that snapshotted its context would freeze the queue.
  expect(clock.now()).toBe(2.5);
});
