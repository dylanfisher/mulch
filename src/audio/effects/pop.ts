/**
 * @role The pop plugin: its five parameters, and the single worklet node that is its whole graph
 *   — dynamics, width, air and the dry/wet blend all inside one processor.
 * @instead The per-sample work → src/audio/worklets/pop.js, which is where the expander, the
 *   mid/side split, the saturator and the crossfade live. Nothing about the audio thread is
 *   decided here.
 */
// A MessagePort's postMessage has no targetOrigin argument — that parameter belongs to
// window.postMessage, which this file never calls. The rule cannot tell the two apart (0007).
// oxlint-disable unicorn/require-post-message-target-origin
import { PulseIcon } from "@phosphor-icons/react/Pulse";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { POP_DYNAMICS } from "@/audio/worklet";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
  workletParam,
} from "./contract";

/**
 * The processor's own copies of these bounds are its `parameterDescriptors` in
 * src/audio/worklets/pop.js — a worklet imports nothing, so every range is written twice, and a
 * declaration wider than the processor's would read past what is heard. The pair is asserted
 * against the declaration in src/audio/worklets/pop.test.ts, so it cannot drift unnoticed.
 */
const params = [
  /**
   * How far the expander opens what it is given, as a fraction: nothing is no expansion, and one
   * is a two-to-one slope either side of the pivot. What bounds it is not this knob but the twelve
   * decibels the processor clamps the gain at, which is why the range here is a plain 0..1.
   */
  {
    id: "pop.lift",
    label: "Lift",
    min: 0,
    max: 1,
    default: 0.35,
    precision: 2,
    automation: "linear",
  },
  /** The follower's own time constant, in seconds: a slow breath at the top of the range and a
   * fast strike at the bottom. Logarithmic, because the interesting half is the fast one. */
  {
    id: "pop.snap",
    label: "Snap",
    min: 0.002,
    max: 0.4,
    default: 0.03,
    precision: 3,
    curve: "log",
    automation: "linear",
  },
  /** Mid and side, with the side high-passed: one is the input untouched and nought is mono above
   * the cut, so the low end stays where the body is however far the top opens. */
  {
    id: "pop.width",
    label: "Width",
    min: 0,
    max: 2,
    default: 1,
    precision: 2,
    automation: "linear",
  },
  {
    id: "pop.sheen",
    label: "Sheen",
    min: 0,
    max: 1,
    default: 0.2,
    precision: 2,
    automation: "linear",
  },
  {
    /**
     * How much of the stage is heard against the untouched input. Named "Pop Mix" rather than
     * "Mix": every automation lane's label is what the picker and its aria-label say, and the
     * delay already holds that word — the same reason the reverb has a Tone and the tape a Tape
     * Tone (src/audio/params.ts).
     */
    id: "pop.mix",
    label: "Pop Mix",
    min: 0,
    max: 1,
    default: 0.5,
    precision: 2,
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

type PopParamId = (typeof params)[number]["id"];

export const popEffect = defineEffect({
  id: "pop",
  label: "Pop",
  width: "half",
  face: "knobs",
  // Absent at a mix of nothing, and absent exactly: the crossfade is inside the kernel, which
  // holds the dry sample beside the wet one and blends them linearly, so a mix of nought is the
  // input written straight back out (0202, 0209).
  presence: { param: "pop.mix", silent: 0 },
  icon: PulseIcon,
  drift: "swell",
  geometry: "linear",
  // The follower's speed is the cycle this effect works over, so it is the row's period. The lift
  // is how hard it surges and stalls across that cycle rather than travelling evenly, which is
  // what a two-sided expander does to everything passing through it (0146). The width is how far
  // the picture's three channels of ink stand apart — the one dimension that already means how
  // wide something is — and the sheen is the top end, so it is where between the cool ink and the
  // hot one the row is drawn (0141). The mix is how much of the effect is heard at all, which is
  // how much of its own depth the row cuts, the reading the tape's Amount already has (0148).
  driftFrom: [
    { param: "pop.snap", into: "period" },
    { param: "pop.lift", into: "bend" },
    { param: "pop.width", into: "fringe" },
    { param: "pop.sheen", into: "hue" },
    { param: "pop.mix", into: "depth" },
  ],
  params,
  build: (ctx, values): EffectInstance<PopParamId> => {
    // Constructed directly, and allowed to throw if the module is not on this context: a chain
    // never awaits, and every context loads MODULES before a node is built on it (0088).
    // The channel count is whatever arrives, and that is the whole of why: the rack sits *before*
    // the deck's own panner (src/audio/chain.ts), and a StereoPanner applies its -3dB law to a
    // mono input and passes a stereo one through untouched. A node that forced two channels out
    // would take that law off the signal, so a pop at a mix of nothing — which this entry declares
    // as its silence — would come out three decibels louder than the session without it. A mono
    // yard therefore stays mono here, where the mid is the signal, the side is nought and Width
    // has nothing to open.
    const stage = new AudioWorkletNode(ctx, POP_DYNAMICS, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCountMode: "max",
      channelInterpretation: "speakers",
    });

    const bindings = {
      "pop.lift": bindParam(workletParam(stage, "pop.lift")),
      "pop.snap": bindParam(workletParam(stage, "pop.snap")),
      "pop.width": bindParam(workletParam(stage, "pop.width")),
      "pop.sheen": bindParam(workletParam(stage, "pop.sheen")),
      "pop.mix": bindParam(workletParam(stage, "pop.mix")),
    } satisfies Record<PopParamId, ParamBinding>;

    return {
      // One node is the whole graph: there is no dry path outside the processor to hang off, which
      // is what binding `pop.mix` as an a-rate worklet parameter bought (0209).
      input: stage,
      output: stage,
      ...instanceFromBindings(params, bindings, values),
      dispose: () => {
        // The one thing that ends the processor, exactly as the tape's does: `disconnect` alone
        // leaves an active source on the context's pull list, and an offline context is never
        // closed (0086).
        stage.port.postMessage({ t: "stop" });
        stage.disconnect();
      },
    };
  },
});
