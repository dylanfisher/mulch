/**
 * @role The single-band parametric EQ effect plugin, including its parameters and Web Audio graph.
 * @instead What its frequency, gain and Q do to a spectrum, as pure maths → src/lib/biquad.ts.
 */
import { rampTo } from "@/audio/ramp";
import { defineEffect, type EffectInstance, type ParamDeclaration } from "./contract";

const params = [
  {
    id: "eq.frequency",
    label: "Freq",
    min: 20,
    max: 20_000,
    default: 1_000,
    curve: "log",
    automation: "linear",
  },
  // Labelled distinctly from the deck's own Gain: the automation picker and its aria-labels name
  // a target by this label alone, so two "Gain"s would be two indistinguishable lanes.
  { id: "eq.gain", label: "EQ Gain", min: -24, max: 24, default: 0, automation: "linear" },
  // Q stays out of automation until it has been performed through the generic path, one registry
  // entry at a time (0024). Every binding below already carries its AudioParam, so opting Q in
  // later is one `automation: "linear"` here and nothing else.
  { id: "eq.q", label: "Q", min: 0.1, max: 18, default: 1, curve: "log" },
] as const satisfies readonly ParamDeclaration[];

type EqParamId = (typeof params)[number]["id"];

type ParamBinding = {
  initialize(value: number): void;
  set(value: number, when: number): void;
  /** The same AudioParam a lane is scheduled onto — one binding, two ways of moving it. */
  target: AudioParam;
};

/** Every one of this plugin's parameters is one AudioParam of one node, so they bind alike. */
const bind = (target: AudioParam): ParamBinding => ({
  initialize: (value) => {
    target.value = value;
  },
  set: (value, when) => {
    rampTo(target, value, when);
  },
  target,
});

export const eqEffect = defineEffect({
  id: "eq",
  label: "EQ",
  params,
  build: (ctx, values): EffectInstance<EqParamId> => {
    const eq = ctx.createBiquadFilter();
    // One native peaking biquad is the whole effect: the coefficients src/lib/biquad.ts asserts
    // are the ones this node computes, so there is no second DSP path to keep in agreement.
    eq.type = "peaking";
    const bindings = {
      "eq.frequency": bind(eq.frequency),
      "eq.gain": bind(eq.gain),
      "eq.q": bind(eq.Q),
    } satisfies Record<EqParamId, ParamBinding>;

    for (const param of params) bindings[param.id].initialize(values[param.id]);

    return {
      input: eq,
      output: eq,
      setParam: (param, value, when) => {
        bindings[param].set(value, when);
      },
      automationTarget: (param) => bindings[param].target,
      dispose: () => {
        eq.disconnect();
      },
    };
  },
});
