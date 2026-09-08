/**
 * @role Tests that the picture is one field of gratings rather than a stack of drawn rows: that
 *   every row is cut out of ink laid down exactly once, that a row's period is its pitch and its
 *   parameter its angle, that the reference is the axis the rest are read against, and that a
 *   canvas which cannot make the pattern lays down no ink at all.
 * @instead The tile shop's own cases → src/ui/moireCanvasTiles.test.ts. The band every spacing is
 *   held inside → src/ui/moireCanvasBand.test.ts. Both split out of this file at the 800-line hard
 *   cap (0045), and all three paint through the one harness in src/ui/moireCanvasPainted.ts.
 */
// Over the soft file cap: every case here is one painting read off that harness, and a third split
// would be the same fixtures declared a third time. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
// One over the cap, and the one over it is the session's own row builder: a case that paints what a
// session paints has to reach the picture the way a yard does rather than through a second copy of
// the walk from a rack instance to a row (principle 1).
// oxlint-disable import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";

import { EFFECTS, type EffectId } from "@/audio/effects/registry";
import {
  DECK_AUTOMATION_PARAM_IDS,
  effectAutomationParamIds,
  effectParamDefaults,
} from "@/audio/params";
import { fold } from "@/lib/copy";
import { fractalStopsRest } from "@/lib/moireFractal";
import {
  DRIFT_FEEDBACK_CEILING,
  DRIFT_PAINT_MS,
  DRIFT_TRAVEL_CYCLES,
  feedbackAlpha,
  type MoireRow,
} from "@/lib/moire";
import { runFeedback } from "@/lib/moireAge";
import { gratingDepth, gratingTurns, latticeCellPx } from "@/lib/moireGrating";
import { octaveShare } from "@/lib/moireOctaves";
import { LATTICE_GEOMETRY, LATTICE_TILE_PX } from "@/lib/moireLattice";
import {
  DRIFT_PROFILES,
  PLAIN_PROFILE,
  profileBlock,
  type DriftProfile,
} from "@/lib/moireProfiles";
import { PLAIN_CUT } from "@/lib/moireSound";
import { emptyDeckPeek } from "@/audio/deckPeek";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { playerRowPeriod } from "@/lib/playerDrift";
import { partVoice } from "@/lib/player";
import { PLAYER_PART_DEFAULTS, type SongPart } from "@/lib/playerSong";
import { playerWalk, type PlayerStep } from "@/lib/playerWalk";
import { emptyMasterPeek } from "@/audio/context";
import { moireRows, refillRows } from "@/ui/moireRows";
import {
  LOOK_FULL_RATE,
  LOOK_SLOW_HZ,
  looksPaintMs,
  looksTravelInto,
  type MoireLook,
} from "@/ui/moireLooks";
import { carryLooks } from "@/ui/moireCarry";
import type { MoireRowSet } from "@/ui/moireRowsField";
import { joltRest } from "@/ui/moireJolt";
import { screenInkRest } from "@/ui/moireScreenInk";
import { NO_GROWN } from "@/ui/moireGrown";
import type { PlayerSpec } from "@/lib/player";
import type { EffectInstanceId, GrownEffect } from "@/audio/effects/contract";
import { drawnGratings, TILE_PX } from "@/ui/moireCanvas";
import { painterOn, pitchOf, PRODUCT, WINDOW, type Painted } from "@/ui/moireCanvasPainted";
import { SHAPE_SECS, shapeRest } from "@/ui/moireShape";
import type { Aim } from "@/lib/moire";

import { moireRow as row } from "@/lib/moireRow";
import { oneSong } from "@/lib/playerSongs";

/** A row asking for the whole of the frame feedback — a fresh one each time, since a painting
 * moves the phase of every row it is handed. */
/**
 * A read with all the time in the world behind it, which is a ground move that has already finished
 * travelling: the cases here are about the tiles a picture bakes, not about how it got where it is
 * (`easedCentre`, src/lib/moire.ts).
 */
const ARRIVED = Number.POSITIVE_INFINITY;

/**
 * And where the picture's own structure stands: at rest, and standing on its rest — so nothing here
 * travels and every case reads the structure the picture would draw with nothing having moved
 * (`fractalStopsRest`, src/lib/moireFractal.ts).
 */
const STOOD = fractalStopsRest();

const fedRow = () => row({ period: 3, feedback: 1 });

/**
 * What one aimed grating keeps at a point of the canvas, cutting `depth`: the tile the painter
 * built, read back through the matrix it aimed that tile with. The field is these multiplied,
 * because `destination-out` leaves what is under it times one minus the grating.
 */
const keptAt = (
  move: Aim | undefined,
  depth: number,
  x: number,
  y: number,
  profile: DriftProfile = PLAIN_PROFILE,
): number => {
  if (move === undefined) return Number.NaN;
  const det = move.a * move.d - move.b * move.c;
  const along = ((x - move.e) * move.d - (y - move.f) * move.c) / det;
  return 1 - depth * profileBlock(profile, along / TILE_PX);
};

/**
 * The picture a yard holding these rack instances draws — its rows and everything beside them that
 * belongs to the field — out of the one builder a session's picture is made with rather than out of
 * a fixture, the entry's own defaults but for what a case names. So a case here paints what a
 * session would paint, through the registry's own declared way into the picture and not through a
 * second copy of the walk that reads it.
 */
const rackSet = (
  ...instances: readonly { id: string; effect: EffectId; params?: Record<string, number> }[]
): MoireRowSet =>
  moireRows(
    [],
    instances.map(({ id, effect, params }) => ({
      id,
      effect,
      bypassed: false,
      params: { ...effectParamDefaults(effect, id), ...params },
      automation: {},
      motion: {},
      bounds: {},
    })),
    0,
    PLAIN_CUT,
    null,
    NO_GROWN,
    null,
  );

const rackRows = (
  ...instances: readonly { id: string; effect: EffectId; params?: Record<string, number> }[]
): MoireRow[] => rackSet(...instances).rows;

/** A rack of `count` instances of one effect, which is how a chain is made long enough to slow. */
const rackOf = (effect: EffectId, count: number): MoireRowSet =>
  rackSet(...Array.from({ length: count }, (_, at) => ({ id: `fx${at}`, effect })));

/** A part of a song, with the opaque badge every one carries (0076, 0157). */
const songPart = (id: string, length: number): SongPart => ({
  ...PLAYER_PART_DEFAULTS,
  id,
  name: id,
  // The dials a part was captured from: nothing in the picture reads one — a row is cut by the
  // badge and the length alone (0176, src/lib/playerDrift.ts) — so the switch's own will do.
  voice: partVoice(PLAYER_DEFAULTS),
  length,
});

/**
 * An output with nothing in it: every case here is about what the painter draws off a yard's own
 * rows, and none of them is about the session's bus (`SILENT_MASTER`, src/ui/moireRows.test.ts).
 */
const SILENT_MASTER = emptyMasterPeek();

/** How many places one automator is standing in the run below, which is past `FRACTAL_REACH`. */
const RUN_PLACES = 4;

/** The run one automator is holding, keyed the way `DeckPeek.grown` keys it (src/ui/moireRows.ts). */
const RUN: Map<EffectInstanceId, GrownEffect[]> = new Map([
  [
    "auto" as EffectInstanceId,
    Array.from({ length: RUN_PLACES }, (_, at) => ({
      effect: "delay" as EffectId,
      instance: `g${at}`,
      presence: 1,
      remain: 30,
      life: 30,
      values: [],
    })),
  ],
]);

/**
 * The rows a yard standing that run draws — through the one builder and the one per-frame read, so
 * what the picture is fed back at here is what a rack standing an automator actually asks for and
 * never a fixture's number. A fresh set each time, since a painting moves the phase of every row.
 * The loop is four seconds, which is a period and not a place count — the two are separate facts
 * that happen to read the same here.
 */
const runRows = (): MoireRow[] => {
  const set = moireRows([], [], 4, PLAIN_CUT, null, RUN, null);
  refillRows(
    set.rows,
    set.reads,
    { ...emptyDeckPeek(), grown: RUN },
    1,
    null,
    0,
    null,
    SILENT_MASTER,
    ARRIVED,
    0,
    set.seed,
    set.toward,
    set.ink,
    [],
    set.jolt,
    shapeRest(),
  );
  return set.rows;
};

/**
 * The lays that are a ghost of the frame before, out of one painting's field: a curved row places
 * its baked tile with the same call, and does it cutting (`destination-out`) rather than laying on.
 */
const laysOf = (painted: Painted): { alpha: number; move: Aim }[] =>
  (painted.surfaces[0]?.drew ?? []).filter((drew) => drew.over === "source-over");

/**
 * The rows a yard jumping through `song` draws while `standing` is the part it is in — through the
 * one builder and the one per-frame read a session's picture is made with, so a case here paints
 * what a yard paints rather than what a fixture row would.
 */
const songRows = (song: readonly SongPart[], standing: SongPart): MoireRow[] => {
  const spec: PlayerSpec = { seed: 7, ...PLAYER_DEFAULTS, songs: oneSong(song) };
  /** The step the clock would be inside, off the walk itself rather than a fixture of its own:
   *  the peek hands the whole step over now, so a case here builds what a yard reads (0180). */
  const standingStep = (): PlayerStep => ({ ...playerWalk(spec)(), part: standing.id, song });
  const { rows, reads } = moireRows([], [], 0, PLAIN_CUT, playerRowPeriod(spec), NO_GROWN, null);
  const peek = emptyDeckPeek();
  peek.player.step = standingStep();
  refillRows(
    rows,
    reads,
    peek,
    1,
    null,
    0,
    null,
    SILENT_MASTER,
    ARRIVED,
    0,
    STOOD,
    STOOD,
    screenInkRest(),
    [],
    joltRest(),
    shapeRest(),
  );
  return rows;
};

/** Which way it leans, in turns of a circle. */
const turnsIn = (move: Aim | undefined): number =>
  Math.atan2(move?.b ?? 0, move?.a ?? 0) / (2 * Math.PI);

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// One flat list of the painter's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireCanvas", () => {
  it("cuts one grating per row out of ink laid down exactly once", () => {
    // The whole shape of the picture: the screen goes down over the canvas once, and then every
    // row takes its own grating back out of it. `destination-out` leaves what is under it times
    // one minus the grating, so the field is the rows' product — which is what a stack of physical
    // gratings is, and what makes a pair of them beat.
    vi.stubGlobal("devicePixelRatio", 2);
    const rows = [row({ period: 3 }), row({ period: 4 }), row({ period: 5, reference: true })];
    const { laid, cuts, ground, left } = paintedOn(400, 128, rows);
    // One solid ground on the product's surface, then one cut per row out of it.
    expect(ground).toHaveLength(1);
    expect(cuts).toHaveLength(rows.length);
    // Every cut at the depth that holds the field's brightness where it belongs.
    for (const cut of cuts) expect(cut.alpha).toBeCloseTo(gratingDepth(rows.length), 10);
    // And on the canvas itself: the screen laid down once, and the whole product taken back out of
    // it in one stroke — so the picture is ink everywhere the gratings block and a window wherever
    // they agree, which is what a stack of gratings does to light.
    expect(laid).toHaveLength(2);
    expect(laid[0]?.over).toBe("source-over");
    expect(laid[1]).toEqual({ ink: PRODUCT, over: "destination-out" });
    expect(left).toBe("source-over");
  });

  it("lays down no ink at all where the engine will not make the pattern", () => {
    // A canvas that cannot make a grating cannot draw this picture. An empty canvas says so; the
    // base fill on its own would be a solid rectangle claiming to be a yard's drift (principle 5).
    vi.stubGlobal("devicePixelRatio", 2);
    expect(paintedOn(400, 128, [row({ period: 3 })], 0).laid).toHaveLength(0);
    // And with only one to hand, the screen is what goes without: the picture is still the rows,
    // cut out of the flat ink the caller resolved.
    const { laid, cuts } = paintedOn(400, 128, [row({ period: 3 })], 1);
    expect(laid).toHaveLength(2);
    expect(cuts).toHaveLength(1);
  });

  it("draws nothing for a picture with no rows in it, or no window to draw them across", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    expect(paintedOn(400, 128, []).laid).toHaveLength(0);
    expect(paintedOn(400, 128, [row({ period: 0 })]).laid).toHaveLength(0);
    expect(paintedOn(400, 128, [row({ period: 3 })], 2, 0).laid).toHaveLength(0);
    // A row with no period of its own is not a grating, and does not count toward the depth the
    // others are cut at — otherwise a lane that never moved would dim the whole picture.
    expect(drawnGratings([row({ period: 3 }), row({ period: 0 })], 0)).toBe(1);
    // And a row drawn at three scales is what its copies cut between them — counting each whole
    // would take depth from every row to pay for ink nobody laid (`octaveShare`, 0244).
    expect(drawnGratings([row({ period: 3, octaves: 3 }), row({ period: 0, octaves: 3 })], 0)).toBe(
      octaveShare(3),
    );
    // P146: and a row with no depth of its own is a grating only as far as the wash has made it
    // one. The field's own row is nothing at all on a dry yard, so the picture weighs exactly what
    // it weighed before that row existed — and it arrives as the fraction it is rather than whole,
    // which the whole picture's depth would step on (0213).
    const washed = [row({ period: 3 }), row({ period: 4, depth: 0 })];
    expect(drawnGratings(washed, 0)).toBe(1);
    expect(drawnGratings(washed, 0.5)).toBe(1.5);
    expect(drawnGratings(washed, 1)).toBe(2);
    // P167: and the session's own row is the other such row, counted by its own reading rather
    // than by the field's — a silent session weighs the picture down if it is counted whole, and
    // the whole picture steps as the first sound arrives if it is counted only once loud.
    const heard = [row({ period: 3 }), row({ period: 4, depth: 0, pulse: 0.25 })];
    expect(drawnGratings(heard, 0)).toBe(1.25);
    expect(drawnGratings([row({ period: 4, depth: 0, pulse: 0 })], 0)).toBe(0);
    // The bolder of the two readings and not their sum: a row raised by the wash and cut by its own
    // meter is one grating either way.
    expect(drawnGratings(heard, 0.5)).toBe(1.5);
    expect(drawnGratings(heard, 1)).toBe(2);
    // A row with a depth of its own is counted whole whatever it is pulsing at, so nothing about a
    // yard's own rows moved.
    expect(drawnGratings([row({ period: 3, pulse: 0.5 })], 0)).toBe(1);
  });

  it("fans every parameter to its own angle, and leaves the reference on the axis", () => {
    // A row's angle is its parameter's identity, the way its waveform used to be. The reference is
    // not fanned: it is the axis the others are read against, which is the whole of what being the
    // reference means now that no row is drawn on top of another.
    expect(gratingTurns(row({ reference: true, shape: 2 ** 30 }))).toBe(0);
    vi.stubGlobal("devicePixelRatio", 2);
    const { aims } = paintedOn(400, 128, [
      row({ period: 3, shape: fold("deck.pan") }),
      row({ period: 3, reference: true }),
    ]);
    expect(turnsIn(aims[1])).toBeCloseTo(0, 9);
    expect(turnsIn(aims[0])).not.toBeCloseTo(0, 6);
    // Every automatable parameter in the real registry gets an angle no other one has: there are
    // far more parameters than there were ever waveforms, and the fold spreads all of them.
    const params = [
      ...DECK_AUTOMATION_PARAM_IDS,
      ...EFFECTS.flatMap((effect) => effectAutomationParamIds(effect.id)),
    ];
    const turns = params.map((param) => gratingTurns(row({ shape: fold(param) })));
    expect(new Set(turns.map((turn) => turn.toFixed(9))).size).toBe(params.length);
    // And the fan is a fan: every one of them near the axis, none of them on it, and to both sides
    // — a fan to one side only would lean the whole picture rather than crossing it.
    expect(Math.min(...turns)).toBeLessThan(0);
    expect(Math.max(...turns)).toBeGreaterThan(0);
    expect(Math.max(...turns.map((turn) => Math.abs(turn)))).toBeLessThan(0.05);
  });

  it("slides a grating along its own axis as the deck plays, and holds where it stops", () => {
    // 0040 for the picture: every motion is read off a row's phase and none off a clock, so a
    // halted yard is painted exactly where it stopped. Paint twice with nothing moved and the
    // matrices have to be the same matrices, cell for cell.
    vi.stubGlobal("devicePixelRatio", 2);
    const rows = [row({ period: 4, phase: 1 }), row({ period: 3, phase: 2, reference: true })];
    const first = paintedOn(400, 128, rows).aims;
    vi.stubGlobal("devicePixelRatio", 2);
    expect(paintedOn(400, 128, rows).aims).toEqual(first);
    // And it does move: a quarter of the way round is a quarter of a pitch along the axis.
    vi.stubGlobal("devicePixelRatio", 2);
    const still = paintedOn(400, 128, [row({ period: 4, phase: 0 })]).aims;
    vi.stubGlobal("devicePixelRatio", 2);
    const moved = paintedOn(400, 128, [row({ period: 4, phase: 1 })]).aims;
    expect(still[0]?.e).not.toBeCloseTo(moved[0]?.e ?? 0, 6);
    // A whole cycle on is the same picture again: the phase slides the field and nothing else.
    vi.stubGlobal("devicePixelRatio", 2);
    const round = paintedOn(400, 128, [row({ period: 4, phase: 4 })]).aims;
    expect(round[0]?.e).toBeCloseTo(still[0]?.e ?? 0, 9);
    expect(pitchOf(round[0])).toBeCloseTo(pitchOf(still[0]), 9);
  });

  it("carries a straight row several fringes a turn, and a whole turn on is still the same picture", () => {
    // 0273: a row on a short lane races and one on a long lane creeps, which is what reads as
    // distance crossed — a quarter of the way round is a quarter of the whole travel along the
    // row's own axis, and the travel is a whole number of the row's fringes.
    vi.stubGlobal("devicePixelRatio", 2);
    const still = paintedOn(400, 128, [row({ period: 4, phase: 0 })]).aims;
    vi.stubGlobal("devicePixelRatio", 2);
    const quarter = paintedOn(400, 128, [row({ period: 4, phase: 1 })]).aims;
    const first = still[0];
    const moved = quarter[0];
    if (first === undefined || moved === undefined) throw new Error("no grating was aimed");
    const along = Math.hypot(moved.e - first.e, moved.f - first.f);
    expect(along).toBeCloseTo((DRIFT_TRAVEL_CYCLES * pitchOf(first) * TILE_PX) / 4, 6);
    expect(Number.isInteger(DRIFT_TRAVEL_CYCLES)).toBe(true);
    // And exactly a turn on, the picture the turn began with: the wrap is invisible.
    vi.stubGlobal("devicePixelRatio", 2);
    const round = paintedOn(400, 128, [row({ period: 4, phase: 4 })]).aims;
    expect(round[0]?.e).toBeCloseTo(first.e, 9);
    expect(round[0]?.f).toBeCloseTo(first.f, 9);
  });

  it("makes a field of two centres that is neither of the two rows in it alone", () => {
    // A row is measured from somewhere now, and two rows measured from two places cross into a
    // field neither of them holds — which is what a delay set to two times is (0142).
    const near = row({ period: 4, centre: 0 });
    const far = row({ period: 4, centre: 1 });
    vi.stubGlobal("devicePixelRatio", 2);
    const apart = paintedOn(120, 60, [near, far]).aims;
    vi.stubGlobal("devicePixelRatio", 2);
    const together = paintedOn(120, 60, [near, { ...far, centre: near.centre }]).aims;
    // One pitch and one lean either way: an anchor is where a row is read from, not how fine it is.
    expect(pitchOf(apart[0])).toBeCloseTo(pitchOf(apart[1]), 9);
    expect(turnsIn(apart[0])).toBeCloseTo(turnsIn(apart[1]), 9);
    const depth = gratingDepth(2);
    const swing = (aims: (Aim | undefined)[], pick: (near: number, far: number) => number) => {
      let most = 0;
      for (let x = 4; x < 120; x += 8) {
        for (let y = 4; y < 60; y += 8) {
          const one = keptAt(aims[0], depth, x, y);
          const two = keptAt(aims[1], depth, x, y);
          most = Math.max(most, Math.abs(one * two - pick(one, two)));
        }
      }
      return most;
    };
    // The field of the two is neither of the two: it is dark wherever either of them blocks.
    expect(swing(apart, (one) => one)).toBeGreaterThan(0.05);
    expect(swing(apart, (_one, two) => two)).toBeGreaterThan(0.05);
    // And the two centres are the reason: the same pair anchored alike is a different picture.
    let moved = 0;
    for (let x = 4; x < 120; x += 8) {
      for (let y = 4; y < 60; y += 8) {
        const two = keptAt(apart[0], depth, x, y) * keptAt(apart[1], depth, x, y);
        const one = keptAt(together[0], depth, x, y) * keptAt(together[1], depth, x, y);
        moved = Math.max(moved, Math.abs(two - one));
      }
    }
    expect(moved).toBeGreaterThan(0.05);
  });

  // What 0139 promised and nothing painted: the picture is of what the rack is set to. Read off the
  // registry's own delay rather than off a fixture row, so it is the mapping under test (0148).
  it("paints one effect at two settings as two fields, and a rack of two as neither", () => {
    const dry = { "delay.time": 0.03, "delay.mix": 0.05 };
    const wet = { "delay.time": 1.8, "delay.mix": 1 };
    vi.stubGlobal("devicePixelRatio", 1);
    const near = paintedOn(400, 128, rackRows({ id: "fx1", effect: "delay", params: dry }));
    vi.stubGlobal("devicePixelRatio", 1);
    const far = paintedOn(400, 128, rackRows({ id: "fx1", effect: "delay", params: wet }));
    vi.stubGlobal("devicePixelRatio", 1);
    const again = paintedOn(400, 128, rackRows({ id: "fx1", effect: "delay", params: dry }));
    // One grating each, and the same instance set the same way twice is the same picture twice:
    // the ink it cuts with is its mix and the place it is measured from is its time. The lattice
    // the rack stands in is in the set and cuts nothing until a read has said how loud the output
    // is (`latticeHeard`), and no read has.
    expect(near.cuts).toHaveLength(1);
    expect(near.cuts[0]?.alpha).toBeCloseTo(again.cuts[0]?.alpha ?? 0, 9);
    expect(near.aims[0]?.e).toBeCloseTo(again.aims[0]?.e ?? 0, 9);
    expect(near.cuts[0]?.alpha).toBeLessThan((far.cuts[0]?.alpha ?? 0) - 0.05);
    expect(Math.abs((near.aims[0]?.e ?? 0) - (far.aims[0]?.e ?? 0))).toBeGreaterThan(1);

    // And a rack of two is one field of both rather than a picture of either: the two are
    // multiplied, so it is dark wherever either of them blocks (0131).
    vi.stubGlobal("devicePixelRatio", 1);
    const rack = rackRows(
      { id: "fx1", effect: "delay", params: dry },
      { id: "fx2", effect: "delay", params: wet },
    );
    const twin = rack[0]?.profile ?? PLAIN_PROFILE;
    const both = paintedOn(400, 128, rack);
    // One cut per row the yard builds — the two instances, and behind them the grating on the whole
    // yard coming round, which a yard of two periods gets and a yard of one does not (0143), so the
    // count is read off the set rather than written down here — less the lattice, which no read
    // has cut yet. The instance rows are the first two.
    expect(both.cuts).toHaveLength(rack.length - 1);
    expect(rack.length).toBeGreaterThan(1);
    let apartFromOne = 0;
    let apartFromTwo = 0;
    for (let x = 4; x < 400; x += 8) {
      for (let y = 4; y < 128; y += 8) {
        const one = keptAt(both.aims[0], both.cuts[0]?.alpha ?? 0, x, y, twin);
        const two = keptAt(both.aims[1], both.cuts[1]?.alpha ?? 0, x, y, twin);
        apartFromOne = Math.max(apartFromOne, Math.abs(one * two - one));
        apartFromTwo = Math.max(apartFromTwo, Math.abs(one * two - two));
      }
    }
    expect(apartFromOne).toBeGreaterThan(0.05);
    expect(apartFromTwo).toBeGreaterThan(0.05);
  });

  // P117: what a song is doing is in the picture. A part boundary is a discontinuity, so two parts
  // are two fields — another angle, another spacing, another tint — and a part coming round again is
  // the field it was, because a row is drawn out of the part's own badge and nothing is stored
  // (0157, 0131).
  it("paints two parts of one song as two fields, and one part twice as one", () => {
    const one = songPart("verse", 2);
    const two = songPart("chorus", 32);
    const song = [one, two];
    vi.stubGlobal("devicePixelRatio", 1);
    const first = paintedOn(400, 128, songRows(song, one));
    vi.stubGlobal("devicePixelRatio", 1);
    const other = paintedOn(400, 128, songRows(song, two));
    vi.stubGlobal("devicePixelRatio", 1);
    const again = paintedOn(400, 128, songRows(song, one));
    // One grating per tier of the arrangement, and no more — a yard of one period has no macro row
    // to come round (0143). The part's own is the first of the two, and the song's over it holds
    // still through every part of one song, which is what makes a boundary one layer moving (P161).
    expect(first.cuts).toHaveLength(2);
    expect(other.aims.slice(1)).toEqual(first.aims.slice(1));
    // The same part twice is the same field twice: the same angle, the same spacing, the same
    // place it is measured from.
    expect(turnsIn(again.aims[0])).toBeCloseTo(turnsIn(first.aims[0]), 9);
    expect(pitchOf(again.aims[0])).toBeCloseTo(pitchOf(first.aims[0]), 9);
    expect(again.aims[0]?.e).toBeCloseTo(first.aims[0]?.e ?? 0, 9);
    // The other part is neither: a longer part is a broader field and another badge is another lean.
    expect(pitchOf(other.aims[0])).toBeGreaterThan(pitchOf(first.aims[0]) * 1.2);
    expect(turnsIn(other.aims[0])).not.toBeCloseTo(turnsIn(first.aims[0]), 3);
    // And the two are two pictures where it counts, which no pair of numbers on their own says.
    const depth = first.cuts[0]?.alpha ?? 0;
    let apart = 0;
    for (let x = 4; x < 400; x += 8) {
      for (let y = 4; y < 128; y += 8) {
        apart = Math.max(
          apart,
          Math.abs(keptAt(first.aims[0], depth, x, y) - keptAt(other.aims[0], depth, x, y)),
        );
      }
    }
    expect(apart).toBeGreaterThan(0.05);
  });

  // P104: one effect contributing a fine texture and a coarse one, so the coarse copies beat with
  // every other row's fine ones and the picture has structure inside its own structure (0143).
  it("draws an octave row's coarse copy at the pitch it claims, and half as deep", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const one = paintedOn(400, 128, [row({ period: 3 })]);
    const three = paintedOn(400, 128, [row({ period: 3, octaves: 3 })]);
    // One fill per scale, through the tile and the matrix the first copy already used.
    expect(one.cuts).toHaveLength(1);
    expect(three.cuts).toHaveLength(3);
    // Each copy an octave coarser than the one below it, and the first at the pitch the row would
    // have been drawn at on its own.
    const pitches = three.aims.slice(0, 3).map((move) => pitchOf(move) * TILE_PX);
    expect(pitches[0]).toBeCloseTo(pitchOf(one.aims[0]) * TILE_PX, 9);
    expect(pitches[1]).toBeCloseTo((pitches[0] ?? 0) * 2, 9);
    expect(pitches[2]).toBeCloseTo((pitches[0] ?? 0) * 4, 9);
    // And half as deep at each of them, so the coarse copies texture the picture rather than
    // replacing it. The depth every row is cut at falls too — by what the three copies come to
    // between them, a grating and three quarters and not three (`octaveShare`, 0244).
    const alphas = three.cuts.map(({ alpha }) => alpha);
    expect(alphas[1]).toBeCloseTo((alphas[0] ?? 0) / 2, 9);
    expect(alphas[2]).toBeCloseTo((alphas[0] ?? 0) / 4, 9);
    expect(alphas[0]).toBeCloseTo(gratingDepth(octaveShare(3)), 9);
  });

  // P104: the one thing in the picture that compounds. Everything else is read off the frame it is
  // drawn in; this carries the frame before it, which is why the share is bounded (0143).
  it("lays the frame before this one back into the field, and never past the ceiling", () => {
    vi.stubGlobal("devicePixelRatio", 1);

    // Nothing to feed back on the first frame, and nothing kept where no row asks for it.
    expect(paintedOn(400, 128, [fedRow()]).surfaces[0]?.drew).toEqual([]);
    expect(
      paintedOn(400, 128, [row({ period: 3 })], 2, WINDOW, { frames: 4 }).surfaces[0]?.drew,
    ).toEqual([]);
    // And from the second frame on, the last one laid back onto the field — onto it, because the
    // field is what the gratings let through and a ghost fills its own fringes back in.
    const twice = paintedOn(400, 128, [fedRow()], 2, WINDOW, { frames: 2 }).surfaces[0]?.drew ?? [];
    expect(twice).toHaveLength(1);
    expect(twice[0]?.over).toBe("source-over");
    expect(twice[0]?.alpha).toBe(DRIFT_FEEDBACK_CEILING);
    // However many frames run, and whatever a row asks for: the share is the ceiling's, not the
    // row's, so the field settles instead of filling to opaque a few seconds after a knob moved.
    const many = paintedOn(400, 128, [fedRow()], 2, WINDOW, { frames: 20 }).surfaces[0]?.drew ?? [];
    expect(many).toHaveLength(19);
    for (const drew of many) expect(drew.alpha).toBeLessThanOrEqual(DRIFT_FEEDBACK_CEILING);
    // A little larger and a little turned each time, or the ghost is a second copy of the picture
    // exactly on top of the first and nothing reads as feedback at all.
    expect(pitchOf(many[0]?.move)).toBeGreaterThan(1);
    expect(turnsIn(many[0]?.move)).not.toBe(0);
  });

  // 0250: the picture zooming into its own structure rather than a structure laid on top of one.
  // The share is a row's like any other, and this is the row that carries a claim no knob on
  // thirteen of the fourteen could make — so the whole path from a standing run to a laid ghost is
  // read here through the builder a yard's picture is actually made with.
  it("lays the whole field back into itself for the run the yard is standing", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const share = runFeedback(RUN_PLACES, 0);
    // Nothing to feed back on the first frame, whatever the run is standing.
    expect(laysOf(paintedOn(400, 128, runRows()))).toEqual([]);
    // And from the second frame on, at the share the run earned and not at the ceiling: a hand on a
    // knob is still deeper than anything a population can ask for (`boldestRow` takes the max).
    const many = laysOf(paintedOn(400, 128, runRows(), 2, WINDOW, { frames: 6 }));
    expect(many).toHaveLength(5);
    for (const drew of many) expect(drew.alpha).toBeCloseTo(feedbackAlpha(share), 9);
    expect(feedbackAlpha(share)).toBeGreaterThan(0);
    expect(feedbackAlpha(share)).toBeLessThan(DRIFT_FEEDBACK_CEILING);
    // Laid in a little larger and a little turned, or the picture is a copy of itself exactly on
    // top of itself and nothing reads as zooming into anything.
    expect(pitchOf(many[0]?.move)).toBeGreaterThan(1);
    expect(turnsIn(many[0]?.move)).not.toBe(0);
    // And the stack still deepens on the row's own turn and never on the repaint: a halted yard
    // standing a whole run is a picture of one frame, however many times React commits it.
    const held = paintedOn(400, 128, runRows(), 2, WINDOW, { frames: 6, advance: 0 });
    expect(laysOf(held)).toEqual([]);
  });

  // A canvas is painted on every commit as well as on every frame, and a halted yard is painted
  // and not animated (0040) — so a stack that deepened per painting would make a stopped picture a
  // function of how often React committed rather than of where the deck has read to (0126).
  it("deepens the stack once per frame of the deck's own clock, and never once per repaint", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const held = paintedOn(400, 128, [fedRow()], 2, WINDOW, {
      frames: 30,
      advance: 0,
    });
    expect(held.surfaces[0]?.drew).toEqual([]);
    // Thirty repaints of one halted yard are thirty of the picture one painting draws, cut for cut
    // and matrix for matrix — the same pixels again, which is what a commit-driven repaint is.
    const once = paintedOn(400, 128, [fedRow()]);
    expect(held.cuts).toEqual(Array.from({ length: 30 }, () => once.cuts).flat());
    expect(held.aims).toEqual(Array.from({ length: 30 }, () => once.aims).flat());
    // The screen's own pattern is a fresh object per painting, so what is compared of what went
    // onto the canvas is the order the ink and the product were laid in.
    expect(held.laid.map(({ over }) => over)).toEqual(
      Array.from({ length: 30 }, () => once.laid.map(({ over }) => over)).flat(),
    );
  });

  // The copy is a canvas-sized bitmap held against a canvas that may stop drawing at any moment —
  // and a field kept across that gap is a frame of a picture the yard has since stopped drawing.
  it("forgets the frame it kept the moment the picture stops being drawn at all", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const fed = fedRow();
    const rows = [fed];
    // Four paintings of one canvas: two with the row, one with the rack emptied — every instance
    // bypassed and no loop, which is a picture with no gratings in it at all — and one after it
    // comes back. The lay in the second painting is the only one there is: the painting after the
    // gap has nothing kept to lay, where a frame kept across it would be an older picture's.
    const painted = paintedOn(400, 128, rows, 2, WINDOW, {
      frames: 4,
      between: (frame) => {
        if (frame === 1) rows.length = 0;
        if (frame === 2) rows.push(fed);
      },
    });
    expect(painted.surfaces[0]?.drew).toHaveLength(1);
  });

  it("takes half the ink at the sixty-four places the tile asks each profile", () => {
    for (const profile of DRIFT_PROFILES) {
      // What `straightTile` writes: the block at each place across one cycle, as the alpha byte.
      const taken = Array.from(
        { length: TILE_PX },
        (_, at) => Math.round(255 * profileBlock(profile, at / TILE_PX)) / 255,
      );
      expect(taken.reduce((sum, value) => sum + value, 0) / TILE_PX).toBeCloseTo(0.5, 2);
    }
  });
  it("lays the lattice as one cell repeated, turned off the axis and the same a whole period on", () => {
    // The lattice is the straight rows' own pattern path with a cell for a tile: its scale is the
    // cell's own size in device pixels over the tightening the shape says, its turn is off the
    // axis by the lean, and a whole period on it is the same matrix — a quarter turn and a cell along being symmetries of a
    // square lattice, so the wrap is invisible (0278).
    const rows = rackRows({ id: "fx1", effect: "delay" });
    const lattice = rows.find((each) => each.geometry === LATTICE_GEOMETRY);
    if (lattice === undefined) throw new Error("the rack stands in no lattice");
    lattice.depth = 0.5;
    const shape = { ...shapeRest(), cells: 2, lean: 0.1 };
    vi.stubGlobal("devicePixelRatio", 1);
    const laid = paintedOn(400, 128, rows, 3, WINDOW, { shape });
    // Cut like every other row, through a fill and not a draw.
    expect(laid.cuts).toHaveLength(2);
    expect(laid.surfaces[0]?.drew).toEqual([]);
    const aim = laid.aims.at(-1);
    if (aim === undefined) throw new Error("the lattice was not aimed");
    expect(aim.b).not.toBeCloseTo(0, 9);
    expect(aim.c).not.toBeCloseTo(0, 9);
    expect(Math.hypot(aim.a, aim.b)).toBeCloseTo(latticeCellPx() / 2 / LATTICE_TILE_PX, 9);
    // The same cell on a picture ten times as tall — a size in CSS pixels and never a share of the
    // height (0293) — and twice the cell at twice the device pixels, the one thing that scales it.
    const cellOn = (height: number, dpr: number): number => {
      vi.stubGlobal("devicePixelRatio", dpr);
      const at = paintedOn(400, height, rows, 3, WINDOW, { shape }).aims.at(-1);
      return Math.hypot(at?.a ?? 0, at?.b ?? 0);
    };
    expect(cellOn(1400, 1)).toBeCloseTo(Math.hypot(aim.a, aim.b), 9);
    expect(cellOn(128, 2)).toBeCloseTo((latticeCellPx() * 2) / 2 / LATTICE_TILE_PX, 9);
    // Tighter is smaller, and nothing else about it moves.
    vi.stubGlobal("devicePixelRatio", 1);
    const tight = paintedOn(400, 128, rows, 3, WINDOW, { shape: { ...shape, cells: 4 } }).aims.at(
      -1,
    );
    expect(Math.hypot(tight?.a ?? 0, tight?.b ?? 0)).toBeCloseTo(
      latticeCellPx() / 4 / LATTICE_TILE_PX,
      9,
    );
    expect(Math.atan2(tight?.b ?? 0, tight?.a ?? 0)).toBeCloseTo(Math.atan2(aim.b, aim.a), 9);
    // A whole period on is the same matrix.
    const later = rows.slice();
    later[rows.indexOf(lattice)] = { ...lattice, phase: lattice.period };
    vi.stubGlobal("devicePixelRatio", 1);
    const period = paintedOn(400, 128, later, 3, WINDOW, { shape }).aims.at(-1);
    for (const term of ["a", "b", "c", "d", "e", "f"] as const) {
      expect(period?.[term]).toBeCloseTo(aim[term], 9);
    }
    // And a rack holding nothing lays no lattice at all.
    expect(rackRows().some((each) => each.geometry === LATTICE_GEOMETRY)).toBe(false);
  });
  it("halves the paint cadence above a full chain, never under twelve, and off the set", () => {
    // Every pass is a draw of the whole field into a whole surface, so what the painting costs is
    // how many of them the rack chains — read off the looks the set already holds and never off a
    // clock, which would answer differently on two windows of one yard (0284).
    const passes = (count: number): MoireLook[] => rackOf("reverb", count).looks;
    expect(passes(LOOK_FULL_RATE.value)).toHaveLength(LOOK_FULL_RATE.value);
    expect(looksPaintMs(passes(LOOK_FULL_RATE.value))).toBe(DRIFT_PAINT_MS);
    expect(looksPaintMs(passes(0))).toBe(DRIFT_PAINT_MS);
    // One pass past the rate is half of it, and every longer chain is the same half: the picture
    // slows once and never further, so ten passes are painted at the floor and not under it.
    const slowed = looksPaintMs(passes(LOOK_FULL_RATE.value + 1));
    expect(slowed).toBeCloseTo(DRIFT_PAINT_MS * 2, 9);
    for (const count of [LOOK_FULL_RATE.value + 1, 6, 10]) {
      expect(looksPaintMs(passes(count))).toBe(slowed);
      expect(1000 / looksPaintMs(passes(count))).toBeGreaterThanOrEqual(LOOK_SLOW_HZ.value);
    }
    // And a rack of looks that take no slot in the chain is not a chain: a sway is cut through the
    // slices the field is read back in either way, so ten of them paint at the whole rate.
    expect(rackOf("sway", 10).looks).toHaveLength(10);
    expect(looksPaintMs(rackOf("sway", 10).looks)).toBe(DRIFT_PAINT_MS);
    // And a pass the rack has let go of is still a pass while it is leaving: it is carried onto the
    // set that replaced it and drawn until it reaches nought, so the cadence stays halved for as
    // long as the chain is long — off the set the painting walks and never off the commit that
    // built it (`carryLooks`, `looksTravelInto`).
    const stood = rackOf("reverb", LOOK_FULL_RATE.value + 1);
    looksTravelInto(stood.looks, SHAPE_SECS.value, ARRIVED, true);
    const leaving = rackOf("reverb", 1);
    carryLooks(stood, leaving);
    expect(leaving.looks).toHaveLength(LOOK_FULL_RATE.value + 1);
    expect(looksPaintMs(leaving.looks)).toBe(slowed);
    // Until it has finished leaving, and then the picture is quick again on the frame it is dropped.
    looksTravelInto(leaving.looks, SHAPE_SECS.value, ARRIVED, true);
    expect(leaving.looks).toHaveLength(1);
    expect(looksPaintMs(leaving.looks)).toBe(DRIFT_PAINT_MS);
  });
});
