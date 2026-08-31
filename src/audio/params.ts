/**
 * @role The parameter registry — every deck and effect parameter, declared once; defaults, UI,
 *       automation and serialization all derive from it. A declaration lookup is `PARAMS[param]`;
 *       a value lookup is (instance, param), because a rack holds instances of entries (0030).
 */

import { fold } from "@/lib/copy";
import { clamp } from "@/lib/range";
import { playbackRate } from "@/lib/timeline";
import { TONE_REF_HZ } from "@/lib/waveform";
import type { Effect, EffectInstanceId, ParamDeclaration, ParamSpec } from "./effects/contract";
import {
  EFFECT_PARAMS,
  effectById,
  effectForParam,
  type EffectAutomationParamId,
  type EffectId,
  type EffectParamId,
} from "./effects/registry";

export type { ParamSpec } from "./effects/contract";
export type { EffectAutomationParamId, EffectParamId } from "./effects/registry";

const DECK_PARAMS = [
  {
    id: "deck.gain",
    label: "Gain",
    min: 0,
    max: 1.5,
    default: 1,
    precision: 2,
    automation: "linear",
  },
  {
    id: "deck.pan",
    label: "Pan",
    min: -1,
    max: 1,
    default: 0,
    precision: 2,
    automation: "linear",
  },
  /**
   * How fast the buffer is read, as a multiplier — 0.25× to 4×, which is what the deck shows as
   * a percentage. Logarithmic, so half speed and double speed sit the same distance either side
   * of 1. It claims no BPM: nothing here knows the tempo of what is loaded (0031).
   *
   * Not automatable, and deliberately: a lane would make the rate a continuous function of time,
   * and every piece of position arithmetic on both sides of the worklet seam is written against
   * a rate that is constant between two rebases (0031).
   */
  { id: "deck.speed", label: "Speed", min: 0.25, max: 4, default: 1, precision: 2, curve: "log" },
  /**
   * Pitch in semitones. Without key lock it moves the read rate with it, exactly as speed does —
   * which is also why it is not automatable either: the exclusion above is the rate's, not the
   * pitch's, and it lasts exactly as long as pitch is `detune` on the buffer source (0031).
   */
  { id: "deck.pitch", label: "Pitch", min: -12, max: 12, default: 0, precision: 0, step: 1 },
  /**
   * A tone's pitch in hertz — the parameter that replaced the `hz` a load used to carry, so that
   * changing it moves with the hand and leaves the tone playing (0110). Logarithmic, because a
   * pitch is: the octave either side of the reference sits the same distance either way, and two
   * decimals is the hundredth of a hertz a beat between two yards is dialled in.
   *
   * Not automatable, and for 0031's reason rather than a new one: a tone is the reference buffer
   * read at `hz / TONE_REF_HZ`, so this is the read rate, exactly as speed and pitch are.
   */
  {
    id: "deck.tone",
    label: "Tone",
    min: 20,
    max: 2_000,
    default: TONE_REF_HZ,
    precision: 2,
    curve: "log",
  },
] as const satisfies readonly ParamDeclaration[];

export type DeckParamId = (typeof DECK_PARAMS)[number]["id"];
export type ParamId = DeckParamId | EffectParamId;

const declarations = [
  ...DECK_PARAMS,
  ...EFFECT_PARAMS,
] as const satisfies readonly ParamDeclaration<ParamId>[];
const duplicate = declarations.find(
  (candidate, index) => declarations.findIndex(({ id }) => id === candidate.id) !== index,
);
if (duplicate !== undefined) throw new Error(`duplicate param id: ${duplicate.id}`);

/** The one declaration lookup. Anything that asks what a parameter *is* asks here (0030). */
// Object.fromEntries cannot retain the declaration tuple's literal key union.
// oxlint-disable-next-line no-unsafe-type-assertion
export const PARAMS = Object.fromEntries(
  declarations.map(({ id, ...spec }) => [id, spec]),
) as Record<ParamId, ParamSpec>;

/**
 * The same registry as a list, for everything that has to visit every param — drawing
 * registry-driven knobs and proving the two halves compose. Derived, so adding a param stays one
 * declaration.
 */
// The keys come straight from PARAMS, so both narrowings below are total — the registry is
// the proof, and this is the one file that gets to say so.
// oxlint-disable no-unsafe-type-assertion
export const PARAM_IDS = Object.keys(PARAMS) as ParamId[];

export const DECK_PARAM_IDS = DECK_PARAMS.map(({ id }) => id);

/**
 * Composed from both halves rather than from `declarations`: the effect list flattens to a
 * `ParamDeclaration<EffectParamId>[]`, which keeps the ids and drops each entry's own literals,
 * so the effect half of the union comes from the plugin tuple itself (0024).
 */
export type DeckAutomationParamId = Extract<
  (typeof DECK_PARAMS)[number],
  { automation: "linear" }
>["id"];
export type AutomationParamId = DeckAutomationParamId | EffectAutomationParamId;

export const AUTOMATION_PARAM_IDS = PARAM_IDS.filter(
  (id): id is AutomationParamId => PARAMS[id].automation === "linear",
);
// Two lanes named one word are two lanes a performer cannot tell apart: the automation marker
// and its preview name a lane by its label alone. Every plugin used to write that rule down as a
// note to the next plugin's author; the rule spans the deck's declarations and all of theirs, so
// it is asked once, here, where both halves are visible.
const laneLabels = AUTOMATION_PARAM_IDS.map((id) => PARAMS[id].label);
const sharedLabel = laneLabels.find((label, index) => laneLabels.indexOf(label) !== index);
if (sharedLabel !== undefined) {
  throw new Error(`two automatable params share a label: ${sharedLabel}`);
}
/** The deck's own automatable parameters — the half a deck, rather than an instance, holds. */
export const DECK_AUTOMATION_PARAM_IDS = DECK_PARAM_IDS.filter(
  (id): id is DeckAutomationParamId => PARAMS[id].automation === "linear",
);
const automationParamIds = new Set<string>(AUTOMATION_PARAM_IDS);
export function isAutomationParam(param: unknown): param is AutomationParamId {
  return typeof param === "string" && automationParamIds.has(param);
}

const deckParamIds = new Set<ParamId>(DECK_PARAM_IDS);
export function isDeckParam(param: ParamId): param is DeckParamId {
  return deckParamIds.has(param);
}

/** The effect that declares this parameter, or null when the deck itself owns it. */
export function paramOwner(param: ParamId): EffectId | null {
  return isDeckParam(param) ? null : effectForParam(param);
}

/**
 * The values one effect instance holds — exactly the parameters its own plugin declared, which
 * is a subset of the union no type can name for a heterogeneous rack. The stored-shape validator
 * is the proof that it is exact, and `paramIn` is the one place a missing key becomes a throw
 * (0030), the way `deckIn` is for a deck-keyed map (0029).
 */
export type EffectParamValues = Partial<Record<EffectParamId, number>>;

/** One entry of an instance's values, or a loud throw. The checked half of a value lookup. */
export function paramIn(values: EffectParamValues, param: EffectParamId): number {
  const found = values[param];
  if (found === undefined) throw new TypeError(`instance holds no param: ${param}`);
  return found;
}

/** The parameters one effect declares — the ids one of its instances holds a value for. */
export function effectParamIds(effect: EffectId): EffectParamId[] {
  return effectById(effect).params.map(({ id }) => id);
}

/** The automatable parameters one effect declares — the lanes one of its instances may hold. */
export function effectAutomationParamIds(effect: EffectId): EffectAutomationParamId[] {
  return AUTOMATION_PARAM_IDS.filter(
    (id): id is EffectAutomationParamId => paramOwner(id) === effect,
  );
}

/**
 * Every parameter one effect declares, at its default — what a fresh instance starts from, bar the
 * ones the plugin declared `seeded`, which start at a fold of the instance's own id. The id is the
 * caller's and is written into the command that adds it, so the draw is a fresh one per gesture
 * and the same one on every replay (0076).
 */
export function effectParamDefaults(
  effect: EffectId,
  instance: EffectInstanceId,
): EffectParamValues {
  // Read as the declarations they are: the registry's own type is a union of one literal per
  // parameter, and an optional field is not on every member of it.
  const declared: readonly ParamDeclaration[] = effectById(effect).params;
  return Object.fromEntries(
    declared.map((param) => [
      param.id,
      param.seeded === true
        ? clamp(fold(`${instance}:${param.id}`), param.min, param.max)
        : param.default,
    ]),
  );
}

/**
 * The rate a deck reads its buffer at, from the parameters it is holding — which three they are,
 * said once. The maths is `playbackRate` in src/lib/timeline.ts and stays there; what lives here
 * is the lookup, because this file is where a parameter id is a fact (plan §4, 0110).
 */
export const deckRate = (params: Readonly<Record<DeckParamId, number>>): number =>
  playbackRate(params["deck.speed"], params["deck.pitch"], params["deck.tone"]);

/** Every deck parameter at its default — what a fresh deck starts from, derived not restated. */
export const DECK_PARAM_DEFAULTS = Object.fromEntries(
  DECK_PARAM_IDS.map((id) => [id, PARAMS[id].default]),
) as Record<DeckParamId, number>;

/**
 * A rack, as far as a parameter question is concerned: which instances are held, and what each
 * one is an instance of. Structural on purpose — `src/audio` may not import the durable shape
 * that satisfies it.
 */
export type RackEntries = readonly { id: EffectInstanceId; effect: EffectId }[];

/**
 * The instance half of a param-addressed command: a deck parameter names none at all, so the key
 * is absent rather than present and undefined (0030). Spread into the command, which is why it is
 * an object and not a value — every surface that sends one used to write this ternary itself.
 */
export const instanceHalf = (instance?: EffectInstanceId) =>
  instance === undefined ? {} : { instance };

/**
 * Whether a deck holding `rack` can reach this value at all: the deck owns the parameter and no
 * instance was named, or the named instance is held and its plugin declares the parameter. The
 * single statement of the rule, and the one place the (instance, param) pair is checked — the
 * executor asks it before writing a value or scheduling a lane (0030).
 */
export function paramReachable(
  rack: RackEntries,
  instance: EffectInstanceId | null,
  param: ParamId,
): boolean {
  const owner = paramOwner(param);
  if (instance === null) return owner === null;
  return rack.some((entry) => entry.id === instance && entry.effect === owner);
}

/**
 * One key for one value lookup, so a map of lanes or targets is keyed by the pair rather than by
 * the parameter alone — two delays on one deck are two keys (0030). JSON rather than a separator
 * character, because an instance id is an opaque caller-supplied string and no character in it is
 * reserved.
 */
export function paramKey(instance: EffectInstanceId | null, param: ParamId): string {
  return JSON.stringify([instance, param]);
}

/**
 * How long one rack entry, at the values it is holding, goes on sounding like what it was given —
 * the plugin's own `settle`, reached through the one lookup surface rather than from wherever an
 * export happens to be standing (0016). The cast is here and nowhere else: `effectById` answers a
 * union of plugins, so a value record for one of them satisfies none of the others, and calling
 * across that union is exactly what a base `Effect` is for.
 */
export function effectSettleSecs(effect: EffectId, values: EffectParamValues): number {
  const plugin = effectById(effect) as Effect;
  return plugin.settle(
    Object.fromEntries(effectParamIds(effect).map((id) => [id, paramIn(values, id)])),
  );
}
