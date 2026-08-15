/**
 * @role The parameter registry — every deck and effect parameter, registered once; defaults,
 *       UI, automation and serialization all derive from it.
 */

import type { ParamDeclaration, ParamSpec } from "./effects/contract";
import {
  EFFECT_PARAMS,
  effectForParam,
  type EffectAutomationParamId,
  type EffectId,
  type EffectParamId,
} from "./effects/registry";

export type { ParamSpec } from "./effects/contract";

const DECK_PARAMS = [
  {
    id: "deck.gain",
    label: "Gain",
    min: 0,
    max: 1.5,
    default: 1,
    automation: "linear",
  },
  { id: "deck.pan", label: "Pan", min: -1, max: 1, default: 0 },
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

/**
 * Composed from both halves rather than from `declarations`: the effect list flattens to a
 * `ParamDeclaration<EffectParamId>[]`, which keeps the ids and drops each entry's own literals,
 * so the effect half of the union comes from the plugin tuple itself (0024).
 */
export type AutomationParamId =
  | Extract<(typeof DECK_PARAMS)[number], { automation: "linear" }>["id"]
  | EffectAutomationParamId;

export const AUTOMATION_PARAM_IDS = PARAM_IDS.filter(
  (id): id is AutomationParamId => PARAMS[id].automation === "linear",
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
 * Whether a deck holding `effects` can reach this parameter at all: the deck owns it, or the
 * effect declaring it is in the rack. The single statement of the rule — the picker asks it to
 * list targets, and the executor and the restore stage ask it before scheduling a lane, so a lane
 * retained across an effect's removal is offered and scheduled by the same one answer (0024).
 */
export function paramReachable(effects: readonly EffectId[], param: ParamId): boolean {
  const owner = paramOwner(param);
  return owner === null || effects.includes(owner);
}

/**
 * The automation targets a deck holding `effects` has right now: every registry entry that opted
 * in, minus the ones an absent effect declares. The one derivation the picker, the editor, the
 * knob highlight and the scheduling guard all read (0024).
 */
export function automationTargets(effects: readonly EffectId[]): AutomationParamId[] {
  return AUTOMATION_PARAM_IDS.filter((param) => paramReachable(effects, param));
}

/** Every param at its default — what a fresh deck starts from, derived rather than restated. */
export const PARAM_DEFAULTS = Object.fromEntries(
  PARAM_IDS.map((id) => [id, PARAMS[id].default]),
) as Record<ParamId, number>;
