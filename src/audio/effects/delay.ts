/** @role The feedback delay effect plugin, including its parameters and Web Audio graph. */
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/ClockCounterClockwise";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { mixCurve } from "@/lib/crossfade";
import { feedbackSettleSecs } from "@/lib/settle";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
} from "./contract";

/** The declared maximum of `delay.time` and the node's `maxDelayTime` are one fact: a declared
 * maximum above the node's is silently clamped, so the parameter would read past what is heard. */
const MAX_DELAY_SECS = 2;

const params = [
  {
    id: "delay.time",
    label: "Time",
    min: 0,
    max: MAX_DELAY_SECS,
    default: 0.25,
    precision: 2,
    automation: "linear",
  },
  {
    id: "delay.feedback",
    label: "Feedback",
    min: 0,
    max: 0.9,
    default: 0.35,
    precision: 2,
    automation: "linear",
  },
  {
    id: "delay.mix",
    label: "Mix",
    min: 0,
    max: 1,
    default: 0.25,
    precision: 2,
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

type DelayParamId = (typeof params)[number]["id"];

export const delayEffect = defineEffect({
  id: "delay",
  label: "Delay",
  width: "half",
  face: "knobs",
  // Absent at a mix of nothing: the crossfade's wet gain shuts and the dry path is untouched, so
  // the effect is exactly a wire (0202).
  presence: { param: "delay.mix", silent: 0 },
  icon: ClockCounterClockwiseIcon,
  drift: "twin",
  geometry: "linear",
  // An echo arrives from somewhere, so the time between repeats is where on the picture this row
  // is anchored — two delays set differently are two rows measured from two places, which fringe
  // into arcs while both of them stay straight (0142). The feedback is a repeat of what has already
  // been heard, which in the picture is the frame before this one cut back into it: the one mapping
  // that explains itself, and the one bounded by a ceiling rather than by a range (0143).
  // The mix is how much of this delay is heard at all, which is how much of its own depth its row
  // cuts — the same reading the reverb's wet already has, because it is the same knob (0148).
  driftFrom: [
    { param: "delay.time", into: "centre" },
    { param: "delay.feedback", into: "feedback" },
    { param: "delay.mix", into: "depth" },
  ],
  // A delay line's repeats, falling to the same silence every decay time here is stated against.
  settle: (values) => feedbackSettleSecs(values["delay.time"], values["delay.feedback"]),
  params,
  // Over the line cap by the derivation `delay.mix` is: the crossfade's nodes belong to the graph
  // they are wired into, and a helper holding them would hand a caller this plugin's privates
  // (0007).
  // oxlint-disable-next-line max-lines-per-function
  build: (ctx, values): EffectInstance<DelayParamId> => {
    const input = ctx.createGain();
    const dry = ctx.createGain();
    const delay = ctx.createDelay(MAX_DELAY_SECS);
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    const output = ctx.createGain();

    // `delay.mix` is one declared parameter, so it is one AudioParam: a DC source both crossfade
    // gains derive from through the curves above. Two gains would be two things to schedule a
    // single lane onto, which is the shape the contract does not have (0049).
    const mix = ctx.createConstantSource();
    const dryShape = ctx.createWaveShaper();
    dryShape.curve = mixCurve("dry");
    const wetShape = ctx.createWaveShaper();
    wetShape.curve = mixCurve("wet");
    // The shaped signal is the whole of each gain: a modulated AudioParam sums onto its intrinsic
    // value, so that value has to be zero rather than the 1 a gain node is built at.
    dry.gain.value = 0;
    wet.gain.value = 0;
    mix.connect(dryShape).connect(dry.gain);
    mix.connect(wetShape).connect(wet.gain);

    const bindings = {
      "delay.time": bindParam(delay.delayTime),
      "delay.feedback": bindParam(feedback.gain),
      "delay.mix": bindParam(mix.offset),
    } satisfies Record<DelayParamId, ParamBinding>;

    const bound = instanceFromBindings(params, bindings, values);
    // After the initialize loop, so the source never runs at the ConstantSourceNode default of 1
    // — full wet — for the window between construction and the value it was built with.
    mix.start();

    input.connect(dry).connect(output);
    input.connect(delay).connect(wet).connect(output);
    delay.connect(feedback).connect(delay);

    return {
      input,
      output,
      ...bound,
      dispose: () => {
        mix.stop();
        mix.disconnect();
        dryShape.disconnect();
        wetShape.disconnect();
        input.disconnect();
        dry.disconnect();
        delay.disconnect();
        feedback.disconnect();
        wet.disconnect();
        output.disconnect();
      },
    };
  },
});
