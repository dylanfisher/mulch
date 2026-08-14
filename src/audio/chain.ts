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

/**
 * The meter's window. 1024 frames is ~21ms at 48kHz — long enough that a level survives between
 * two frames of a 60fps read, short enough to still be "now". It is an analysis size, not a
 * spectrum: nothing here ever asks for frequency data.
 */
const METER_WINDOW = 1024;

export type DeckChain = {
  /** What a source connects into. The chain's own output is already wired to `destination`. */
  input: AudioNode;
  setParam(param: ParamId, value: number, when: number): void;
  /**
   * Instantaneous post-fader level — the loudest |sample| in the meter window. Usually in
   * [0, 1], but deck.gain reaches 1.5, so a hot buffer can read above 1; callers clamp for
   * display. The analyser reads its input down-mixed to mono, so a hard-panned signal meters
   * at half its channel level — a mono-sum meter, not a per-channel pair. Allocation-free
   * after construction: each read fills the one scratch buffer (docs/plan.md §4).
   */
  level(): number;
};

export function buildDeckChain(ctx: BaseAudioContext, destination: AudioNode): DeckChain {
  const gain = ctx.createGain();
  const pan = ctx.createStereoPanner();
  gain.connect(pan).connect(destination);

  // A dead-end tap, not a link in the chain: pan still connects straight to the destination, so
  // the signal the fingerprint measures never passes through this node.
  const meter = ctx.createAnalyser();
  meter.fftSize = METER_WINDOW;
  pan.connect(meter);
  const scratch = new Float32Array(meter.fftSize);

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
    level: () => {
      meter.getFloatTimeDomainData(scratch);
      let loudest = 0;
      // Indexed, like every hot loop in src/lib: a typed-array iterator is an allocation per
      // read on the unoptimised path, and this runs per frame per deck.
      for (let i = 0; i < scratch.length; i++) {
        const magnitude = Math.abs(scratch[i] ?? 0);
        if (magnitude > loudest) loudest = magnitude;
      }
      return loudest;
    },
  };
}
