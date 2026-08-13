import { expect, test } from "vitest";

import { manualClock, realTimeClock } from "./clock";

test("manualClock moves only when set", () => {
  const clock = manualClock(1);
  expect(clock.now()).toBe(1);
  clock.set(2.5);
  expect(clock.now()).toBe(2.5);
});

test("realTimeClock advances on its own, in seconds", async () => {
  const clock = realTimeClock();
  const t0 = clock.now();
  await new Promise((resolve) => {
    setTimeout(resolve, 25);
  });
  const elapsed = clock.now() - t0;
  expect(elapsed).toBeGreaterThan(0.015);
  // The unit is the claim: in milliseconds this would read ~25, not ~0.025.
  expect(elapsed).toBeLessThan(5);
});
