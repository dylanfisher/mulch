/**
 * @role The tape echo plugin: its parameters, and the graph that hangs the worklet loop off a dry
 *   path that never enters it.
 * @instead The per-sample work → src/audio/worklets/tape.js, which is where the loop, the head and
 *   the noise live. Nothing about the audio thread is decided here.
 */
// A MessagePort's postMessage has no targetOrigin argument — that parameter belongs to
// window.postMessage, which this file never calls. The rule cannot tell the two apart (0007).
// oxlint-disable unicorn/require-post-message-target-origin
import { CassetteTapeIcon } from "@phosphor-icons/react/CassetteTape";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { TAPE_DELAY } from "@/audio/worklet";
import { mixCurve } from "@/lib/crossfade";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
  workletParam,
} from "./contract";

/**
 * The longest tap. The processor's own copy is `MAX_DELAY_SECS` in
 * src/audio/worklets/tape.js — a worklet imports nothing, so the number is written twice, and a
 * declared maximum above the processor's would read past what is heard.
 */
const MAX_DELAY_SECS = 2;

const params = [
  {
    id: "tape.time",
    label: "Repeat",
    min: 0.005,
    max: MAX_DELAY_SECS,
    default: 0.35,
    precision: 3,
    automation: "linear",
  },
  /**
   * Past unity on purpose, and this is the point of the whole effect: the saturator inside the
   * loop bounds what comes back, so feedback above 1 is a tape that never quite stops rather than
   * a graph that runs away. A linear feedback gain at 1.4 would be an exponential and a blown
   * speaker; through `adaaTanh` it is self-oscillation you can play.
   */
  {
    id: "tape.feedback",
    /** Distinct from the delay's Feedback, and the word a tape echo's own panel uses for it. */
    label: "Regen",
    min: 0,
    max: 1.4,
    default: 0.55,
    precision: 2,
    automation: "linear",
  },
  {
    id: "tape.tone",
    label: "Tape Tone",
    min: 200,
    max: 16000,
    default: 3200,
    precision: 0,
    curve: "log",
    automation: "linear",
  },
  { id: "tape.drive", label: "Drive", min: 1, max: 8, default: 1.5, precision: 2 },
  {
    id: "tape.wow",
    label: "Wow",
    min: 0,
    max: 1,
    default: 0.35,
    precision: 2,
    automation: "linear",
  },
  { id: "tape.hiss", label: "Hiss", min: 0, max: 1, default: 0.25, precision: 2 },
  {
    /**
     * How much tape is heard against the clean signal. Named for what the knob says rather than
     * borrowing the delay's word, and its id gets its own moiré row from its own fold
     * (src/ui/moireCanvas.ts).
     */
    id: "tape.amount",
    label: "Amount",
    min: 0,
    max: 1,
    default: 0.3,
    precision: 2,
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

type TapeParamId = (typeof params)[number]["id"];

export const tapeEffect = defineEffect({
  id: "tape",
  label: "Tape",
  // A half like every other card since P128 took its reels away: the full width was the room the
  // drawing needed beside the knobs, and there is no drawing (0171).
  width: "half",
  face: "knobs",
  // Absent at an amount of nothing. The hiss is a worklet parameter inside the loop rather than
  // beside it, so it is on the wet path and goes quiet with it (0202).
  presence: { param: "tape.amount", silent: 0 },
  icon: CassetteTapeIcon,
  drift: "split",
  geometry: "linear",
  // The repeat time is the row's own cycle and the wow is what wanders across it, which is the
  // pair a listener hears this effect as. The regen is how many repeats actually come back, so it
  // is how many scales the row is drawn at — one more copy of the same texture an octave coarser
  // for every repeat still audible, which is what a moiré inside a moiré is (0143). The two values
  // the step named for that dimension could not take it: reverb's decay because a ring family's
  // octave is a bake of its own per copy, which the registry refuses a curved entry, and the repeat
  // time because it is the one value here that varies the row continuously and an octave count is
  // three steps — a tape at its own default would have said nothing at all through it. The drive is
  // the one thing here that bends what is already there rather than adding a row of its own, so it
  // is the lens the finished field is drawn back through (0142). The tone is a dark machine or a
  // bright one, which is the picture's own travel between its cool ink and its hot one — the same
  // reading the reverb's tone has, on the entry next to it — a colour is read per picture off the
  // boldest claim, so a second claimant speaks when it is the bolder and that is 0141's rule rather
  // than a silence. The hiss is the noise floor the medium lays under everything it carries, and a
  // noisier medium resolves less of what is on it, so it is how fine the row is drawn: a quiet tape
  // stands its fringes close and a hissy one opens them out, the grain swallowing what used to be
  // between them. And the amount is how much tape is heard against the clean signal, which is how
  // much of its own depth the row cuts (0148).
  driftFrom: [
    { param: "tape.time", into: "period" },
    { param: "tape.feedback", into: "octaves" },
    { param: "tape.wow", into: "bend" },
    { param: "tape.drive", into: "lens" },
    { param: "tape.tone", into: "hue" },
    { param: "tape.hiss", into: "pitch" },
    { param: "tape.amount", into: "depth" },
  ],
  params,
  // The dry/wet pair and the worklet's six bindings are one graph; a helper holding half of them
  // would hand a caller this plugin's privates (0007).
  // oxlint-disable-next-line max-lines-per-function
  build: (ctx, values): EffectInstance<TapeParamId> => {
    const input = ctx.createGain();
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    const output = ctx.createGain();

    // Constructed directly, and allowed to throw if the module is not on this context: a chain
    // never awaits, and every context loads MODULES before a node is built on it (0088).
    const loop = new AudioWorkletNode(ctx, TAPE_DELAY, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      channelCount: 2,
      channelCountMode: "explicit",
      channelInterpretation: "speakers",
    });

    // `tape.amount` is one declared parameter and therefore one AudioParam, exactly as delay's
    // and the reverb's are: a DC source both crossfade gains derive from through the equal-power
    // curves (0049). The third occurrence of this block, and it stays written out: extracting it
    // would reorder node construction in two shipped plugins for no behaviour (principle 4).
    const mix = ctx.createConstantSource();
    const dryShape = ctx.createWaveShaper();
    dryShape.curve = mixCurve("dry");
    const wetShape = ctx.createWaveShaper();
    wetShape.curve = mixCurve("wet");
    dry.gain.value = 0;
    wet.gain.value = 0;
    mix.connect(dryShape).connect(dry.gain);
    mix.connect(wetShape).connect(wet.gain);

    const bindings = {
      "tape.time": bindParam(workletParam(loop, "tape.time")),
      "tape.feedback": bindParam(workletParam(loop, "tape.feedback")),
      "tape.tone": bindParam(workletParam(loop, "tape.tone")),
      "tape.drive": bindParam(workletParam(loop, "tape.drive")),
      "tape.wow": bindParam(workletParam(loop, "tape.wow")),
      "tape.hiss": bindParam(workletParam(loop, "tape.hiss")),
      "tape.amount": bindParam(mix.offset),
    } satisfies Record<TapeParamId, ParamBinding>;

    const bound = instanceFromBindings(params, bindings, values);
    mix.start();

    // The dry path: input straight to output through one gain, touching nothing the loop owns.
    input.connect(dry).connect(output);
    input.connect(loop).connect(wet).connect(output);

    return {
      input,
      output,
      ...bound,
      dispose: () => {
        // The one thing that ends the processor. `disconnect` alone leaves an active source on
        // the context's pull list holding a two-second buffer per channel, and an offline context
        // is never closed — so every export of a session holding a tape would keep one (0086).
        loop.port.postMessage({ t: "stop" });
        mix.stop();
        mix.disconnect();
        dryShape.disconnect();
        wetShape.disconnect();
        input.disconnect();
        dry.disconnect();
        loop.disconnect();
        wet.disconnect();
        output.disconnect();
      },
    };
  },
});
