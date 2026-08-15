/**
 * @role The session's captured deck presets: capture a deck as a clip, name it, apply it back to
 *   a deck, delete it. Every control sends one ordinary command and the rack owns no transport,
 *   clock, graph or per-frame state — a clip is data (0027).
 * @instead What applying one does to the deck → src/app/execute.ts and src/app/restore.ts.
 */
import { type KeyboardEvent, useCallback, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { CLIP_NAME_MAX, type Clip } from "@/state/session";
import { DECK_IDS, type DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";

function CaptureButton({ instrument, deck }: { instrument: Instrument; deck: DeckId }) {
  const capture = useCallback(() => {
    const clips = instrument.state.getState().clips;
    // The id is minted here, outside the command, the way an archive handle is: a clip's identity
    // is opaque and given, never derived from the label or the list position (0027).
    instrument.send({
      t: "clip.capture",
      id: crypto.randomUUID(),
      name: `clip ${clips.length + 1}`,
      deck,
    });
  }, [instrument, deck]);

  return (
    <Button size="sm" variant="outline" onClick={capture}>
      capture deck {deck}
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
      aria-label={`Apply ${clip.name} to deck ${deck}`}
      onClick={apply}
    >
      → {deck}
    </Button>
  );
}

/**
 * One clip. The name field is uncommitted text until blur or Enter, so a durable rename is one
 * edit per deliberate gesture rather than one per keystroke — the same rule a lane drag follows
 * (0024). Its key is the stored name, so an undo remounts the field on what the session says.
 */
function ClipRow({ instrument, clip }: { instrument: Instrument; clip: Clip }) {
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
      <Input
        key={clip.name}
        className="w-44"
        defaultValue={clip.name}
        maxLength={CLIP_NAME_MAX}
        aria-label={`Rename ${clip.name}`}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      {DECK_IDS.map((deck) => (
        <ApplyButton key={deck} instrument={instrument} clip={clip} deck={deck} />
      ))}
      <Button size="sm" variant="ghost" aria-label={`Delete ${clip.name}`} onClick={remove}>
        remove
      </Button>
    </li>
  );
}

export function ClipRack({ instrument }: { instrument: Instrument }) {
  const read = useCallback(() => instrument.state.getState().clips, [instrument]);
  const clips = useSyncExternalStore(instrument.state.subscribe, read, read);

  return (
    <section className="flex flex-col gap-2" aria-label="Clips">
      <div className="flex items-center gap-2">
        <div className="type-eyebrow text-muted-foreground">clips</div>
        {DECK_IDS.map((deck) => (
          <CaptureButton key={deck} instrument={instrument} deck={deck} />
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {clips.map((clip) => (
          <ClipRow key={clip.id} instrument={instrument} clip={clip} />
        ))}
      </ul>
    </section>
  );
}
