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
import type { BedZone } from "@/lib/playerZone";
import { bedAt, groundsAhead, plantBed, zoneAt } from "@/lib/playerGround";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { offsetPx, pxToSecs, type Loop } from "@/lib/timeline";
import type { DeckId } from "@/state/store";
import { pct, usePeakCanvas } from "@/ui/peakCanvas";
import { PlayerGroundZone, spanning, zoneBlock, type Block } from "@/ui/PlayerGroundZone";
import { track, type Tracked, usePointerGesture } from "@/ui/gesture";

/**
 * Which of the strip's gestures a pointer went down on. `ground` is the plain drag that moves the
 * window, `mark` the Shift-drag that sweeps a zone out of its own two ends, and the two edges are
 * the elements a zone is dragged narrower or wider by — targets a pointer either hit or did not,
 * the way the loop's own strip discriminates its four (0053, src/ui/LoopHandles.tsx).
 */
type Grip = "ground" | "mark" | "from" | "to";

/** The drag in flight: its pointer, which gesture it is, and — for the two edge grips — the zone
 *  as it stood when the pointer went down, so the edge that is not moving is held still. Every
 *  move commits what it reached, so there is nothing painted ahead of the store to put back
 *  (0114, src/ui/Knob.tsx). */
type Drag = Tracked & { pointerId: number; grip: Grip; anchor: number; zone: BedZone | null };

/**
 * One ground as a block over the buffer: the offset folded onto the source the deck is holding,
 * and one loop-length from there. `bedGround` is the fold and the second at once, which is what
 * keeps this rectangle and the loop a plant writes in step (principle 1, 0185). The zone goes in
 * with it, so every block on this strip lands inside a marked one exactly as the sound does (0318).
 */
const blockOf = (loop: Loop, duration: number, offset: number, zone: BedZone | null): Block => {
  const span = loop.out - loop.in;
  const ground = bedGround(loop.in, span, duration, offset, zone);
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
  const zone = player?.zone ?? null;
  // Unzoned, and it is the one block here that is: the loop is a fact about the deck rather than a
  // ground the walk reaches, so folding it would move the marker every other block is read against
  // off the loop the handles and the waveform both draw (0183, 0318).
  const home = useMemo(
    () => (loop === null ? null : blockOf(loop, duration, 0, null)),
    [loop, duration],
  );
  /** The ground the song opens on — the block a drag carries. Drawn even at bed zero, where it
   *  sits exactly on the loop's own window: it is the thing a hand takes hold of, and one that
   *  appeared only once the pattern had moved would be a control nobody could find (0121). */
  const opens = useMemo(
    () =>
      loop === null || player === null
        ? null
        : blockOf(loop, duration, player.bed * PLAYER_SLOTS, zone),
    [loop, duration, player, zone],
  );
  /** And the grounds a hand kept, marked wherever they fall on the source: the song comes back to
   *  each on a count of its own, so they are places on this picture and not moves on it (0194). */
  const kept = useMemo(
    () =>
      loop === null || player === null
        ? []
        : player.beds.map((one) => blockOf(loop, duration, one.bed * PLAYER_SLOTS, zone)),
    [loop, duration, player, zone],
  );
  /** And where the pattern's own moves go next, off the walk the transport lays: a picture of the
   *  moves being made rather than a second opinion about them (`groundsAhead`, 0089). */
  const ahead = useMemo(
    () =>
      loop === null || player === null
        ? []
        : groundsAhead(player).map((offset) => blockOf(loop, duration, offset, zone)),
    [loop, duration, player, zone],
  );
  /** And the zone a hand marked, or nothing where none is: the one block on this strip that is a
   *  bound rather than a ground (0318). */
  const marked = useMemo(
    () => (loop === null || zone === null ? null : zoneBlock(loop, duration, zone)),
    [loop, duration, zone],
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
  /** And the same reading in the unit a zone is counted in: the loop's own sixteenths, which is
   *  what `bedBounds` is narrowed in (`zoneAt`, 0318). */
  const edge = useCallback(
    (root: HTMLDivElement, clientX: number): number => {
      if (loop === null) return 0;
      const secs = pxToSecs(offsetPx(root, clientX), duration, root.clientWidth);
      return zoneAt(secs, loop.in, loop.out - loop.in);
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
  /** And the third: the zone the ground is bounded to, or null where a hand cleared it. Unchanged
   *  is unsent for the reason a bed is — a sweep crosses a sixteenth once and reports a pointer
   *  move a hundred times — and the whole gesture is one `zone` patch, so a drag is one history
   *  entry the card closes on release (0067, src/ui/PlayerCard.tsx). */
  const mark = useCallback(
    (next: BedZone | null) => {
      if (player === null) return;
      const held = player.zone;
      if (next === null ? held === null : held?.from === next.from && held.to === next.to) return;
      patch({ zone: next });
    },
    [patch, player],
  );
  /** One gesture begun, whichever grip it is: the pointer, the reading it went down on and — for
   *  the two edges — the zone that edge is moved against. */
  const begin = useCallback(
    (target: HTMLDivElement, event: PointerEvent<HTMLDivElement>, grip: Grip) => {
      drag.begin(target, event, {
        pointerId: event.pointerId,
        downClientX: event.clientX,
        grip,
        // Only a sweep has one, and only a sweep is measured against the strip it went down on:
        // an edge grip captures on the handle itself, whose box is not the ruler.
        anchor: grip === "mark" ? edge(target, event.clientX) : 0,
        zone: player?.zone ?? null,
        // Overwritten by the first `track`, on a move or on the release, before anything reads it.
        current: 0,
        moved: false,
      });
    },
    [drag, edge, player],
  );
  const onDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (disabled || player === null || loop === null || event.button !== 0) return;
      // The modifiers are read before the drag begins, so neither of the other two gestures moves
      // the window the press landed on: three gestures on one picture, and the plain drag is the
      // one a hand makes most (0194, 0318).
      if (event.altKey) {
        keep(reach(event.currentTarget, event.clientX));
        return;
      }
      // A Shift press writes nothing yet: it is a sweep until it has travelled, and a press that
      // never travels is the one that clears the zone — read on the release, where that is known.
      if (event.shiftKey) {
        begin(event.currentTarget, event, "mark");
        return;
      }
      begin(event.currentTarget, event, "ground");
      write(reach(event.currentTarget, event.clientX));
    },
    [begin, disabled, keep, loop, player, reach, write],
  );
  /** A press on one of the zone's own two edges, which is a target a pointer either hit or did
   *  not — and never also the drag that moves the window, so the press stops here (0053). */
  const onDownEdge = useCallback(
    (event: PointerEvent<HTMLDivElement>, grip: "from" | "to") => {
      if (disabled || player === null || loop === null || event.button !== 0) return;
      if (player.zone === null) return;
      event.stopPropagation();
      begin(event.currentTarget, event, grip);
    },
    [begin, disabled, loop, player],
  );
  const onDownFrom = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onDownEdge(event, "from");
    },
    [onDownEdge],
  );
  const onDownTo = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onDownEdge(event, "to");
    },
    [onDownEdge],
  );
  /** What a gesture that has travelled asks for, read live so a move and the release that follows
   *  it cannot disagree: a sweep is drawn out of its own two ends, and an edge against the one it
   *  is not moving (the shape `LoopHandles.asked` has). */
  const commit = useCallback(
    (active: Drag) => {
      if (active.grip === "ground") {
        write(active.current);
        return;
      }
      if (active.grip === "mark") {
        mark(spanning(active.anchor, active.current));
        return;
      }
      const held = active.zone;
      // `onDownEdge` refuses an edge grip without one, and the edges are drawn only where there is
      // a zone, so this cannot happen (principle 5, the claim `LoopHandles` makes of its origin).
      if (held === null) throw new Error(`a ${active.grip} edge began with no zone to move`);
      mark(spanning(active.grip === "from" ? held.to : held.from, active.current));
    },
    [mark, write],
  );
  const onMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const active = drag.matched(event);
      if (active === null) return;
      const root = event.currentTarget;
      if (active.grip === "ground") {
        track(active, event.clientX, reach(root, event.clientX));
        write(active.current);
        return;
      }
      track(active, event.clientX, edge(root, event.clientX));
      if (active.moved) commit(active);
    },
    [commit, drag, edge, reach, write],
  );
  /**
   * The hand let go. The card above this closes the history entry for every gesture inside it,
   * because every dial on it patches the one `deck.player` and no one control is the place for
   * that boundary (0067, src/ui/PlayerCard.tsx) — so what is left here is the release's own
   * position and the one press that clears the zone (0318).
   *
   * The release is a position of its own: the browser coalesces the moves of a frame, so the last
   * pixels of a drag reach the page here and nowhere else, and a whole flick can arrive as a press
   * and a release with nothing between them. Read once and then asked, or a flick would be a press
   * that never travelled — which is the gesture that clears the zone it meant to sweep
   * (src/ui/gesture.ts, the read `LoopHandles` takes on its own release).
   */
  const onUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const active = drag.ended(event);
      if (active === null) return;
      const root = event.currentTarget;
      track(
        active,
        event.clientX,
        active.grip === "ground" ? reach(root, event.clientX) : edge(root, event.clientX),
      );
      if (active.moved) commit(active);
      else if (active.grip === "mark") mark(null);
    },
    [commit, drag, edge, mark, reach],
  );
  /** A gesture the browser ended commits nothing, which is what a cancel has always meant here:
   *  the clear above is a press a hand made and let go of, not one it was interrupted in (0114). */
  const onCancel = useCallback(
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
      onPointerCancel={onCancel}
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
      {/* The zone a hand marked, under everything it bounds, or nothing where none is: the whole
            file, which is the strip as it was (0318). */}
      {marked !== null && (
        <PlayerGroundZone
          block={marked}
          named={named}
          onDownFrom={onDownFrom}
          onDownTo={onDownTo}
        />
      )}
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
