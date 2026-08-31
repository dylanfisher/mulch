/**
 * @role The words the ground says: how to read the strip under the Which Ground fold, what dragging
 *   it does, and what the period behind the Every dial is counted in (0192). Beside
 *   src/lib/copy.ts rather than in it because that file is at the hard cap (0045, the reason
 *   src/lib/copyKnobs.ts and src/lib/copyStrip.ts are where they are).
 * @instead The fold's heading, which is the card's and not the ground's (`PLAYER_GROUP_LABELS`),
 *   and every other word the interface says → src/lib/copy.ts. What a ground *is* →
 *   src/lib/playerBed.ts. The picture itself → src/ui/PlayerGround.tsx, and the door the period
 *   sits behind → src/ui/PlayerBed.tsx.
 */

/**
 * How to read the picture, in one sentence: what the three kinds of block on it are, and the one
 * thing a glance has to know — that the window is the control. Said on the fold's own toggle, for
 * the reason the scope's sentence and the written row's are said on their eyebrows (0080, 0188,
 * 0191, 0217): a canvas is not a thing a pointer can rest on or a keyboard can reach.
 */
export const PLAYER_GROUND_TOOLTIP = `The whole sound, with the loop marked on it and the window the pattern is reading drawn over that. Drag the window to move the ground, a loop-length at a time; the dashed blocks are where the pattern's own next moves go. Option-click anywhere on it to keep that ground, or to let a kept one go.`;

/**
 * What the ground's period is counted in, as the eyebrow over the three presses and the word each
 * of them wears. Plural, because the dial beside them says how many: "Every 4 — parts" (0192).
 */
export const PLAYER_BED_PER_LABEL = "Counted in";
export const PLAYER_BED_PER_LABELS = {
  jump: "Jumps",
  part: "Parts",
  song: "Songs",
} as const;

/**
 * And what choosing one does, said as when the loop moves rather than as which counter ticks. It
 * has to say the quiet case out loud: a pattern with no song never moves its ground on either of
 * the arrangement's clocks, because there is no part to begin and no round to come round
 * (principle 5, 0158, the refusal `PLAYER_CAST_TOOLTIP` makes for the cast).
 */
export const PLAYER_BED_PER_TOOLTIP =
  "What the period beside this counts: the pattern's own jumps, the parts of the song, or whole rounds of it. A pattern with no song never moves at all on parts or songs.";

/**
 * The grounds a hand kept, as the eyebrow over the row of them and the words each gesture on it
 * says. A kept ground is a loop the performance comes back to on a count of its own (0194), so
 * every sentence here is about *when* it comes round rather than about where it is — where it is
 * is the picture above the row, which is the one place that answers it.
 *
 * Here rather than in src/lib/copy.ts for the reason the three clocks above are: that file is at
 * the hard cap and these are the ground's own words (0045).
 */
export const PLAYER_BEDS_LABEL = "Kept grounds";
export const PLAYER_BEDS_TOOLTIP = `Grounds worth coming back to. Each one comes round on a count of its own — every 4 parts, every 16 — and takes that move over from the wandering, so a loop you liked returns instead of being walked past. The count is in whatever the Every dial is counted in.`;

/** What the count on the lit one is called, which is the word the dial in the box already wears. */
export const PLAYER_BEDS_EVERY = "Every";

/**
 * The three gestures on the row. Keeping one reads the ground the window is on rather than asking
 * for a number, which is the whole of why it is a press: a hand keeps the ground it is looking at
 * (0194, 0226).
 *
 * And the two reasons the press is unavailable, said in its own words rather than left to a dead
 * control: a `+` that adds nothing has to say which of the two it is, because the row already
 * holding this ground and the row being full look identical from outside (principle 5). Said as
 * the accessible name and not only as the tooltip — a disabled control opens no tooltip.
 */
export const PLAYER_BEDS_KEEP = "Keep the ground the window is on, so the song comes back to it.";
export const PLAYER_BEDS_KEPT =
  "The ground the window is on is already kept — move the window, or let this one go below.";
export const PLAYER_BEDS_FULL = "Nothing more can be kept — let one go before keeping another.";
export const PLAYER_BEDS_SELECT = "Show this kept ground's count.";
export const PLAYER_BEDS_REMOVE = "Stop coming back to this ground.";

/** And what the row says while nothing is kept, which is the ground as it was before one could be. */
export const PLAYER_BEDS_EMPTY = "Nothing kept — the ground only wanders.";

/** One kept ground, read out: which ground it is, and how often the song comes back to it. */
export const bedsReadout = (bed: number, every: number): string =>
  `${bed > 0 ? `+${bed}` : bed} \u00D7${every}`;
