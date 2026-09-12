/**
 * @role The words the ground says: how to read the strip under the Which Ground fold, what dragging
 *   it does, what the period behind the Every dial is counted in (0192), and the three rows of
 *   words a move is said in — whether the loop wanders, how far, which way (0277). Beside
 *   src/lib/copy.ts rather than in it because that file is at the hard cap (0045, the reason
 *   src/lib/copyKnobs.ts and src/lib/copyStrip.ts are where they are).
 * @instead The fold's heading, which is the card's and not the ground's (`PLAYER_GROUP_LABELS`),
 *   and every other word the interface says → src/lib/copy.ts. What a ground *is* →
 *   src/lib/playerBed.ts. The picture itself → src/ui/PlayerGround.tsx, and the door the period
 *   sits behind → src/ui/PlayerBed.tsx.
 */
import { PLAYER_LABEL, PLAYER_SCOPE_LABEL } from "./copy.ts";
import type { PlayerBedReach, PlayerBedWay } from "./playerBed.ts";
import { PLAYER_SCOPE_LANDINGS } from "./playerScope.ts";

/**
 * How to read the picture, in one sentence: what the three kinds of block on it are, and the one
 * thing a glance has to know — that the window is the control. Said on the fold's own toggle, for
 * the reason the scope's sentence and the written row's are said on their eyebrows (0080, 0188,
 * 0191, 0217): a canvas is not a thing a pointer can rest on or a keyboard can reach.
 */
export const PLAYER_GROUND_TOOLTIP = `The whole sound, with the loop marked on it and the window the pattern is reading drawn over that. Drag the window to move the ground, a loop-length at a time; the dashed blocks are where the pattern's own next moves go. With the ${PLAYER_LABEL} off, dragging moves the loop itself. Option-click anywhere on it to keep that ground, or to let a kept one go. Shift-drag to mark the zone the ground stays inside, and shift-click to clear it back to the whole sound.`;

/**
 * The zone a hand marked, as the two edges it is dragged by and the sentence over them. Not a dial
 * and so not a row of `PLAYER_SONG_KNOBS`: two edges are a place and not an amount, and a place is
 * marked on the picture of the file rather than turned (0318, the argument that put the kept
 * grounds on the strip and not in a box).
 *
 * "Zone" and not "Region": the loop's own strip already calls the span between its handles a
 * region, and one word for two spans on one card is the drift these files exist to prevent (0097).
 */
export const PLAYER_ZONE_LABEL = "Zone";
export const PLAYER_ZONE_FROM = "The near edge of the zone the ground stays inside.";
export const PLAYER_ZONE_TO = "The far edge of the zone the ground stays inside.";

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
 * has to say the quiet case out loud: with nothing arranged there is no part to begin and no round
 * to come round, so both of the arrangement's clocks fall back to one whole row of the scope — the
 * one boundary such a pattern has, and the one a hand can watch go by (0192, principle 5).
 */
export const PLAYER_BED_PER_TOOLTIP = `What the period beside this counts: the pattern's own jumps, the parts of the song, or whole rounds of it. With no parts or songs entered, parts and songs both count one whole row of ${PLAYER_SCOPE_LABEL} — ${PLAYER_SCOPE_LANDINGS} jumps.`;

/**
 * The three rows of words a move is said in, each an eyebrow over its presses and the word each
 * press wears — the switchboard, which won the bench because every word the fold could say is on
 * it at once (0277). The words are `src/lib/playerBed.ts`'s; these are how they are spelled.
 *
 * Whether it moves on its own has to say the quiet case out loud, the way the clocks' sentence
 * does: staying put is not the period at nought, it is coming home on every move the period is
 * due, which is a return a hand hears whenever a kept ground has walked the loop away.
 */
/**
 * Whose ground this yard stands on, as the eyebrow over two presses and the word each wears. The
 * question is *whose* rather than *whether*, because both answers are a ground and a hand is
 * choosing between two of them — a switch would have said the yard's own ground was the absence
 * of something (0313, principle 5).
 *
 * "Together" and not "Sync": the header already carries that word for the shared jump clock, and
 * one word for two shared facts is the drift these files exist to prevent (0097, src/lib/copy.ts).
 */
export const PLAYER_BED_TOGETHER_LABEL = "Whose ground";
export const PLAYER_BED_TOGETHER_LABELS = {
  own: "Its own",
  together: "Together",
} as const;
export const PLAYER_BED_TOGETHER_TOOLTIP = `Whether this yard walks a ground of its own, or stands on the session's — the one every yard set to Together stands on at once, so their loops wander over the same part of the sample instead of drifting apart. While it is together, this yard's own period and the grounds it kept go quiet: the ground is the session's to move, and the rows below say how it moves for every yard on it.`;

/**
 * The shared ground's own period, which is the one clock on the instrument counted in seconds:
 * a yard counts jumps, parts or rounds of its own song, and no two yards need share any of those
 * (0097's argument for the jump clock, said one field along). Its own caption because it is not
 * the yard's `Every` dial — the same word would be two periods on one fold (0313).
 */
export const PLAYER_GROUND_EVERY_LABEL = "Every";
/**
 * And what the shared ground's period is counted in, which is the row Together keeps rather than
 * drops: seconds, or the parts and whole rounds of the one yard leading it. Its own words and not
 * `PLAYER_BED_PER_LABELS`, because those three are jumps, parts and songs of the yard you are
 * looking at and these are seconds and *someone else's* parts (0192, 0313).
 */
export const PLAYER_GROUND_PER_LABEL = "Counted in";
export const PLAYER_GROUND_PER_LABELS = {
  second: "Seconds",
  part: "Parts",
  song: "Songs",
} as const;
export const PLAYER_GROUND_PER_TOOLTIP = `What the period beside this counts for every yard on the shared ground: wall seconds, or the parts or whole rounds of one yard's song. Seconds need no yard named; parts and songs are counted on whichever yard leads, so the loops move when that yard's music does. With no parts or songs entered on that yard, both count one whole row of its ${PLAYER_SCOPE_LABEL} — ${PLAYER_SCOPE_LANDINGS} jumps.`;

/**
 * And which yard that is, as the eyebrow over one press per yard. The one control on the
 * instrument that names a deck from another deck's card, which is why it is here rather than
 * folded away: a period counted in parts is counted in *some yard's* parts, and a hand that cannot
 * see which is reading a clock with no face (0313).
 */
export const PLAYER_GROUND_LEADER_LABEL = "Counting";
export const PLAYER_GROUND_LEADER_TOOLTIP = `Which yard's song the shared ground is counted on. Its parts and rounds are the boundaries every yard on that ground moves at, so the loops move when this yard's music does. It need not be standing on the ground itself — leading it is a source of boundaries and nothing else — and while no yard leads, the ground holds still.`;
export const PLAYER_GROUND_EVERY_TOOLTIP = `How long the session's shared ground stays put before it moves, in seconds. Counted in seconds and not in jumps, because seconds are the one thing yards holding different loops can share — the same reason the header's own clock is in them.`;

/** What the three rows below say while the ground is the session's: the words are the same words,
 *  and what they move is the ground every Together yard is standing on. */
export const PLAYER_GROUND_SHARED_SAID = "This moves the ground every Together yard stands on.";

export const PLAYER_BED_WANDERS_LABEL = "On its own";
export const PLAYER_BED_WANDERS_LABELS = { stays: "Stays put", wanders: "Wanders" } as const;
export const PLAYER_BED_WANDERS_TOOLTIP =
  "Whether a move carries the loop on, or brings it back to the song's own bed. Wanders walks away and keeps walking; stays put comes home on every move that is due, which is a return whenever a kept ground has taken the loop elsewhere.";

export const PLAYER_BED_REACH_LABEL = "How far";
export const PLAYER_BED_REACH_LABELS: Record<PlayerBedReach, string> = {
  nudge: "A nudge",
  bed: "A bed",
  anywhere: "Anywhere",
};
export const PLAYER_BED_REACH_TOOLTIP =
  "How far one move may carry the loop: up to a quarter of a bed, up to one bed, or anywhere in the sample. Counted in the loop's own sixteenths, so a nudge crawls out of step with the sample rather than hopping bed to bed.";

export const PLAYER_BED_WAY_LABEL = "Which way";
export const PLAYER_BED_WAY_LABELS: Record<PlayerBedWay, string> = {
  back: "Back",
  either: "Either way",
  on: "On",
};
export const PLAYER_BED_WAY_TOOLTIP =
  "Which way the loop goes when it moves: always back through the sample, as likely either way, or always on — wrapping at the ends of the sample.";

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
