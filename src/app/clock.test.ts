import { expect, test } from "vitest";

import { contextClock, manualClock } from "./clock";
import { createInstrument } from "./facade";

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

/**
 * The session's own reading of how long it has been performing. The audio clock cannot be
 * rewound — it is the context's `currentTime` and every envelope is stamped against it — so a
 * rewind moves where the run is measured from, which is where the next export's take begins
 * (0315).
 */
test("session.rewind returns the elapsed run to nought without moving the clock", () => {
  const clock = manualClock(0);
  const instrument = createInstrument(clock);
  clock.set(90);
  expect(instrument.probe().at).toBe(90);
  expect(instrument.stats().at).toBe(90);

  // A yard's own stop is not the session ending, so it moves none of this (P66).
  instrument.send({ t: "deck.stop", deck: "a" });
  expect(instrument.probe().at).toBe(90);

  instrument.send({ t: "session.rewind" });
  expect(instrument.probe().at).toBe(0);
  // The audio clock is not rewound and cannot be: it is what every envelope is stamped against,
  // and `stats().at` goes on reading it.
  expect(instrument.stats().at).toBe(90);
  expect(instrument.ring().filter(({ t }) => t === "session.rewound")).toHaveLength(1);

  // And it goes on running from there: what moved is the origin, not the clock.
  clock.set(120);
  expect(instrument.probe().at).toBe(30);
});
