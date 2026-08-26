/**
 * @role The door at a jump dial's corner: the marker saying how many further amounts the dial
 *   holds, and — while it is open — those amounts laid out beside it, in the same box, as ordinary
 *   siblings of the dial they belong to (0121 amended, P135). Seven dials on the jumps card carry
 *   one — the distance, the phrase, the repeats, the burst's vary, the rest, the hold and the
 *   arrangement — so the frame they share is declared here once and the amounts stay each menu's
 *   own (principle 3, P87, 0135).
 * @instead Which amounts each door holds → src/ui/PlayerDistance.tsx, src/ui/PlayerPhrase.tsx,
 *   src/ui/PlayerRepeats.tsx, src/ui/PlayerVary.tsx, src/ui/PlayerRest.tsx, src/ui/PlayerRate.tsx,
 *   src/ui/PlayerArrange.tsx. The one `deck.player` they all patch → src/ui/PlayerCard.tsx. The
 *   box an opened run lands in → src/ui/PlayerGroup.tsx.
 */
import { Children, useCallback, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { yardLabel } from "@/lib/copy";
import type { PlayerDefaults, PlayerSpec } from "@/lib/player";
import type { DeckId } from "@/state/store";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { Toggle } from "@/ui/components/toggle";
import type { PlayerVoiceReader } from "@/ui/PlayerDial";
import { INSTANT_POPUP } from "@/ui/shell";

/**
 * Which doors stand open, and the one call that opens or shuts one. Held by the yard rather than
 * by the door — a view preference either way, no command, nothing durable, no history entry (plan
 * §2) — because a card's fold, and a part's, would otherwise throw it away and reopen it
 * differently, which is the bug every held-above-the-fold line in src/ui/Deck.tsx is written
 * against (0157, 0176).
 */
export type PlayerDoors = {
  /**
   * Which set of boxes these doors belong to: the empty string is the card's own, and a part's
   * fold is that part's `SongPartId`. An **identity** and never a position, for the reason
   * `songSelect` and `songOpen` are ids: dragging a part up the list, or removing the one above
   * it, is not a gesture about which doors stand open, and a positional key would slam one shut
   * and open another the hand never touched.
   */
  scope: string;
  /**
   * Which one door on this card stands open, by its `doorKey`, or none at all. **One at a time**,
   * for the reason a caption is: a caption is a dial's whole accessible name, and the words behind
   * two different doors are allowed to repeat — a chance is called Chance wherever it is — on the
   * stated ground that only one door is open at a time (0124, src/lib/copyKnobs.ts,
   * src/ui/tooltips.test.ts). Two open at once would put two sliders called Chance on one card,
   * which nothing — a screen reader or a locator — could tell apart.
   */
  open: string | null;
  setOpen: (key: string | null) => void;
};

/**
 * What names one door in that set. The title alone would not: a part's fold draws the very boxes
 * the card draws, so with one open there are two Rate doors in one yard, and what tells them apart
 * is the scope the set carries.
 */
export const doorKey = (scope: string, title: string): string => `${scope} ${title}`;

/**
 * What every one of those seven doors takes. Each is the same component with a different list of
 * amounts inside it, and each spelled this list out for itself — seven copies of five paragraphs,
 * which is six more than a fact gets (principle 1). Declared here, beside the frame they all
 * share, so a prop added to a door is added once.
 */
export type PlayerDoorProps = {
  deck: DeckId;
  /**
   * What names the controls behind this door, where the card's own words would not tell them from
   * another set on screen. The empty string is the card's own, which is named by its captions and
   * its yard alone; a part's fold draws the very boxes the card draws, so with one open there are
   * two Gate dials and two Rate doors in one yard, and `aria-label` is the only thing between them
   * (0055, 0176, src/ui/PlayerDial.tsx, src/ui/PlayerPart.tsx).
   */
  named: string;
  /** The spec every dial behind the door reads and patches, which is the card's own (0089). */
  player: PlayerSpec;
  /** What each dial snaps back to on a double-click: the switch's own values (0118). */
  defaults: PlayerDefaults;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** Which doors stand open and the call that changes that, from the yard (`PlayerDoors` above). */
  doors: PlayerDoors;
  /** What the song is standing at, handed down from the card: every dial behind a door reads the
   *  pattern's own numbers while one plays, exactly as the dial on the row does (0157). */
  voice?: PlayerVoiceReader;
  /** Whether the card's dials are pointed at a part of its song, so every dial behind the door
   *  reads and writes that part and wears the mark saying so (0176, src/ui/PlayerDial.tsx). */
  selected?: boolean;
  /** Whether every control in the door is refused rather than absent: the card draws its whole
   *  body whether or not its switch is on, so the dial and the marker at its corner are greyed and
   *  unturnable until the module holds a spec (0121, 0173). */
  disabled?: boolean;
};

/** Where the marker sits, and how it reads when there is nothing behind it to open yet. */
const TRIGGER = "absolute -top-0.5 -right-0.5 h-auto min-w-0 px-1 py-0 text-foreground";

/**
 * The wash an open door wears: the dial and each of its amounts, side by side in the box's own
 * flow. It is a tint and not a border, because `PlayerGroup` already says a box inside a card is
 * not a second card — and because these are siblings of that box's flex rather than one node, a
 * ring would have to be drawn four times over four separate elements and would read as four boxes
 * (0173, P135). Rounded only at the ends of the run, so the tint reads as one bracket.
 */
const DOOR_RUN = "flex flex-col justify-end self-stretch bg-muted/40 px-1.5 py-1";

/**
 * What the marker says, which is how many amounts the dial holds. `Children.count` rather than a
 * number each door writes down: what is behind a door is the list that door renders, and a second
 * answer to that is one a hand could set wrong (principle 1). The arrangement's cast block counts
 * as the one amount it is drawn as.
 *
 * Where a lane's preview marker sits on a parameter knob, one control along
 * (src/ui/ParameterKnob.tsx), with two differences these need. It is always drawn rather than
 * waiting on a held modifier, because it is the only way to the amounts behind it and a control
 * nothing can open is not a control. And it says the count rather than the framed plus 0121
 * minted: a plus in a frame said only "more of it behind a press", and the number says that and
 * how much — which is exactly what a door nobody could find was failing to say (0121 amended,
 * P135). Drawn in the instrument's own ink and in one colour only: a door does not report the
 * state of what is behind it, and whether it stands open is the toggle's own fill.
 */
const DoorCount = ({ children }: { children: ReactNode }) => (
  <span className="type-readout">{Children.count(children)}</span>
);

/**
 * The one door that is still a layer, drawn the way all seven were before P135: a trigger at the
 * dial's corner and a popup of what is behind it. Kept for what the arrangement's door holds and
 * not for how much — six cast presses under an eyebrow of their own are not a row of dials, and
 * laid inline they are a block of a different height and a different grammar standing beside dial
 * columns (0174, src/ui/PlayerArrange.tsx).
 */
function PoppedDoor({
  label,
  title,
  dial,
  children,
  disabled,
}: {
  label: string;
  title: string;
  dial: ReactNode;
  children: ReactNode;
  disabled: boolean;
}) {
  return (
    <div className="relative">
      {dial}
      <Popover>
        <PopoverTrigger
          aria-label={label}
          disabled={disabled}
          className={cn(
            TRIGGER,
            "inline-flex items-center",
            disabled ? "opacity-50" : "cursor-pointer",
          )}
        >
          <DoorCount>{children}</DoorCount>
        </PopoverTrigger>
        {/* Opens instantly, for the reason the effect picker's does: ./scripts/drive clicks into
            this popup, and waiting out an enter and an exit costs the gate a scenario's worth of
            time for nothing a person would notice (0056, src/ui/EffectPicker.tsx). */}
        <PopoverContent side="top" align="end" className={`w-auto ${INSTANT_POPUP}`}>
          <PopoverTitle>{title}</PopoverTitle>
          <div className="flex items-end gap-2">{children}</div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// The marker, the run it brackets and the paragraph on each: what is over the cap is the two
// shapes a door has — shut, which is a dial with a count on its corner, and open, which is that
// dial and one wrapper per amount beside it — and neither half is a thing on its own. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerMore({
  deck,
  named,
  title,
  dial,
  children,
  doors,
  popped = false,
  disabled = false,
}: {
  deck: DeckId;
  /** What names this door where the yard alone would not, from `PlayerDoorProps` above. */
  named: string;
  /** What the door is called: the name of the control that opens it, and a popped one's title. */
  title: string;
  /** The dial the marker sits on the corner of, drawn by whoever declares its range. */
  dial: ReactNode;
  /** The amounts behind it, laid out the way a card's row of dials is. */
  children: ReactNode;
  /** Which doors stand open and the call that changes that, from `PlayerDoorProps` above. */
  doors: PlayerDoors;
  /**
   * Whether this door's amounts are a layer rather than a run. One door is: the arrangement's,
   * whose marker holds six cast presses under an eyebrow of their own rather than a row of dials
   * (0174). Laid inline that is a block of a different height and a different grammar standing
   * beside dial columns, so it keeps the popover — for what is behind it and not for how much
   * (P135, src/ui/PlayerArrange.tsx).
   */
  popped?: boolean;
  /** Refused rather than absent, the flag `PlayerDoorProps` above carries (0121, 0173). */
  disabled?: boolean;
}) {
  const { scope, open, setOpen } = doors;
  const key = doorKey(scope, title);
  const shown = open === key;
  const press = useCallback(
    (next: boolean) => {
      setOpen(next ? key : null);
    },
    [setOpen, key],
  );
  const label = `${named === "" ? yardLabel(deck) : named} ${title}`;
  if (popped) {
    return (
      <PoppedDoor label={label} title={title} dial={dial} disabled={disabled}>
        {children}
      </PoppedDoor>
    );
  }
  const amounts = Children.count(children);
  /* A fragment and not a box: the amounts are siblings of the dial in the group's own flex, so
     they wrap with it and stand at the same baseline as every other dial in the box. A Fragment
     paints neither a ring nor a tint, so the run marks itself per element — the dial and each of
     its amounts — rather than growing a nested bordered box, which a box inside a card may not be
     (0173, P135). Nothing at all is rendered while the door is shut: hiding drawn dials with CSS
     would put their captions, their two line boxes and their labels on the page for a door nobody
     opened (0093, 0121). */
  return (
    <>
      <div
        data-door={shown ? title : undefined}
        className={cn("relative", shown && `${DOOR_RUN} rounded-l-sm`)}
      >
        {dial}
        <Toggle
          size="sm"
          aria-label={label}
          pressed={shown}
          disabled={disabled}
          onPressedChange={press}
          className={cn(TRIGGER, disabled ? "opacity-50" : "cursor-pointer")}
        >
          <DoorCount>{children}</DoorCount>
        </Toggle>
      </div>
      {shown
        ? Children.map(children, (amount, at) => (
            <div data-door={title} className={cn(DOOR_RUN, at === amounts - 1 && "rounded-r-sm")}>
              {amount}
            </div>
          ))
        : null}
    </>
  );
}
