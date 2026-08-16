/** @role The parametric EQ offline: its peak swept onto a tone, and both of its lanes moving it. */
import { fail, report } from "./harness.js";

/** Six fingerprint windows: the EQ's peak away from the tone, swept onto it, then cutting it. */
const EQ_RENDER_SECS = 0.6;
/** How much of the EQ's 18dB the render has to actually deliver, boosting and cutting alike. */
const EQ_BAND_DB = 12;

export const renderEq = async ({ page }) => {
  // P6's offline half: the parametric EQ through the same shared graph, on the same page. One
  // tone, one narrow peak, and two lanes that move independently — the render is its own
  // control, because every window below plays the identical source at the identical deck gain.
  const eqRender = await page.evaluate(async (secs) => {
    const result = await window.mulch.render({
      secs,
      envelopes: [
        { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733, secs } },
        // Quiet enough that an 18dB boost still lands well under the master limiter, so what
        // the windows measure is the EQ and never the bus protecting itself.
        { t: "param.set", deck: "a", param: "deck.gain", value: 0.08 },
        { t: "effect.add", deck: "a", id: "eq1", effect: "eq" },
        { t: "param.set", deck: "a", instance: "eq1", param: "eq.q", value: 8 },
        {
          t: "automation.set",
          deck: "a",
          instance: "eq1",
          param: "eq.frequency",
          points: [
            { at: 0, value: 200 },
            { at: 0.15, value: 200 },
            { at: 0.23, value: 733 },
            { at: secs - 0.05, value: 733 },
          ],
        },
        {
          t: "automation.set",
          deck: "a",
          instance: "eq1",
          param: "eq.gain",
          points: [
            { at: 0, value: 18 },
            { at: 0.35, value: 18 },
            { at: 0.4, value: -18 },
            { at: secs - 0.05, value: -18 },
          ],
        },
        { t: "deck.play", deck: "a" },
      ],
    });
    const deck = result.probes.at(-1).probe.decks.a;
    return {
      effects: deck.effects.map((entry) => entry.effect).join(","),
      lanes: Object.keys(deck.effects[0].automation).sort().join(","),
      // 0.1s windows. [1]: a full 18dB of boost parked at 200Hz, which a 733Hz tone must not
      // hear — the frequency-selectivity control, and the first window clear of the transport's
      // lookahead silence. [3]: the same boost after the lane swept the peak onto the tone.
      // [5]: the peak still on the tone, with the gain lane now cutting instead.
      windows: result.fingerprint.rmsDb,
      awayDb: result.fingerprint.rmsDb[1],
      boostedDb: result.fingerprint.rmsDb[3],
      cutDb: result.fingerprint.rmsDb[5],
    };
  }, EQ_RENDER_SECS);

  // P6: the parametric EQ is one registry plugin, so what needs proving in a browser is its sound —
  // that its peak is where its frequency says, and that both of its lanes move it independently.
  if (eqRender.effects !== "eq" || eqRender.lanes !== "eq.frequency,eq.gain") {
    fail(`the EQ render did not arrange the rack it asked for — ${JSON.stringify(eqRender)}`);
  }
  if (Math.abs(eqRender.awayDb - eqRender.boostedDb) < EQ_BAND_DB) {
    fail(
      `18dB of EQ parked at 200Hz was not selective against a 733Hz tone: ${eqRender.awayDb}dB ` +
        `away, ${eqRender.boostedDb}dB with the peak swept onto the tone`,
      eqRender,
    );
  }
  if (eqRender.boostedDb - eqRender.cutDb < EQ_BAND_DB) {
    fail(
      `the EQ gain lane did not cut what it had boosted: ${eqRender.boostedDb}dB boosted, ` +
        `${eqRender.cutDb}dB cut`,
      eqRender,
    );
  }
  report(
    `the EQ's peak swept onto a 733Hz tone offline: ` +
      `${(eqRender.boostedDb - eqRender.awayDb).toFixed(1)}dB once its ` +
      `frequency lane arrived, ` +
      `${(eqRender.boostedDb - eqRender.cutDb).toFixed(1)}dB back when its ` +
      "gain lane cut",
  );
};
