/**
 * @role The cast: which characters exist at all, and which of them a drawn arrangement may draw
 *   its parts from — one durable whole number the bits of that list pack into, refused empty
 *   (0174). Pure maths: no clock, no React and no PRNG of its own, because a draw belongs to the
 *   one stream a pattern is a function of and the caller is the one holding it.
 * @instead What each name *means*, and the region a press draws inside → src/lib/playerCharacter.ts.
 *   Where a part's character is drawn → src/lib/playerWalk.ts. The rest of the spec this field is
 *   part of, and the one validator → src/lib/player.ts. The presses that write one →
 *   src/ui/PlayerArrange.tsx.
 */

/**
 * The characters a pattern may be asked to sound like, as a declared enum rather than a free
 * number (0089) — and here rather than beside the regions that say what each of
 * them means, because a song's parts name characters and a song is durable (0153). What a spec is
 * allowed to hold is this module's decision; what a name sounds like is
 * src/lib/playerCharacter.ts's.
 *
 * `plain` is first and is the identity: its region names no knob, so a part drawn as it is the
 * card's own dials and nothing else. Every other one is a direction away from that.
 *
 * Here rather than in src/lib/player.ts since 0174: the mask below is derived from it — bit _n_ is
 * this list's _n_th name — so the names and which of them are permitted are one family of the
 * spec's numbers and sit in a module of its own beside what reads them, the way the grid's and the
 * rest's do (0045, P119, P120).
 *
 * **Order is durable.** A name inserted in the middle moves every bit above it, so a stored cast
 * would mean a different set of names — which pre-release is a spec from another build and
 * discarded, never repaired (0026).
 */
export const PLAYER_CHARACTERS = [
  "plain",
  "stutter",
  "riff",
  "scatter",
  "breathe",
  "slide",
] as const;
export type PlayerCharacter = (typeof PLAYER_CHARACTERS)[number];

/** Whether an outside string is one of the declared characters. A narrowing, not an assertion:
 *  a part's character is the one field of the spec whose value is a name out of a closed list. */
export const isCharacter = (value: unknown): value is PlayerCharacter =>
  PLAYER_CHARACTERS.some((declared) => declared === value);

/**
 * Which of those names a drawn arrangement may draw from, as the one whole number their bits pack
 * into — bit _n_ set is `PLAYER_CHARACTERS[n]` permitted. One number rather than six booleans
 * because it travels in a `deck.player` envelope and is read in a command log: a cast is one thing
 * a hand did, and six fields spread over six lines is one thing spelled six ways (0165, 0174).
 *
 * **An empty cast is refused.** An arrangement that may draw nobody has no part to draw, so the
 * floor is one name rather than none and `assertPlayer` throws on zero rather than letting a spec
 * play quietly (principle 5). The ceiling is every name — the identity, under which a pattern lays
 * down exactly the stream it laid before the field existed.
 */
export const PLAYER_CAST_MIN = 1;
export const PLAYER_CAST_MAX = 2 ** PLAYER_CHARACTERS.length - 1;

/**
 * The one field of a `PlayerSpec` the cast is. Declared here because this is the file that reads
 * it, the way each family of the spec's numbers is (0045).
 */
export type CastSpec = {
  /** Which characters a drawn arrangement may draw from, `PLAYER_CAST_MIN`…`PLAYER_CAST_MAX`. */
  cast: number;
};

/** Whether one name is in a cast. */
export const inCast = (cast: number, character: PlayerCharacter): boolean =>
  (cast & (1 << PLAYER_CHARACTERS.indexOf(character))) !== 0;

/** That cast with one name added or taken out. Pure: the number in, the number out. */
export const withCharacter = (cast: number, character: PlayerCharacter, held: boolean): number => {
  const bit = 1 << PLAYER_CHARACTERS.indexOf(character);
  return held ? cast | bit : cast & ~bit;
};

/** The names a cast permits, in the order they are declared — the list a draw is taken from. */
export const castCharacters = (cast: number): readonly PlayerCharacter[] =>
  PLAYER_CHARACTERS.filter((character) => inCast(cast, character));

/**
 * One character drawn uniformly from those a cast permits, at the cost of exactly one number off
 * the caller's stream — the same one draw an unnarrowed pattern takes, so narrowing the cast
 * changes which name comes up and never how many draws a walk has spent (0089, 0174). Drawn
 * *within* rather than snapped *onto*, which is where this parts from the grid mask 0165 argued:
 * a list of names has no nearest, so there is nothing to snap to (0169, 0174).
 *
 * Throws on an empty cast rather than falling back to a name nobody permitted: reaching it means a
 * spec that came from somewhere other than the validator (principle 5).
 */
export function drawCast(cast: number, random: () => number): PlayerCharacter {
  const named = castCharacters(cast);
  const drawn = named[Math.floor(random() * named.length)];
  if (drawn === undefined) throw new RangeError(`cast ${cast} permits no character`);
  return drawn;
}
