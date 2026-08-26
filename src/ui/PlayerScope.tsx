/**
 * @role One yard's walk as a picture: the window of landings ahead of the one the clock is inside,
 *   on the card's own canvas surface (0070, 0144), with the song it is arranged in drawn above it
 *   as proportional segments and the part standing lit per frame. Per-frame and nothing else — no
 *   command, nothing durable, no React state (plan §2).
 * @instead What a block is and where it sits → src/lib/playerScope.ts. What a painting is made of
 *   → src/ui/playerScopeCanvas.ts. How fast the module is going, which is the drift's one moiré
 *   row and not this → src/lib/playerDrift.ts. The part list itself, which this is the shape of →
 *   src/ui/PlayerSong.tsx.
 */
// Over the dependency cap, and what is over it is the two tiers a per-frame picture needs at once:
// the module's own maths — the walk, the geometry, the grid, the song — and the surface, the
// painter and the words. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useLayoutEffect, useMemo, useRef, type Ref } from "react";

import type { Instrument } from "@/app/facade";
import { deckRate } from "@/audio/params";
import { playerJumps } from "@/audio/player";
import { PLAYER_SCOPE_LABEL, PLAYER_SCOPE_TOOLTIP, yardLabel } from "@/lib/copy";
import type { PlayerSpec } from "@/lib/player";
import {
  PLAYER_SCOPE_LANDINGS,
  PLAYER_SCOPE_PAINT_MS,
  scopeGeometry,
  type ScopeGeometry,
} from "@/lib/playerScope";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { songIsDrawn, songShare, type SongPart, type SongPartId } from "@/lib/playerSong";
import { playerWalk, type PlayerStep } from "@/lib/playerWalk";
import { loopPeriodSecs } from "@/lib/recurrence";
import type { DeckState } from "@/state/store";
import type { DeckId } from "@/state/store";
import { useCanvasSurface } from "@/ui/canvasSurface";
import { PART_ATTRIBUTE } from "@/ui/PlayerPart";
import { paintScope } from "@/ui/playerScopeCanvas";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

/**
 * How many landings behind the one sounding the cache is allowed to keep before it drops them.
 * Four windows: the steps below `at` are never read again, and a pass that ran for an hour would
 * otherwise be holding some fourteen thousand of them. Dropped by taking the tail rather than by
 * walking again, so the trim costs one array every few hundred landings and no draws at all.
 */
const SCOPE_CACHE_SLACK = PLAYER_SCOPE_LANDINGS * 4;

/**
 * The steps this surface has walked for itself, the ordinal the first of them is, and the cursor
 * that drew them. **Append-only, and walked again only when the spec is a different object.**
 *
 * `playerWalk(spec, from)` burns `from` steps to get the tail, so a memo keyed on the peek's
 * ordinal would re-walk from zero at every landing boundary at linearly growing cost, and one
 * keyed on the spec would re-walk on every stepped pointer move of a drag — on top of the full
 * walk `rearm` is already paying there (0144). Extended lazily instead: O(1) amortised per landing
 * and one walk per dial move, and that one is taken at the surface's own cadence rather than at
 * the pointer's, so a drag costs paintings and not moves.
 *
 * A fresh walk happens only when `spec` changes identity, which is a commit and never a frame
 * where nothing moved (0070); `base` is what keeps the array itself bounded.
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

const EMPTY_GEOMETRY: ScopeGeometry = { blocks: [], secs: 0 };

/**
 * How long one slot of this yard's grid lasts in wall seconds, or null where the loop has no grid
 * to jump around at all — the same question the transport asks before it lays a pattern down
 * (`gridOf`, src/audio/player.ts), asked here through the one export that says it (`playerJumps`),
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
 * The window, kept fed. Answers the geometry to paint and how far across it the clock is, and
 * allocates on the paintings where the window actually moved — a landing boundary, a dial move —
 * and on no other (0070).
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

  // The whole of one painting's read, in one pass over the peek: the cache, the trim, the geometry
  // and the clock the playhead runs on, each with the paragraph saying why it is where it is.
  // Splitting it means walking the peek twice a painting. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  return useCallback(() => {
    const peek = instrument.peek(deck).player;
    const at = peek.at ?? 0;
    const cache = walked.current;
    // A different pattern, a pass that went back to its own start, or one wound forward past the
    // end of what is already walked: all three are a walk to here. The third is the audition — a
    // cue moves the ordinal by a whole part rather than by one landing (0181), and the trim below
    // re-anchors `base` without re-anchoring the cursor, so a jump it cannot cover would leave the
    // picture drawing landings the graph is not playing for the rest of the pass (0159).
    if (cache.spec !== player || at < cache.base || at - cache.base > cache.steps.length) {
      cache.spec = player;
      cache.base = at;
      cache.steps = [];
      cache.walk = player === null ? null : playerWalk(player, at);
    } else if (at - cache.base > SCOPE_CACHE_SLACK) {
      // The landings behind the clock are never read again, so they go — the tail of what is
      // already walked, at no draw. Not on a frame where nothing moved: this is reached once every
      // `SCOPE_CACHE_SLACK` landings, which is a few times a minute at most (0070).
      cache.steps = cache.steps.slice(at - cache.base);
      cache.base = at;
    }
    const wanted = at - cache.base + PLAYER_SCOPE_LANDINGS;
    while (cache.walk !== null && cache.steps.length < wanted) cache.steps.push(cache.walk());
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
      window.geometry = scopeGeometry(cache.steps, at - cache.base, slotSecs, peek.step);
    }
    const clock = began.current;
    // Against the ordinal exactly as the peek reports it, nulls and all: a stopped deck reports
    // none, and reading that as landing zero would leave the clock stamped where the stop was and
    // the playhead parked at the end of the first landing of the next pass.
    if (clock.at !== peek.at) {
      clock.at = peek.at;
      clock.ms = performance.now();
    }
    const first = window.geometry.blocks[0];
    // Held at the landing's own end: between two landings the pattern is resting and the head is
    // where the last one left it, which is exactly what the transport's own cursor does (P67).
    window.head =
      first === undefined || peek.at === null || window.geometry.secs <= 0
        ? 0
        : Math.min(
            first.to,
            first.from + (performance.now() - clock.ms) / 1000 / window.geometry.secs,
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
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
}) {
  const player = state.player;
  const slotSecs = slotSecsOf(state);
  const laneRef = useRef<HTMLDivElement>(null);
  /** The written list only, and only while it is the one being walked: a drawn arrangement is a
   *  run that moves as it plays, and its own section already shows it (0158). */
  const lane = useMemo(() => (player === null || songIsDrawn(player) ? [] : player.song), [player]);
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

  const paint = useCallback(
    (canvas: HTMLCanvasElement, color: string) => {
      const window = read();
      paintScope(canvas, window.geometry, window.head, color);
      light();
    },
    [light, read],
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

  // A yard with no grid to jump around has no walk to draw and says so by not being there — the
  // same answer the drift gives a module it plays straight past (0159).
  if (slotSecs === null) return null;

  return (
    <section
      className="flex w-full flex-col gap-1"
      aria-label={`${yardLabel(deck)} ${PLAYER_SCOPE_LABEL}`}
    >
      {/* The eyebrow is the one thing here a pointer can rest on and a keyboard can reach, so it
          carries the sentence — the same call the drift's estimate makes beside its own strip
          (0080, src/ui/MoireStrip.tsx). A picture this fine is unreadable without it. */}
      <Says what={PLAYER_SCOPE_TOOLTIP}>
        <button type="button" className="self-start type-eyebrow text-muted-foreground">
          {PLAYER_SCOPE_LABEL}
        </button>
      </Says>
      <div ref={rootRef} className="h-32 w-full text-primary">
        <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
      </div>
      {lane.length > 0 && <SongLane song={lane} laneRef={laneRef} />}
    </section>
  );
}
