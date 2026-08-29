/**
 * @role One part written as a row of cells rather than drawn by dials: the cells themselves, the
 *   jump read between two of them, and the one editor the selected cell is changed through (0188).
 *   Every gesture is one `deck.player` carrying the whole spec, like every other edit on this card
 *   — which cell is selected is a view preference and never leaves this component (plan §2).
 * @instead What a cell *is*, and every bound one of its three numbers sits inside →
 *   src/lib/playerStrip.ts. What the walk does with a row → src/lib/playerWalk.ts. The part this
 *   is drawn in the fold of, and the road its edits take → src/ui/PlayerPart.tsx. The words on it
 *   → src/lib/copyStrip.ts. The picture of what the row actually played → src/ui/PlayerScope.tsx.
 */
// Keyed by place, which is what a cell is: unlike a part, a cell carries no id, because what tells
// two of them apart is where they are in the row, and a reorder of the row is a rewrite of it
// rather than a move of a thing (0157's argument, answered the other way for a thing that is its
// position). No cell holds state of its own, so there is nothing a re-key could lose.
// oxlint-disable react/no-array-index-key
import { useCallback, useState } from "react";

import {
  PLAYER_STRIP_ADD,
  PLAYER_STRIP_EMPTY,
  PLAYER_STRIP_LABEL,
  PLAYER_STRIP_LABELS,
  PLAYER_STRIP_REMOVE,
  PLAYER_STRIP_SELECT,
  PLAYER_STRIP_TOOLTIP,
  stripJump,
  stripReadout,
} from "@/lib/copyStrip";
import { PLAYER_REPEATS_MAX, PLAYER_REPEATS_MIN } from "@/lib/playerRepeats";
import { PLAYER_REST_MAX, PLAYER_REST_MIN } from "@/lib/playerRest";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { PLAYER_STRIP_CELL, PLAYER_STRIP_MAX, type PartStep } from "@/lib/playerStrip";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";
import { PlayerGroup } from "@/ui/PlayerGroup";
import { Says } from "@/ui/Says";

/**
 * One number of one cell, stepped. The slot wraps because the grid is a ring — which is what
 * `travelFrom` does with a jump that runs off the top of it (0162) — and the other two clamp,
 * because a count and a wait are amounts rather than places.
 */
const stepped = (value: number, by: number, min: number, max: number, ring: boolean): number => {
  const moved = value + by;
  if (ring) return ((moved % max) + max) % max;
  return Math.min(max, Math.max(min, moved));
};

/** The three numbers a cell carries, in the order they are drawn on it and edited under it. */
const FIELDS = [
  { key: "slot", label: PLAYER_STRIP_LABELS.slot, min: 0, max: PLAYER_SLOTS, ring: true },
  {
    key: "repeats",
    label: PLAYER_STRIP_LABELS.repeats,
    min: PLAYER_REPEATS_MIN,
    max: PLAYER_REPEATS_MAX,
    ring: false,
  },
  {
    key: "rest",
    label: PLAYER_STRIP_LABELS.rest,
    min: PLAYER_REST_MIN,
    max: PLAYER_REST_MAX,
    ring: false,
  },
] as const satisfies readonly {
  key: keyof PartStep;
  label: string;
  min: number;
  max: number;
  ring: boolean;
}[];

/**
 * One cell of the row: the jump into it, and the press that points the editor at it. A component
 * of its own for the reason `PartCard` is — every handler has to carry which cell it is, and a
 * closure built in the parent's own render is a new prop on every draw of the row.
 */
function StripCell({
  at,
  cell,
  from,
  named,
  pressed,
  disabled,
  onSelect,
}: {
  at: number;
  cell: PartStep;
  /** The slot the cell before it read, or null where this is the row's first. */
  from: number | null;
  named: string;
  pressed: boolean;
  disabled: boolean;
  onSelect: (at: number) => void;
}) {
  const select = useCallback(() => {
    onSelect(at);
  }, [onSelect, at]);
  return (
    <div className="flex items-center gap-1">
      {/* The jump into this cell, between the two it is a jump between — a readout and never a
          control, because the slot the cell after it reads is the one field behind it and a second
          author of that is what 0188 refused. */}
      {from !== null && (
        <span className="type-readout text-muted-foreground">
          {stripJump(from, cell.slot, PLAYER_SLOTS)}
        </span>
      )}
      <Says what={PLAYER_STRIP_SELECT}>
        <Toggle
          size="sm"
          variant="outline"
          pressed={pressed}
          disabled={disabled}
          aria-label={`${PLAYER_STRIP_SELECT} ${at + 1} ${named}`}
          onPressedChange={select}
        >
          <span className="type-readout">{stripReadout(cell.slot, cell.repeats, cell.rest)}</span>
        </Toggle>
      </Says>
    </div>
  );
}

/** One press on one number of the lit cell, up or down. Its own component for the same reason. */
function StripStep({
  field,
  value,
  by,
  named,
  disabled,
  onWrite,
}: {
  field: (typeof FIELDS)[number];
  value: number;
  by: 1 | -1;
  named: string;
  disabled: boolean;
  onWrite: (field: keyof PartStep, value: number) => void;
}) {
  const press = useCallback(() => {
    onWrite(field.key, stepped(value, by, field.min, field.max, field.ring));
  }, [onWrite, field, value, by]);
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      disabled={disabled}
      aria-label={`${field.label} ${by > 0 ? "up" : "down"} ${named}`}
      onClick={press}
    >
      {by > 0 ? "+" : "\u2212"}
    </Button>
  );
}

// The row, the jumps between its cells and the editor under it: one block, because what the editor
// edits is which cell the row has lit and neither half is a thing without the other. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerStrip({
  named,
  steps,
  onChange,
  disabled = false,
}: {
  /** The part this row belongs to, as a label reads it — every control here says which. */
  named: string;
  /** The cells as they stand, empty where the part is drawn by its dials instead. */
  steps: readonly PartStep[];
  /** The whole row after this gesture. One `deck.player` per press, sent by the part (0089). */
  onChange: (steps: readonly PartStep[]) => void;
  disabled?: boolean;
}) {
  /**
   * Which cell the editor is pointed at. A view preference and nothing else — no command, nothing
   * durable, no history entry (plan §2) — and clamped on read rather than on write, so a row that
   * shrank under an undo cannot leave the editor pointed past its end (principle 5).
   */
  const [lit, setLit] = useState(0);
  const at = steps.length === 0 ? null : Math.min(lit, steps.length - 1);
  const cell = at === null ? undefined : steps[at];

  const write = useCallback(
    (field: keyof PartStep, value: number) => {
      onChange(steps.map((one, where) => (where === at ? { ...one, [field]: value } : one)));
    },
    [onChange, steps, at],
  );
  const add = useCallback(() => {
    // The last cell again, which is the guess a hand can correct in one press — and the top of the
    // loop for the first, which is where a play begins.
    const last = steps.at(-1) ?? PLAYER_STRIP_CELL;
    setLit(steps.length);
    onChange([...steps, { ...last }]);
  }, [onChange, steps]);
  const remove = useCallback(() => {
    onChange(steps.filter((_, where) => where !== at));
  }, [onChange, steps, at]);

  // The sentence sits on the box's own eyebrow rather than on each cell: what a cell means is one
  // thing said once, and sixteen tooltips saying it would be sixteen (0080).
  return (
    <PlayerGroup label={PLAYER_STRIP_LABEL} what={PLAYER_STRIP_TOOLTIP}>
      <div className="flex w-full flex-wrap items-center gap-1">
        {steps.map((one, index) => (
          <StripCell
            key={index}
            at={index}
            cell={one}
            from={index === 0 ? null : (steps[index - 1]?.slot ?? null)}
            named={named}
            pressed={index === at}
            disabled={disabled}
            onSelect={setLit}
          />
        ))}
        <Says what={PLAYER_STRIP_ADD}>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled || steps.length >= PLAYER_STRIP_MAX}
            aria-label={`${PLAYER_STRIP_ADD} ${named}`}
            onClick={add}
          >
            +
          </Button>
        </Says>
      </div>
      {/* And what the lit cell's three numbers are, under the row rather than on it: a stepper per
          number on every cell would be forty-eight controls on a row of sixteen, which is the
          crowding the dials themselves are being taken out of (0188). */}
      {cell === undefined ? (
        <span className="type-readout text-muted-foreground">{PLAYER_STRIP_EMPTY}</span>
      ) : (
        <div className="flex w-full flex-wrap items-center gap-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-1">
              <span className="type-eyebrow text-muted-foreground">{field.label}</span>
              <StripStep
                field={field}
                value={cell[field.key]}
                by={-1}
                named={named}
                disabled={disabled}
                onWrite={write}
              />
              <StripStep
                field={field}
                value={cell[field.key]}
                by={1}
                named={named}
                disabled={disabled}
                onWrite={write}
              />
              <span className="type-readout">{cell[field.key]}</span>
            </div>
          ))}
          <Says what={PLAYER_STRIP_REMOVE}>
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              aria-label={`${PLAYER_STRIP_REMOVE} ${named}`}
              onClick={remove}
            >
              {"\u00D7"}
            </Button>
          </Says>
        </div>
      )}
    </PlayerGroup>
  );
}
