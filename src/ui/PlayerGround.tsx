/**
 * @role The ground as a picture a hand moves: the whole source drawn once, the loop's own window
 *   marked on it, the bed the song opens on drawn as the block a drag carries along the file, and
 *   the grounds the pattern's own moves reach next drawn ahead of it (0191), and the ones a hand
 *   kept marked where they fall (0194). One `deck.player` per gesture, carrying the whole spec,
 *   like every other control on this card (0089).
 * @instead What a bed is, and where an offset lands on a real buffer → src/lib/playerBed.ts. Which
 *   bed a point names, the grounds ahead, and what keeping one does to the list →
 *   src/lib/playerGround.ts. The row those kept ones are counted on → src/ui/PlayerBeds.tsx. The
 *   dials beside this — the bed, the period and the three amounts a move is shaped by →
 *   src/ui/PlayerBed.tsx and
 *   src/ui/PlayerCard.tsx. The yard's own waveform, where the loop is *set* → src/ui/Waveform.tsx:
 *   that one is about the loop and the playhead, and this one is about where that loop is read.
 */
import { useCallback, useMemo, type PointerEvent } from "react";

// Over the cap by the grounds it draws: the source, the loop's window, the bed a drag carries and
// the kept ones marked on it are each read from their own module, plus the canvas and gesture this
// file draws them with. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import type { Instrument } from "@/app/facade";
import { PLAYER_GROUP_LABELS, yardLabel } from "@/lib/copy";
import type { PlayerSpec } from "@/lib/player";
import { bedGround } from "@/lib/playerBed";
import { bedAt, groundsAhead, plantBed } from "@/lib/playerGround";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { offsetPx, pxToSecs, type Loop } from "@/lib/timeline";
import type { DeckId } from "@/state/store";
import { pct, usePeakCanvas } from "@/ui/peakCanvas";
import { usePointerGesture } from "@/ui/gesture";

/** One rectangle on the strip: where it begins and how wide it is, both as CSS percentages. */
type Block = { left: string; width: string };

/** The drag in flight, which carries nothing but its pointer: every move commits the bed it
 *  reached, so there is nothing painted ahead of the store to put back (0114, src/ui/Knob.tsx). */
type Drag = { pointerId: number };

/**
 * One ground as a block over the buffer: the offset folded onto the source the deck is holding,
 * and one loop-length from there. `bedGround` is the fold and the second at once, which is what
 * keeps this rectangle and the loop a plant writes in step (principle 1, 0185).
 */
const blockOf = (loop: Loop, duration: number, offset: number): Block => {
  const span = loop.out - loop.in;
  const ground = bedGround(loop.in, span, duration, offset);
  return { left: pct(ground.in, duration), width: pct(span, duration) };
};

// One picture, one gesture and the blocks it draws: the length is how many things the ground is
// rather than how much this component decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerGround({
  instrument,
  deck,
  player,
  loop,
  duration,
  patch,
  disabled = false,
}: {
  instrument: Instrument;
  deck: DeckId;
  /** The spec the picture is of, or null while the module holds none — which is a strip drawn
   *  with the source and the loop on it and nothing moved, the way every dial on this card is
   *  drawn before it is turned on (0121, 0173). */
  player: PlayerSpec | null;
  /** The loop the ground is measured from: the window at bed zero. Null is a yard with nothing to
   *  read, and there is no picture to draw. */
  loop: Loop | null;
  /** How long the source is, which is the whole of what this strip is a map of. */
  duration: number;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  disabled?: boolean;
}) {
  const peaks = instrument.peaks(deck);
  const { rootRef, canvasRef } = usePeakCanvas(peaks);
  // Nothing is painted ahead of the store: a move writes the bed it reached, so a gesture the
  // browser ended has nothing left to put back (0114).
  const drag = usePointerGesture<Drag>(() => {});
  const named = `${yardLabel(deck)} ${PLAYER_GROUP_LABELS.ground}`;

  /** The window the loop itself is, which is bed zero and the thing every other block is read
   *  against: a hand reading this strip is asking "where is the loop, and where is it being read
   *  instead". */
  const home = useMemo(() => (loop === null ? null : blockOf(loop, duration, 0)), [loop, duration]);
  /** The ground the song opens on — the block a drag carries. Drawn even at bed zero, where it
   *  sits exactly on the loop's own window: it is the thing a hand takes hold of, and one that
   *  appeared only once the pattern had moved would be a control nobody could find (0121). */
  const opens = useMemo(
    () =>
      loop === null || player === null ? null : blockOf(loop, duration, player.bed * PLAYER_SLOTS),
    [loop, duration, player],
  );
  /** And the grounds a hand kept, marked wherever they fall on the source: the song comes back to
   *  each on a count of its own, so they are places on this picture and not moves on it (0194). */
  const kept = useMemo(
    () =>
      loop === null || player === null
        ? []
        : player.beds.map((one) => blockOf(loop, duration, one.bed * PLAYER_SLOTS)),
    [loop, duration, player],
  );
  /** And where the pattern's own moves go next, off the walk the transport lays: a picture of the
   *  moves being made rather than a second opinion about them (`groundsAhead`, 0089). */
  const ahead = useMemo(
    () =>
      loop === null || player === null
        ? []
        : groundsAhead(player).map((offset) => blockOf(loop, duration, offset)),
    [loop, duration, player],
  );

  /** Where a press or a move landed, as the bed it names. The reading is taken off the padding
   *  box, which is what the canvas and the blocks over it are both placed against. */
  const reach = useCallback(
    (root: HTMLDivElement, clientX: number): number => {
      if (loop === null) return 0;
      const secs = pxToSecs(offsetPx(root, clientX), duration, root.clientWidth);
      return bedAt(secs, loop.in, loop.out - loop.in);
    },
    [loop, duration],
  );
  /** One bed, sent as the whole spec — the same command a turn of the Bed dial beside this sends,
   *  because it is the same field (principle 1, 0089). Unchanged is unsent: a drag crosses a bed
   *  boundary once and reports a pointer move a hundred times. */
  const write = useCallback(
    (bed: number) => {
      if (player === null || bed === player.bed) return;
      patch({ bed });
    },
    [patch, player],
  );
  /** And the other gesture on the picture: one ground kept, or let go. An Option press rather than
   *  a plain one because the plain one is the drag, and what a hand does most here is move the
   *  window — the modifier is the one that says "this ground, permanently" (0194). Unchanged is
   *  unsent, the way an unmoved drag is: `plantBed` hands the same list back where there is no
   *  room for another. */
  const keep = useCallback(
    (bed: number) => {
      if (player === null) return;
      const beds = plantBed(player.beds, bed);
      if (beds !== player.beds) patch({ beds });
    },
    [patch, player],
  );
  const onDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (disabled || player === null || loop === null || event.button !== 0) return;
      // The modifier is read before the drag begins, so keeping a ground never moves the window
      // the press landed on: two gestures on one picture, and a press is one of them (0194).
      if (event.altKey) {
        keep(reach(event.currentTarget, event.clientX));
        return;
      }
      drag.begin(event.currentTarget, event, { pointerId: event.pointerId });
      write(reach(event.currentTarget, event.clientX));
    },
    [disabled, drag, keep, loop, player, reach, write],
  );
  const onMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (drag.matched(event) === null) return;
      write(reach(event.currentTarget, event.clientX));
    },
    [drag, reach, write],
  );
  /** The hand let go, and that is the whole of it: the card above this closes the history entry
   *  for every gesture inside it, because every dial on it patches the one `deck.player` and no
   *  one control is the place for that boundary (0067, src/ui/PlayerCard.tsx). */
  const onUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      drag.ended(event);
    },
    [drag],
  );

  // A yard with no loop has no ground to draw and says so by not being there, which is the answer
  // the picture above this box gives a yard with no grid to jump around (0159, 0171).
  if (loop === null || home === null) return null;

  return (
    // The sentence is on the fold's own toggle rather than on this picture: a canvas is not a
    // thing a keyboard can rest on, and the word over it is what says how to read what is under it
    // — which is the call the written row already makes (0080, 0188, 0217).
    <div
      ref={rootRef}
      data-slot="player-ground"
      aria-label={named}
      // The pointer says what the picture is for: a strip a hand moves sideways, which is the one
      // thing about this picture a glance cannot otherwise tell (0080).
      className="relative h-10 w-full cursor-ew-resize touch-none border border-border select-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50"
      data-disabled={disabled}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <canvas ref={canvasRef} className="size-full text-muted-foreground" aria-hidden="true" />
      {/* Where the loop itself is, in the loop's own ink at the level the waveform draws a moved
            one in: this is the same fact that surface draws, so it is drawn the same way (0183). */}
      <div
        data-slot="ground-home"
        className="pointer-events-none absolute inset-y-0 border border-loop/50"
        style={home}
      />
      {/* And where the pattern is about to be, quietest of the three: a ground the walk has
            decided but not yet reached (0191). */}
      {ahead.map((block, at) => (
        <div
          // The blocks are a sequence and nothing about one of them is identity: two moves may
          // land on one ground, and the order they are reached in is the whole of what they are.
          // oxlint-disable-next-line react/no-array-index-key
          key={at}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 border border-dashed border-primary/30"
          style={block}
        />
      ))}
      {/* And the grounds kept, marked inside the ones ahead: a kept ground is a place the song
            returns to on its own count, so it is drawn as standing there rather than as a move
            (0194). */}
      {kept.map((block, at) => (
        <div
          // Two kept grounds are two places and never one thing that moved, so the sequence is the
          // whole of what a key could say (0194, the argument the blocks above make).
          // oxlint-disable-next-line react/no-array-index-key
          key={at}
          data-slot="ground-kept"
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-2 border border-primary/50 bg-primary/10"
          style={block}
        />
      ))}
      {/* The block a hand moves, and the one thing on this strip that is a control. */}
      {opens !== null && (
        <div
          data-slot="ground-opens"
          className="pointer-events-none absolute inset-y-0 border border-primary/60 bg-primary/15"
          style={opens}
        />
      )}
    </div>
  );
}
