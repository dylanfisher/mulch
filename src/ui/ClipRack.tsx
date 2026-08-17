/**
 * @role The session's captured deck presets: capture a deck as a clip, name it, apply it back to
 *   a deck, delete it. Every control sends one ordinary command and the rack owns no transport,
 *   clock, graph or per-frame state — a clip is data (0027).
 * @instead What applying one does to the deck → src/app/execute.ts and src/app/restore.ts.
 */
// One import per control a clip row offers plus the command the capture button sends: the count
// tracks how many gestures a clip has. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { type KeyboardEvent, useCallback, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { yardLabel } from "@/lib/copy";
import { DURABLE_TEXT_MAX } from "@/lib/guards";
import type { Clip } from "@/state/session";
import type { DeckEntry, DeckId } from "@/state/store";
import { captureClipCommand } from "@/ui/actions";
import { ClipThumbnail } from "@/ui/ClipThumbnail";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { ACTION_ICONS } from "@/ui/icons";
// oxlint-enable import/max-dependencies

function CaptureButton({ instrument, deck }: { instrument: Instrument; deck: DeckId }) {
  // The command comes from src/ui/actions.ts, which the palette's Capture entry also reaches: one
  // construction, minted outside the command the way an archive handle is (0027, P41).
  const capture = useCallback(() => {
    instrument.send(captureClipCommand(instrument.state.getState().clips, deck));
  }, [instrument, deck]);

  return (
    <Button size="sm" variant="outline" onClick={capture}>
      <ACTION_ICONS.capture data-icon="inline-start" />
      Capture {yardLabel(deck)}
    </Button>
  );
}

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
    <Button
      size="sm"
      variant="ghost"
      aria-label={`Apply ${clip.name} to ${yardLabel(deck)}`}
      onClick={apply}
    >
      <ACTION_ICONS.apply data-icon="inline-start" />
      {deck}
    </Button>
  );
}

/**
 * One clip. The name field is uncommitted text until blur or Enter, so a durable rename is one
 * edit per deliberate gesture rather than one per keystroke — the same rule a lane drag follows
 * (0024). Its key is the stored name, so an undo remounts the field on what the session says.
 */
type ClipRowProps = { instrument: Instrument; clip: Clip; deckList: readonly DeckEntry[] };

function ClipRow({ instrument, clip, deckList }: ClipRowProps) {
  const rename = useCallback(
    (value: string) => {
      const name = value.trim();
      if (name.length === 0 || name === clip.name) return;
      instrument.send({ t: "clip.rename", id: clip.id, name });
    },
    [instrument, clip.id, clip.name],
  );
  const onBlur = useCallback(
    (event: { currentTarget: HTMLInputElement }) => {
      rename(event.currentTarget.value);
    },
    [rename],
  );
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      rename(event.currentTarget.value);
    },
    [rename],
  );
  const remove = useCallback(() => {
    instrument.send({ t: "clip.delete", id: clip.id });
  }, [instrument, clip.id]);

  return (
    <li className="flex items-center gap-2">
      <ClipThumbnail instrument={instrument} clip={clip} />
      <Input
        key={clip.name}
        className="w-44"
        defaultValue={clip.name}
        maxLength={DURABLE_TEXT_MAX}
        aria-label={`Rename ${clip.name}`}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      {deckList.map(({ id: deck }) => (
        <ApplyButton key={deck} instrument={instrument} clip={clip} deck={deck} />
      ))}
      <Button size="icon-sm" variant="ghost" aria-label={`Delete ${clip.name}`} onClick={remove}>
        <ACTION_ICONS.remove />
      </Button>
    </li>
  );
}

export function ClipRack({ instrument }: { instrument: Instrument }) {
  const read = useCallback(() => instrument.state.getState().clips, [instrument]);
  const clips = useSyncExternalStore(instrument.state.subscribe, read, read);
  // Capture and apply reach exactly the decks the session holds, however many that is (0029).
  const readDecks = useCallback(() => instrument.state.getState().deckList, [instrument]);
  const deckList = useSyncExternalStore(instrument.state.subscribe, readDecks, readDecks);

  return (
    <section className="flex flex-col gap-2" aria-label="Clips">
      <div className="flex items-center gap-2">
        <div className="type-eyebrow text-muted-foreground">Clips</div>
        {deckList.map(({ id: deck }) => (
          <CaptureButton key={deck} instrument={instrument} deck={deck} />
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {clips.map((clip) => (
          <ClipRow key={clip.id} instrument={instrument} clip={clip} deckList={deckList} />
        ))}
      </ul>
    </section>
  );
}
