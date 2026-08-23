/**
 * @role The convolution reverb effect plugin, including its parameters and Web Audio graph.
 * @instead The impulse response itself, as pure maths → src/lib/impulse.ts. Nothing here draws a
 *   sample: this file owns the ConvolverNode and decides when a new response is asked for.
 */
import { BarnIcon } from "@phosphor-icons/react/Barn";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { mixCurve } from "@/lib/crossfade";
import { snapToStep } from "@/lib/range";
import { IMPULSE_CHANNELS, impulseResponse } from "@/lib/impulse";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
} from "./contract";

/** The declared maximum of `reverb.predelay` and the node's `maxDelayTime` are one fact. */
const MAX_PREDELAY_SECS = 0.25;

/**
 * The two parameters the impulse is a function of. Neither is automatable, and deliberately: a
 * lane would ask for a new response per point, and a response is a buffer built over its whole
 * length rather than a value ramped to (0087).
 */
const decayParam = {
  id: "reverb.decay",
  label: "Decay",
  min: 0.1,
  max: 8,
  default: 1.8,
  precision: 2,
  curve: "log",
  // Both carry a step, and it is what makes a drag affordable: a knob sends a value per pointer
  // event, so an unstepped one would ask for a new eight-second response sixty times a second.
  // The grid is finer than the readout can show a difference on and coarser than a pointer moves.
  step: 0.05,
  // And a step is not enough on its own: a drag crosses many of them, and each crossing swapped
  // the convolver's buffer and dropped the tail, so the drag was silent for its own length (0090).
  rebuild: true,
} as const satisfies ParamDeclaration;

const toneParam = {
  id: "reverb.tone",
  label: "Tone",
  min: 200,
  max: 18_000,
  default: 6_000,
  precision: 0,
  curve: "log",
  step: 50,
  rebuild: true,
} as const satisfies ParamDeclaration;

const impulseParams = [decayParam, toneParam] as const satisfies readonly ParamDeclaration[];

/** The two the graph carries as AudioParams, so both take a lane like any other knob. */
const graphParams = [
  {
    id: "reverb.predelay",
    label: "Pre-delay",
    min: 0,
    max: MAX_PREDELAY_SECS,
    default: 0.02,
    precision: 3,
    automation: "linear",
  },
  {
    id: "reverb.wet",
    label: "Wet",
    min: 0,
    max: 1,
    default: 0.3,
    precision: 2,
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

const params = [...impulseParams, ...graphParams] as const satisfies readonly ParamDeclaration[];

type ReverbParamId = (typeof params)[number]["id"];
type GraphParamId = (typeof graphParams)[number]["id"];

const isGraphParam = (param: ReverbParamId): param is GraphParamId =>
  param === "reverb.predelay" || param === "reverb.wet";

export const reverbEffect = defineEffect({
  id: "reverb",
  label: "Reverb",
  width: "half",
  icon: BarnIcon,
  drift: "lobe",
  params,
  // Over the line cap by the crossfade's nodes and the rebuild the two impulse parameters share:
  // the graph belongs to the instance it is wired into, and a helper holding it would hand a
  // caller this plugin's privates (0007).
  // oxlint-disable-next-line max-lines-per-function
  build: (ctx, values): EffectInstance<ReverbParamId> => {
    const input = ctx.createGain();
    const dry = ctx.createGain();
    const predelay = ctx.createDelay(MAX_PREDELAY_SECS);
    const convolver = ctx.createConvolver();
    // The response arrives at unit energy (src/lib/impulse.ts), which is the scaling that makes a
    // convolution pass the wet path at 0dB. The node must not scale it again: its own
    // normalization is a different law over the same samples, and two of them is neither.
    convolver.normalize = false;
    const wet = ctx.createGain();
    const output = ctx.createGain();

    // One declared parameter is one AudioParam: a DC source both crossfade gains derive from
    // through the shaping curves, exactly as the delay's mix does (0049).
    const mix = ctx.createConstantSource();
    const dryShape = ctx.createWaveShaper();
    dryShape.curve = mixCurve("dry");
    const wetShape = ctx.createWaveShaper();
    wetShape.curve = mixCurve("wet");
    dry.gain.value = 0;
    wet.gain.value = 0;
    mix.connect(dryShape).connect(dry.gain);
    mix.connect(wetShape).connect(wet.gain);

    // The values the buffer in the convolver was built from, on the grid each parameter declares
    // its step as. A move that lands in the bucket already built rebuilds nothing, which is what
    // keeps a drag from asking for a response per pointer event — the defect this pair of numbers
    // exists to prevent (0087). Snapped here and not only at the knob, because a command off the
    // wire carries whatever number it likes.
    let decaySecs = snapToStep(
      values["reverb.decay"],
      decayParam.min,
      decayParam.max,
      decayParam.step,
    );
    let toneHz = snapToStep(values["reverb.tone"], toneParam.min, toneParam.max, toneParam.step);
    /** Whether either of them has moved off what the convolver is actually holding. */
    let stale = false;
    const rebuild = (): void => {
      const response = impulseResponse({ decaySecs, toneHz, sampleRate: ctx.sampleRate });
      const buffer = ctx.createBuffer(IMPULSE_CHANNELS, response[0]!.length, ctx.sampleRate);
      for (const [channel, samples] of response.entries()) buffer.copyToChannel(samples, channel);
      convolver.buffer = buffer;
    };
    rebuild();

    const bindings = {
      "reverb.predelay": bindParam(predelay.delayTime),
      "reverb.wet": bindParam(mix.offset),
    } satisfies Record<GraphParamId, ParamBinding>;

    const bound = instanceFromBindings(graphParams, bindings, values);
    // After the initialize loop, so the source never runs at the ConstantSourceNode default of 1
    // — full wet — for the window between construction and the value it was built with.
    mix.start();

    input.connect(dry).connect(output);
    input.connect(predelay).connect(convolver).connect(wet).connect(output);

    return {
      input,
      output,
      setParam: (param, value, when) => {
        if (isGraphParam(param)) {
          bound.setParam(param, value, when);
          return;
        }
        // Not scheduled against `when`: swapping a convolver's buffer happens when it happens,
        // and pretending otherwise would be a ramp to a value nothing ramps. Nor swapped now —
        // both of these are declared `rebuild`, so the move is taken and the buffer waits.
        if (param === "reverb.decay") {
          const snapped = snapToStep(value, decayParam.min, decayParam.max, decayParam.step);
          if (snapped === decaySecs) return;
          decaySecs = snapped;
        } else {
          const snapped = snapToStep(value, toneParam.min, toneParam.max, toneParam.step);
          if (snapped === toneHz) return;
          toneHz = snapped;
        }
        stale = true;
      },
      // One rebuild however many of the two moved: they are two arguments to one response.
      endGesture: () => {
        if (!stale) return;
        stale = false;
        rebuild();
      },
      automationTarget: (param) => {
        if (!isGraphParam(param)) throw new Error(`reverb binds no automation target: ${param}`);
        return bindings[param].target;
      },
      dispose: () => {
        mix.stop();
        mix.disconnect();
        dryShape.disconnect();
        wetShape.disconnect();
        input.disconnect();
        dry.disconnect();
        predelay.disconnect();
        convolver.disconnect();
        wet.disconnect();
        output.disconnect();
      },
    };
  },
});
