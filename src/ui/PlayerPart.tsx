/**
 * @role One part of a song as a row of the section that arranges it: the grip that moves it, the
 *   press that points the card's dials at it, what it is called and how long it lasts, and, under
 *   its own fold, the dials it was captured from (0176).
 * @instead The list these rows are in, and every gesture that changes which parts there are →
 *   src/ui/PlayerSong.tsx. What a part is, and the maths its bar and its signature are →
 *   src/lib/playerSong.ts and src/lib/playerCharacter.ts. The boxes its fold draws →
 *   src/ui/PlayerDials.tsx. The reorder gesture itself → src/ui/listDrag.ts.
 */
// Over the dependency cap, and what is over it is one row's worth of controls: a grip, a select, a
// name field, a fold, a length dial, four actions and the words for all of them. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the line cap by the same arithmetic: what is over it is one paragraph per gesture a
// part offers, and P135 added the one saying why a door under this fold is held under the part's
// id rather than the name on its row. Splitting it would name half a row. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { useCallback, useMemo, type FocusEvent, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";
import { partVoice, type PlayerSpec } from "@/lib/player";
import { partSignature, PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import {
  PLAYER_PART_DEFAULTS,
  PLAYER_PART_MAX,
  PLAYER_PART_MIN,
  PLAYER_SONG_MAX,
  songShare,
  type SongPart,
  type SongPartId,
} from "@/lib/playerSong";
import {
  ACTION_TOOLTIPS,
  partBadge,
  PLAYER_CHARACTER_LABELS,
  PLAYER_PART_LABEL,
  PLAYER_PART_LENGTH_LABEL,
  PLAYER_PART_LENGTH_TOOLTIP,
  PLAYER_PART_NAME_LABEL,
  PLAYER_PART_NAME_TOOLTIP,
  PLAYER_PART_SIGNATURE_TOOLTIP,
  PLAYER_SELECT_LABEL,
  PLAYER_SELECT_TOOLTIP,
  PLAYER_SONG_LABEL,
  READOUT_JOIN,
  yardLabel,
} from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Toggle } from "@/ui/components/toggle";
import { FoldCaret } from "@/ui/FoldCaret";
import { ACTION_ICONS } from "@/ui/icons";
import { Knob } from "@/ui/Knob";
import { playerReadout } from "@/ui/PlayerDial";
import { playerDials } from "@/ui/PlayerDials";
import type { PlayerDoors } from "@/ui/PlayerMore";
import { DRAG_CARD_ATTRIBUTE, type DragHandleProps } from "@/ui/listDrag";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

/** The attribute one row carries the part it draws under, so the frame in the section above can
 *  light the one standing without asking React for anything (0157). */
export const PART_ATTRIBUTE = "data-part";

/**
 * How wide the bar saying how much of the song this part is. A picture and not a layout width: it
 * is the one thing on the row whose meaning *is* its size, so it needs a track to be a fraction of
 * — and it wraps with everything else on the row rather than setting the row's measure, which is
 * what 0054 is about.
 */
const SHARE_TRACK = "h-1 w-24 shrink-0 bg-foreground/10";

/**
 * A part's dials, read out: the three furthest from plain, each spelled the way its own dial spells
 * it. What answers "which part is which" for a part that carries a spec and no character (0176) —
 * and the whole of it is read-only, because the dials that change it are one fold below.
 *
 * A part left exactly at the switch's own values has no signature at all, and says so with the
 * character menu's own word for that point: it is the same fact — this is plain — and a second word
 * for it would be two things to learn (0152, principle 1).
 */
const signatureOf = (part: SongPart): string => {
  const knobs = partSignature(part.voice);
  if (knobs.length === 0) return PLAYER_CHARACTER_LABELS.plain;
  return knobs
    .map((knob) => `${PLAYER_KNOB_LABELS[knob]} ${playerReadout(knob, part.voice[knob])}`)
    .join(READOUT_JOIN);
};

/**
 * One part, and everything a hand does to it: the grip that moves it, the press that points the
 * card's dials at it, the name it was given, the fold that opens its own dials in place, how long
 * it lasts, and the four actions that copy it, pass over it, hear it alone and take it away.
 *
 * A component of its own for the reason the character menu's entries are: every handler has to
 * carry which part it is, and a closure built in the parent's own render is a new prop on every
 * frame the card draws.
 */
// One callback per gesture and one control per gesture, plus the grip, the badge, the bar and the
// signature that say which part this is: the length is how many things a part is rather than how
// much this row decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PartCard({
  deck,
  at,
  part,
  song,
  player,
  selected,
  open,
  doors,
  handle,
  onChange,
  onSelect,
  onOpen,
  onDuplicate,
  onAudition,
  onRemove,
}: {
  deck: DeckId;
  /** Where in the song this part stands, from zero. Its place and not its name: what a control on
   *  this row is called is positional, because a name is what ./scripts/drive presses and an
   *  opaque id is not a thing a person or a locator asks for. The badge beside the grip is the
   *  name (0157). */
  at: number;
  part: SongPart;
  /** The whole list this part is in — read for one thing only: how much of the song it is, which
   *  is a fact about the part *and the ones beside it* and so cannot be asked of the part alone
   *  (`songShare`, src/lib/playerSong.ts). */
  song: readonly SongPart[];
  /** The card's own spec, which the fold's dials read the four song fields off: a part carries
   *  every number but those, so the dials under it are this spec with the part laid over it
   *  (0158, 0176). */
  player: PlayerSpec;
  /** Whether the card's dials are pointed at this part. A view preference held by the yard, so it
   *  is handed down rather than kept here: no command, nothing durable, no history entry (plan §2,
   *  0176). */
  selected: boolean;
  /** Whether this part's own dials are open under it — held by the yard on exactly those terms,
   *  and separate from the selection: a hand may edit a part in place without pointing the card's
   *  dials at it, which is the indirection this fold replaces. */
  open: boolean;
  /** And which of the doors on those dials stand open, held by the yard for the same reason and
   *  keyed so this part's Rate door is not the card's (`PlayerDoors`, src/ui/PlayerMore.tsx). */
  doors: PlayerDoors;
  /** The drag and the arrow keys that reorder this part, from the list that owns the gesture. */
  handle: DragHandleProps;
  onChange: (at: number, part: SongPart) => void;
  onSelect: (id: SongPartId, selected: boolean) => void;
  onOpen: (id: SongPartId, open: boolean) => void;
  onDuplicate: (at: number) => void;
  /** Hear this part now: a transport cue the section sends straight to the instrument, and the one
   *  gesture on this row that writes nothing durable at all (0041, 0181). */
  onAudition: (id: SongPartId) => void;
  onRemove: (at: number) => void;
}) {
  /** What every control on this row is named by: the yard, the song, and which part it is. */
  const named = `${yardLabel(deck)} ${PLAYER_SONG_LABEL} ${PLAYER_PART_LABEL} ${at + 1}`;
  /** And what the doors under its fold are held under, which is this part's own id and never that
   *  name: the name is positional because a locator has to be able to ask for it, and a door that
   *  went with the slot would slam shut when the part above it was dragged away (`PlayerDoors`). */
  const scoped: PlayerDoors = useMemo(() => ({ ...doors, scope: part.id }), [doors, part.id]);
  const badge = partBadge(part.id);
  const setLength = useCallback(
    (length: number) => {
      onChange(at, { ...part, length: Math.round(length) });
    },
    [onChange, at, part],
  );
  const select = useCallback(
    (next: boolean) => {
      onSelect(part.id, next);
    },
    [onSelect, part.id],
  );
  const unfold = useCallback(
    (next: boolean) => {
      onOpen(part.id, next);
    },
    [onOpen, part.id],
  );
  const skip = useCallback(
    (next: boolean) => {
      onChange(at, { ...part, skip: next });
    },
    [onChange, at, part],
  );
  const duplicate = useCallback(() => {
    onDuplicate(at);
  }, [onDuplicate, at]);
  const audition = useCallback(() => {
    onAudition(part.id);
  }, [onAudition, part.id]);
  const remove = useCallback(() => {
    onRemove(at);
  }, [onRemove, at]);
  /**
   * Renaming, committed on Enter or on leaving the field and never per keystroke: one durable edit
   * per deliberate gesture, which is the rule a lane drag follows and the one the clip rack's own
   * field keeps (0024, src/ui/ClipRack.tsx).
   *
   * An emptied field puts the badge back rather than committing nothing. `assertDurableText`
   * refuses the empty string, so "no name" is not a state a part can be in — and a field left
   * blank on screen while the part still answers to something else would be the card saying one
   * thing and the session holding another (principle 5).
   */
  const rename = useCallback(
    (field: HTMLInputElement) => {
      const typed = field.value.trim();
      const name = typed === "" ? badge : typed;
      field.value = name;
      if (name === part.name) return;
      onChange(at, { ...part, name });
    },
    [onChange, at, part, badge],
  );
  const onRenameKey = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    // Leaves the field rather than committing here, and leaving it is what commits: the field is
    // keyed on the stored name, so a commit taken on the keystroke would remount the input under
    // the caret — and committing on both roads would send one edit twice (0024).
    event.currentTarget.blur();
  }, []);
  const onRenameBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      rename(event.currentTarget);
    },
    [rename],
  );
  /**
   * What the fold's dials read and write: the card's spec with this part's numbers over it, and a
   * patch that puts the part knobs back into the part and drops everything else. One
   * `deck.player` carrying the whole spec, like every other gesture on this card — the same road
   * `dialPatch` takes for a *selected* part, and taken here so a hand can edit a part without
   * pointing the card at it (0089, 0176, src/ui/PlayerCard.tsx).
   */
  const painted: PlayerSpec = useMemo(() => ({ ...player, ...part.voice }), [player, part]);
  /** And how much of the song this part is, as the one style this row writes. Memoised beside the
   *  spec for the reason that one is: a fresh object per render is a fresh prop per render. */
  const share = useMemo(() => ({ width: `${songShare(song, part) * 100}%` }), [song, part]);
  const patch = useCallback(
    (fields: Partial<PlayerSpec>) => {
      onChange(at, { ...part, voice: partVoice({ ...part.voice, ...fields }) });
    },
    [onChange, at, part],
  );

  return (
    <div
      {...{ [DRAG_CARD_ATTRIBUTE]: "", [PART_ATTRIBUTE]: part.id }}
      // Two inks and never one: the walk lights the row it is standing on and a hand lights the row
      // it has pointed the dials at, and a surface that drew them the same would say a part is
      // playing when what it is, is being edited (0172, 0176). The hand's mark wins where both are
      // true — the standing attribute goes on being written by the frame in the section above, and
      // this row is simply not drawing it — because what a selected row is *for* is that the dials
      // above are its. `accent` is the value a pressed control is filled with, so neither of these
      // may be it.
      className={cn(
        "flex w-full flex-col gap-1 rounded-md px-1",
        "data-[dragging=true]:relative data-[dragging=true]:z-10",
        selected ? "bg-foreground/10" : "data-[standing=true]:bg-primary/15",
      )}
    >
      <div className="flex flex-wrap items-center gap-1">
        {/* The grip is the leftmost thing on the row because it is what a pointer aims at, and the
            badge reads out of it — the rack's own card, one list along (0062, 0155, P48). */}
        <Says what={ACTION_TOOLTIPS.reorder}>
          <Button
            size="icon-sm"
            variant="ghost"
            className="cursor-grab touch-none"
            aria-label={`Reorder ${named}`}
            {...handle}
          >
            <ACTION_ICONS.reorder />
          </Button>
        </Says>
        {/* What this part is, as against where it is — and the press that points the card's dials
            at it, which is the one control that says both (0076, 0157, 0176). A state and so no
            icon (0055): the badge is the whole of what the control says, because the badge is what
            a part is called until a hand calls it something else. */}
        <Says what={PLAYER_SELECT_TOOLTIP}>
          <Toggle
            size="sm"
            variant="outline"
            pressed={selected}
            aria-label={`${PLAYER_SELECT_LABEL} ${named}`}
            onPressedChange={select}
          >
            <span className="type-readout">{badge}</span>
          </Toggle>
        </Says>
        {/* And what a hand calls it, which is the field beside that badge rather than a pencil in a
            popover: a part is one of eight rows a person is telling apart at a glance, so the name
            is where it is read (0157). Keyed on the stored name, so an undo remounts the field on
            what the session says (src/ui/ClipRack.tsx). */}
        <Says what={PLAYER_PART_NAME_TOOLTIP}>
          <Input
            key={part.name}
            className="w-32"
            defaultValue={part.name}
            maxLength={DURABLE_TEXT_MAX}
            aria-label={`${PLAYER_PART_NAME_LABEL} ${named}`}
            onKeyDown={onRenameKey}
            onBlur={onRenameBlur}
          />
        </Says>
        {/* The fold that opens this part's own dials in place. Its own control and not the badge
            beside it: pointing the card's dials at a part and editing it where it stands are two
            things a hand does, and one press that did both would make the selection a mode (0055,
            0176). */}
        <Says what={ACTION_TOOLTIPS.collapse}>
          <Toggle
            size="sm"
            className="text-muted-foreground"
            pressed={open}
            aria-label={`Open ${named}`}
            onPressedChange={unfold}
          >
            <FoldCaret />
          </Toggle>
        </Says>
        {/* How much of the song this part is, drawn rather than counted: four lengths on four rows
            are four numbers to hold against each other, and the proportion is the thing a hand is
            actually asking about (0119). A picture of the dial beside it, so it says nothing the
            row does not already say aloud. */}
        <div aria-hidden="true" className={SHARE_TRACK}>
          <div className="h-full bg-foreground/40" style={share} />
        </div>
        {/* The compact dial, which is the one drawn without a caption: a row is read across rather
            than down, and a caption on it would be a column of two line boxes (0055,
            src/ui/Knob.tsx). Its sentence goes on the dial itself, which is the only road that
            reaches a control drawing no caption — a `Says` around the component would put the
            trigger's handlers on nothing (0094, 0157). */}
        <Knob
          label={PLAYER_PART_LENGTH_LABEL}
          name={`${named} ${PLAYER_PART_LENGTH_LABEL}`}
          says={PLAYER_PART_LENGTH_TOOLTIP}
          size="xs"
          value={part.length}
          min={PLAYER_PART_MIN}
          max={PLAYER_PART_MAX}
          defaultValue={PLAYER_PART_DEFAULTS.length}
          step={1}
          onChange={setLength}
        />
        {/* And what it plays, in the three dials it is furthest from plain on: read-only, because
            the dials that change it are the fold below and a second set of them here would be two
            ways to turn one number (principle 1, 0176). */}
        <Says what={PLAYER_PART_SIGNATURE_TOOLTIP}>
          <span className="min-w-0 truncate type-readout text-muted-foreground">
            {signatureOf(part)}
          </span>
        </Says>
        {/* The four actions, at the row's end and in the order a hand reaches for them: make
            another like this, take this one out of the run, hear it alone, end it. */}
        <div className="ml-auto flex items-center gap-1">
          {/* Refused rather than hidden at the ceiling, exactly as Add Part is: a copy is a ninth
              part on a song of eight, which the one validator refuses loudly — so the control that
              would write it says so instead of writing a session that will not load (0121). */}
          <Says what={ACTION_TOOLTIPS.duplicate}>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={song.length >= PLAYER_SONG_MAX}
              aria-label={`Duplicate ${named}`}
              onClick={duplicate}
            >
              <ACTION_ICONS.duplicate />
            </Button>
          </Says>
          {/* A state and not an action — the part is passed over or it is not — so a `Toggle` and
              never a `Switch`: it is durable, and a switch is for what a yard is left in (0055). */}
          <Says what={ACTION_TOOLTIPS.skip}>
            <Toggle
              size="sm"
              variant="outline"
              pressed={part.skip}
              aria-label={`Skip ${named}`}
              onPressedChange={skip}
            >
              <ACTION_ICONS.skip />
            </Toggle>
          </Says>
          {/* Refused rather than hidden on a part the walk passes over, the way every other
              control at a bound on this card is: a skipped part has no first jump to wind to, so
              the press is unanswerable — and one that vanished would leave nothing saying the
              gesture is there when the skip comes off again (0121, 0181). */}
          <Says what={ACTION_TOOLTIPS.audition}>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={part.skip}
              aria-label={`Audition ${named}`}
              onClick={audition}
            >
              <ACTION_ICONS.audition />
            </Button>
          </Says>
          <Says what={ACTION_TOOLTIPS.remove}>
            <Button size="icon-sm" variant="ghost" aria-label={`Remove ${named}`} onClick={remove}>
              <ACTION_ICONS.remove />
            </Button>
          </Says>
        </div>
      </div>
      {/* The part's own dials, in the boxes the card draws its own in and reading this part's
          numbers: the direct edit that replaces reaching back up to the card. The selection stays,
          because it is what a *closed* part offers, but a hand no longer has to use it (0176). */}
      {open ? (
        <div className="flex w-full flex-col items-stretch gap-2">
          {playerDials({
            deck,
            named,
            player: painted,
            defaults: PLAYER_DEFAULTS,
            patch,
            doors: scoped,
          })}
        </div>
      ) : null}
    </div>
  );
}
