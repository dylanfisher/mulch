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
  // The gain after the compressor, so what the threshold took off can be put back.
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
export const compressorEffect = defineEffect({
  id: "compressor",
  label: "Compressor",
  // Six knobs across half a rack: they wrap into rows rather than the single column that made
  // this full width, and a wrapped row is readable now that every label reserves the same line
  // box whatever its longest word is (P64).
  width: "half",
  icon: GaugeIcon,
  drift: "flat",
  // The ratio is how hard this squeezes, and the release is the time it works over.
  driftFrom: [
    { param: "comp.ratio", into: "depth" },
    { param: "comp.release", into: "period" },
  ],
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
