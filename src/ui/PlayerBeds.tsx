/**
 * @role The grounds a hand kept, as the row under the picture: one press per kept ground, the
 *   count the lit one comes round on, and the press that keeps the ground the window is on
 *   (0194, 0226). Every gesture is one `deck.player` carrying the whole spec, like every other
 *   edit on this card — which one is lit is a view preference and never leaves this component
 *   (plan §2).
 * @instead What a kept ground *is*, and which count it comes round on → src/lib/playerBed.ts. The
 *   add this row's `+` writes → `keepBed`, src/lib/playerGround.ts, beside the `plantBed` toggle
 *   the picture's Option-press keeps. The
 *   picture these are blocks on, and the Option-press that keeps one there →
 *   src/ui/PlayerGround.tsx. The words on this row → src/lib/copyGround.ts. The three amounts the
 *   *wandering* move is shaped by → src/ui/PlayerBed.tsx.
 */
// Keyed by place, which is what a kept ground is: it carries no id, because what tells two of them
// apart is which ground they are, and the list is held in the source's own order (0194,
// src/ui/PlayerStrip.tsx). No press holds state of its own, so there is nothing a re-key could lose.
// oxlint-disable react/no-array-index-key
import { useCallback, useState } from "react";

import {
  bedsReadout,
  PLAYER_BEDS_EMPTY,
  PLAYER_BEDS_EVERY,
  PLAYER_BEDS_FULL,
  PLAYER_BEDS_KEEP,
  PLAYER_BEDS_KEPT,
  PLAYER_BEDS_REMOVE,
  PLAYER_BEDS_SELECT,
} from "@/lib/copyGround";
import {
  PLAYER_BED_ROUND_MAX,
  PLAYER_BED_ROUND_MIN,
  PLAYER_BEDS_MAX,
  type PlantedBed,
} from "@/lib/playerBed";
import { bedKept, keepBed } from "@/lib/playerGround";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";
import { Says } from "@/ui/Says";

/** One press on the lit ground's count, up or down. Clamped, because a count is an amount. */
const stepped = (value: number, by: number): number =>
  Math.min(PLAYER_BED_ROUND_MAX, Math.max(PLAYER_BED_ROUND_MIN, value + by));

/**
 * One kept ground: which ground it is, how often the song comes back to it, and the press that
 * points the count under the row at it. Its own component for the reason a cell is — every handler
 * has to carry which one it is, and a closure built in the parent's own render is a new prop on
 * every draw of the row.
 */
function KeptBed({
  at,
  kept,
  named,
  pressed,
  disabled,
  onSelect,
}: {
  at: number;
  kept: PlantedBed;
  named: string;
  pressed: boolean;
  disabled: boolean;
  onSelect: (at: number) => void;
}) {
  const select = useCallback(() => {
    onSelect(at);
  }, [onSelect, at]);
  return (
    <Says what={PLAYER_BEDS_SELECT}>
      <Toggle
        size="sm"
        variant="outline"
        pressed={pressed}
        disabled={disabled}
        aria-label={`${PLAYER_BEDS_SELECT} ${at + 1} ${named}`}
        onPressedChange={select}
      >
        <span className="type-readout">{bedsReadout(kept.bed, kept.every)}</span>
      </Toggle>
    </Says>
  );
}

// The row, the press that adds to it and the count under it: one block, because what the count
// edits is which ground the row has lit and neither half is a thing without the other. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerBeds({
  named,
  beds,
  bed,
  onChange,
  disabled = false,
}: {
  /** The yard this row belongs to, as a label reads it — every control here says which. */
  named: string;
  /** The grounds kept, in the source's own order. Empty is a pattern that only wanders. */
  beds: readonly PlantedBed[];
  /** The ground the window is on — the durable field the Bed dial turns and the drag on the
   *  picture writes, so the `+` means the same thing on a stopped yard as on a running one and is
   *  live wherever the row is drawn (0226). Not the peek: where the walk has wandered to is a frame, and
   *  what a hand is looking at is this. */
  bed: number;
  /** The whole list after this gesture. One `deck.player` per press, sent by the card (0089). */
  onChange: (beds: readonly PlantedBed[]) => void;
  disabled?: boolean;
}) {
  /**
   * Which kept ground the count is pointed at. A view preference and nothing else — no command,
   * nothing durable, no history entry (plan §2) — and clamped on read rather than on write, so a
   * list that shrank under an undo cannot leave it pointed past the end (principle 5).
   */
  const [lit, setLit] = useState(0);
  const at = beds.length === 0 ? null : Math.min(lit, beds.length - 1);
  const kept = at === null ? undefined : beds[at];

  const write = useCallback(
    (by: number) => {
      onChange(
        beds.map((one, where) => (where === at ? { ...one, every: stepped(one.every, by) } : one)),
      );
    },
    [onChange, beds, at],
  );
  const down = useCallback(() => {
    write(-1);
  }, [write]);
  const up = useCallback(() => {
    write(1);
  }, [write]);
  const remove = useCallback(() => {
    onChange(beds.filter((_, where) => where !== at));
  }, [onChange, beds, at]);
  /**
   * And the press that keeps one: an add and never a take-away, so a hand pressing it twice ends
   * with the ground kept rather than with an empty row (0226, `keepBed`). The two reasons it can
   * do nothing are said rather than left dead (principle 5), and **already kept wins** where both
   * are true: letting a ground go would not make this press work, because the one it is aimed at
   * is the one already there.
   */
  const held = bedKept(beds, bed);
  const full = beds.length >= PLAYER_BEDS_MAX;
  const says = held ? PLAYER_BEDS_KEPT : full ? PLAYER_BEDS_FULL : PLAYER_BEDS_KEEP;
  const keep = useCallback(() => {
    onChange(keepBed(beds, bed));
  }, [onChange, beds, bed]);

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex w-full flex-wrap items-center gap-1">
        {beds.map((one, index) => (
          <KeptBed
            key={index}
            at={index}
            kept={one}
            named={named}
            pressed={index === at}
            disabled={disabled}
            onSelect={setLit}
          />
        ))}
        {/* The press that keeps one, at the end of the row it adds to — the same `+` the written
            row wears, because it is the same gesture said about a different list (0188). What it
            keeps is the ground the window is on, so a hand keeps the ground it is looking at
            rather than one it has to find again. */}
        <Says what={says}>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled || full || held}
            aria-label={`${says} ${named}`}
            onClick={keep}
          >
            +
          </Button>
        </Says>
      </div>
      {/* And how often the lit one comes round, under the row rather than on it: a stepper on every
          press would be sixteen controls on a row of eight, which is the crowding the written row
          is drawn out of (0188). */}
      {kept === undefined ? (
        <span className="type-readout text-muted-foreground">{PLAYER_BEDS_EMPTY}</span>
      ) : (
        <div className="flex w-full flex-wrap items-center gap-1">
          <span className="type-eyebrow text-muted-foreground">{PLAYER_BEDS_EVERY}</span>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={disabled}
            aria-label={`${PLAYER_BEDS_EVERY} down ${named}`}
            onClick={down}
          >
            {"\u2212"}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={disabled}
            aria-label={`${PLAYER_BEDS_EVERY} up ${named}`}
            onClick={up}
          >
            +
          </Button>
          <span className="type-readout">{kept.every}</span>
          <Says what={PLAYER_BEDS_REMOVE}>
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              aria-label={`${PLAYER_BEDS_REMOVE} ${named}`}
              onClick={remove}
            >
              {"\u00D7"}
            </Button>
          </Says>
        </div>
      )}
    </div>
  );
}
