/**
 * @role The three boxes of dials one voice of the mulcher is: where a jump lands, how the landing
 *   sounds, and how it is timed. Drawn by the card for the pattern it holds and by a part's own
 *   fold for the numbers that part carries, so the dials a hand reaches for are one set of boxes in
 *   one order however it got to them (0173, 0176).
 * @instead The two boxes that are the song's own and never a part's — the arrangement, and the
 *   ground every part of it is read on (0184) → src/ui/PlayerCard.tsx.
 *   The dial itself → src/ui/PlayerDial.tsx; the box around a set of them → src/ui/PlayerGroup.tsx;
 *   the words on them → src/lib/copy.ts and src/lib/copyKnobs.ts.
 */
// Over the dependency cap, and what is over it is one dial per number the module declares plus the
// six runs the rest of them stand in: the count is the size of that vocabulary and not a judgement
// of this file's. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import type { ReactNode } from "react";

import { PLAYER_GROUP_LABELS, PLAYER_LABEL, yardLabel } from "@/lib/copy";
import {
  PLAYER_BEAT_LABEL,
  PLAYER_BEAT_TOOLTIP,
  PLAYER_TAP_LABEL,
  PLAYER_TAP_TOOLTIP,
} from "@/lib/copyCard";
import { ACTION_ICONS } from "@/ui/icons";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";
import { Says } from "@/ui/Says";
import { PlayerDial } from "@/ui/PlayerDial";
import { PlayerDistance } from "@/ui/PlayerDistance";
import { PlayerGroup } from "@/ui/PlayerGroup";
import type { PlayerRunProps } from "@/ui/PlayerRun";
import { PlayerPhrase } from "@/ui/PlayerPhrase";
import { PlayerReach } from "@/ui/PlayerReach";
import { PlayerRate } from "@/ui/PlayerRate";
import { PlayerRepeats } from "@/ui/PlayerRepeats";
import { PlayerRest } from "@/ui/PlayerRest";
import { PlayerVary } from "@/ui/PlayerVary";
// oxlint-enable import/max-dependencies

/**
 * The two gestures the Burst dial wears beside it, which are the card's and not a part's: a tap,
 * and whether what it and the dial write is held to the beat. Handed down as one object rather
 * than as four props, so a part's fold — which has neither the yard's state nor the deck's
 * analysis — draws the dial alone by passing nothing (0176, `docs/plan.md` P152).
 *
 * Neither is a field of the spec. The tap writes the same `burst` the dial writes, and the hold
 * rounds whatever is written, so what the walk reads is one number in wall seconds however it was
 * arrived at (0119, src/lib/playerBurst.ts).
 */
export type PlayerBurstProps = {
  /**
   * The **sounding** beat, in bpm — `analysis.bpm * deckRate`, the figure the yard's own waveform
   * reads out. Nought for a deck whose analysis is null or found no tempo, which is a deck with no
   * grid: the toggle is then refused rather than absent, the way every control under an off switch
   * is (0121, 0173).
   */
  bpm: number;
  /** Whether a written burst is rounded onto the beat, and the toggle that says so. Held by the
   *  yard beside its folds: it changes no number the walk reads and holds no value of its own, so
   *  it is the card's own state and not part of the session (P40, 0026). */
  held: boolean;
  onHeld: (held: boolean) => void;
  /** One press of the tap. The times it is a mean of are the card's, because they outlive no
   *  gesture but this one and nothing else on the page can read them. */
  onTap: () => void;
};

/** What the boxes take: what every run in them takes, and the burst's own two gestures. */
export type PlayerDialsProps = PlayerRunProps & { burst?: PlayerBurstProps };

/**
 * A function returning the boxes rather than a component wrapping them, and called rather than
 * mounted. What a part's fold and the card draw is *the same three boxes*, not a thing that owns
 * them: a component here would put a node in the tree that holds no state, registers no frame
 * callback and decides nothing, between a card and the dials it is a card of. It takes no hooks
 * for the same reason, so calling it is exactly writing the boxes out where it is called.
 *
 * It takes the run props every one of those boxes already takes, so a prop added to a dial is
 * added in one place and reaches both callers (`PlayerRunProps`, src/ui/PlayerRun.tsx).
 */
// One box per question a voice answers and one control per number inside them, each with the
// paragraph saying why it is drawn where it is: the length is the size of the module's vocabulary
// rather than a judgement of this function's. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function playerDials({ deck, burst, ...dialled }: PlayerDialsProps): ReactNode {
  /** The same, and the one a run takes that a dial does not: the yard it names itself after
   *  (src/ui/PlayerRun.tsx). */
  const runProps = { deck, ...dialled };
  return (
    <>
      <PlayerGroup label={PLAYER_GROUP_LABELS.landing}>
        {/* Every dial at the rack's own size, saying what it is and in what unit — so the
            two line boxes a caption spends are spent here too and a row holding this card
            measures one height (0093, P65). The lean the walk had as a pair of buttons is one
            of the three amounts standing in this dial's own run: which way a jump goes is an
            amount of the same draw the distance bounds, and a spec saying it twice would be
            one instruction from two fields (0124, 0162). */}
        <PlayerDistance {...runProps} />
        {/* The figure the pattern lays down and plays back, beside the Distance that draws
            it: both are about where a landing reads from, and the three amounts saying what
            becomes of a figure stand in this dial's own run (0124, 0151). */}
        <PlayerPhrase {...runProps} />
        {/* And what those two dials and the three amounts in the first one's run come to, as
            odds rather than as a jump: the one thing in this box that says where the next landing
            can go before any of it is turned (0180). It stands in the box's own flow beside the
            dials it is a picture of, at their height, so the box is still one row that wraps. */}
        <PlayerReach named={dialled.named} player={dialled.player} disabled={dialled.disabled} />
      </PlayerGroup>
      {/* What a landing does with the slot it has been given, which is everything that
          moves nothing the landing after it stands on: the gate that cuts inside a repeat,
          the hole that never opens (P118), which way it reads (P121), the spark it throws,
          how loud that is and how far into the landing it begins (P123, 0175), and the
          ladder its rate climbs (0118, 0167). */}
      <PlayerGroup label={PLAYER_GROUP_LABELS.sound}>
        {/* In the order a hand reads them across: the gate then the hole — the two that take
            sound away without moving anything (P118) — the spark then how loud it is then how
            far into the landing it begins (P123, 0175), then which way the landing reads and
            the ladder its rate climbs (P121, 0167). All three of the spark's own are on the
            row rather than behind the Spark dial's marker for one reason: they shape no draw,
            and 0124 puts behind a marker only the amounts that shape the draw the dial they
            sit on bounds. */}
        <PlayerDial knob="gate" {...dialled} />
        <PlayerDial knob="drop" {...dialled} />
        <PlayerDial knob="spark" {...dialled} />
        <PlayerDial knob="sparkLevel" {...dialled} />
        <PlayerDial knob="sparkDelay" {...dialled} />
        <PlayerDial knob="reverse" {...dialled} />
        <PlayerRate {...runProps} />
      </PlayerGroup>
      {/* When the next one comes, and how long this one lasts: the repeats a landing is
          cut into, the burst it fills, how far that varies and the wait placed or rolled
          between two of them (0119, 0135, 0163). */}
      <PlayerGroup label={PLAYER_GROUP_LABELS.timing}>
        {/* Read across in pairs here too: the burst and how far it varies, then the repeats
            one landing is cut into and the waits between two of them. The burst is drawn on a
            log curve and read in two units, both of which are the knob's own declaration
            rather than this card's — the only dial here whose range spans three orders of
            magnitude (src/lib/playerKnobs.ts). */}
        <PlayerDial knob="burst" {...dialled} />
        {/* And the two ways of arriving at that number that are not a turn, standing beside the
            dial they write with nothing to open first — the shape the ground's own Plant has
            (0195). Both write the same `burst` and neither is a field of the spec: a tap is an
            interval a hand played, and the hold is a rounding applied to whatever is written
            next, so the walk never hears about either (0119, src/lib/playerBurst.ts). Drawn only
            where they are the card's own; a part's fold passes no `burst` and gets the dial. */}
        {burst !== undefined && (
          <>
            <Says what={PLAYER_TAP_TOOLTIP}>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={dialled.disabled}
                aria-label={`${PLAYER_TAP_LABEL} ${PLAYER_LABEL} on ${yardLabel(deck)}`}
                onClick={burst.onTap}
              >
                <ACTION_ICONS.tap />
              </Button>
            </Says>
            {/* Refused and not absent on a deck with no grid: a control that comes and goes with
                the source is one a hand cannot learn is there (0121, 0173). */}
            <Says what={PLAYER_BEAT_TOOLTIP}>
              <Toggle
                size="sm"
                variant="outline"
                pressed={burst.held}
                onPressedChange={burst.onHeld}
                disabled={dialled.disabled === true || burst.bpm <= 0}
                aria-label={`${PLAYER_BEAT_LABEL} ${PLAYER_LABEL} on ${yardLabel(deck)}`}
              >
                <ACTION_ICONS.snap data-icon="inline-start" />
                {PLAYER_BEAT_LABEL}
              </Toggle>
            </Says>
          </>
        )}
        <PlayerVary {...runProps} />
        <PlayerRepeats {...runProps} />
        <PlayerRest {...runProps} />
      </PlayerGroup>
    </>
  );
}
