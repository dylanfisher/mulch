/** @role The low-pass filter effect plugin, including its parameter and Web Audio graph. */
import { FunnelIcon } from "@phosphor-icons/react/Funnel";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { defineEffect, type EffectInstance, type ParamDeclaration } from "./contract";

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
  icon: FunnelIcon,
  params,
  build: (ctx, values): EffectInstance<FilterParamId> => {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    const bindings = {
      "filter.cutoff": bindParam(filter.frequency),
    } satisfies Record<FilterParamId, ParamBinding>;

    for (const param of params) bindings[param.id].initialize(values[param.id]);

    return {
      input: filter,
      output: filter,
      setParam: (param, value, when) => {
        bindings[param].set(value, when);
      },
      automationTarget: (param) => bindings[param].target,
      dispose: () => {
        filter.disconnect();
      },
    };
  },
});
