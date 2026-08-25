/**
 * @role The arrangement a pattern wrote for itself, in the list a written one is read in: one row
 *   per part of the run, each showing the badge it was minted with and how many jumps it lasts,
 *   and the one standing lit as it plays (0158, 0157, 0176). Read-only, and it has to be — a drawn
 *   arrangement is a function of the seed and the four amounts at walk time and nothing stores
 *   one, so there is nothing here a gesture could edit and the dials above are what shapes it.
 * @instead The list a hand writes, and every gesture that shapes one → src/ui/PlayerSong.tsx. The
 *   four amounts → src/ui/PlayerArrange.tsx. What lays the run → src/lib/playerSong.ts. What fills
 *   the read → src/audio/player.ts.
 */
import { useCallback, useLayoutEffect, useRef } from "react";

import type { Instrument } from "@/app/facade";
import {
  partBadge,
  PLAYER_PART_LABEL,
  PLAYER_PART_LENGTH_LABEL,
  PLAYER_SONG_DRAWN,
  PLAYER_SONG_LABEL,
  yardLabel,
} from "@/lib/copy";
import type { SongPart, SongPartId } from "@/lib/playerSong";
import type { DeckId } from "@/state/store";
import { useOnFrame } from "@/ui/frame";

/**
 * What a row reads before the pattern has drawn the part it will hold — a stopped yard, and the
 * jumps of a round that has not reached this part yet. The dash a counter nobody can answer reads
 * as, said for a part nothing has drawn (0063).
 */
const UNDRAWN = "—";

/** The attribute one row carries its place in the run under, so the frame below can find it
 *  without asking React for anything — the written list's own idiom, one component along. */
const DRAWN_ATTRIBUTE = "data-drawn";

/** Which of a row's two readouts is which, for the same frame. */
const BADGE_SLOT = "drawn-badge";
const LENGTH_SLOT = "drawn-length";

// One paint per thing a row says — the badge, the length, and whether it is standing — over a
// list whose length is a durable number. The length is how many things a part shows rather than
// how much this component decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerDrawn({
  instrument,
  deck,
  count,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  /** How many parts the arrangement is a run of: `arrange`, which is durable and so is known
   *  before a note is played. The rows are drawn from it and filled in by the frames below, so a
   *  stopped yard shows the shape of what it will draw rather than nothing at all. */
  count: number;
  /** Whether this yard is playing: a halted deck stands in no part and draws no arrangement, and
   *  a page of stopped yards runs no frames at all (0035, 0040). */
  playing: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  /** The run the last frame wrote, by identity. A cursor hands out a fresh array at every part
   *  boundary and the same one at every jump between, so this is one reference test a frame and
   *  a text rewrite only where the arrangement actually moved (0070). */
  const laid = useRef<readonly SongPart[] | null>(null);
  /** And which part it lit, kept apart from the run above because the two move on different
   *  jumps: the standing part changes at every boundary, the run only when it evolves. */
  const lit = useRef<SongPartId | null>(null);

  const paint = useCallback(
    (force = false) => {
      const { part: standing, song } = instrument.peek(deck).player;
      const list = listRef.current;
      if (list === null) return;
      const wrote = force || song !== laid.current;
      const lights = force || standing !== lit.current;
      if (!wrote && !lights) return;
      laid.current = song;
      lit.current = standing;
      const rows = list.querySelectorAll<HTMLElement>(`:scope > [${DRAWN_ATTRIBUTE}]`);
      for (const [at, row] of rows.entries()) {
        const part = song?.[at];
        if (wrote) {
          const badge = row.querySelector<HTMLElement>(`[data-slot="${BADGE_SLOT}"]`);
          const length = row.querySelector<HTMLElement>(`[data-slot="${LENGTH_SLOT}"]`);
          if (badge !== null) badge.textContent = part === undefined ? UNDRAWN : partBadge(part.id);
          if (length !== null) {
            // What a drawn part says about itself besides its name: a part is a spec now, and a
            // spec is thirty-two numbers rather than a word — so what a row can read out is how
            // long it lasts, which is the one field of a part a listener counts (0176).
            length.textContent =
              part === undefined ? UNDRAWN : `${part.length} ${PLAYER_PART_LENGTH_LABEL}`;
          }
        }
        if (lights) {
          row.dataset["standing"] = String(part !== undefined && part.id === standing);
        }
      }
    },
    [deck, instrument],
  );

  const follow = useCallback(() => {
    paint();
  }, [paint]);
  useOnFrame(follow, playing);
  // And once on every commit, written whatever the refs above say — which is the only thing that
  // empties these rows. React never wrote their text, so it will never take it back, and a yard
  // that has stopped is arranging nothing at all (0040, 0157).
  useLayoutEffect(() => {
    paint(true);
  }, [paint, playing, count]);

  return (
    <div className="flex w-full flex-col items-start gap-1">
      {/* A list nothing on screen can edit has to say why, and where the arrangement it is showing
          came from: the dials above drew it, and turning one of them back is how the written one
          comes back (0158). */}
      <p className="max-w-md type-body text-muted-foreground">{PLAYER_SONG_DRAWN}</p>
      <div ref={listRef} className="flex w-full flex-col gap-1">
        {Array.from({ length: count }, (_unused, at) => (
          <div
            key={at}
            {...{ [DRAWN_ATTRIBUTE]: String(at) }}
            aria-label={`${yardLabel(deck)} ${PLAYER_SONG_LABEL} ${PLAYER_PART_LABEL} ${at + 1}`}
            // Lit while this part is the one being walked, in the ink and the box the written
            // list's own rows wear, so an arrangement reads the same way whoever wrote it (0157,
            // 0172).
            className="flex flex-wrap items-center gap-1 rounded-md px-1 data-[standing=true]:bg-primary/15"
          >
            <span data-slot={BADGE_SLOT} className="w-10 type-readout text-muted-foreground" />
            <span data-slot={LENGTH_SLOT} className="type-body" />
          </div>
        ))}
      </div>
    </div>
  );
}
