/**
 * @role The parameter registry — every deck and effect parameter, registered once; defaults,
 *       UI, automation and serialization all derive from it.
 */

export type ParamSpec = {
  label: string;
  min: number;
  max: number;
  default: number;
  /**
   * Discrete choices are stepped integers with labelled values, the way plugin hosts do it —
   * every param value stays a number, so `param.set` never grows a union type (0009, plan §1).
   */
  step?: number;
  curve?: "log";
};

const DECK_PARAMS = {
  "deck.gain": { label: "Gain", min: 0, max: 1.5, default: 1 },
  "deck.pan": { label: "Pan", min: -1, max: 1, default: 0 },
} satisfies Record<string, ParamSpec>;

export type ParamId = keyof typeof DECK_PARAMS;

// Effect files contribute their own params here at M5: { ...DECK_PARAMS, ...effectParams }.
/** The one lookup surface. Anything that asks about a param asks here. */
export const PARAMS: Record<ParamId, ParamSpec> = DECK_PARAMS;

/**
 * The same registry as a list, for everything that has to visit every param — building a deck's
 * defaults, binding the chain, drawing a rack of knobs. Derived, so adding a param stays one line.
 */
// The keys come straight from PARAMS, so both narrowings below are total — the registry is
// the proof, and this is the one file that gets to say so.
// oxlint-disable no-unsafe-type-assertion
export const PARAM_IDS = Object.keys(PARAMS) as ParamId[];

/** Every param at its default — what a fresh deck starts from, derived rather than restated. */
export const PARAM_DEFAULTS = Object.fromEntries(
  PARAM_IDS.map((id) => [id, PARAMS[id].default]),
) as Record<ParamId, number>;
