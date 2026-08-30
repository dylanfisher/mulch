/**
 * @role The validated effect registry and O(1) lookups for plugins and parameter ownership.
 * @instead An effect's graph or declarations → its own file in this directory.
 */
import { isDriftGeometry, LINEAR_GEOMETRY, STRAIGHT_DIMENSIONS } from "@/lib/moire";
import { RESERVED_PROFILES } from "@/lib/moireProfiles";

import { compressorEffect } from "./compressor";
import { delayEffect } from "./delay";
import { eqEffect } from "./eq";
import { filterEffect } from "./filter";
import { popEffect } from "./pop";
import { reverbEffect } from "./reverb";
import { tapeEffect } from "./tape";
import { createAutomator, drawnParamIds, type GrowablePlugin } from "./automator";
// A registry's dependencies *are* its entries: the list grows by exactly one import per plugin, so
// the cap is a count of how many effects the instrument has rather than of how tangled this file
// is. Waived here, at the last import, rather than raised for the tree (0007).
// oxlint-disable-next-line import/max-dependencies
import type { Effect, ParamDeclaration } from "./contract";

/**
 * The entries an automator may draw from: every one that declared a presence of its own, which is
 * every one but the automator (0202). Named before `EFFECTS` because the automator is built from
 * it, and built by a factory rather than imported whole because this module and that one cannot
 * both import each other — see `createAutomator` (0203).
 */
const growable = [
  filterEffect,
  delayEffect,
  eqEffect,
  compressorEffect,
  reverbEffect,
  tapeEffect,
  popEffect,
] as const;

/**
 * Whether an entry says how it is turned down to nothing — which is what an automator needs of
 * anything it means to fade in and out, and the one thing that keeps an automator out of its own
 * pool (0202).
 */
export const isGrowable = <T extends Effect>(effect: T): effect is T & GrowablePlugin =>
  "param" in effect.presence;

export const EFFECTS = [...growable, createAutomator(growable.filter(isGrowable))] as const;

/**
 * Every parameter a run may draw, and so every one a hand may put a window on: the drawn
 * parameters of each entry in the automator's own pool, in the order the pool holds them and the
 * order each entry's card draws them. One reading, shared by the durable shape that stores a
 * window, the popover that offers one and the run that draws inside it — a second list here is
 * exactly the "forty-two automator parameters" this arrangement exists to refuse (0208).
 */
// The ids came from the same literal plugin tuple the union above is derived from.
// oxlint-disable-next-line no-unsafe-type-assertion
export const BOUNDABLE_PARAM_IDS = growable
  .filter((plugin) => isGrowable(plugin))
  .flatMap((plugin) => drawnParamIds(plugin)) as readonly EffectParamId[];

const boundable = new Set<string>(BOUNDABLE_PARAM_IDS);

/** Whether a hand may put a window on this parameter — the wire's half of the list above. */
export function isBoundableParam(value: unknown): value is EffectParamId {
  return typeof value === "string" && boundable.has(value);
}

export type EffectId = (typeof EFFECTS)[number]["id"];
type ParamsOf<T> = T extends Effect<string, infer Params> ? Params[number]["id"] : never;
export type EffectParamId = ParamsOf<(typeof EFFECTS)[number]>;
/** The effect parameters whose declaration opted into automation — the type half of 0024. */
type AutomationParamsOf<T> =
  T extends Effect<string, infer Params>
    ? Extract<Params[number], { automation: "linear" }>["id"]
    : never;
export type EffectAutomationParamId = AutomationParamsOf<(typeof EFFECTS)[number]>;

// One rule per paragraph over one list of entries, each throwing with the id it read. Splitting it
// would put half a registry's contract in a helper nobody would think to read beside the other half.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function validateEffects(effects: readonly Effect[]): void {
  const effectIds = new Set<string>();
  const paramIds = new Set<string>();
  const profiles = new Set<string>();
  for (const effect of effects) {
    if (effectIds.has(effect.id)) throw new Error(`duplicate effect id: ${effect.id}`);
    effectIds.add(effect.id);
    // The look each entry claims in the drift picture, answered here rather than left to the
    // painter (0122): two entries cut to one profile draw the same kind of row, which is the
    // complaint the field exists to close, and the reserved ones belong to the rows no effect owns
    // — the deck's own lanes, the reference row the source cuts, and the jumps module's, which is
    // cut to one of these two by whichever part is standing (0145, 0212).
    if (RESERVED_PROFILES.includes(effect.drift)) {
      throw new Error(`effect claims a reserved drift profile: ${effect.id}`);
    }
    if (profiles.has(effect.drift)) {
      throw new Error(`duplicate effect drift profile: ${effect.drift}`);
    }
    profiles.add(effect.drift);
    // And the coordinate it cuts them along. Not claimed exclusively the way the wave is — two
    // rooms are both radial — so what is refused here is a geometry the picture has no maths for,
    // which would otherwise reach the painter as a row nothing draws (0122, 0142).
    if (!isDriftGeometry(effect.geometry)) {
      throw new Error(`unknown effect drift geometry: ${effect.id}`);
    }
    // And how its own values reach that row, answered here for the same reason (0122, 0139): an
    // entry that declares none draws a row folded out of an instance's id alone, which is a
    // picture of what a rack holds rather than of what it is set to.
    if (effect.driftFrom.length === 0) {
      throw new Error(`effect declares no drift mapping: ${effect.id}`);
    }
    const owned = new Set<string>(effect.params.map((param) => param.id));
    // The same list keyed, because a presence is checked against its parameter's own range and
    // lane rather than only against the set of names (0202).
    const specs = new Map(effect.params.map((param) => [param.id, param] as const));
    const reached = new Set<string>();
    /** Every parameter this entry has said something about, either way. */
    const claimed = new Set<string>();
    for (const { param, into } of effect.driftFrom) {
      if (!owned.has(param)) {
        throw new Error(`effect maps a drift value it does not own: ${effect.id}.${param}`);
      }
      if (reached.has(into)) {
        throw new Error(`two drift values reach one dimension: ${effect.id}.${into}`);
      }
      // A sweep and an octave stack are both a second spacing across the picture, which a straight
      // row gets from a matrix on a tile it shares and a curved one could only get from a
      // picture-sized bake of its own. The painter reads them on a straight row and on no other,
      // and they are refused here rather than dropped there: a mapping that reaches nothing is the
      // silence a registry answers for (0122, 0142, 0143).
      if (STRAIGHT_DIMENSIONS.includes(into) && effect.geometry !== LINEAR_GEOMETRY) {
        throw new Error(
          `a curved effect cannot claim a straight row's ${into}: ${effect.id}.${param}`,
        );
      }
      if (claimed.has(param)) {
        throw new Error(`a drift value is declared more than once: ${effect.id}.${param}`);
      }
      reached.add(into);
      claimed.add(param);
    }
    // And what it deliberately says nothing with. An entry that ran out of dimensions to claim and
    // one that decided a value has no honest place in the picture read identically from outside, so
    // every parameter is in exactly one of the two lists and neither list may be quietly short: a
    // silence is a reason nobody wrote down (0122, 0148).
    for (const { param, because } of effect.driftUnreached ?? []) {
      if (!owned.has(param)) {
        throw new Error(`effect declares a value it does not own unreached: ${effect.id}.${param}`);
      }
      // Said once, either way: a parameter in both lists and a parameter twice in this one are the
      // same contradiction — the entry gives two answers about one value.
      if (claimed.has(param)) {
        throw new Error(`a drift value is declared more than once: ${effect.id}.${param}`);
      }
      if (because.trim().length === 0) {
        throw new Error(`effect declares a value unreached for no reason: ${effect.id}.${param}`);
      }
      claimed.add(param);
    }
    // How this entry is turned down to nothing, which no two of them spell alike (0202). Checked
    // here, at load, for the reason the drift declarations are: a presence naming a parameter its
    // entry does not own, or standing outside that parameter's own range, is a fade onto nothing.
    const presence = effect.presence;
    if ("none" in presence) {
      if (presence.none.trim().length === 0) {
        throw new Error(`effect declares no presence for no reason: ${effect.id}`);
      }
    } else {
      const spec = specs.get(presence.param);
      if (spec === undefined) {
        throw new Error(`effect names a presence it does not own: ${effect.id}.${presence.param}`);
      }
      if (presence.silent < spec.min || presence.silent > spec.max) {
        throw new Error(`effect is silent outside its own range: ${effect.id}.${presence.param}`);
      }
      // A fade is a schedule laid on the bound AudioParam, and only a parameter that declared a
      // lane has one to lay it on — otherwise the move comes through the manual join and is capped
      // at PARAM_RAMP_SECS, which is a step and not a fade (src/audio/ramp.ts).
      if (spec.automation !== "linear") {
        throw new Error(`a presence must be schedulable: ${effect.id}.${presence.param}`);
      }
      // What "all the way in" means, where the default cannot say it.
      if (presence.full !== undefined) {
        if (presence.full < spec.min || presence.full > spec.max) {
          throw new Error(`effect is full outside its own range: ${effect.id}.${presence.param}`);
        }
        if (presence.full === presence.silent) {
          throw new Error(`effect is full where it is silent: ${effect.id}.${presence.param}`);
        }
      } else if (spec.default === presence.silent) {
        // The EQ's own case, caught here rather than left to sound like nothing: an entry whose
        // default is its silence has to say what being present means.
        throw new Error(`effect is silent at its own default: ${effect.id}.${presence.param}`);
      }
      const heldSeen = new Set<string>();
      for (const id of presence.held ?? []) {
        if (!owned.has(id))
          throw new Error(`effect holds a value it does not own: ${effect.id}.${id}`);
        if (id === presence.param)
          throw new Error(`effect holds its own presence: ${effect.id}.${id}`);
        if (heldSeen.has(id)) throw new Error(`effect holds one value twice: ${effect.id}.${id}`);
        heldSeen.add(id);
      }
    }

    for (const param of effect.params) {
      if (!claimed.has(param.id)) {
        throw new Error(`effect is silent about a value of its own: ${effect.id}.${param.id}`);
      }
      if (paramIds.has(param.id)) throw new Error(`duplicate effect param id: ${param.id}`);
      // A lane asks for a value per point, which is the rate a `rebuild` exists to refuse, and no
      // gesture ends between two points. Declaring both is declaring a contradiction (0090).
      if (param.rebuild === true && param.automation !== undefined) {
        throw new Error(`a rebuild param cannot take a lane: ${param.id}`);
      }
      paramIds.add(param.id);
    }
  }
}

validateEffects(EFFECTS);

const effectsById = new Map<EffectId, (typeof EFFECTS)[number]>(
  EFFECTS.map((effect) => [effect.id, effect]),
);
const owners = new Map<EffectParamId, EffectId>();
for (const effect of EFFECTS) {
  for (const param of effect.params) owners.set(param.id, effect.id);
}

export const EFFECT_IDS = EFFECTS.map((effect) => effect.id);
const effectIds = new Set<string>(EFFECT_IDS);

export function isEffectId(value: unknown): value is EffectId {
  return typeof value === "string" && effectIds.has(value);
}

// The declaration ids came directly from the literal plugin tuple; this keeps the flattened
// runtime list and its derived union paired without restating either.
// oxlint-disable-next-line no-unsafe-type-assertion
export const EFFECT_PARAMS = EFFECTS.flatMap(
  (effect) => effect.params as readonly ParamDeclaration[],
) as readonly ParamDeclaration<EffectParamId>[];

export function effectById(id: EffectId): (typeof EFFECTS)[number] {
  const effect = effectsById.get(id);
  if (effect === undefined) throw new Error(`unknown effect: ${id}`);
  return effect;
}

export function effectForParam(param: EffectParamId): EffectId {
  const effect = owners.get(param);
  if (effect === undefined) throw new Error(`no effect owns param: ${param}`);
  return effect;
}
