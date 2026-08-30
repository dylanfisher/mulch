/** @role The low-pass filter effect plugin, including its parameter and Web Audio graph. */
import { FunnelIcon } from "@phosphor-icons/react/Funnel";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
} from "./contract";

const params = [
  {
    id: "filter.cutoff",
    label: "Cutoff",
    min: 20,
    max: 20_000,
    default: 1_000,
    precision: 0,
    curve: "log",
    // The first effect-owned automation target: declared here, bound below, and named nowhere
    // else in the app or the UI (0024).
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

type FilterParamId = (typeof params)[number]["id"];

export const filterEffect = defineEffect({
  id: "filter",
  label: "Filter",
  width: "half",
  face: "knobs",
  // Open past the audible band. The one entry whose silence is at the *top* of its range, which is
  // why presence is a declared pair and not an assumed zero. It is transparent only approximately:
  // there is no dry path around the biquad, so a lowpass at 20kHz is very nearly a wire and not
  // exactly one, and an arrival is faintly audible in the top octave (0202).
  presence: { param: "filter.cutoff", silent: 20_000 },
  icon: FunnelIcon,
  drift: "slope",
  geometry: "linear",
  // A cutoff is a slope across the spectrum rather than a line drawn on it, so it is the sweep of
  // this row's own pitch across the picture: fringes crowded at one edge and open at the other,
  // which is one broad family sweeping the frame where a fixed spacing was an even comb (0142).
  driftFrom: [{ param: "filter.cutoff", into: "chirp" }],
  params,
  build: (ctx, values): EffectInstance<FilterParamId> => {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    const bindings = {
      "filter.cutoff": bindParam(filter.frequency),
    } satisfies Record<FilterParamId, ParamBinding>;

    return {
      input: filter,
      output: filter,
      ...instanceFromBindings(params, bindings, values),
      dispose: () => {
        filter.disconnect();
      },
    };
  },
});
