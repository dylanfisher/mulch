/**
 * @role The single-band parametric EQ effect plugin, including its parameters and Web Audio graph.
 * @instead What its frequency, gain and Q do to a spectrum, as pure maths → src/lib/biquad.ts.
 */
import { EqualizerIcon } from "@phosphor-icons/react/Equalizer";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
} from "./contract";

const params = [
  {
    id: "eq.frequency",
    label: "Freq",
    min: 20,
    max: 20_000,
    default: 1_000,
    precision: 0,
    curve: "log",
    automation: "linear",
  },
  {
    id: "eq.gain",
    label: "EQ Gain",
    min: -24,
    max: 24,
    default: 0,
    precision: 1,
    automation: "linear",
  },
  {
    id: "eq.q",
    label: "Q",
    min: 0.1,
    max: 18,
    default: 1,
    precision: 2,
    curve: "log",
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

type EqParamId = (typeof params)[number]["id"];

export const eqEffect = defineEffect({
  id: "eq",
  label: "EQ",
  width: "half",
  icon: EqualizerIcon,
  drift: "peak",
  // The band this sits on is how fine the row is drawn, and the gain is how hard it is cut. How
  // tightly it is focused is how far the picture's three channels stand apart: a wide Q touches
  // everything either side of it and reads as one colour, and a narrow one separates (0141).
  driftFrom: [
    { param: "eq.frequency", into: "pitch" },
    { param: "eq.gain", into: "depth" },
    { param: "eq.q", into: "fringe" },
  ],
  params,
  build: (ctx, values): EffectInstance<EqParamId> => {
    const eq = ctx.createBiquadFilter();
    // One native peaking biquad is the whole effect: the coefficients src/lib/biquad.ts asserts
    // are the ones this node computes, so there is no second DSP path to keep in agreement.
    eq.type = "peaking";
    const bindings = {
      "eq.frequency": bindParam(eq.frequency),
      "eq.gain": bindParam(eq.gain),
      "eq.q": bindParam(eq.Q),
    } satisfies Record<EqParamId, ParamBinding>;

    return {
      input: eq,
      output: eq,
      ...instanceFromBindings(params, bindings, values),
      dispose: () => {
        eq.disconnect();
      },
    };
  },
});
