/**
 * @role The one deck signal chain. `buildDeckChain(ctx)` serves the live context and the offline
 *   render alike — there is never a second implementation of the chain for rendering.
 * @instead A parameter's range, label or default → src/audio/params.ts. Effect graph bindings →
 *   the owning plugin in src/audio/effects/.
 */
import { createEffectRack } from "./effects/rack";
import type { EffectId } from "./effects/registry";
import type { AutomationPoint } from "@/lib/automation";
import {
  DECK_PARAM_IDS,
  isDeckParam,
  PARAMS,
  type AutomationParamId,
  type DeckParamId,
  type ParamId,
} from "./params";
import { rampTo, scheduleAutomation } from "./ramp";

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
  setAutomation(
    param: AutomationParamId,
    lane: readonly AutomationPoint[],
    base: number,
    when: number,
  ): void;
  addEffect(effect: EffectId, values: Readonly<Record<ParamId, number>>): number;
  setEffectBypass(effect: EffectId, bypassed: boolean): void;
  removeEffect(effect: EffectId): void;
  reorderEffects(order: readonly EffectId[]): void;
  /**
   * Instantaneous post-fader level — the loudest |sample| in the meter window. Usually in
   * [0, 1], but deck.gain reaches 1.5, so a hot buffer can read above 1; callers clamp for
   * display. The analyser reads its input down-mixed to mono, so a hard-panned signal meters
   * at half its channel level — a mono-sum meter, not a per-channel pair. Allocation-free
   * after construction: each read fills the one scratch buffer (docs/plan.md §4).
   */
  level(): number;
  dispose(): void;
};

// The added disposal closes resources already owned by this single graph builder; extracting it
// would expose those private nodes to a one-call helper. See 0007.
// oxlint-disable-next-line max-lines-per-function
export function buildDeckChain(ctx: BaseAudioContext, destination: AudioNode): DeckChain {
  const gain = ctx.createGain();
  const pan = ctx.createStereoPanner();
  gain.connect(pan).connect(destination);
  const effects = createEffectRack(ctx, gain);

  // A dead-end tap, not a link in the chain: pan still connects straight to the destination, so
  // the signal the fingerprint measures never passes through this node.
  const meter = ctx.createAnalyser();
  meter.fftSize = METER_WINDOW;
  pan.connect(meter);
  const scratch = new Float32Array(meter.fftSize);

  /**
   * The deck binding: `satisfies` makes this map total, so a new deck id fails to compile until
   * it is wired here. Effect parameters have the same declaration/binding pair inside their
   * owning plugin (0016).
   */
  const targets = {
    "deck.gain": gain.gain,
    "deck.pan": pan.pan,
  } satisfies Record<DeckParamId, AudioParam>;

  for (const id of DECK_PARAM_IDS) targets[id].value = PARAMS[id].default;

  return {
    input: effects.input,
    setParam: (param, value, when) => {
      if (isDeckParam(param)) rampTo(targets[param], value, when);
      else effects.setParam(param, value, when);
    },
    setAutomation: (param, lane, base, when) => {
      // Routed exactly the way setParam is: the deck owns its own AudioParams, and every other
      // registry target is the owning plugin's binding, reached through the rack (0024).
      scheduleAutomation(
        isDeckParam(param) ? targets[param] : effects.automationTarget(param),
        lane,
        base,
        when,
      );
    },
    addEffect: (effect, values) => effects.add(effect, values),
    setEffectBypass: (effect, bypassed) => {
      effects.setBypass(effect, bypassed);
    },
    removeEffect: (effect) => {
      effects.remove(effect);
    },
    reorderEffects: (order) => {
      effects.reorder(order);
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
    dispose: () => {
      effects.dispose();
      gain.disconnect();
      pan.disconnect();
      meter.disconnect();
    },
  };
}
