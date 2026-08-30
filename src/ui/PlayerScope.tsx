/**
 * @role One yard's walk as a picture: one sheet of landings, held still while the clock crosses it
 *   left to right and turned over whole at its end (0187), on the card's own canvas surface (0070,
 *   0144), with the song it is arranged in drawn above it as proportional segments and the part
 *   standing lit per frame. Per-frame and nothing else — no command, nothing durable, no React
 *   state (plan §2).
 * @instead What a block is and where it sits → src/lib/playerScope.ts. What a painting is made of
 *   → src/ui/playerScopeCanvas.ts. How fast the module is going, which is the drift's one moiré
 *   row and not this → src/lib/playerDrift.ts. The part list itself, which this is the shape of →
 *   src/ui/PlayerSong.tsx.
 */
// Over the dependency cap, and what is over it is the two tiers a per-frame picture needs at once:
// the module's own maths — the walk, the geometry, the grid, the song — and the surface, the
// painter and the words. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the 400-line soft cap since the picture became a control: what is over it is the drag
// that writes the distance and the count, which is one gesture and its three handlers (0197). Well
// under the hard cap docs/map.md sets — see docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { useCallback, useLayoutEffect, useMemo, useRef, type PointerEvent, type Ref } from "react";

import type { Instrument } from "@/app/facade";
import { deckRate } from "@/audio/params";
import { playerJumps } from "@/audio/playerGrid";
import { PLAYER_SCOPE_LABEL, PLAYER_SCOPE_TOOLTIP, yardLabel } from "@/lib/copy";
import { PLAYER_WALK_AIM } from "@/lib/copyCard";
import type { PlayerSpec } from "@/lib/player";
import {
  PLAYER_SCOPE_LANDINGS,
  PLAYER_SCOPE_PAINT_MS,
  scopeGeometry,
  scopeAim,
  scopeMark,
  scopeSheet,
  type ScopeGeometry,
} from "@/lib/playerScope";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { albumsParts, playedRun, soloAlbums } from "@/lib/playerAlbum";
import { songIsDrawn, songShare, type SongPart, type SongPartId } from "@/lib/playerSong";
import { playerWalk, type PlayerStep } from "@/lib/playerWalk";
import { loopPeriodSecs } from "@/lib/recurrence";
import type { DeckState } from "@/state/store";
import type { DeckId } from "@/state/store";
import { useCanvasSurface } from "@/ui/canvasSurface";
import { usePointerGesture } from "@/ui/gesture";
import { Explains } from "@/ui/Explains";
import { PART_ATTRIBUTE } from "@/ui/PlayerPart";
import { paintScope } from "@/ui/playerScopeCanvas";
// oxlint-enable import/max-dependencies

/**
 * The steps of the sheet being drawn, the ordinal it begins at, and the cursor that drew them.
 * **Append-only within a sheet, and walked again only when the spec is a different object.**
 *
 * `playerWalk(spec, from)` burns `from` steps to get the tail, so a memo keyed on the peek's
 * ordinal would re-walk from zero at every landing boundary at linearly growing cost, and one
 * keyed on the spec would re-walk on every stepped pointer move of a drag — on top of the full
 * walk `rearm` is already paying there (0144). Extended lazily instead: O(1) amortised per landing
 * and one walk per dial move, and that one is taken at the surface's own cadence rather than at
 * the pointer's, so a drag costs paintings and not moves.
 *
 * A fresh walk happens only when `spec` changes identity, which is a commit and never a frame
 * where nothing moved (0070), and even then the landings of the sheet that already sounded are
 * kept rather than re-walked: they were laid down under the spec that played them, and drawing
 * them again under the new one would draw a past nobody heard (0180, 0187). The sheet is what
 * keeps the array itself bounded — one sheet's worth of steps and never more.
 */
type Walked = {
  spec: PlayerSpec | null;
  base: number;
  steps: PlayerStep[];
  walk: (() => PlayerStep) | null;
};

/**
 * The geometry last folded, the three things that decide whether it still stands, and where the
 * clock is across it. One object, held in a ref and written in place: a painting reads through it
 * rather than being handed a fresh pair, because a fresh pair a painting is a fresh pair a
 * painting (0070).
 */
type Held = {
  at: number;
  slotSecs: number;
  steps: PlayerStep[];
  /** The landing the transport handed over, which is the block the playhead runs across (0180). */
  standing: PlayerStep | null;
  geometry: ScopeGeometry;
  head: number;
};

const EMPTY_GEOMETRY: ScopeGeometry = { blocks: [], secs: 0, at: 0 };

/**
 * How long one slot of this yard's grid lasts in wall seconds, or null where the loop has no grid
 * to jump around at all — the same question the transport asks before it lays a pattern down
 * (`gridOf`, src/audio/playerGrid.ts), asked here through the one export that says it (`playerJumps`),
 * so the picture and the sound agree about whether there is anything to draw (0159, principle 1).
 */
function slotSecsOf(state: DeckState): number | null {
  // The deck's own rate, exactly as `gridOf` reads it: a yard at half speed jumps a loop twice as
  // long in wall seconds, so a picture that asked at unity would both disagree about whether the
  // yard jumps at all and lay every rest out at the wrong width (0035, src/ui/MoireStrip.tsx).
  const period = loopPeriodSecs(state.loop, deckRate(state.params));
  if (state.loop === null || !playerJumps(period)) return null;
  return period / PLAYER_SLOTS;
}

/**
 * The sheet, kept fed. Answers the geometry to paint and how far across it the clock is, and
 * allocates on the paintings where the sheet actually changed — a landing boundary, a sheet turn,
 * a dial move — and on no other (0070).
 */
// One window's whole lifecycle — the walk, the cache, the geometry and the clock the playhead
// runs on — sharing three refs. Splitting it means threading those through hooks with one caller
// each. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function useScopeWindow(
  instrument: Instrument,
  deck: DeckId,
  player: PlayerSpec | null,
  slotSecs: number,
): () => Readonly<Held> {
  const walked = useRef<Walked>({ spec: null, base: 0, steps: [], walk: null });
  const held = useRef<Held>({
    at: -1,
    slotSecs: 0,
    steps: [],
    standing: null,
    geometry: EMPTY_GEOMETRY,
    head: 0,
  });
  /** When the landing the clock is inside began, by the wall clock, so the playhead moves between
   *  two boundaries. A picture's own estimate and never a transport read: the deck's position is
   *  buffer seconds inside one repeat, which says nothing about how far through a landing it is. */
  const began = useRef<{ at: number | null; ms: number }>({ at: -1, ms: 0 });

  // The whole of one painting's read, in one pass over the peek: the cache, the sheet, the
  // geometry and the clock the playhead runs on, each with the paragraph saying why it is where it
  // is.
  // Splitting it means walking the peek twice a painting. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  return useCallback(() => {
    const peek = instrument.peek(deck).player;
    const at = peek.at ?? 0;
    const sheet = scopeSheet(at);
    const cache = walked.current;
    if (cache.spec !== player) {
      // A dial moved. The landings of this sheet the clock is already past sounded under the spec
      // that played them, so they stay exactly as they were drawn and only the tail is laid down
      // again — the picture agreeing with the sound is what 0180 bought and 0187 keeps.
      cache.steps = cache.base === sheet ? cache.steps.slice(0, at - sheet) : [];
      cache.base = sheet;
      cache.spec = player;
      cache.walk = player === null ? null : playerWalk(player, sheet + cache.steps.length);
    } else if (cache.base !== sheet) {
      const ahead = sheet - cache.base;
      if (cache.walk !== null && ahead > 0 && ahead <= cache.steps.length) {
        // The sheet turned over. Its steps are the tail of the one before, at no draw: the cursor
        // is already standing where the new sheet's unwalked landings begin.
        cache.steps = cache.steps.slice(ahead);
      } else {
        // A pass that went back to its own start, or one wound forward past the end of what is
        // already walked — the audition, which cues the ordinal by a whole part rather than by one
        // landing (0181). Neither can be reached by trimming, so both are a walk to the sheet.
        cache.steps = [];
        cache.walk = player === null ? null : playerWalk(player, sheet);
      }
      cache.base = sheet;
    }
    while (cache.walk !== null && cache.steps.length < PLAYER_SCOPE_LANDINGS) {
      cache.steps.push(cache.walk());
    }
    const window = held.current;
    if (
      window.at !== at ||
      window.slotSecs !== slotSecs ||
      window.steps !== cache.steps ||
      window.standing !== peek.step
    ) {
      window.at = at;
      window.slotSecs = slotSecs;
      window.steps = cache.steps;
      window.standing = peek.step;
      window.geometry = scopeGeometry(cache.steps, at - sheet, slotSecs, peek.step);
    }
    const clock = began.current;
    // Against the ordinal exactly as the peek reports it, nulls and all: a stopped deck reports
    // none, and reading that as landing zero would leave the clock stamped where the stop was and
    // the playhead parked at the end of the first landing of the next pass.
    if (clock.at !== peek.at) {
      clock.at = peek.at;
      clock.ms = performance.now();
    }
    // The block the clock is inside, which is where on the sheet the head is — so the head crosses
    // a sheet left to right over its whole length rather than running the first landing again at
    // every boundary (0187).
    const standing = window.geometry.blocks[window.geometry.at];
    // Held at the landing's own end: between two landings the pattern is resting and the head is
    // where the last one left it, which is exactly what the transport's own cursor does (P67).
    window.head =
      standing === undefined
        ? 0
        : peek.at === null || window.geometry.secs <= 0
          ? standing.from
          : Math.min(
              standing.to,
              standing.from + (performance.now() - clock.ms) / 1000 / window.geometry.secs,
            );
    return window;
  }, [deck, instrument, player, slotSecs]);
}

/**
 * The song as a shape: one segment per part, at the share of the run that part is played for
 * (`songShare`, src/lib/playerSong.ts), with the standing one lit once a frame straight into the
 * element — exactly the mechanism the part list itself uses (0157, src/ui/PlayerSong.tsx). It
 * replaces nothing; it is what the list looks like from a distance.
 */
function SongLane({ song, laneRef }: { song: readonly SongPart[]; laneRef: Ref<HTMLDivElement> }) {
  /** The widths, built once per song rather than per render: a fresh style object per segment per
   *  render is a fresh prop on each of them, which is what `PartCard`'s own bar memoises for. */
  const segments = useMemo(
    () =>
      song.map((part) => ({ id: part.id, style: { width: `${songShare(song, part) * 100}%` } })),
    [song],
  );
  return (
    <div ref={laneRef} className="flex h-1 w-full gap-px" aria-hidden="true">
      {segments.map((segment) => (
        <div
          key={segment.id}
          {...{ [PART_ATTRIBUTE]: segment.id }}
          data-standing="false"
          className="h-full bg-muted-foreground/40 data-[standing=true]:bg-primary"
          style={segment.style}
        />
      ))}
    </div>
  );
}

// The picture, the lane under it and the one painting that writes both: over the cap by the
// paragraph on each, and neither half of it is a thing on its own — the lane is lit by the same
// painting the canvas is drawn by, so a component for it would be a second per-frame reader of the
// one peek (0070). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerScope({
  instrument,
  deck,
  state,
  solo,
  patch,
  disabled = false,
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
  /** Which part of the song the pass is playing on its own, or null for the whole song. The
   *  picture draws what is being *heard*, so it walks the same soloed spec the transport does —
   *  one author of what a solo is, or the sheet would draw a run nobody is playing (principle 1,
   *  0190, `soloAlbums`). */
  solo: SongPartId | null;
  /** The card's own patch, which is what makes this picture a control rather than a readout: a
   *  drag across it writes the distance and the count, sent as the one `deck.player` every dial on
   *  the card sends (0089, 0197, `scopeAim`). It reaches the selected part when one is selected,
   *  for the reason the dials do — it is the card's patch and not a second one (0176). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** Whether the picture is a readout only, the way every dial under it is refused while the
   *  switch is off: there is no spec for a drag to write until the module holds one (0121). */
  disabled?: boolean;
}) {
  /** The spec being walked: the one the deck holds, less every part a solo is not. A memo because
   *  its identity is what the sheet re-walks on — a fresh object per frame is a fresh walk per
   *  frame (0070). */
  const player = useMemo(
    () => (state.player === null ? null : soloAlbums(state.player, solo)),
    [state.player, solo],
  );
  const slotSecs = slotSecsOf(state);
  const laneRef = useRef<HTMLDivElement>(null);
  /**
   * The parts the walk actually plays, in the order the albums hold them, and only while that list
   * is the one being walked: a drawn arrangement is a run that moves as it plays, and its own
   * section already shows it (0158). Flat, because a lane is one line: which song a part stands in
   * is the section's picture and never this one's (P147).
   *
   * Through `playedRun` and never off the whole spec, for the reason `songShare` zeroes a skipped
   * part: a segment is how much of what is *heard* this part is, so a part inside an album or a
   * song played no times at all is none of the picture — a count of nought is the skip, and a
   * segment that could never light would be a picture of a run nobody is playing.
   */
  const lane = useMemo(
    () => (player === null || songIsDrawn(player) ? [] : albumsParts(playedRun(player.albums))),
    [player],
  );
  /**
   * What the last painting lit: the part, and the list it lit inside. The list is half of it
   * because React never wrote a segment's mark — a lane swapped out and back arrives with every
   * segment dark, and a guard on the part alone would skip it until the standing part changed,
   * which is exactly the hole `paint(true)` fills in the part list itself (0157,
   * src/ui/PlayerSong.tsx). A new list is a new `paint`, and `useCanvasSurface` paints on the
   * commit that changes one.
   */
  const lit = useRef<{ part: SongPartId | null; song: readonly SongPart[] }>({
    part: null,
    song: [],
  });
  const read = useScopeWindow(instrument, deck, player, slotSecs ?? 0);

  /**
   * Lighting the lane's standing segment, straight into the DOM. Its own call because a frame is
   * not the only thing that has to write it: a stopped yard registers no frame callback at all, so
   * the commit that stops one is the only thing left to put a lit segment back — the same hole
   * `paint(true)` fills in the part list itself (0157, src/ui/PlayerSong.tsx).
   */
  const light = useCallback(() => {
    const standing = instrument.peek(deck).player.step?.part ?? null;
    if (standing === lit.current.part && lane === lit.current.song) return;
    lit.current = { part: standing, song: lane };
    const strip = laneRef.current;
    if (strip === null) return;
    for (const segment of strip.querySelectorAll<HTMLElement>(`[${PART_ATTRIBUTE}]`)) {
      segment.dataset["standing"] = String(segment.getAttribute(PART_ATTRIBUTE) === standing);
    }
  }, [deck, instrument, lane]);

  /**
   * Where the crosshair stands, or null while there is nothing to grab. Off the deck's own spec
   * rather than the soloed one: the two numbers the drag writes are the card's, and a solo swaps
   * the *song* being heard without moving either of them (0190). Off the spec and never off the
   * step, so the handle is where a hand left it rather than where the walk has wandered to — a
   * marker that moved per frame would be a readout wearing a control's clothes (0157).
   */
  const aim = useMemo(
    () => (state.player === null ? null : scopeMark(state.player.distance, state.player.repeats)),
    [state.player],
  );
  const paint = useCallback(
    (canvas: HTMLCanvasElement, color: string) => {
      const window = read();
      paintScope(canvas, window.geometry, window.head, color, aim);
      light();
    },
    [aim, light, read],
  );
  // Animated only where there is a walk to draw: a playing yard whose loop has no grid draws
  // nothing, so it registers no frame callback either (0035, 0157).
  const { rootRef, canvasRef } = useCanvasSurface(
    paint,
    state.playing && slotSecs !== null,
    PLAYER_SCOPE_PAINT_MS,
  );

  // And once on every commit, written whatever the frame loop is doing: a yard that stops
  // registers no frame callback, so nothing else clears the segment the last frame lit (0040).
  useLayoutEffect(light, [light, state.playing]);

  /**
   * The gesture that makes this a control: where in the picture the pointer is, as the two numbers
   * that shape what it draws. The record carries nothing but the pointer, the way the ground's
   * does — every move writes what it reaches, and unchanged is unsent (0114, src/ui/PlayerGround.tsx).
   */
  const drag = usePointerGesture<{ pointerId: number }>(() => {});
  const write = useCallback(
    (target: Element, clientX: number, clientY: number) => {
      if (state.player === null) return;
      const box = target.getBoundingClientRect();
      // Up for more, because a landing stacks upward from the line the sheet is drawn on.
      const put = scopeAim((clientX - box.left) / box.width, (box.bottom - clientY) / box.height);
      if (put.distance === state.player.distance && put.repeats === state.player.repeats) return;
      patch(put);
    },
    [patch, state.player],
  );
  const onDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (disabled || state.player === null || event.button !== 0) return;
      drag.begin(event.currentTarget, event, { pointerId: event.pointerId });
      write(event.currentTarget, event.clientX, event.clientY);
    },
    [disabled, drag, state.player, write],
  );
  const onMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (drag.matched(event) === null) return;
      write(event.currentTarget, event.clientX, event.clientY);
    },
    [drag, write],
  );
  /** The hand let go, and that is the whole of it: the card closes the history entry for every
   *  gesture inside it, because every control on it patches the one `deck.player` (0067). */
  const onUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      drag.ended(event);
    },
    [drag],
  );

  // A yard with no grid to jump around has no walk to draw and says so by not being there — the
  // same answer the drift gives a module it plays straight past (0159).
  if (slotSecs === null) return null;

  return (
    <section
      className="flex w-full flex-col gap-1"
      aria-label={`${yardLabel(deck)} ${PLAYER_SCOPE_LABEL}`}
    >
      {/* The eyebrow and, beside it, the press that explains the picture. The sentence used to be
          on the word itself — a hover target nothing on screen said was one, which is exactly the
          reading 0198 is about: a picture this fine is unreadable without its sentence, and a
          sentence nobody can see a way into is a sentence nobody reads (0080). The icon is the way
          in, and it carries both halves — what the shape means, and what the crosshair on it does.
          Reachable by a pointer and by a keyboard, which is what a sentence has to be. */}
      <div className="flex items-center gap-1">
        <span className="type-eyebrow text-muted-foreground">{PLAYER_SCOPE_LABEL}</span>
        <Explains
          what={`${PLAYER_SCOPE_TOOLTIP} ${PLAYER_WALK_AIM}`}
          named={`${yardLabel(deck)} ${PLAYER_SCOPE_LABEL}`}
        />
      </div>
      {/* The picture, and the two numbers a drag across it writes. The sentence is on the eyebrow
          above rather than here, and the dials in Fine Tune are the keyboard's road to both — the
          call the ground's own picture already makes, for the reason it makes it: a canvas is not
          a thing a keyboard can rest on (0080, 0191, src/ui/PlayerGround.tsx). The pointer says
          what it is for: a surface a hand moves in both directions. */}
      <div
        ref={rootRef}
        data-slot="player-scope"
        data-disabled={disabled}
        className="h-24 w-full touch-none text-primary select-none data-[disabled=false]:cursor-grab data-[disabled=false]:active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
      </div>
      {lane.length > 0 && <SongLane song={lane} laneRef={laneRef} />}
    </section>
  );
}
