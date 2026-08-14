/**
 * @role The one deck signal chain. `buildDeckChain(ctx)` serves the live context and the offline
 *   render alike — there is never a second implementation of the chain for rendering.
 * @instead A parameter's range, label or default → src/audio/params.ts. This file only says
 *   which node each registered parameter drives.
 */
import { PARAM_IDS, PARAMS, type ParamId } from "./params";

/**
 * How long a parameter takes to reach a new value. Stepping an AudioParam instead is the classic
 * source of zipper noise, and a knob drag sends a great many of these.
 */
export const PARAM_RAMP_SECS = 0.01;

export type DeckChain = {
  /** What a source connects into. The chain's own output is already wired to `destination`. */
  input: AudioNode;
  setParam(param: ParamId, value: number, when: number): void;
};

export function buildDeckChain(ctx: BaseAudioContext, destination: AudioNode): DeckChain {
  const gain = ctx.createGain();
  const pan = ctx.createStereoPanner();
  gain.connect(pan).connect(destination);

  /**
   * The binding, and the reason adding a parameter stays cheap: `satisfies` makes this map
   * total, so a new id in the registry fails to compile until it is wired to a node here —
   * the one other place a parameter is ever mentioned, named by the type system rather than
   * by a comment someone has to remember (docs/plan.md §5).
   */
  const targets = {
    "deck.gain": gain.gain,
    "deck.pan": pan.pan,
  } satisfies Record<ParamId, AudioParam>;

  for (const id of PARAM_IDS) targets[id].value = PARAMS[id].default;

  return {
    input: gain,
    setParam: (param, value, when) => {
      // Ramp from wherever the param actually is, including mid-ramp: cancelAndHoldAtTime is
      // what makes a fast drag a series of joins rather than a series of jumps.
      const target = targets[param];
      target.cancelAndHoldAtTime(when);
      target.linearRampToValueAtTime(value, when + PARAM_RAMP_SECS);
    },
  };
}
