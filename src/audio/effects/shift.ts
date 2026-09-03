/**
 * @role The shift plugin: its four parameters, and the single worklet node that is its whole graph
 *   — the capture, the two read heads and the dry/wet blend all inside one processor.
 * @instead The per-sample work → src/audio/worklets/shift.js, which is where the circular capture,
 *   the heads' own walk and the crossfade between them live. Nothing about the audio thread is
 *   decided here.
 */
// A MessagePort's postMessage has no targetOrigin argument — that parameter belongs to
// window.postMessage, which this file never calls. The rule cannot tell the two apart (0007).
// oxlint-disable unicorn/require-post-message-target-origin
import { ArrowsDownUpIcon } from "@phosphor-icons/react/ArrowsDownUp";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { SHIFT_PITCH } from "@/audio/worklet";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
  workletParam,
} from "./contract";

/**
 * How much of a window the crossfade adds to what this stage remembers — the share of one the two
 * heads stand apart, which is `HEAD_OFFSET` in src/audio/worklets/shift.js. The deepest either head
 * actually reads is one whole window and no more, so this half is slack rather than need; it is
 * declared because a warm-up wants the generous side of a memory, and because the number is the
 * crossfade the entry is built out of. The pair is held together in
 * src/audio/worklets/shift.test.ts.
 */
const CROSSFADE_SHARE = 0.5;

/**
 * The processor's own copies of these bounds are its `parameterDescriptors` in
 * src/audio/worklets/shift.js — a worklet imports nothing, so every range is written twice, and a
 * declaration wider than the processor's would read past what is heard. The pair is asserted
 * against the declaration in src/audio/worklets/shift.test.ts, so it cannot drift unnoticed.
 */
/**
 * How long one head's window is, in seconds — the grain it reads before it wraps and its other half
 * takes over. Named rather than left inline because `settle` below is this window plus the
 * crossfade, and because its maximum is the whole of the processor's capture: ./shift.test.ts holds
 * `max` against the worklet's `WINDOW_MAX_SECS`, so the memory is read off this declaration rather
 * than written a third time.
 *
 * Short is a grain and rasps at the interval's own rate; long is smooth and smears a transient
 * across the whole of itself. Logarithmic, because the difference between ten milliseconds and
 * twenty is a different sound and the difference between a hundred and eighty and two hundred is
 * not.
 */
const windowParam = {
  id: "shift.window",
  label: "Window",
  min: 0.01,
  max: 0.2,
  default: 0.06,
  precision: 3,
  curve: "log",
  automation: "linear",
} as const satisfies ParamDeclaration;

const params = [
  /**
   * How far what passes through is transposed, in semitones — two octaves either way, stepped onto
   * whole ones because the interval is the musical distance and Detune below is the same distance
   * said finer. At nothing the heads do not walk at all and the stage is a fixed tap half a window
   * back rather than a wire — the one setting at which Window is heard as a delay and not as a
   * grain.
   */
  {
    id: "shift.interval",
    label: "Interval",
    min: -24,
    max: 24,
    default: 12,
    precision: 0,
    step: 1,
    automation: "linear",
  },
  /**
   * And the same distance under a semitone, in cents: a hundred either way, which is exactly the
   * step Interval moves in, so the two together reach every rate in the range without either knob
   * doing the other's job. This is where a detuned double comes from — a shift of nothing and a few
   * cents is a second voice beating against the first.
   */
  {
    id: "shift.detune",
    label: "Detune",
    min: -100,
    max: 100,
    default: 0,
    precision: 0,
    automation: "linear",
  },
  windowParam,
  {
    /**
     * How much of the transposed signal is heard against the untouched input. Named "Shift Mix"
     * rather than "Mix" for the reason the crush's and the sway's are: every automation lane's
     * label is what the picker and its aria-label say, and the delay already holds that word
     * (src/audio/params.ts).
     */
    id: "shift.mix",
    label: "Shift Mix",
    min: 0,
    max: 1,
    default: 0.5,
    precision: 2,
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

type ShiftParamId = (typeof params)[number]["id"];

export const shiftEffect = defineEffect({
  id: "shift",
  label: "Shift",
  width: "half",
  face: "knobs",
  // Absent at a mix of nothing, and absent exactly: the crossfade is inside the kernel, which holds
  // the dry sample beside the transposed one and blends them linearly, so a mix of nought is the
  // input written straight back out however far the heads are walking (0202, 0209).
  presence: { param: "shift.mix", silent: 0 },
  icon: ArrowsDownUpIcon,
  drift: "fifth",
  geometry: "linear",
  // The window is the cycle this stage works over — a head wraps once per window — so it is the
  // row's period, the reading the crush's own rate has. The interval is a frequency ratio, and how
  // far apart a row's fringes stand is `pitch`, which is the one dimension in the picture that is
  // itself a ratio (0139). The detune is the interval said finer, a cent either side of it, and
  // a cent either side is what the picture's travel along its ramp reads: flat is drawn toward the
  // cool end and sharp toward the hot one, about the row's own ink at none (0141). And the mix is
  // how much of this entry is heard at all, which is how much of its own depth its row cuts (0148).
  driftFrom: [
    { param: "shift.window", into: "period" },
    { param: "shift.interval", into: "pitch" },
    { param: "shift.detune", into: "hue" },
    { param: "shift.mix", into: "depth" },
  ],
  // A second picture at the interval's own ratio, laid over the first: how far it is zoomed is the
  // Interval, in the semitones it is declared in — the one look term that is a ratio, for the reason
  // `pitch` above is one (0139) — and how much of it is heard is the Mix, the same knob this entry's
  // presence is read off, the two agreeing at no mix at all (0202, 0289).
  look: "double",
  lookFrom: [
    { param: "shift.interval", into: "zoom" },
    { param: "shift.mix", into: "amount" },
  ],
  // The window a head reads plus the crossfade the second head is standing in, which is the whole
  // of what this stage remembers: there is no filter and no feedback path in the processor, so what
  // it is doing stops depending on what it was given as soon as the heads have walked past it.
  // Under the rack's own floor at every setting, and stated anyway — a settle is what the entry
  // knows about itself, and the floor is what the rack does with it (src/lib/settle.ts).
  settle: (values) => values["shift.window"] * (1 + CROSSFADE_SHARE),
  params,
  build: (ctx, values): EffectInstance<ShiftParamId> => {
    // Constructed directly, and allowed to throw if the module is not on this context: a chain
    // never awaits, and every context loads MODULES before a node is built on it (0088).
    // The channel count is whatever arrives, for the reason src/audio/effects/pop.ts gives at
    // length: the rack sits *before* the deck's own StereoPanner (src/audio/chain.ts), whose law
    // is -3dB on a mono input and unity on a stereo one, so a node built with
    // `outputChannelCount: [2]` would be three decibels louder than the session without it — and
    // this entry declares a silence, so that would be audible at a mix of nothing (P142).
    const stage = new AudioWorkletNode(ctx, SHIFT_PITCH, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCountMode: "max",
      channelInterpretation: "speakers",
    });

    const bindings = {
      "shift.interval": bindParam(workletParam(stage, "shift.interval")),
      "shift.detune": bindParam(workletParam(stage, "shift.detune")),
      "shift.window": bindParam(workletParam(stage, "shift.window")),
      "shift.mix": bindParam(workletParam(stage, "shift.mix")),
    } satisfies Record<ShiftParamId, ParamBinding>;

    return {
      // One node is the whole graph: there is no dry path outside the processor to hang off, which
      // is what binding `shift.mix` as an a-rate worklet parameter bought (0209).
      input: stage,
      output: stage,
      ...instanceFromBindings(params, bindings, values),
      dispose: () => {
        // The one thing that ends the processor, exactly as the crush's does: `disconnect` alone
        // leaves an active source on the context's pull list, and an offline context is never
        // closed (0086).
        stage.port.postMessage({ t: "stop" });
        stage.disconnect();
      },
    };
  },
});
