/**
 * @role The single-band EQ effect plugin — a band that sweeps, cuts and passes — including its
 *   parameters and Web Audio graph.
 * @instead What its frequency, gain, Q and shape do to a spectrum, as pure maths, and the list of
 *   shapes itself → src/lib/biquad.ts.
 */
import { EqualizerIcon } from "@phosphor-icons/react/Equalizer";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { EQ_SHAPE_MAX, eqShapeAt } from "@/lib/biquad";
import { SETTLE_FLOOR_SECS } from "@/lib/settle";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
} from "./contract";

/**
 * The shape knob, apart from the three the graph carries as AudioParams: it is written onto the
 * node's own `type` rather than ramped onto a parameter, so it takes no lane and there is nothing
 * for `instanceFromBindings` to bind it to (0322).
 */
const shapeParam = {
  id: "eq.shape",
  label: "Shape",
  min: 0,
  max: EQ_SHAPE_MAX,
  default: 0,
  precision: 0,
  // A discrete choice on this instrument is a number stepped by one (contract.ts). No `rebuild`:
  // a shape is one string written onto a node that is already built, which is the cheapest move
  // any knob here makes — declaring one would only defer it to a gesture that never ends.
  step: 1,
} as const satisfies ParamDeclaration;

const graphParams = [
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

const params = [...graphParams, shapeParam] as const satisfies readonly ParamDeclaration[];

type GraphParamId = (typeof graphParams)[number]["id"];
type EqParamId = (typeof params)[number]["id"];

const isGraphParam = (param: EqParamId): param is GraphParamId => param !== shapeParam.id;

export const eqEffect = defineEffect({
  id: "eq",
  label: "EQ",
  width: "half",
  face: "knobs",
  // A peaking biquad at a gain of nothing is flat at whatever frequency and Q it is set to, so
  // those two need not be held: the band is there and lifts nothing (0202).
  // A peaking band ships flat, so its default is its own silence — this is the entry that made
  // `full` a field: all the way in is a band actually lifted (0202).
  //
  // **And the shape is held**, which is what keeps that pair true now that there are four of them
  // (0322): a gain of nought is flat for the peaking shape and for no other, so a run that drew a
  // low-pass and then faded its gain from nought to twelve would be fading a knob nothing is
  // hearing while the whole top of the band stayed cut. Held, an automator-grown EQ grows in the
  // one shape whose silence this pair describes — and the entry stays in the growable pool.
  presence: { param: "eq.gain", silent: 0, full: 12, held: ["eq.shape"] },
  icon: EqualizerIcon,
  drift: "peak",
  geometry: "linear",
  // The band this sits on is how fine the row is drawn, and the gain is how hard it is cut. How
  // tightly it is focused is how far the picture's three channels stand apart: a wide Q touches
  // everything either side of it and reads as one colour, and a narrow one separates (0141).
  driftFrom: [
    { param: "eq.frequency", into: "pitch" },
    { param: "eq.gain", into: "depth" },
    { param: "eq.q", into: "fringe" },
  ],
  // And the shape reaches no dimension of a row, because a row is a grating and every dimension it
  // has is a quantity — how fast, how deep, how far apart. Which of four shapes a band is standing
  // in is none of those, and folding it onto one would have the picture read a choice as an amount
  // (0148). It is not silent about it: the look below is where the shape lands, and it lands there
  // as the whole draw rather than as a term with a size.
  driftUnreached: [
    {
      param: "eq.shape",
      because: "a shape is a choice, and every dimension of a row is a quantity",
    },
  ],
  // One band of the picture stood out of the rest of it, where the band sits: the frequency walks
  // it up the field, the Q says how deep it is, and the gain says which way it goes — read for a
  // direction and not for a share, because how far the gain stands from flat is already the
  // presence above (0287). And the shape says which of the two bands it is: the peaking one lifted
  // or cut at the frequency, and a pass one drawn as everything past its own edge taken out (0322).
  look: "band",
  lookFrom: [
    { param: "eq.frequency", into: "position" },
    { param: "eq.gain", into: "lift" },
    { param: "eq.q", into: "width" },
    { param: "eq.shape", into: "shape" },
  ],
  // A biquad at any of its four shapes: two samples of state and nothing that lasts.
  settle: () => SETTLE_FLOOR_SECS,
  params,
  build: (ctx, values): EffectInstance<EqParamId> => {
    const eq = ctx.createBiquadFilter();
    // One native biquad is the whole effect, at whichever of the four shapes the knob names: the
    // coefficients src/lib/biquad.ts asserts are the ones this node computes, so there is no second
    // DSP path to keep in agreement.
    eq.type = eqShapeAt(values["eq.shape"]);
    const bindings = {
      "eq.frequency": bindParam(eq.frequency),
      "eq.gain": bindParam(eq.gain),
      "eq.q": bindParam(eq.Q),
    } satisfies Record<GraphParamId, ParamBinding>;

    const bound = instanceFromBindings(graphParams, bindings, values);

    return {
      input: eq,
      output: eq,
      ...bound,
      setParam: (param, value, when) => {
        if (isGraphParam(param)) {
          bound.setParam(param, value, when);
          return;
        }
        // Not scheduled against `when`, for the reason the reverb's rebuilds are not: a node's
        // `type` is a string and there is no ramping to a string. It is written now rather than
        // held to a gesture's end because writing it costs nothing (0090).
        eq.type = eqShapeAt(value);
      },
      // No `automationTarget` of its own: the spread above is the contract's, which answers for
      // exactly the parameters it was handed and throws for the rest — so the shape, which was not
      // handed to it, is refused there rather than by a second copy of the same rule (0024).
      dispose: () => {
        eq.disconnect();
      },
    };
  },
});
