/**
 * @role One yard's walk as a score: one sheet of landings on the loop, each standing as tall as the
 *   count it is struck and ruled at the counts and at the loop's own turnovers, held still while
 *   the clock crosses it left to right and turned over whole at its end (0187, 0258), on the card's
 *   own canvas surface (0070, 0144), with the run it is arranged in drawn under it as two lanes of
 *   proportional segments — song and part — each lane saying its tier's word and the name of the
 *   row standing in it, the row of each tier lit per frame, and the wait the clock is standing in
 *   counted down in words beside the label. A press picks a landing to read and writes nothing
 *   (0257); nothing per-frame goes through React state (plan §2).
 * @instead What a block is, where it sits and which one a press lands on → src/lib/playerScope.ts.
 *   What a painting is made of → src/ui/playerScopeCanvas.ts. The numbers of the landing a press
 *   picked → src/ui/PlayerLanding.tsx. How fast the module is going, which is the drift's one moiré
 *   row and not this → src/lib/playerDrift.ts. The part list itself, which this is the shape of →
 *   src/ui/PlayerGrid.tsx.
 */
// Over the dependency cap, and what is over it is the two tiers a per-frame picture needs at once:
// the module's own maths — the walk, the geometry, the grid, the song — and the surface, the
// painter and the words. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the 400-line soft cap by what a per-frame picture is: the fed window with a paragraph
// per ref, the two lanes, the wait's own sentence and the press that picks a landing to read. The
// readout those numbers are drawn in is its own file for exactly this reason
// (src/ui/PlayerLanding.tsx). Well under the hard cap docs/map.md sets — see
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

import type { Instrument } from "@/app/facade";
import { deckRate } from "@/audio/params";
import { playerJumps } from "@/audio/playerGrid";
import { growthLeft } from "@/lib/copyAuto";
import {
  PLAYER_PART_LABEL,
  PLAYER_SCOPE_LABEL,
  PLAYER_SCOPE_TOOLTIP,
  PLAYER_SONG_LABEL,
  waitLeftSaid,
  yardLabel,
} from "@/lib/copy";
import { playerSounding, type PlayerSpec } from "@/lib/player";
import {
  blockAt,
  pickOnSheet,
  PLAYER_SCOPE_LANDINGS,
  PLAYER_SCOPE_PAINT_MS,
  scopeGeometry,
  scopeSheet,
  type ScopeBlock,
  type ScopeGeometry,
} from "@/lib/playerScope";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { songsParts, playedRun, soloSongs } from "@/lib/playerSongs";
import { songIsDrawn, songShare, type SongPart, type SongPartId } from "@/lib/playerSong";
import { playerWalk, type PlayerStep } from "@/lib/playerWalk";
import { loopPeriodSecs } from "@/lib/recurrence";
import type { DeckState } from "@/state/store";
import type { DeckId } from "@/state/store";
import { useCanvasSurface } from "@/ui/canvasSurface";
import { Explains } from "@/ui/Explains";
import {
  litRows,
  PART_ATTRIBUTE,
  sameRow,
  SONG_ATTRIBUTE,
  standingIn,
  type StandingRow,
} from "@/ui/playerLit";
import { PlayerLanding } from "@/ui/PlayerLanding";
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

const EMPTY_GEOMETRY: ScopeGeometry = { blocks: [], secs: 0, at: 0, bars: [] };

/**
 * This scope's cadence as the budget asks for it — one gap that never moves, where the drift's own
 * moves with what its rack costs (`paced`, src/ui/frame.ts, 0284).
 */
const scopePace = (): number => PLAYER_SCOPE_PAINT_MS;

/**
 * How long one slot of this yard's grid lasts in wall seconds, or null where the loop has no grid
 * to jump around at all — the same question the transport asks before it lays a pattern down
 * (`gridOf`, src/audio/playerGrid.ts), asked here through the one export that says it (`playerJumps`),
 * so the picture and the sound agree about whether there is anything to draw (0159, principle 1).
 *
 * The arrangement's rows count down through the same answer: a yard whose loop has no grid has no
 * seconds to say and says none, which is the answer this picture already gives by not being there
 * (0159, src/ui/PlayerGrid.tsx).
 */
export function slotSecsOf(state: DeckState): number | null {
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
    // Held at the end of the landing's own wait, which is where the next one begins: the ordinal
    // steps at the landing *after* the rest, so the elapsed the head runs on spans the whole of
    // this step's span and the head crosses the wait the picture now draws (P67, P156). Held there
    // and no further, so a late frame parks it at the seam rather than inside the next landing.
    window.head =
      standing === undefined
        ? 0
        : peek.at === null || window.geometry.secs <= 0
          ? standing.from
          : Math.min(
              standing.wait?.to ?? standing.to,
              standing.from + (performance.now() - clock.ms) / 1000 / window.geometry.secs,
            );
    return window;
  }, [deck, instrument, player, slotSecs]);
}

/** One segment of a lane: which row of its tier it is, what that row is called, and how much of
 *  the run it holds. The name rides on the segment rather than being looked up when one lights,
 *  so the painting reads it off the element it already found (0157). */
type LaneSegment = { id: string; name: string; style: { width: string } };

/** The two lanes' segments, one list per tier, both measured against the same played run so the
 *  song above sits exactly over the parts it holds. */
type ScopeLanes = { songs: LaneSegment[]; parts: LaneSegment[] };

/**
 * The two lanes lit at once, each tier's segment marked by the row the walk is standing in.
 *
 * Which row that is, is `standingIn`'s answer and never a second read of the place (principle 1,
 * src/ui/PlayerGrid.tsx): the section below and the lanes above it are two pictures of one run, and
 * a lane that worked out where the walk was for itself could disagree with the row it sits over.
 *
 * A segment is still a width with nowhere to put a countdown, so `litRows` finds no clock in one
 * and writes none — the seconds are the section's (0159). What each lane does say is the name of
 * the row standing in it, written into the lane's own label beside the tier's word: two
 * hairlines cannot tell a hand which one is the songs, and the section that could is no help
 * while the fold over it is shut (P156). The name is copied off the segment the walk just lit,
 * which is why it rides on the element — one author of where the walk is, and no second read of
 * the place (principle 1).
 */
export function litLanes(strip: HTMLElement, standing: StandingRow): void {
  litLane(strip, SONG_ATTRIBUTE, standing.song);
  litLane(strip, PART_ATTRIBUTE, standing.part);
}

/** Where a lane writes the standing row's name — the label's counterpart to a row's clock slot
 *  (`ROW_LEFT_SLOT`, src/ui/PlayerGridPick.tsx), one per tier and told apart by the tier's own
 *  attribute so the two labels are two targets and not one. */
export const LANE_NAME_SLOT = "lane-name";

/** One tier's lane lit: the mark on its standing segment, and that segment's name in the lane's
 *  label. Empty where nothing is standing — a stopped yard reads as the empty label the same
 *  commit puts a dark segment back with (0070, 0157) — and compared before it is written, because
 *  a `textContent` replaces the node's children whether or not the string matches. */
function litLane(strip: HTMLElement, attribute: string, standing: string | null): void {
  litRows(strip, attribute, standing, "");
  const label = strip.querySelector<HTMLElement>(
    `[data-slot="${LANE_NAME_SLOT}"][data-lane="${attribute}"]`,
  );
  if (label === null) return;
  const lit =
    standing === null
      ? null
      : strip.querySelector<HTMLElement>(`[${attribute}][data-standing="true"]`);
  const named = lit?.dataset["name"] ?? "";
  if (label.textContent !== named) label.textContent = named;
}

/** Standing nowhere, which is what a stopped yard reads as — the one shape, taken from the one
 *  answer, so the first painting has something of its own kind to compare against. */
const NOTHING_LIT = standingIn(null, null);

/**
 * One tier as a shape: a segment per row of it, at the share of the played run that row holds
 * (`songShare`, src/lib/playerSong.ts), with the standing one lit once a frame straight into the
 * element — exactly the mechanism the part list itself uses (0157, src/ui/PlayerGrid.tsx). It
 * replaces nothing; it is what the list looks like from a distance.
 *
 * The tier is carried by the attribute each segment wears — the same attribute its row wears in
 * the section below, so one id means one thing across both pictures (0157).
 */
function ScopeLane({
  segments,
  attribute,
  word,
  tall,
}: {
  segments: readonly LaneSegment[];
  attribute: string;
  /** The tier's word, as the rest of the card already says it (`PLAYER_SONG_LABEL` and its
   *  neighbour) — nothing new is written for a lane (principle 1). */
  word: string;
  tall: string;
}) {
  return (
    <div className="flex w-full flex-col gap-0.5">
      <div className="flex w-full items-baseline gap-1 type-eyebrow text-muted-foreground">
        <span>{word}</span>
        {/* Empty on the server and filled per frame, exactly like the wait's eyebrow above: the
            name of the row standing in this lane, written straight into the node (`litLane`). */}
        <span
          data-slot={LANE_NAME_SLOT}
          data-lane={attribute}
          className="min-w-0 truncate text-foreground"
        />
      </div>
      <div className={`flex w-full gap-px ${tall}`}>
        {segments.map((segment) => (
          <div
            key={segment.id}
            {...{ [attribute]: segment.id }}
            data-name={segment.name}
            data-standing="false"
            className="h-full bg-muted-foreground/40 data-[standing=true]:bg-primary"
            style={segment.style}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * What the eyebrow says while the clock is inside a wait: how long the standing landing's wait has
 * left, in the clock every other countdown on the card is said in (`growthLeft`,
 * src/lib/copyAuto.ts) and the sentence that says what that clock is counting (`waitLeftSaid`,
 * src/lib/copy.ts) — prose here, because a row's column has no room for the word and an eyebrow
 * has. How long a wait is, is written once and in words rather than sixteen times
 * on the canvas — a picture this size cannot hold a number per block, and sixteen unreadable ones
 * are worse than none (P156).
 *
 * Empty everywhere else, and empty rather than nought: a landing that does not rest, a head still
 * inside the sounding, and a sheet with no standing block are all "nothing to say" and none of them
 * is a wait of no seconds.
 */
export function waitSaid(geometry: ScopeGeometry, head: number): string {
  const wait = geometry.blocks[geometry.at]?.wait;
  if (wait === undefined || wait === null || head < wait.from) return "";
  return waitLeftSaid(growthLeft((wait.to - head) * geometry.secs));
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
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
  /** Which part of the song the pass is playing on its own, or null for the whole song. The
   *  picture draws what is being *heard*, so it walks the same soloed spec the transport does —
   *  one author of what a solo is, or the sheet would draw a run nobody is playing (principle 1,
   *  0190, `soloSongs`). */
  solo: SongPartId | null;
}) {
  /** The spec being walked: the one the deck holds, less every part a solo is not. A memo because
   *  its identity is what the sheet re-walks on — a fresh object per frame is a fresh walk per
   *  frame (0070). */
  /**
   * The spec this is a picture of, which is nothing while the switch stands off over one: a
   * bypassed yard is handed no pattern, so a walk drawn from it would be a picture of a walk
   * nothing is walking. Read through the one reader of that field, the way the graph is
   * (`playerSounding`, src/lib/player.ts, P164) — it hands back the spec itself or null, so it is
   * stable enough to key the memos below on.
   */
  const armed = playerSounding(state.player);
  const player = useMemo(() => (armed === null ? null : soloSongs(armed, solo)), [armed, solo]);
  const slotSecs = slotSecsOf(state);
  const laneRef = useRef<HTMLDivElement>(null);
  /**
   * The parts the walk actually plays, in the order the songs hold them, and only while that list
   * is the one being walked: a drawn arrangement is a run that moves as it plays, and its own
   * section already shows it (0158). Flat, because a lane is one line: which song a part stands in
   * is the section's picture and never this one's (P170).
   *
   * Through `playedRun` and never off the whole spec, for the reason `songShare` zeroes a skipped
   * part: a segment is how much of what is *heard* this part is, so a part inside a song played no
   * times at all is none of the picture — a count of nought is the skip, and a segment that could
   * never light would be a picture of a run nobody is playing.
   */
  const lanes = useMemo((): ScopeLanes | null => {
    if (player === null || songIsDrawn(player)) return null;
    const run = playedRun(player.songs);
    const parts = songsParts(run);
    if (parts.length === 0) return null;
    /** One row's width: its parts' shares of the played run summed, which is `songShare`'s own
     *  arithmetic one tier up rather than a second reading of it (principle 1). */
    const wide = (held: readonly SongPart[]): { width: string } => ({
      width: `${held.reduce((share, part) => share + songShare(parts, part), 0) * 100}%`,
    });
    return {
      songs: run.map((song) => ({ id: song.id, name: song.name, style: wide(song.parts) })),
      parts: parts.map((part) => ({ id: part.id, name: part.name, style: wide([part]) })),
    };
  }, [player]);
  /**
   * What the last painting lit: the row of each tier, and the lanes it lit inside. The lanes are
   * part of it because React never wrote a segment's mark — a lane swapped out and back arrives
   * with every segment dark, and a guard on the rows alone would skip it until one of them changed,
   * which is exactly the hole `paint(true)` fills in the part list itself (0157,
   * src/ui/PlayerGrid.tsx). A new set of lanes is a new `paint`, and `useCanvasSurface` paints on
   * the commit that changes one.
   */
  const lit = useRef<{ standing: StandingRow; lanes: ScopeLanes | null }>({
    standing: NOTHING_LIT,
    lanes: null,
  });
  const read = useScopeWindow(instrument, deck, player, slotSecs ?? 0);

  /**
   * The landing a hand pressed, held twice over: its own place in the run and where that sits on
   * the sheet being drawn, in a ref the painting outlines it from, and the block itself in state,
   * which is what the readout beside the picture is drawn off.
   *
   * A press here **sends no command**, which is the whole of why it is allowed to exist: 0232 took
   * the pointer off this picture because the crosshair *wrote* two numbers that were nowhere on the
   * sheet, so the picture redrew under the pointer in answer to itself. Reading a block writes
   * nothing, so the picture cannot move under the press — and which block a hand has hold of is a
   * view preference, the one kind of state a component may hold (plan §2, 0257).
   *
   * The pick is kept as the landing's own place in the run rather than as an index into the sheet
   * it was taken on: the geometry is rebuilt at every landing and the sheet turns over whole at
   * its end (0187), and a pick held against the object would be dropped by the very next jump —
   * a reading a hand cannot keep while the pattern plays is a gesture that does not work
   * (`pickOnSheet`, src/lib/playerScope.ts). It goes when the walk carries it off the sheet, and
   * not before.
   */
  const picked = useRef<{ ordinal: number; index: number } | null>(null);
  const [landing, setLanding] = useState<ScopeBlock | null>(null);
  /**
   * What the readout is showing, beside the state that shows it: the block is followed onto every
   * sheet it is redrawn on, and a `setState` per frame is not what following it means — so the one
   * already drawn is compared first, exactly as the eyebrow's own sentence is (0157).
   */
  const shown = useRef<ScopeBlock | null>(null);
  const show = useCallback((block: ScopeBlock | null) => {
    if (block === shown.current) return;
    shown.current = block;
    setLanding(block);
  }, []);

  /**
   * Lighting the lane's standing segment, straight into the DOM. Its own call because a frame is
   * not the only thing that has to write it: a stopped yard registers no frame callback at all, so
   * the commit that stops one is the only thing left to put a lit segment back — the same hole
   * `paint(true)` fills in the part list itself (0157, src/ui/PlayerGrid.tsx).
   */
  const light = useCallback(() => {
    // No seconds: a lane says which row is standing and never how long it has left, so the tiers'
    // own clocks are asked for once, in the section that has somewhere to write them (0159).
    const standing = standingIn(instrument.peek(deck).player.step, null);
    const held = lit.current;
    if (sameRow(standing, held.standing) && lanes === held.lanes) return;
    lit.current = { standing, lanes };
    const strip = laneRef.current;
    if (strip === null) return;
    litLanes(strip, standing);
  }, [deck, instrument, lanes]);

  /**
   * The eyebrow's own sentence, written straight into the span beside the label — per-frame words
   * on a per-frame picture, so they go the way the lane's mark goes rather than through React
   * (0070, plan §2). Compared before it is written, because a `textContent` replaces the node's
   * children whether or not the string matches, exactly as a row's countdown is (0157).
   */
  const said = useRef("");
  const waitRef = useRef<HTMLSpanElement>(null);
  const say = useCallback((words: string) => {
    const node = waitRef.current;
    // A yard whose loop lost its grid takes the whole section away with it, and what was written
    // went with the span. So nothing is remembered across that: a fresh span comes back empty, and
    // a `said` still holding the last sentence would refuse to write it again (0040).
    if (node === null) {
      said.current = "";
      return;
    }
    if (words === said.current) return;
    said.current = words;
    node.textContent = words;
  }, []);

  const paint = useCallback(
    (canvas: HTMLCanvasElement, color: string) => {
      const window = read();
      // The pick, followed onto the sheet being drawn: the same landing at its new index while it
      // is still on the picture, and let go of once the walk has carried it past the end.
      const held = picked.current;
      if (held !== null) {
        const index = pickOnSheet(window.geometry, window.at - window.geometry.at, held.ordinal);
        picked.current = index === null ? null : { ordinal: held.ordinal, index };
        show(index === null ? null : (window.geometry.blocks[index] ?? null));
      }
      paintScope(canvas, window.geometry, window.head, color, picked.current?.index ?? null);
      light();
      say(waitSaid(window.geometry, window.head));
    },
    [light, read, say, show],
  );
  // Animated only where there is a walk to draw: a playing yard whose loop has no grid draws
  // nothing, so it registers no frame callback either (0035, 0157).
  const { rootRef, canvasRef, repaint } = useCanvasSurface(
    paint,
    state.playing && slotSecs !== null,
    scopePace,
  );

  /**
   * Take the pick to `index` of the sheet being drawn, or let it go where there is no such block.
   * What is kept is the landing's own place in the run — the sheet's first ordinal plus the index
   * on it — which is what the pick survives the walk as (`pickOnSheet`).
   */
  const hold = useCallback(
    (window: Readonly<Held>, index: number | null) => {
      const block = index === null ? undefined : window.geometry.blocks[index];
      picked.current =
        block === undefined || index === null
          ? null
          : { ordinal: window.at - window.geometry.at + index, index };
      show(block ?? null);
      // Asked for rather than waited on: a stopped yard registers no frame callback, so nothing
      // else would draw the outline the readout is about (0040).
      repaint();
    },
    [repaint, show],
  );

  /** Which landing the pointer came down on, which is the one the readout is then about. */
  const pick = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const box = event.currentTarget.getBoundingClientRect();
      if (box.width <= 0) return;
      const window = read();
      hold(window, blockAt(window.geometry, (event.clientX - box.left) / box.width));
    },
    [hold, read],
  );

  /**
   * The same road for a keyboard, which a picture a pointer can read has to have (0055): the arrows
   * step the pick along the sheet, and the first press takes the landing the clock is inside — the
   * one already lit, so the picture and the first reading agree.
   */
  const step = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      const by = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (by === 0) return;
      event.preventDefault();
      const window = read();
      const held = picked.current;
      const at =
        held === null
          ? null
          : pickOnSheet(window.geometry, window.at - window.geometry.at, held.ordinal);
      const from = at ?? window.geometry.at;
      const next = Math.min(window.geometry.blocks.length - 1, Math.max(0, from + by));
      hold(window, held === null ? window.geometry.at : next);
    },
    [hold, read],
  );

  // And once on every commit, written whatever the frame loop is doing: a yard that stops
  // registers no frame callback, so nothing else clears the segment the last frame lit, or the
  // wait the last frame was counting down (0040).
  useLayoutEffect(() => {
    light();
    if (!state.playing) say("");
  }, [light, say, state.playing]);

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
          in, and what it carries is the picture's own sentence whole — what a block, a split, a
          hollow one and a thread mean — and nothing about a gesture, because there is none (P171).
          Reachable by a pointer and by a keyboard, which is what a sentence has to be. */}
      <div className="flex items-center gap-1">
        <span className="type-eyebrow text-muted-foreground">{PLAYER_SCOPE_LABEL}</span>
        <Explains what={PLAYER_SCOPE_TOOLTIP} named={`${yardLabel(deck)} ${PLAYER_SCOPE_LABEL}`} />
        {/* And how long the wait the clock is standing in has left, in words and only while it is
            standing in one: the canvas cannot hold a number per block, so the one wait that is
            happening is said here instead (`waitSaid`). */}
        <span ref={waitRef} className="type-eyebrow text-muted-foreground" />
      </div>
      {/* The picture. Every landing stands on the floor as tall as the count it is struck, ruled at
          the counts themselves and at the loop's own turnovers, so a glance reads a rhythm against
          a beat (0258).

          There is still nothing on it to *drag*: a press picks a landing to read and writes no
          value, so the sheet cannot move under the pointer in answer to itself, which is the whole
          of what 0232 refused (0257). The dials in Fine Tune stay the one road to the distance and
          the count. The ground's own rectangle keeps its drag on the third argument — there, where
          the pointer is *is* the value (0191, 0197, src/ui/PlayerGround.tsx). */}
      <div ref={rootRef} data-slot="player-scope" className="h-40 w-full text-primary">
        {/* The press is on a button and not on the box, so the one road is a real control: it takes
            focus, it says its own name, and the arrows step along the sheet from wherever the
            press left off. A div wearing a tabindex would be a picture pretending to be one. */}
        <button
          type="button"
          className="block size-full cursor-pointer"
          aria-label={`${yardLabel(deck)} ${PLAYER_SCOPE_LABEL}`}
          onPointerDown={pick}
          onKeyDown={step}
        >
          <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
        </button>
      </div>
      {/* And what the landing a hand pressed is, in numbers — the slot it reads among them, which
          is the one thing the picture gave up saying when its height became the count (0258).
          Announced when it changes, because the picture that answered the press is a canvas. */}
      <div aria-live="polite">
        <PlayerLanding block={landing} />
      </div>
      {/* The run under the picture, one lane per tier and the song's on top: two shapes of the
          same total, so a glance reads which song the parts belong to without leaving the picture.
          Each says which tier it is and what is standing in it, because two hairlines on their own
          do not. One container and one ref, because both are lit by the one painting the canvas
          above is drawn by (0070, 0218). */}
      {lanes !== null && (
        <div ref={laneRef} className="flex w-full flex-col gap-1" aria-hidden="true">
          <ScopeLane
            segments={lanes.songs}
            attribute={SONG_ATTRIBUTE}
            word={PLAYER_SONG_LABEL}
            tall="h-1"
          />
          <ScopeLane
            segments={lanes.parts}
            attribute={PART_ATTRIBUTE}
            word={PLAYER_PART_LABEL}
            tall="h-1.5"
          />
        </div>
      )}
    </section>
  );
}
