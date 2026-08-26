/**
 * @role The three boxes of dials one voice of the mulcher is: where a jump lands, how the landing
 *   sounds, and how it is timed. Drawn by the card for the pattern it holds and by a part's own
 *   fold for the numbers that part carries, so the dials a hand reaches for are one set of boxes in
 *   one order however it got to them (0173, 0176).
 * @instead The fourth box, which is the song's own and never a part's → src/ui/PlayerCard.tsx.
 *   The dial itself → src/ui/PlayerDial.tsx; the box around a set of them → src/ui/PlayerGroup.tsx;
 *   the words on them → src/lib/copy.ts and src/lib/copyKnobs.ts.
 */
// Over the dependency cap, and what is over it is one dial per number the module declares plus the
// six doors that hold the rest: the count is the size of that vocabulary and not a judgement of
// this file's. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import type { ReactNode } from "react";

import { PLAYER_GROUP_LABELS } from "@/lib/copy";
import { PlayerDial } from "@/ui/PlayerDial";
import { PlayerDistance } from "@/ui/PlayerDistance";
import { PlayerGroup } from "@/ui/PlayerGroup";
import type { PlayerDoorProps } from "@/ui/PlayerMore";
import { PlayerPhrase } from "@/ui/PlayerPhrase";
import { PlayerRate } from "@/ui/PlayerRate";
import { PlayerRepeats } from "@/ui/PlayerRepeats";
import { PlayerRest } from "@/ui/PlayerRest";
import { PlayerVary } from "@/ui/PlayerVary";
// oxlint-enable import/max-dependencies

/**
 * A function returning the boxes rather than a component wrapping them, and called rather than
 * mounted. What a part's fold and the card draw is *the same three boxes*, not a thing that owns
 * them: a component here would put a node in the tree that holds no state, registers no frame
 * callback and decides nothing, between a card and the dials it is a card of. It takes no hooks
 * for the same reason, so calling it is exactly writing the boxes out where it is called.
 *
 * It takes the door props every one of those boxes already takes, so a prop added to a dial is
 * added in one place and reaches both callers (`PlayerDoorProps`, src/ui/PlayerMore.tsx).
 */
// One box per question a voice answers and one control per number inside them, each with the
// paragraph saying why it is drawn where it is: the length is the size of the module's vocabulary
// rather than a judgement of this function's. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function playerDials({ deck, ...dialled }: PlayerDoorProps): ReactNode {
  /** The same, and the yard a door names its own popover after. */
  const doored = { deck, ...dialled };
  return (
    <>
      <PlayerGroup label={PLAYER_GROUP_LABELS.landing}>
        {/* Every dial at the rack's own size, saying what it is and in what unit — so the
            two line boxes a caption spends are spent here too and a row holding this card
            measures one height (0093, P65). The lean the walk had as a pair of buttons is one
            of the three amounts behind this dial's own marker: which way a jump goes is an
            amount of the same draw the distance bounds, and a spec saying it twice would be
            one instruction from two fields (0124, 0162). */}
        <PlayerDistance {...doored} />
        {/* The figure the pattern lays down and plays back, beside the Distance that draws
            it: both are about where a landing reads from, and the three amounts saying what
            becomes of a figure sit behind this dial's own marker (0124, 0151). */}
        <PlayerPhrase {...doored} />
      </PlayerGroup>
      {/* What a landing does with the slot it has been given, which is everything that
          moves nothing the landing after it stands on: the gate that cuts inside a repeat,
          the hole that never opens (P118), which way it reads (P121), the spark it throws,
          how loud that is and how far into the landing it begins (P123, 0175), and the
          ladder its rate climbs (0118, 0167). */}
      <PlayerGroup label={PLAYER_GROUP_LABELS.sound}>
        {/* In the order a box two deep reads them: a column is a pair. The gate over the
            hole — the two that take sound away without moving anything (P118) — the spark
            over how loud it is, its delay under those two (P123, 0175), and which way the
            landing reads over the ladder its rate climbs (P121, 0167). The spark's third
            amount is the one that leaves a cell of this box empty, and it is on the row
            rather than behind the Spark dial's own marker for the reason the level is: it
            shapes no draw, and 0124 puts behind a marker only the amounts that shape the
            draw the dial above them bounds. */}
        <PlayerDial knob="gate" {...dialled} />
        <PlayerDial knob="drop" {...dialled} />
        <PlayerDial knob="spark" {...dialled} />
        <PlayerDial knob="sparkLevel" {...dialled} />
        <PlayerDial knob="sparkDelay" {...dialled} />
        <PlayerDial knob="reverse" {...dialled} />
        <PlayerRate {...doored} />
      </PlayerGroup>
      {/* When the next one comes, and how long this one lasts: the repeats a landing is
          cut into, the burst it fills, how far that varies and the wait placed or rolled
          between two of them (0119, 0135, 0163). */}
      <PlayerGroup label={PLAYER_GROUP_LABELS.timing}>
        {/* A column is a pair here too: the burst over how far it varies, and the repeats
            one landing is cut into over the waits between two of them. The burst is drawn
            on a log curve and read in two units, both of which are the knob's own
            declaration rather than this card's — the only dial here whose range spans
            three orders of magnitude (src/lib/playerKnobs.ts). */}
        <PlayerDial knob="burst" {...dialled} />
        <PlayerVary {...doored} />
        <PlayerRepeats {...doored} />
        <PlayerRest {...doored} />
      </PlayerGroup>
    </>
  );
}
