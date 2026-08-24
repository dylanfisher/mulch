/**
 * @role The validated effect registry and O(1) lookups for plugins and parameter ownership.
 * @instead An effect's graph or declarations → its own file in this directory.
 */
import {
  isDriftGeometry,
  LINEAR_GEOMETRY,
  RESERVED_PROFILES,
  STRAIGHT_DIMENSIONS,
} from "@/lib/moire";

import { compressorEffect } from "./compressor";
import { delayEffect } from "./delay";
import { eqEffect } from "./eq";
import { filterEffect } from "./filter";
import { reverbEffect } from "./reverb";
import { tapeEffect } from "./tape";
import type { Effect, ParamDeclaration } from "./contract";

export const EFFECTS = [
  filterEffect,
  delayEffect,
  eqEffect,
  compressorEffect,
  reverbEffect,
  tapeEffect,
] as const;

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
    // — the deck's own lanes, and the reference row the source cuts (0145).
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
    const reached = new Set<string>();
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
      reached.add(into);
    }
    for (const param of effect.params) {
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
