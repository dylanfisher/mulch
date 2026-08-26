/**
 * @role Which way one landing reads its slot — the odds a landing plays backwards, declared here
 *   rather than in src/lib/player.ts because that file is at the hard cap and each family of the
 *   spec's numbers now sits in a module of its own beside what reads it (0045, P119, P120).
 * @instead Where a landing reads *from*, which is a fact about the grid →
 *   src/lib/playerSlots.ts (`PLAYER_SLOTS`, `PLAYER_DISTANCE_MIN`). Which way the walk leans between two landings →
 *   src/lib/playerTravel.ts, which is the jump and not the read. What a reversed landing actually
 *   plays — a reversed copy of the deck's buffer, mirrored on the same slot → src/audio/player.ts,
 *   the one thing that may move a read position. The dial it is turned on →
 *   src/lib/playerKnobs.ts.
 */

/**
 * The odds one landing reads its slot backwards, 0…1. Zero is every landing read the way the
 * sample runs, which is what the module did before a landing could be reversed; one plays the
 * whole pattern backwards while the pattern itself still walks the grid forwards.
 *
 * A chance rather than a switch, and rolled per landing the way the drop and the vary are, so a
 * pattern that reverses nothing rolls nothing and lays down the stream it laid before this field
 * existed (0160, P87). What it moves is the grain and never the rhythm: the landing keeps its
 * slot, its count and its window, and the only thing that changes is which end of the slot it
 * starts at — which is why it stands beside the drop in its own box rather than behind a door,
 * since it shapes no drawn number (0124).
 */
export const PLAYER_REVERSE_MIN = 0;
export const PLAYER_REVERSE_MAX = 1;

/**
 * The one field of a `PlayerSpec` that says how a landing reads, arranged as the travel's four and
 * the wait's five are: a family declared where its numbers are (src/lib/playerTravel.ts).
 */
export type ReverseSpec = {
  /** The odds one landing reads its slot backwards, 0…1. */
  reverse: number;
};
