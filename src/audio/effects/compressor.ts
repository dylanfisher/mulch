/** @role The dynamics compressor effect plugin, including its parameters and Web Audio graph. */
import { GaugeIcon } from "@phosphor-icons/react/Gauge";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
} from "./contract";

/**
 * The declared ranges are inside the node's own, which the specification fixes: threshold
 * -100..0dB, knee 0..40dB, ratio 1..20, attack and release 0..1s. A declaration wider than the
 * node's is silently clamped, so the knob would read past what is heard — the same fact the
 * delay's maximum time is (0011).
 */
const params = [
  {
    id: "comp.threshold",
    label: "Threshold",
    min: -60,
    max: 0,
    default: -24,
    precision: 1,
    automation: "linear",
  },
  {
    id: "comp.ratio",
    label: "Ratio",
    min: 1,
    max: 20,
    default: 4,
    precision: 1,
    automation: "linear",
  },
  { id: "comp.attack", label: "Attack", min: 0.001, max: 1, default: 0.003, precision: 3 },
  { id: "comp.release", label: "Release", min: 0.01, max: 1, default: 0.25, precision: 2 },
  { id: "comp.knee", label: "Knee", min: 0, max: 40, default: 30, precision: 1 },
  // The gain after the compressor, so what the threshold took off can be put back. Labelled
  // distinctly from the deck's Gain and the EQ's for the same reason those two are: the
  // automation picker names a lane by its label alone.
  {
    id: "comp.output",
    label: "Makeup",
    min: 0,
    max: 4,
    default: 1,
    precision: 2,
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

type CompressorParamId = (typeof params)[number]["id"];
type CompressorLaneId = Extract<(typeof params)[number], { automation: "linear" }>["id"];

/** Exactly the three the declarations above opted into a lane, as the contract requires (0024). */
const isLaneParam = (param: CompressorParamId): param is CompressorLaneId =>
  param === "comp.threshold" || param === "comp.ratio" || param === "comp.output";

export const compressorEffect = defineEffect({
  id: "compressor",
  label: "Compressor",
  // Six knobs: half a rack would wrap them into a column nobody can read across (P48).
  width: "full",
  icon: GaugeIcon,
  params,
  build: (ctx, values): EffectInstance<CompressorParamId> => {
    const compressor = ctx.createDynamicsCompressor();
    const makeup = ctx.createGain();
    compressor.connect(makeup);

    const bindings = {
      "comp.threshold": bindParam(compressor.threshold),
      "comp.ratio": bindParam(compressor.ratio),
      "comp.attack": bindParam(compressor.attack),
      "comp.release": bindParam(compressor.release),
      "comp.knee": bindParam(compressor.knee),
      "comp.output": bindParam(makeup.gain),
    } satisfies Record<CompressorParamId, ParamBinding>;

    return {
      input: compressor,
      output: makeup,
      ...instanceFromBindings(params, bindings, values),
      // Attack, release and knee are AudioParams that ramp like any other, and they still refuse
      // a target: `automationTarget` answers for exactly what a plugin declared `automation` on,
      // so the rack throws rather than scheduling a lane the registry says does not exist (0024).
      automationTarget: (param) => {
        if (!isLaneParam(param)) throw new Error(`compressor binds no automation target: ${param}`);
        return bindings[param].target;
      },
      // How far the compressor is pulling the signal down, in dB, read straight off the node.
      // It is a reading and not a setting: no parameter declares it, nothing writes it, and the
      // session has no field for it — a meter asks per frame and the answer is gone (P60).
      meter: () => compressor.reduction,
      dispose: () => {
        compressor.disconnect();
        makeup.disconnect();
      },
    };
  },
});
