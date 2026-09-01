/**
 * @role The crush plugin: its three parameters, and the single worklet node that is its whole
 *   graph — the decimator, the quantiser and the dry/wet blend all inside one processor.
 * @instead The per-sample work → src/audio/worklets/crush.js, which is where the sample-and-hold,
 *   the rounding and the crossfade live. Nothing about the audio thread is decided here.
 */
// A MessagePort's postMessage has no targetOrigin argument — that parameter belongs to
// window.postMessage, which this file never calls. The rule cannot tell the two apart (0007).
// oxlint-disable unicorn/require-post-message-target-origin
import { StairsIcon } from "@phosphor-icons/react/Stairs";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { CRUSH_BITS } from "@/audio/worklet";
import { SETTLE_FLOOR_SECS } from "@/lib/settle";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
  workletParam,
} from "./contract";

/**
 * The processor's own copies of these bounds are its `parameterDescriptors` in
 * src/audio/worklets/crush.js — a worklet imports nothing, so every range is written twice, and a
 * declaration wider than the processor's would read past what is heard. The pair is asserted
 * against the declaration in src/audio/worklets/crush.test.ts, so it cannot drift unnoticed.
 */
const params = [
  /**
   * How many bits a sample is rounded onto: one is the sign of the signal and nothing else, and
   * sixteen is finer than the converter this is played through. Fractional, because it carries a
   * lane and a lane that could only arrive at whole bits would be a staircase of staircases.
   */
  {
    id: "crush.bits",
    label: "Bits",
    min: 1,
    max: 16,
    default: 8,
    precision: 1,
    automation: "linear",
  },
  /**
   * The rate held samples are taken at, in hertz: at the top of the range the hold is a sample or
   * two long and only the rounding is heard, and at the bottom it is a few hundred a second, which
   * is the aliasing this entry exists for. Logarithmic, because the difference between two hundred
   * hertz and four hundred is a different sound and the difference between twenty thousand and
   * twenty-two is not.
   */
  {
    id: "crush.rate",
    label: "Rate",
    min: 100,
    max: 24_000,
    default: 6000,
    precision: 0,
    curve: "log",
    automation: "linear",
  },
  {
    /**
     * How much of the stage is heard against the untouched input. Named "Crush Mix" rather than
     * "Mix" for the reason the pop's is named "Pop Mix": every automation lane's label is what the
     * picker and its aria-label say, and the delay already holds that word (src/audio/params.ts).
     */
    id: "crush.mix",
    label: "Crush Mix",
    min: 0,
    max: 1,
    default: 0.5,
    precision: 2,
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

type CrushParamId = (typeof params)[number]["id"];

export const crushEffect = defineEffect({
  id: "crush",
  label: "Crush",
  width: "half",
  face: "knobs",
  // Absent at a mix of nothing, and absent exactly: the crossfade is inside the kernel, which
  // holds the dry sample beside the rounded one and blends them linearly, so a mix of nought is
  // the input written straight back out however coarse the levels are (0202, 0209).
  presence: { param: "crush.mix", silent: 0 },
  icon: StairsIcon,
  drift: "stair",
  geometry: "linear",
  // The hold's own rate is the cycle this effect works over, so it is the row's period. The mix is
  // how much of the effect is heard at all, which is how much of its own depth the row cuts — the
  // reading the tape's Amount and the pop's Mix already have (0148). And the bit depth is how
  // finely the signal is resolved, which is how finely the row is drawn: `pitch` is how far apart
  // its fringes stand, and a coarser quantiser is a coarser row (0139).
  driftFrom: [
    { param: "crush.rate", into: "period" },
    { param: "crush.bits", into: "pitch" },
    { param: "crush.mix", into: "depth" },
  ],
  // One held sample is this stage's whole memory: there is no filter, no capture and no feedback
  // path in the processor, so what it is doing stops depending on what it was given as soon as the
  // hold takes its next sample — which is under a hundredth of a second at the bottom of Rate.
  settle: () => SETTLE_FLOOR_SECS,
  params,
  build: (ctx, values): EffectInstance<CrushParamId> => {
    // Constructed directly, and allowed to throw if the module is not on this context: a chain
    // never awaits, and every context loads MODULES before a node is built on it (0088).
    // The channel count is whatever arrives, for the reason src/audio/effects/pop.ts gives at
    // length: the rack sits *before* the deck's own StereoPanner (src/audio/chain.ts), whose law
    // is -3dB on a mono input and unity on a stereo one, so a node built with
    // `outputChannelCount: [2]` would be three decibels louder than the session without it — and
    // this entry declares a silence, so that would be audible at a mix of nothing (P142).
    const stage = new AudioWorkletNode(ctx, CRUSH_BITS, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCountMode: "max",
      channelInterpretation: "speakers",
    });

    const bindings = {
      "crush.bits": bindParam(workletParam(stage, "crush.bits")),
      "crush.rate": bindParam(workletParam(stage, "crush.rate")),
      "crush.mix": bindParam(workletParam(stage, "crush.mix")),
    } satisfies Record<CrushParamId, ParamBinding>;

    return {
      // One node is the whole graph: there is no dry path outside the processor to hang off, which
      // is what binding `crush.mix` as an a-rate worklet parameter bought (0209).
      input: stage,
      output: stage,
      ...instanceFromBindings(params, bindings, values),
      dispose: () => {
        // The one thing that ends the processor, exactly as the pop's does: `disconnect` alone
        // leaves an active source on the context's pull list, and an offline context is never
        // closed (0086).
        stage.port.postMessage({ t: "stop" });
        stage.disconnect();
      },
    };
  },
});
