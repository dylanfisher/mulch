/**
 * @role The one deck signal chain. `buildDeckChain(ctx)` serves the live context and the offline
 *   render alike — there is never a second implementation of the chain for rendering.
 * @instead A parameter's range, label or default → src/audio/params.ts. Effect graph bindings →
 *   the owning plugin in src/audio/effects/.
 */
import { createEffectRack } from "./effects/rack";
import type { EffectInstanceId, GrownEffect } from "./effects/contract";
import type { GrowthBounds } from "@/lib/effectGrowth";
import { effectById, type EffectId, type EffectParamId } from "./effects/registry";
import type { AutomationPoint } from "@/lib/automation";
import { crestFactor, peakMagnitude } from "@/lib/peaks";
import { fromIds } from "@/lib/records";
import { CENTS_PER_SEMITONE, toneCents } from "@/lib/timeline";
import {
  deckRate,
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
export const METER_WINDOW = 1024;

/**
 * The narrowing an instance-scoped routing needs: a parameter reached through the rack is one of
 * an effect's, and a deck parameter arriving with an instance id is malformed rather than a
 * different binding to find (0030).
 */
const asEffectParam = (param: ParamId): EffectParamId => {
  if (isDeckParam(param)) throw new Error(`deck param names no instance: ${param}`);
  return param;
};

/** The mirror narrowing: a value reached without an instance is one the deck itself owns. */
const asDeckParam = (param: ParamId): DeckParamId => {
  if (!isDeckParam(param)) throw new Error(`effect param needs an instance: ${param}`);
  return param;
};

/**
 * Whether this parameter is heard as the source's `detune`. Two of them are — pitch in semitones
 * and a tone's in hertz — and one AudioParam takes their sum, which is why a node value is read
 * off the whole `held` map rather than off the one parameter that moved (0110).
 */
const detuned = (param: DeckParamId): boolean => param === "deck.pitch" || param === "deck.tone";

/**
 * Whether this parameter is read by the transport's own arithmetic rather than only heard. A
 * rate parameter steps at `when` instead of ramping over PARAM_RAMP_SECS, because the plan both
 * sides of the worklet seam compute against carries one rate from one instant — a ramp would
 * make the true position an integral nobody can invert (0031).
 */
const stepped = (param: DeckParamId): boolean => param === "deck.speed" || detuned(param);

export type DeckChain = {
  /** What a source connects into. The chain's own output is already wired to `destination`. */
  input: AudioNode;
  /**
   * Hold the source the transport is currently playing, or `null` when it has stopped. Speed and
   * pitch are declared deck parameters like any other, but the AudioParams they bind to live on
   * the buffer source rather than on a node this chain owns — so the chain keeps their values
   * and writes them onto each source it is handed. A rate set while stopped is heard on the next
   * play, and a rate set while playing is a step on the running source (0031).
   */
  bindSource(source: AudioBufferSourceNode | null): void;
  /** Buffer seconds per wall second, from the speed and pitch this chain is holding (0031). */
  rate(): number;
  /** `instance` is null for a deck parameter and the rack entry's id for an effect's (0030). */
  setParam(instance: EffectInstanceId | null, param: ParamId, value: number, when: number): void;
  /** The hand let go: every rebuild the rack held through the drag is paid for now (P63). */
  endGesture(): void;
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
  /** The windows a hand has put on what one held instance draws (0208). */
  setEffectBounds(instance: EffectInstanceId, bounds: GrowthBounds): void;
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
  /**
   * The crest of a window of this deck's own end: its peak over its RMS, which falls as reverb,
   * delay and saturation fill the gaps between the transients — how *washed* the yard sounds, in
   * the raw unit the reading is taken in, exactly as `level` above is raw (0213). Higher is drier,
   * and a window with nothing in it reads 0, the way a crest says it measured nothing. Its own read
   * of the same analyser rather than a second look at `level`'s window: two dead-end reads of one
   * node, each allocation-free, and neither depends on the other having been called.
   * The deck's end rather than the master's because what rests on it is a yard's own picture.
   */
  crest(): number;
  /**
   * What every effect instance in this deck's rack that exposes a meter is reading, written into
   * `out` and refilled in place — the other per-frame read of the graph, beside `level` (0128).
   */
  meters(out: Map<EffectInstanceId, number>): void;
  /** Advance every held instance that grows something of its own, up to `now + horizon` (0204). */
  pumpEffects(now: number, horizon: number): void;
  /** What each of them is holding, keyed by instance and refilled in place (0070). */
  growth(out: Map<EffectInstanceId, GrownEffect[]>): void;
  /** The session's shared clock, pushed down to whatever paces itself by it (0097). */
  setSync(sync: number | null): void;
  /** Whether anything in the rack has a pump, so a deck ticks only where it must. */
  pumping(): boolean;
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

  /** The source the transport is playing, or null between a stop and the next play. */
  let source: AudioBufferSourceNode | null = null;

  /** Every deck parameter's current value. The chain's own copy, and the one it replays. */
  const held = fromIds(DECK_PARAM_IDS, (id) => PARAMS[id].default);

  /**
   * The deck binding: `satisfies` makes this map total, so a new deck id fails to compile until
   * it is wired here. Effect parameters have the same declaration/binding pair inside their
   * owning plugin (0016). Gain and pan bind to nodes this chain owns and are always there; speed
   * and pitch bind to the buffer source, which exists only while something is playing, so they
   * answer null in between and `bindSource` replays them onto the next one (0031).
   */
  const targets = {
    "deck.gain": () => gain.gain,
    "deck.pan": () => pan.pan,
    "deck.speed": () => source?.playbackRate ?? null,
    "deck.pitch": () => source?.detune ?? null,
    "deck.tone": () => source?.detune ?? null,
  } satisfies Record<DeckParamId, () => AudioParam | null>;

  /** A parameter's value in the unit its AudioParam is declared in — cents is the one conversion. */
  const inNodeUnits = (param: DeckParamId): number =>
    detuned(param)
      ? held["deck.pitch"] * CENTS_PER_SEMITONE + toneCents(held["deck.tone"])
      : held[param];

  const write = (param: DeckParamId, value: number, when: number): void => {
    held[param] = value;
    const target = targets[param]();
    if (target === null) return;
    if (stepped(param)) {
      target.cancelScheduledValues(when);
      target.setValueAtTime(inNodeUnits(param), when);
      return;
    }
    rampTo(target, inNodeUnits(param), when);
  };

  for (const id of DECK_PARAM_IDS) {
    const target = targets[id]();
    if (target !== null) target.value = inNodeUnits(id);
  }

  /**
   * The bound AudioParam a deck lane is scheduled onto, or a loud no for one with none. A lane's
   * values reach it unconverted, which is correct exactly while pitch — the one parameter whose
   * declared unit is not its node's — is not automatable (0031).
   */
  const deckTarget = (param: ParamId): AudioParam => {
    const target = targets[asDeckParam(param)]();
    if (target === null) throw new Error(`deck param has no live binding: ${param}`);
    return target;
  };

  return {
    input: effects.input,
    bindSource: (next) => {
      source = next;
      if (next === null) return;
      // Straight onto the node rather than through `write`: this is construction, not a move,
      // and the source has not started yet.
      next.playbackRate.value = held["deck.speed"];
      next.detune.value = inNodeUnits("deck.pitch");
    },
    rate: () => deckRate(held),
    setParam: (instance, param, value, when) => {
      if (instance === null) {
        write(asDeckParam(param), value, when);
        return;
      }
      effects.setParam(instance, asEffectParam(param), value, when);
    },
    endGesture: () => {
      effects.endGesture();
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
        // The clock the rendering thread has actually reached, which is what decides how the
        // cycle holds what came before it. Not the lane clock the caller placed `origin` with:
        // that one is held a lookahead ahead of the thread, and offline the whole horizon is
        // armed before the render reaches any of it (0102).
        ctx.currentTime,
      );
    },
    // The registry lookup happens here rather than in the rack, which may not reach the registry
    // at all: it is imported from inside it (0203).
    addEffect: (instance, effect, values) => effects.add(instance, effectById(effect), values),
    setEffectBounds: (instance, bounds) => {
      effects.setBounds(instance, bounds);
    },
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
      return peakMagnitude(scratch);
    },
    crest: () => {
      meter.getFloatTimeDomainData(scratch);
      return crestFactor(scratch);
    },
    pumpEffects: (now, horizon) => {
      effects.pump(now, horizon);
    },
    growth: (out) => {
      effects.growth(out);
    },
    setSync: (sync) => {
      effects.setSync(sync);
    },
    pumping: () => effects.pumping(),
    meters: (out) => {
      effects.meters(out);
    },
    dispose: () => {
      effects.dispose();
      gain.disconnect();
      pan.disconnect();
      meter.disconnect();
    },
  };
}
