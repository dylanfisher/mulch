/**
 * @role The session's captured deck presets: name one, apply it back to a deck, delete it. Every
 *   control sends one ordinary command and the rack owns no transport, clock, graph or per-frame
 *   state — a clip is data (0027).
 * @instead Capturing one → the yard's own button group in src/ui/Deck.tsx, where the thing being
 *   captured is (0078). What applying one does to the deck → src/app/execute.ts and
 *   src/app/restore.ts.
 */
// One import per control a clip row offers: the count tracks how many gestures a clip has.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { type KeyboardEvent, useCallback, useState, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { ACTION_TOOLTIPS, CLIPS_LABEL, yardLabel } from "@/lib/copy";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import type { Clip } from "@/state/session";
import type { DeckEntry, DeckId } from "@/state/store";
import { ClipThumbnail } from "@/ui/ClipThumbnail";
import { Button } from "@/ui/components/button";
import { Card, CardAction, CardContent, CardHeader } from "@/ui/components/card";
import { Input } from "@/ui/components/input";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

function ApplyButton({
  instrument,
  clip,
  deck,
}: {
  instrument: Instrument;
  clip: Clip;
  deck: DeckId;
}) {
  const apply = useCallback(() => {
    instrument.send({ t: "clip.apply", id: clip.id, deck });
  }, [instrument, clip.id, deck]);

  return (
    <Says what={ACTION_TOOLTIPS.apply}>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Apply ${clip.name} to ${yardLabel(deck)}`}
        onClick={apply}
      >
        <ACTION_ICONS.apply data-icon="inline-start" />
        {deck}
      </Button>
    </Says>
  );
}

/**
 * Renaming, behind the one control that offers it: the card wears its name as text, and the field
 * that changes it opens from this pencil the way a playing yard's confirmation opens from its bin
 * (DeckRemove). Enter is the whole of the commit — one durable edit per deliberate gesture rather
 * than one per keystroke, the rule a lane drag follows (0024) — and it closes what it finished,
 * which is why this popover is the one the app holds open itself. Dismissing the popover any other
 * way is a cancel and writes nothing, so blur commits nothing either: a field with a way out has
 * one, and Escape means what it means everywhere else. Its key is the stored name, so an undo
 * remounts the field on what the session says.
 */
function RenameClip({ instrument, clip }: { instrument: Instrument; clip: Clip }) {
  const [open, setOpen] = useState(false);
  const rename = useCallback(
    (value: string) => {
      const name = value.trim();
      if (name.length === 0 || name === clip.name) return;
      instrument.send({ t: "clip.rename", id: clip.id, name });
    },
    [instrument, clip.id, clip.name],
  );
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      rename(event.currentTarget.value);
      setOpen(false);
    },
    [rename],
  );
  const label = `Rename ${clip.name}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button size="icon-sm" variant="ghost" aria-label={label}>
            <ACTION_ICONS.rename />
          </Button>
        }
      />
      <PopoverContent side="bottom" align="end" className="w-56">
        <PopoverTitle>{label}</PopoverTitle>
        <Input
          key={clip.name}
          defaultValue={clip.name}
          maxLength={DURABLE_TEXT_MAX}
          aria-label={`New name for ${clip.name}`}
          onKeyDown={onKeyDown}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * How much of the rack one clip takes: a quarter of it, the same declaration-beside-the-card shape
 * the effect rack's widths have (0076). The gap is `gap-2`, so four cards and the three gaps
 * between them are the row — subtracting three quarters of one gap is what makes four abreast fit.
 */
const CLIP_CARD_WIDTH = "w-full sm:w-[calc(25%-0.375rem)]";

/** One clip, as a card: what it holds, what it is called, and where it can be put. */
type ClipCardProps = { instrument: Instrument; clip: Clip; deckList: readonly DeckEntry[] };

function ClipCard({ instrument, clip, deckList }: ClipCardProps) {
  const remove = useCallback(() => {
    instrument.send({ t: "clip.delete", id: clip.id });
  }, [instrument, clip.id]);

  return (
    <li className={CLIP_CARD_WIDTH}>
      <Card size="sm" aria-label={clip.name}>
        <CardHeader>
          {/* The name is text, because that is what it is; the pencil beside it is the control
              that changes it, and the bin the one that ends the clip. */}
          <div className="truncate type-readout">{clip.name}</div>
          <CardAction className="flex items-center gap-1">
            <RenameClip instrument={instrument} clip={clip} />
            <Says what={ACTION_TOOLTIPS.remove}>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${clip.name}`}
                onClick={remove}
              >
                <ACTION_ICONS.remove />
              </Button>
            </Says>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <ClipThumbnail instrument={instrument} clip={clip} />
          <div className="flex flex-wrap items-center gap-1">
            {deckList.map(({ id: deck }) => (
              <ApplyButton key={deck} instrument={instrument} clip={clip} deck={deck} />
            ))}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

export function ClipRack({ instrument }: { instrument: Instrument }) {
  const read = useCallback(() => instrument.state.getState().clips, [instrument]);
  const clips = useSyncExternalStore(instrument.state.subscribe, read, read);
  // Apply reaches exactly the decks the session holds, however many that is (0029). Capture is
  // not here: it is a gesture about one yard, so it lives in that yard's own group (0078).
  const readDecks = useCallback(() => instrument.state.getState().deckList, [instrument]);
  const deckList = useSyncExternalStore(instrument.state.subscribe, readDecks, readDecks);
  // A rack with nothing in it is a frame around nothing, and a heading over a box that says
  // nothing is worse than no heading: the first capture is what brings the rack onto the screen
  // (P98). The gesture that makes one is the yard's own, so nothing here becomes unreachable.
  if (clips.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-label={CLIPS_LABEL}>
      <div className="type-eyebrow text-muted-foreground">{CLIPS_LABEL}</div>
      {/* One card the whole rack is, and a small card per clip laid inside it, four abreast on a
          wide viewport and stacked on a narrow one. */}
      <Card size="sm">
        <CardContent>
          <ul className="flex flex-wrap items-start gap-2">
            {clips.map((clip) => (
              <ClipCard key={clip.id} instrument={instrument} clip={clip} deckList={deckList} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
