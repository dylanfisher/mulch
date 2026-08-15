/**
 * @role The one deck signal chain. `buildDeckChain(ctx)` serves the live context and the offline
 *   render alike — there is never a second implementation of the chain for rendering.
 * @instead A parameter's range, label or default → src/audio/params.ts. Effect graph bindings →
 *   the owning plugin in src/audio/effects/.
 */
import { createEffectRack } from "./effects/rack";
import type { EffectInstanceId } from "./effects/contract";
import type { EffectId, EffectParamId } from "./effects/registry";
import type { AutomationPoint } from "@/lib/automation";
import {
  DECK_PARAM_IDS,
  isDeckParam,
  PARAMS,
  type AutomationParamId,
  type DeckParamId,
  type EffectParamValues,
  type ParamId,
} from "./params";
import { rampTo, scheduleAutomation } from "./ramp";

/**
 * The meter's window. 1024 frames is ~21ms at 48kHz — long enough that a level survives between
 * two frames of a 60fps read, short enough to still be "now". It is an analysis size, not a
 * spectrum: nothing here ever asks for frequency data.
 */
const METER_WINDOW = 1024;

/**
 * The narrowing an instance-scoped routing needs: a parameter reached through the rack is one of
 * an effect's, and a deck parameter arriving with an instance id is malformed rather than a
 * different binding to find (0030).
 */
const asEffectParam = (param: ParamId): EffectParamId => {
  if (isDeckParam(param)) throw new Error(`deck param names no instance: ${param}`);
  return param;
};

export type DeckChain = {
  /** What a source connects into. The chain's own output is already wired to `destination`. */
  input: AudioNode;
  /** `instance` is null for a deck parameter and the rack entry's id for an effect's (0030). */
  setParam(instance: EffectInstanceId | null, param: ParamId, value: number, when: number): void;
  /** Schedule one lane against the pass beginning at `origin` — see src/audio/ramp.ts. */
  setAutomation(
    instance: EffectInstanceId | null,
    param: AutomationParamId,
    lane: readonly AutomationPoint[],
    base: number,
    origin: number,
  ): void;
  addEffect(instance: EffectInstanceId, effect: EffectId, values: EffectParamValues): number;
  setEffectBypass(instance: EffectInstanceId, bypassed: boolean): void;
  removeEffect(instance: EffectInstanceId): void;
  reorderEffects(order: readonly EffectInstanceId[]): void;
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

  /** A deck's own binding, or the loud version of "that parameter belongs to an instance". */
  const deckTarget = (param: ParamId): AudioParam => {
    if (!isDeckParam(param)) throw new Error(`effect param needs an instance: ${param}`);
    return targets[param];
  };

  return {
    input: effects.input,
    setParam: (instance, param, value, when) => {
      if (instance === null) {
        rampTo(deckTarget(param), value, when);
        return;
      }
      effects.setParam(instance, asEffectParam(param), value, when);
    },
    setAutomation: (instance, param, lane, base, origin) => {
      // Routed exactly the way setParam is: the deck owns its own AudioParams, and every other
      // registry target is the owning plugin's binding on one named instance (0024, 0030).
      scheduleAutomation(
        instance === null
          ? deckTarget(param)
          : effects.automationTarget(instance, asEffectParam(param)),
        lane,
        base,
        origin,
      );
    },
    addEffect: (instance, effect, values) => effects.add(instance, effect, values),
    setEffectBypass: (instance, bypassed) => {
      effects.setBypass(instance, bypassed);
    },
    removeEffect: (instance) => {
      effects.remove(instance);
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
