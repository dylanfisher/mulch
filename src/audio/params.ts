/**
 * @role The parameter registry — every deck and effect parameter, registered once; defaults,
 *       UI, automation and serialization all derive from it.
 */

import type { ParamDeclaration, ParamSpec } from "./effects/contract";
import { EFFECT_PARAMS, type EffectParamId } from "./effects/registry";

export type { ParamSpec } from "./effects/contract";

const DECK_PARAMS = [
  { id: "deck.gain", label: "Gain", min: 0, max: 1.5, default: 1 },
  { id: "deck.pan", label: "Pan", min: -1, max: 1, default: 0 },
] as const satisfies readonly ParamDeclaration[];

export type DeckParamId = (typeof DECK_PARAMS)[number]["id"];
export type ParamId = DeckParamId | EffectParamId;

const declarations: readonly ParamDeclaration<ParamId>[] = [...DECK_PARAMS, ...EFFECT_PARAMS];
const duplicate = declarations.find(
  (candidate, index) => declarations.findIndex(({ id }) => id === candidate.id) !== index,
);
if (duplicate !== undefined) throw new Error(`duplicate param id: ${duplicate.id}`);

/** The one lookup surface. Anything that asks about a deck or effect param asks here. */
// Object.fromEntries cannot retain the declaration tuple's literal key union.
// oxlint-disable-next-line no-unsafe-type-assertion
export const PARAMS = Object.fromEntries(
  declarations.map(({ id, ...spec }) => [id, spec]),
) as Record<ParamId, ParamSpec>;

/**
 * The same registry as a list, for everything that has to visit every param — building a deck's
 * defaults and drawing registry-driven knobs. Derived, so adding a param stays one declaration.
 */
// The keys come straight from PARAMS, so both narrowings below are total — the registry is
// the proof, and this is the one file that gets to say so.
// oxlint-disable no-unsafe-type-assertion
export const PARAM_IDS = Object.keys(PARAMS) as ParamId[];

export const DECK_PARAM_IDS = DECK_PARAMS.map(({ id }) => id);

const deckParamIds = new Set<ParamId>(DECK_PARAM_IDS);
export function isDeckParam(param: ParamId): param is DeckParamId {
  return deckParamIds.has(param);
}

/** Every param at its default — what a fresh deck starts from, derived rather than restated. */
export const PARAM_DEFAULTS = Object.fromEntries(
  PARAM_IDS.map((id) => [id, PARAMS[id].default]),
) as Record<ParamId, number>;
