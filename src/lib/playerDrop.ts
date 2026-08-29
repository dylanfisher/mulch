/**
 * @role Whether one landing sounds at all — the odds it is a hole, declared here rather than in
 *   src/lib/player.ts because that file is at the hard cap and each family of the spec's numbers
 *   now sits in a module of its own beside what reads it (0045, P119, P120).
 * @instead The other odd a landing carries about itself, rolled immediately after this one and on
 *   the same terms → src/lib/playerReverse.ts. The wait *between* two landings, which moves
 *   everything after it → src/lib/playerRest.ts. How hard a repeat is cut inside a landing, which
 *   is floored above silence → `PLAYER_GATE_MIN`, src/lib/player.ts. The roll itself →
 *   src/lib/playerWalk.ts; the dial it is turned on → src/lib/playerKnobs.ts.
 */

/**
 * The odds one landing is a hole: silent, and standing exactly where it stood, 0…1. Zero is every
 * landing sounding, which is what the module did before a landing could be dropped; one is a
 * pattern that plays nothing at all and still keeps its place in the grid.
 *
 * It is neither of the two knobs that can already take sound away. A rest is a wait *between* two
 * landings, measured in slots, and it moves everything after it (0119); a gate cuts inside a
 * repeat and cannot reach silence, because `PLAYER_GATE_FLOOR` floors what a shut one leaves.
 * A hole is the one of the three that leaves the rhythm where it is, which is what lets a figure
 * be said with a gap in it — the same run of slots with one of them silent is 0151's memory heard
 * as syncopation rather than as repetition.
 */
export const PLAYER_DROP_MIN = 0;
export const PLAYER_DROP_MAX = 1;

/**
 * The one field of a `PlayerSpec` that says whether a landing sounds, arranged as the reverse's
 * one and the travel's four are: a family declared where its numbers are
 * (src/lib/playerReverse.ts).
 */
export type DropSpec = {
  /** The odds one landing is silent while keeping its place, 0…1. */
  drop: number;
};
