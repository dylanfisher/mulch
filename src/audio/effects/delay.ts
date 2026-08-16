/** @role The feedback delay effect plugin, including its parameters and Web Audio graph. */
import { rampTo } from "@/audio/ramp";
import { defineEffect, type EffectInstance, type ParamDeclaration } from "./contract";

/** The declared maximum of `delay.time` and the node's `maxDelayTime` are one fact: a declared
 * maximum above the node's is silently clamped, so the parameter would read past what is heard. */
const MAX_DELAY_SECS = 2;

const params = [
  { id: "delay.time", label: "Time", min: 0, max: MAX_DELAY_SECS, default: 0.25 },
  { id: "delay.feedback", label: "Feedback", min: 0, max: 0.9, default: 0.35 },
  { id: "delay.mix", label: "Mix", min: 0, max: 1, default: 0.25 },
] as const satisfies readonly ParamDeclaration[];

type DelayParamId = (typeof params)[number]["id"];

type ParamBinding = {
  initialize(value: number): void;
  set(value: number, when: number): void;
};

/** Equal-power gains keep perceived level steadier than a linear crossfade. */
export function mixGains(mix: number): { dry: number; wet: number } {
  const angle = mix * (Math.PI / 2);
  return { dry: Math.cos(angle), wet: Math.sin(angle) };
}

function createBindings(
  delay: DelayNode,
  feedback: GainNode,
  dry: GainNode,
  wet: GainNode,
): Record<DelayParamId, ParamBinding> {
  return {
    "delay.time": {
      initialize: (value) => {
        delay.delayTime.value = value;
      },
      set: (value, when) => {
        rampTo(delay.delayTime, value, when);
      },
    },
    "delay.feedback": {
      initialize: (value) => {
        feedback.gain.value = value;
      },
      set: (value, when) => {
        rampTo(feedback.gain, value, when);
      },
    },
    "delay.mix": {
      initialize: (value) => {
        const gains = mixGains(value);
        dry.gain.value = gains.dry;
        wet.gain.value = gains.wet;
      },
      set: (value, when) => {
        const gains = mixGains(value);
        rampTo(dry.gain, gains.dry, when);
        rampTo(wet.gain, gains.wet, when);
      },
    },
  } satisfies Record<DelayParamId, ParamBinding>;
}

export const delayEffect = defineEffect({
  id: "delay",
  label: "Delay",
  params,
  build: (ctx, values): EffectInstance<DelayParamId> => {
    const input = ctx.createGain();
    const dry = ctx.createGain();
    const delay = ctx.createDelay(MAX_DELAY_SECS);
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    const output = ctx.createGain();

    const bindings = createBindings(delay, feedback, dry, wet);

    for (const param of params) bindings[param.id].initialize(values[param.id]);

    input.connect(dry).connect(output);
    input.connect(delay).connect(wet).connect(output);
    delay.connect(feedback).connect(delay);

    return {
      input,
      output,
      setParam: (param, value, when) => {
        bindings[param].set(value, when);
      },
      dispose: () => {
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
