/**
 * @role The compressor, the reverb, the pop stage and the scatter offline: the same session
 * rendered seven times, so each effect's own fingerprint is compared against the control that
 * differs from it by that effect alone — and the pop and the scatter twice each, because an entry
 * that declares a silence has to be proved transparent at it as well as audible off it
 * (P60, P142, P157).
 */
import { compareFingerprints } from "../../src/lib/fingerprint.ts";
import { GEN_SECS } from "../../src/lib/waveform.ts";
import { fail, report } from "./harness.js";

/** Long enough that the source stops well before the render does, leaving a reverb tail to hear. */
const DYNAMICS_RENDER_SECS = 0.8;
/** How much of the tone a compressor 55dB under it at 20:1 has to actually hold down. */
const COMPRESSION_DB = 6;
/** How far above the silence floor a wet tail has to stand to be a tail. */
const TAIL_DB = 40;
/**
 * How long the tone the rack is fed sounds for. A load carries no length any more (P127), so the
 * pass starts this far from the end of the one length a drawn source has — the source stopping
 * partway through the render is what leaves a tail to hear.
 */
const DYNAMICS_TONE_SECS = 0.3;

export const renderDynamics = async ({ page }) => {
  // One control and two sessions differing from it by one `effect.add` and its knobs. Every
  // window below plays the identical source at the identical deck gain, so the render is its own
  // control and the fingerprint's own comparison is the assertion.
  const renders = await page.evaluate(
    async ({ secs, from }) => {
      const session = (envelopes) => ({
        secs,
        envelopes: [
          // The tone ends 0.3s in, so the second half of the render is the tail of whatever the
          // rack is doing rather than the source.
          { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733 } },
          { t: "deck.seek", deck: "a", position: from },
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
      const popped = await window.mulch.render(
        session([
          { t: "effect.add", deck: "a", id: "pop", effect: "pop" },
          { t: "param.set", deck: "a", instance: "pop", param: "pop.mix", value: 1 },
          { t: "param.set", deck: "a", instance: "pop", param: "pop.lift", value: 1 },
          { t: "param.set", deck: "a", instance: "pop", param: "pop.snap", value: 0.005 },
          { t: "param.set", deck: "a", instance: "pop", param: "pop.width", value: 2 },
          { t: "param.set", deck: "a", instance: "pop", param: "pop.sheen", value: 1 },
        ]),
      );
      // The same entry again with its own mix at nothing, which is the presence it declares: a
      // worklet that crossfades in its own kernel has to be transparent at a mix of nought, and
      // the fingerprint is what says whether it is (0202, 0209).
      const silent = await window.mulch.render(
        session([
          { t: "effect.add", deck: "a", id: "pop", effect: "pop" },
          { t: "param.set", deck: "a", instance: "pop", param: "pop.mix", value: 0 },
          { t: "param.set", deck: "a", instance: "pop", param: "pop.lift", value: 1 },
          { t: "param.set", deck: "a", instance: "pop", param: "pop.width", value: 2 },
          { t: "param.set", deck: "a", instance: "pop", param: "pop.sheen", value: 1 },
        ]),
      );
      // The entry that plays back what it has heard, and the same entry again at a gate of
      // nothing, which is the presence it declares: a window is drawn from the stage's own
      // capture, so a short Reach against a source that stops partway through the render leaves
      // pieces of the tone sounding after the tone itself has gone (P157).
      const scattered = await window.mulch.render(
        session([
          { t: "effect.add", deck: "a", id: "sct", effect: "scatter" },
          { t: "param.set", deck: "a", instance: "sct", param: "scatter.gate", value: 1 },
          { t: "param.set", deck: "a", instance: "sct", param: "scatter.reach", value: 0.05 },
          { t: "param.set", deck: "a", instance: "sct", param: "scatter.span", value: 0.05 },
          { t: "param.set", deck: "a", instance: "sct", param: "scatter.odds", value: 1 },
          { t: "param.set", deck: "a", instance: "sct", param: "scatter.stray", value: 0 },
        ]),
      );
      const hushed = await window.mulch.render(
        session([
          { t: "effect.add", deck: "a", id: "sct", effect: "scatter" },
          { t: "param.set", deck: "a", instance: "sct", param: "scatter.gate", value: 0 },
          { t: "param.set", deck: "a", instance: "sct", param: "scatter.reach", value: 0.05 },
          { t: "param.set", deck: "a", instance: "sct", param: "scatter.odds", value: 1 },
        ]),
      );
      return {
        control: control.fingerprint,
        scattered: scattered.fingerprint,
        hushed: hushed.fingerprint,
        popped: popped.fingerprint,
        silent: silent.fingerprint,
        compressed: compressed.fingerprint,
        reverberated: reverberated.fingerprint,
        effects: {
          compressed: compressed.probes.at(-1).probe.decks.a.effects.map((one) => one.effect),
          reverberated: reverberated.probes.at(-1).probe.decks.a.effects.map((one) => one.effect),
          popped: popped.probes.at(-1).probe.decks.a.effects.map((one) => one.effect),
          scattered: scattered.probes.at(-1).probe.decks.a.effects.map((one) => one.effect),
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
    },
    { secs: DYNAMICS_RENDER_SECS, from: GEN_SECS - DYNAMICS_TONE_SECS },
  );

  if (
    renders.effects.compressed.join(",") !== "compressor" ||
    renders.effects.reverberated.join(",") !== "reverb" ||
    renders.effects.popped.join(",") !== "pop" ||
    renders.effects.scattered.join(",") !== "scatter"
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
    ["pop", renders.popped],
    ["scatter", renders.scattered],
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
  // And the other half of the same claim, for each entry that declares one: it is transparent
  // where it says it is silent.
  for (const [name, at, fingerprint] of [
    ["pop", "a mix", renders.silent],
    ["scatter", "a gate", renders.hushed],
  ]) {
    const still = compareFingerprints(renders.control, fingerprint);
    if (still.length > 0) {
      fail(
        `a ${name} at ${at} of nothing moved the render it should have passed through — ${still.join("; ")}`,
        renders,
      );
    }
  }
  report(
    `all four effects moved the offline render: the compressor held the tone down ` +
      `${(renders.toneDb.control - renders.toneDb.compressed).toFixed(1)}dB, and the reverb ` +
      `left a tail ${(renders.tailDb.reverberated - renders.tailDb.control).toFixed(1)}dB above ` +
      "the silence the same session renders without it, and the pop stage and the scatter each " +
      "moved it with their own presence up and left it untouched with that presence at nothing",
  );
};
