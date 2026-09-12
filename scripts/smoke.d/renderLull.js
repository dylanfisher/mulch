/**
 * @role The lull offline: the entry's whole claim is a claim about the transport, so it is proved
 * where the transport is an audio file — a looped tone rendered through the one chain with a lull
 * that rests it once a second, twice over, and once more with a delay ringing through the rests.
 * A render is a spec (0068): the two takes of one spec are the same file to the byte, the rests
 * are runs of silence the fingerprint can see, and a tail laid over them is not silence (0372).
 */
import { MIN_SILENCE_SECS } from "../../src/lib/fingerprint.ts";
import { fail, report } from "./harness.js";

/** How long the render runs: two rests of a second each, a second of playing before each. */
const LULL_RENDER_SECS = 4;
/** The rest and the gap, fixed at one second each so the rests fall where the assertion looks. */
const LULL_SECS = 1;
/** How far a rest's silence may stand from a whole second: the fingerprint's own window. */
const LULL_NEAR_SECS = 0.1;

export const renderLull = async ({ page }) => {
  const rested = await page.evaluate(
    async ({ secs, rest }) => {
      // One session, one knob apart: at a chance of nothing — this entry's silence — the same rack
      // plays straight through, so what the takes differ by is the rest and not the graph. Every
      // take goes through `buildDeckChain`, which is the one chain the live path uses.
      const render = (chance, delay) =>
        window.mulch.render({
          secs,
          envelopes: [
            { t: "deck.load", deck: "a", source: { gen: "sine", hz: 440 } },
            // Looped, so the source sounds for the whole render rather than stopping at the end of
            // one clip (P127).
            { t: "deck.loop.toggle", deck: "a" },
            { t: "effect.add", deck: "a", id: "lull", effect: "lull" },
            { t: "param.set", deck: "a", instance: "lull", param: "lull.seed", value: 7 },
            { t: "param.set", deck: "a", instance: "lull", param: "lull.chance", value: chance },
            { t: "param.set", deck: "a", instance: "lull", param: "lull.least", value: rest },
            { t: "param.set", deck: "a", instance: "lull", param: "lull.most", value: rest },
            { t: "param.set", deck: "a", instance: "lull", param: "lull.gapLeast", value: rest },
            { t: "param.set", deck: "a", instance: "lull", param: "lull.gapMost", value: rest },
            ...(delay
              ? [
                  { t: "effect.add", deck: "a", id: "dly", effect: "delay" },
                  { t: "param.set", deck: "a", instance: "dly", param: "delay.time", value: 0.25 },
                  {
                    t: "param.set",
                    deck: "a",
                    instance: "dly",
                    param: "delay.feedback",
                    value: 0.8,
                  },
                  { t: "param.set", deck: "a", instance: "dly", param: "delay.mix", value: 1 },
                ]
              : []),
            { t: "deck.play", deck: "a" },
          ],
        });
      const [held, again, ringing, none] = await Promise.all([
        render(1, false),
        render(1, false),
        render(1, true),
        render(0, false),
      ]);
      const print = (result) => ({
        sampleRate: result.fingerprint.sampleRate,
        silence: result.fingerprint.silence,
        rmsDb: result.fingerprint.rmsDb,
        frames: result.fingerprint.frames,
      });
      return {
        held: print(held),
        same: JSON.stringify(held.fingerprint) === JSON.stringify(again.fingerprint),
        ringing: print(ringing),
        none: print(none),
      };
    },
    { secs: LULL_RENDER_SECS, rest: LULL_SECS },
  );

  // A gap the rest left: a run of silence that begins after the first sample — the rest itself,
  // and never the silence a render begins in — said in seconds.
  const gaps = (print) =>
    print.silence
      .filter(([from]) => from > 0)
      .map(([from, to]) => [from / print.sampleRate, to / print.sampleRate]);

  // The control first: at the chance this entry declares as its silence the same rack rests
  // nowhere, so a gap the check below finds is the lull's and not the loop's.
  if (gaps(rested.none).length > 0) {
    fail(`a lull at a chance of nothing left a gap of at least ${MIN_SILENCE_SECS}s`, rested);
  }
  // And the claim: a rest of a second after a second of playing is a second of silence in the
  // file, at the second — scheduled on the source and not timed from the main thread (0372).
  const held = gaps(rested.held);
  const first = held[0];
  if (first === undefined) {
    fail("a lull resting every second left no gap in the file at all", rested);
  }
  if (
    Math.abs(first[0] - LULL_SECS) > LULL_NEAR_SECS ||
    Math.abs(first[1] - 2 * LULL_SECS) > LULL_NEAR_SECS
  ) {
    fail(
      `the first rest fell at ${first[0].toFixed(3)}–${first[1].toFixed(3)}s against ` +
        `${LULL_SECS}–${2 * LULL_SECS}s asked for`,
      rested,
    );
  }
  // Two rests in four seconds: one tick lays both, the second on the release of the first (0372).
  if (held.length < 2) {
    fail(`a lull resting every second left ${held.length} gap(s) in ${LULL_RENDER_SECS}s`, rested);
  }
  // A render is a spec: the same rests twice, to the byte, is what a seed promises (0068).
  if (!rested.same) {
    fail("two renders of one lull did not fingerprint identically", rested);
  }
  // And what a rest leaves: only the source stops, so a delay ringing behind it fills the gap —
  // no silence where the held take had a second of it, and quieter there than where it played.
  if (gaps(rested.ringing).length > 0) {
    fail("a delay ringing through a rest still left silence in it", rested);
  }
  const rmsOver = (print, fromSecs, toSecs) => {
    const window = print.rmsDb.length / (print.frames / print.sampleRate);
    const from = Math.round(fromSecs * window);
    const to = Math.round(toSecs * window);
    const slice = print.rmsDb.slice(from, to);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  };
  const playing = rmsOver(rested.ringing, 0.5, 1);
  const resting = rmsOver(rested.ringing, 1.5, 2);
  if (!(resting < playing)) {
    fail(
      `the rest under a ringing delay was no quieter: ${resting}dB against ${playing}dB playing`,
      rested,
    );
  }
  report(
    `offline a lull rested the yard at ${first[0].toFixed(2)}–${first[1].toFixed(2)}s and ` +
      `${held.length} times in ${LULL_RENDER_SECS}s, rendered the same file twice, and a delay ` +
      `rang through the rest at ${resting.toFixed(1)}dB against ${playing.toFixed(1)}dB playing ` +
      `and left no silence in it; at the chance of nothing the same session left no gap`,
  );
};
