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
/** The six this plugin hands to the processor; `tape.amount` is graph-side and is not one. */
type TapeWorkletParamId = Exclude<TapeParamId, "tape.amount">;

/** The worklet's own AudioParam, or a loud no. `parameters.get` answers undefined for a name the
 * processor did not declare, and a silently missing binding is a knob that moves nothing. */
const workletParam = (node: AudioWorkletNode, id: TapeWorkletParamId): AudioParam => {
  const param = node.parameters.get(id);
  if (param === undefined) throw new Error(`the tape processor declares no parameter: ${id}`);
  return param;
};

export const tapeEffect = defineEffect({
  id: "tape",
  label: "Tape",
  width: "full",
  icon: CassetteTapeIcon,
  drift: "split",
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
