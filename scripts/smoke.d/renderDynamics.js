/**
 * @role The compressor and the reverb offline: the same session rendered three times, so each
 * effect's own fingerprint is compared against the control that differs from it by that effect
 * alone (P60).
 */
import { compareFingerprints } from "../../src/lib/fingerprint.ts";
import { fail, report } from "./harness.js";

/** Long enough that the source stops well before the render does, leaving a reverb tail to hear. */
const DYNAMICS_RENDER_SECS = 0.8;
/** How much of the tone a compressor 55dB under it at 20:1 has to actually hold down. */
const COMPRESSION_DB = 6;
/** How far above the silence floor a wet tail has to stand to be a tail. */
const TAIL_DB = 40;

export const renderDynamics = async ({ page }) => {
  // One control and two sessions differing from it by one `effect.add` and its knobs. Every
  // window below plays the identical source at the identical deck gain, so the render is its own
  // control and the fingerprint's own comparison is the assertion.
  const renders = await page.evaluate(async (secs) => {
    const session = (envelopes) => ({
      secs,
      envelopes: [
        // The tone ends at 0.3s, so the second half of the render is the tail of whatever the
        // rack is doing rather than the source.
        { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733, secs: 0.3 } },
        { t: "param.set", deck: "a", param: "deck.gain", value: 0.5 },
        ...envelopes,
        { t: "deck.play", deck: "a" },
      ],
    });
    const control = await window.mulch.render(session([]));
    const compressed = await window.mulch.render(
      session([
        { t: "effect.add", deck: "a", id: "cmp", effect: "compressor" },
        { t: "param.set", deck: "a", instance: "cmp", param: "comp.threshold", value: -55 },
        { t: "param.set", deck: "a", instance: "cmp", param: "comp.ratio", value: 20 },
        { t: "param.set", deck: "a", instance: "cmp", param: "comp.knee", value: 0 },
        { t: "param.set", deck: "a", instance: "cmp", param: "comp.attack", value: 0.001 },
      ]),
    );
    const reverberated = await window.mulch.render(
      session([
        { t: "effect.add", deck: "a", id: "rev", effect: "reverb" },
        { t: "param.set", deck: "a", instance: "rev", param: "reverb.wet", value: 1 },
        { t: "param.set", deck: "a", instance: "rev", param: "reverb.decay", value: 2 },
        { t: "param.set", deck: "a", instance: "rev", param: "reverb.tone", value: 12000 },
        { t: "param.set", deck: "a", instance: "rev", param: "reverb.predelay", value: 0 },
      ]),
    );
    return {
      control: control.fingerprint,
      compressed: compressed.fingerprint,
      reverberated: reverberated.fingerprint,
      effects: {
        compressed: compressed.probes.at(-1).probe.decks.a.effects.map((one) => one.effect),
        reverberated: reverberated.probes.at(-1).probe.decks.a.effects.map((one) => one.effect),
      },
      // 0.1s windows. [1] is inside the tone; [6] is well after it stopped, where the control is
      // silence and a wet reverb is its tail.
      toneDb: {
        control: control.fingerprint.rmsDb[1],
        compressed: compressed.fingerprint.rmsDb[1],
      },
      tailDb: {
        control: control.fingerprint.rmsDb[6],
        reverberated: reverberated.fingerprint.rmsDb[6],
      },
    };
  }, DYNAMICS_RENDER_SECS);

  if (
    renders.effects.compressed.join(",") !== "compressor" ||
    renders.effects.reverberated.join(",") !== "reverb"
  ) {
    fail(
      `the dynamics renders did not arrange the racks they asked for — ${JSON.stringify(renders.effects)}`,
    );
  }

  // The step's own proof: adding each effect moves the fingerprint, judged by the one comparison
  // the whole project compares renders with rather than by a threshold invented here.
  for (const [name, fingerprint] of [
    ["compressor", renders.compressed],
    ["reverb", renders.reverberated],
  ]) {
    const moved = compareFingerprints(renders.control, fingerprint);
    if (moved.length === 0) {
      fail(`adding the ${name} did not move the offline fingerprint at all`, renders);
    }
  }

  if (renders.toneDb.control - renders.toneDb.compressed < COMPRESSION_DB) {
    fail(
      `a compressor 55dB under the tone at 20:1 did not hold it down: ` +
        `${renders.toneDb.control}dB dry, ${renders.toneDb.compressed}dB compressed`,
      renders,
    );
  }
  if (renders.tailDb.reverberated - renders.tailDb.control < TAIL_DB) {
    fail(
      `a fully wet reverb left no tail after the source stopped: ${renders.tailDb.control}dB ` +
        `dry, ${renders.tailDb.reverberated}dB wet`,
      renders,
    );
  }
  report(
    `both new effects moved the offline render: the compressor held the tone down ` +
      `${(renders.toneDb.control - renders.toneDb.compressed).toFixed(1)}dB, and the reverb ` +
      `left a tail ${(renders.tailDb.reverberated - renders.tailDb.control).toFixed(1)}dB above ` +
      "the silence the same session renders without it",
  );
};
