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
} satisfies Record<string, ParamSpec>;

export type ParamId = keyof typeof DECK_PARAMS;

// Effect files contribute their own params here at M5: { ...DECK_PARAMS, ...effectParams }.
/** The one lookup surface. Anything that asks about a param asks here. */
export const PARAMS: Record<ParamId, ParamSpec> = DECK_PARAMS;
