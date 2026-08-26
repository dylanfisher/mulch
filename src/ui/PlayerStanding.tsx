/**
 * @role What a yard's song is playing, said in the jumps card's header beside the seed: the name
 *   of the part standing, written once a frame straight into the element (0157). The name and not
 *   the badge, which is what a part carrying one is for — and the same word the arrangement line
 *   beside this reads out, since two vocabularies for one part on one line is one too many
 *   (`songLabel`, 0178). Per-frame and nothing else — no command, nothing durable, no React state
 *   (plan §2), the same seam an automated knob's live read runs on (0035).
 * @instead The arrangement itself, read out beside this → `songLabel`, src/lib/copy.ts. The
 *   section that edits it, where the same part is lit → src/ui/PlayerSong.tsx. What fills the read
 *   → src/audio/player.ts.
 */
import { useCallback, useLayoutEffect, useRef } from "react";

import { PLAYER_STANDING_LABEL } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import type { DeckId } from "@/state/store";
import { useOnFrame } from "@/ui/frame";

export function PlayerStanding({
  instrument,
  deck,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  /** Whether this yard is playing: a halted deck stands in no part, and a page of stopped yards
   *  runs no frames at all (0035, 0040). */
  playing: boolean;
}) {
  const out = useRef<HTMLSpanElement>(null);
  /** What the last frame wrote, so a frame that would write the same string writes nothing —
   *  the same guard the knob's readout keeps (0070, src/ui/Knob.tsx). */
  const written = useRef<string | null>(null);

  const paint = useCallback(() => {
    // The arrangement off the same read as the part standing in it, rather than off a list handed
    // down: a drawn song is a run nothing holds, so the peek is the only place either can be read
    // and both come from the step the clock is inside (0158).
    const { part: standing, song } = instrument.peek(deck).player;
    const part =
      standing === null || song === null ? undefined : song.find((entry) => entry.id === standing);
    // Nothing rather than a placeholder: between two pattern passes there is no part standing, and
    // a header that said so would be a line of text about an absence.
    const text = part === undefined ? "" : `${PLAYER_STANDING_LABEL} ${part.name}`;
    if (written.current === text) return;
    written.current = text;
    if (out.current !== null) out.current.textContent = text;
  }, [deck, instrument]);

  useOnFrame(paint, playing);
  // And once on every commit, which is the only thing that empties this: React never wrote the
  // text, so it will never take it back, and a yard that has stopped stands in no part at all —
  // a header still naming one is a surface saying what the transport does not (0040, 0157). The
  // read is the same one the frames make, so a tick still in flight writes what this just wrote.
  useLayoutEffect(paint, [paint, playing]);

  return <span ref={out} data-slot="player-standing" className="type-readout text-primary" />;
}
