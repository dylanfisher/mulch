/**
 * @role The scatter plugin: its six parameters, and the single worklet node that is its whole
 *   graph — the capture of the last few seconds, the trigger that opens a window in it, and the
 *   gate that blends the window against what is passing through.
 * @instead The per-sample work → src/audio/worklets/scatter.js, which is where the circular
 *   capture, the trigger's own draws and the window's envelope live. Nothing about the audio
 *   thread is decided here.
 */
// A MessagePort's postMessage has no targetOrigin argument — that parameter belongs to
// window.postMessage, which this file never calls. The rule cannot tell the two apart (0007).
// oxlint-disable unicorn/require-post-message-target-origin
import { GrainsIcon } from "@phosphor-icons/react/Grains";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { SCATTER_GRAINS } from "@/audio/worklet";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
  workletParam,
} from "./contract";

/**
 * The processor's own copies of these bounds are its `parameterDescriptors` in
 * src/audio/worklets/scatter.js — a worklet imports nothing, so every range is written twice, and a
 * declaration wider than the processor's would read past what is heard. The pair is asserted
 * against the declaration in src/audio/worklets/scatter.test.ts, so it cannot drift unnoticed.
 *
 * **What "how far back" means here is how far back in what this effect has heard.** An effect is a
 * link in the chain and hears what passes through it: it cannot read the deck's buffer and does not
 * know where the loop is, because the transport is the one thing that may move a read position
 * (0030). So the past these knobs are said in is the stage's own capture and nothing else.
 */
/**
 * How far back a window may be taken from, in seconds — up to the whole capture, which is what
 * the processor's `CAPTURE_SECS` is and why the top of this range is that number. Logarithmic,
 * because the difference between a tenth of a second back and a fifth is a different sound and
 * the difference between three seconds and three and a bit is not.
 *
 * Named rather than left inline because `settle` below is the capture's length, and that is this
 * declaration's own top: ./scatter.test.ts already holds `max` against the processor's
 * `CAPTURE_SECS`, so reading the memory off here keeps one copy of the number rather than three.
 */
const reachParam = {
  id: "scatter.reach",
  label: "Reach",
  min: 0.01,
  max: 4,
  default: 1,
  precision: 2,
  curve: "log",
  automation: "linear",
} as const satisfies ParamDeclaration;

const params = [
  reachParam,
  /** How long one window lasts, in seconds: a grain at the bottom of the range and most of a bar
   * at the top. Logarithmic for the reason Reach is — the short half is the interesting one. */
  {
    id: "scatter.span",
    label: "Span",
    min: 0.01,
    max: 1,
    default: 0.12,
    precision: 3,
    curve: "log",
    automation: "linear",
  },
  /** How often a window is taken, as the chance of one at each of the chances the stage offers —
   * which it offers at a rate of its own, and only while no window is open. Nothing is never, and
   * one is a window at every chance there is. */
  {
    id: "scatter.odds",
    label: "Odds",
    min: 0,
    max: 1,
    default: 0.5,
    precision: 2,
    automation: "linear",
  },
  /** How far a window replaces what is passing through, from not at all to wholly. This entry's
   * own presence, which is why nothing is transparent rather than quiet. */
  {
    id: "scatter.gate",
    label: "Gate",
    min: 0,
    max: 1,
    default: 0.8,
    precision: 2,
    automation: "linear",
  },
  /** How quickly the gate opens and shuts, in seconds. A millisecond is a click and two hundred of
   * them is a swell that a short window never finishes. */
  {
    id: "scatter.edge",
    label: "Edge",
    min: 0.001,
    max: 0.2,
    default: 0.01,
    precision: 3,
    curve: "log",
    automation: "linear",
  },
  /** How much of each of the four above is drawn per window rather than held at the knob: nothing
   * is every window alike, and one is anywhere from nothing up to what the knob says. */
  {
    id: "scatter.stray",
    label: "Stray",
    min: 0,
    max: 1,
    default: 0.3,
    precision: 2,
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

type ScatterParamId = (typeof params)[number]["id"];

export const scatterEffect = defineEffect({
  id: "scatter",
  label: "Scatter",
  width: "half",
  face: "knobs",
  // Absent at a gate of nothing, and absent exactly: the blend is inside the kernel, which holds
  // the dry sample beside the captured one and crossfades them linearly, so a gate of nought is
  // the input written straight back out however wide the windows are (0202, 0209).
  presence: { param: "scatter.gate", silent: 0 },
  icon: GrainsIcon,
  drift: "grain",
  geometry: "linear",
  // A window's own length is the cycle this effect works over, so Span is the row's period. The
  // gate is how much of the signal it takes at all, which is the reading the tape's Amount and the
  // pop's Mix already have (0148). Odds is how crowded that cycle is, which is how finely the row
  // is drawn beside its own period. Reach is a distance back into what was heard, which is where
  // the row is anchored — the reading the delay's Time already has. Edge is how abruptly the
  // window arrives rather than travelling evenly into it, which is what `bend` is and what the
  // compressor's Attack claims. And Stray is how far each window is drawn from every other, which
  // is the three channels of ink no longer being one lattice at all (0141).
  driftFrom: [
    { param: "scatter.span", into: "period" },
    { param: "scatter.gate", into: "depth" },
    { param: "scatter.odds", into: "pitch" },
    { param: "scatter.reach", into: "centre" },
    { param: "scatter.edge", into: "bend" },
    { param: "scatter.stray", into: "disperse" },
  ],
  // Exactly the capture, and exactly once: a window is taken from the stage's own last few seconds
  // and can reach no further back than they go, so when the capture has been overwritten once this
  // stage is playing back only what it is being given now.
  settle: () => reachParam.max,
  params,
  build: (ctx, values): EffectInstance<ScatterParamId> => {
    // Constructed directly, and allowed to throw if the module is not on this context: a chain
    // never awaits, and every context loads MODULES before a node is built on it (0088).
    // The channel count is whatever arrives, for the reason src/audio/effects/pop.ts gives at
    // length: the rack sits *before* the deck's own StereoPanner (src/audio/chain.ts), whose law
    // is -3dB on a mono input and unity on a stereo one, so a node built with
    // `outputChannelCount: [2]` would be three decibels louder than the session without it — and
    // this entry declares a silence, so that would be audible at a gate of nothing (P142).
    const stage = new AudioWorkletNode(ctx, SCATTER_GRAINS, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCountMode: "max",
      channelInterpretation: "speakers",
    });

    const bindings = {
      "scatter.reach": bindParam(workletParam(stage, "scatter.reach")),
      "scatter.span": bindParam(workletParam(stage, "scatter.span")),
      "scatter.odds": bindParam(workletParam(stage, "scatter.odds")),
      "scatter.gate": bindParam(workletParam(stage, "scatter.gate")),
      "scatter.edge": bindParam(workletParam(stage, "scatter.edge")),
      "scatter.stray": bindParam(workletParam(stage, "scatter.stray")),
    } satisfies Record<ScatterParamId, ParamBinding>;

    return {
      // One node is the whole graph: the dry path is the sample the kernel already holds, which is
      // what binding `scatter.gate` as an a-rate worklet parameter bought (0209).
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
