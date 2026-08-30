/**
 * @role The automator offline: that one seed renders the same file twice, that it moves the sound
 * at all, and that a run drawn from a different seed is a different performance (0204).
 */
import { fail, report } from "./harness.js";

/** Long enough for several ticks of the run, and short enough to render twice inside the gate. */
const AUTOMATOR_RENDER_SECS = 6;
/** How far apart two renders may be and still be called the same file: they must be exact. */
const SAME_DB = 0.000_001;
/** How far a run has to move the sound before it counts as having done anything. */
const MOVED_DB = 0.5;

export const renderAutomator = async ({ page }) => {
  const run = async (secs, seed, count) =>
    page.evaluate(
      async ({ secs, seed, count }) => {
        const result = await window.mulch.render({
          secs,
          envelopes: [
            { t: "deck.load", deck: "a", source: { gen: "sine", hz: 440 } },
            { t: "session.sync", sync: 1 },
            { t: "effect.add", deck: "a", id: "auto", effect: "automator" },
            { t: "param.set", deck: "a", instance: "auto", param: "auto.seed", value: seed },
            { t: "param.set", deck: "a", instance: "auto", param: "auto.count", value: count },
            { t: "param.set", deck: "a", instance: "auto", param: "auto.stays", value: 12 },
            { t: "param.set", deck: "a", instance: "auto", param: "auto.fade", value: 0.5 },
            { t: "deck.play", deck: "a" },
          ],
        });
        return {
          windows: result.fingerprint.rmsDb,
          // The run itself is never stored: the durable rack is the automator and nothing else,
          // however many effects it grew while rendering (0203).
          effects: result.probes
            .at(-1)
            .probe.decks.a.effects.map((entry) => entry.effect)
            .join(","),
        };
      },
      { secs, seed, count },
    );

  const [once, twice, other, bare] = await Promise.all([
    run(AUTOMATOR_RENDER_SECS, 7, 3),
    run(AUTOMATOR_RENDER_SECS, 7, 3),
    run(AUTOMATOR_RENDER_SECS, 9, 3),
    run(AUTOMATOR_RENDER_SECS, 7, 0),
  ]);

  // The whole claim the design rests on: the population is drawn from the seed and the tick index,
  // so an export of one session is one performance however the pump happened to fall (0204).
  const apart = once.windows.map((db, at) => Math.abs(db - twice.windows[at]));
  const worst = Math.max(...apart);
  if (worst > SAME_DB) {
    fail(`automator smoke: one seed rendered two different files — worst window ${worst}dB apart`, {
      once: once.windows,
      twice: twice.windows,
    });
  }

  // And it is not stored: the deck holds the automator, never what it grew.
  for (const [what, render] of [
    ["once", once],
    ["other", other],
  ]) {
    if (render.effects !== "automator") {
      fail(`automator smoke: the ${what} render stored what it grew — rack is ${render.effects}`);
    }
  }

  // It has to actually do something, or the two assertions above are true of silence.
  const moved = Math.max(...once.windows.map((db, at) => Math.abs(db - bare.windows[at])));
  if (!(moved > MOVED_DB)) {
    fail(
      `automator smoke: a run of three moved nothing — worst window ${moved}dB from an empty one`,
      {
        grown: once.windows,
        bare: bare.windows,
      },
    );
  }

  // A different draw is a different performance, or the seed is not the seed.
  const drawn = Math.max(...once.windows.map((db, at) => Math.abs(db - other.windows[at])));
  if (!(drawn > SAME_DB)) {
    fail(`automator smoke: two seeds rendered one file — worst window ${drawn}dB apart`);
  }

  report(
    `an automator rendered the same file twice on seed 7 (${once.windows.length} windows, worst ${worst.toExponential(1)}dB apart), moved ${moved.toFixed(1)}dB against a run of none, parted from seed 9 by ${drawn.toFixed(1)}dB, and stored none of what it grew`,
  );
};
