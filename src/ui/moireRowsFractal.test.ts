/**
 * @role The one row in a yard's drift that is the picture's own structure: that a rack running an
 *   automator has it at all, that what the row *is* — its angle, and the half of its tile slot that
 *   says which row is asking — is the automators standing and not the places they are standing,
 *   that where the structure
 *   stands on the plane belongs to the field and travels there rather than swapping, and that how
 *   hard it cuts is the run and never the picture's age.
 * @instead The rows a lane, a rack instance, a grown run and the macro row make →
 *   src/ui/moireRows.test.ts, which this was the tail of until these cases took it past the
 *   800-line hard cap (0045). The
 *   two that belong to the whole field, and what the output's own edge does to this one →
 *   src/ui/moireRowsField.test.ts. The coordinate and the travel as arithmetic →
 *   src/lib/moireFractal.test.ts. Drawing any of it → src/ui/moireCanvas.test.ts.
 */
// One import over the cap: the picture's weight and the picture's ink are the two readings 0249
// made agree, and they are declared in two files — so the case that holds them to each other has to
// name both. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the soft file cap: this is one flat list of the fractal row's cases, all built through
// the one builder and read through the one per-frame read, and the file it would split into is the
// one it was already split out of. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import { emptyDeckPeek } from "@/audio/deckPeek";
import { emptyMasterPeek } from "@/audio/context";
import { DRIFT_REST, type MoireRow } from "@/lib/moire";
import { DRIFT_RUN_FEEDBACK, runFeedback } from "@/lib/moireAge";
import {
  FRACTAL_BEAT,
  FRACTAL_BITE,
  fractalFlight,
  fractalShape,
  fractalStopsInto,
  fractalStopsRest,
  fractalTravelSecs,
  isFractalGeometry,
} from "@/lib/moireFractal";
import { PLAIN_CUT, washedDepth } from "@/lib/moireSound";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { loopStand, playerGroundSecs, playerRowPeriod, playerRowStand } from "@/lib/playerDrift";
import { oneSong } from "@/lib/playerSongs";
import { playerWalk } from "@/lib/playerWalk";
import type { PlayerSpec } from "@/lib/player";
import type { Loop } from "@/lib/timeline";
import { drawnGratings } from "@/ui/moireCanvas";
import { NO_GROWN } from "@/ui/moireGrown";
import { moireRows, NO_MASTER, refillRows } from "@/ui/moireRows";
import { carryFractal } from "@/ui/moireCarry";
import type { EffectInstanceId, GrownEffect } from "@/audio/effects/contract";
import type { DeckPeek } from "@/audio/deckPeek";
import type { MoireRowSet } from "@/ui/moireRowsField";
import { shapeRest } from "@/ui/moireShape";

/** One place an automator is standing, at its whole presence, which is a place in the picture. */
const place = (instance: EffectInstanceId): GrownEffect => ({
  effect: "delay",
  instance,
  presence: 1,
  remain: 30,
  life: 30,
  values: [],
});

/** The run one automator instance is holding, keyed the way `DeckPeek.grown` keys it. */
const runOf = (
  id: EffectInstanceId,
  ...places: readonly EffectInstanceId[]
): Map<EffectInstanceId, GrownEffect[]> =>
  new Map([[id, places.map((instance) => place(instance))]]);

/** An output with nothing in it: what the row *is* is the run's, and never the session's bus. */
const SILENT_MASTER = emptyMasterPeek();

/**
 * A read with all the time in the world behind it, which is a travel that has already finished:
 * a case about where the structure ends up rather than about how it got there
 * (`easedCentre`, src/lib/moire.ts).
 */
const ARRIVED = Number.POSITIVE_INFINITY;

/** And a picture of a performance that has just begun, which is where every case here reads it. */
const FRESH = 0;

/**
 * The picture a yard running `grown` and nothing else draws, and the peek that reads it back — and,
 * for the one case that is about the ground, a yard whose pattern can jump, which is the only kind
 * whose ground move has a length to be travelled over (`groundTravel`).
 */
const pictureOf = (
  grown: Map<EffectInstanceId, GrownEffect[]>,
  playerPeriod: number | null = null,
): { set: MoireRowSet; peek: DeckPeek } => {
  const set = moireRows([], [], 4, PLAIN_CUT, playerPeriod, grown, null, NO_MASTER);
  return { set, peek: { ...emptyDeckPeek(), grown } };
};

/** The first of the two rows the structure is cut on, which is one structure on two periods. */
const fractalRow = (rows: readonly MoireRow[]): MoireRow => {
  const found = rows.find((row) => isFractalGeometry(row.geometry));
  if (found === undefined) throw new Error("the picture holds no fractal row");
  return found;
};

/** A yard's pattern, arranged as nothing and otherwise exactly what a switch press leaves. */
const JUMPING: PlayerSpec = { seed: 7, ...PLAYER_DEFAULTS, songs: oneSong([]) };

/** An output as narrow as one gets, which is the one that asks the picture for the deepest lens. */
const RINGING_MASTER = { ...emptyMasterPeek(), flatness: 0.001 };

/**
 * One per-frame read of a whole picture, `elapsed` seconds after the one before it — and, for the
 * one case that is about the ground, the loop and the length the yard is reading it in.
 */
const readAt = (
  set: MoireRowSet,
  peek: DeckPeek,
  elapsed: number,
  master = SILENT_MASTER,
  age = FRESH,
  loop: Loop | null = null,
  duration = 0,
): void => {
  refillRows(
    set.rows,
    set.reads,
    peek,
    1,
    loop,
    duration,
    null,
    master,
    elapsed,
    age,
    set.seed,
    set.toward,
    set.ink,
    [],
    set.jolt,
    shapeRest(),
  );
};

// One flat list of the fractal row's cases, every one of them built through the one builder and
// read through the one per-frame read (0007), exactly as the tile shop's cases are.
// oxlint-disable-next-line max-lines-per-function
describe("the picture's own structure", () => {
  /**
   * P183: the support is baked when the population turns over and cut at every painting, so what
   * seeds a map has to be a fact that rests. A place's own id is one; a playhead is not (0245).
   */
  it("seeds the fractal row off the run standing and off no clock at all", () => {
    const grown = runOf("auto", "g0");
    const { set, peek } = pictureOf(grown);
    const fractalAt = (position: number): MoireRow => {
      readAt(set, { ...peek, position }, ARRIVED);
      return { ...fractalRow(set.rows) };
    };
    const still = fractalAt(0);
    const moved = fractalAt(2);
    // Its identity is the rack's own run and it is the same wherever the playhead stands: a row
    // that moved with the clock would bake a picture-sized tile at every frame.
    expect(still.shape).not.toBe(0);
    expect(moved.shape).toBe(still.shape);
    expect(moved.geometry).toBe(still.geometry);
    // And its phase does move, which is what opens it into itself and back out (`fractalZoom`).
    expect(moved.phase).not.toBeCloseTo(still.phase, 6);
  });

  /**
   * 0248, amending 0245 and 0246: what a row *is* rests on the automators, because the row's own
   * angle and the slot its last tile is held in both rest on it and neither may move when a place
   * does. Where the structure *stands* is the population, and that is the thing that travels.
   */
  it("stands its rows on the automators and aims the picture at the places", () => {
    const one = pictureOf(runOf("auto", "g0")).set;
    const two = pictureOf(runOf("auto", "g0", "g1")).set;
    const other = pictureOf(runOf("another auto", "g0")).set;
    // A place arriving under the same automator: the same rows, angle for angle.
    expect(fractalRow(two.rows).shape).toBe(fractalRow(one.rows).shape);
    expect(fractalRow(two.rows).geometry).toBe(fractalRow(one.rows).geometry);
    // And a different automator holding the same run is a different structure outright.
    expect(fractalRow(other.rows).shape).not.toBe(fractalRow(one.rows).shape);
    // But the place it stands on has moved, and that is what the picture travels toward.
    const aimed = fractalStopsRest();
    fractalStopsInto(aimed, fractalShape(runOf("auto", "g0", "g1")));
    expect(two.toward).toEqual(aimed);
    expect(two.toward).not.toEqual(one.toward);
    // Both start where the last picture stood, which on a fresh set is the plane's own rest.
    expect(one.seed).toEqual(fractalStopsRest());
  });

  /**
   * And the travel itself, through the one read a picture is actually filled by: the structure
   * moves from where it stands toward where the population stands, at one rate, and is there
   * inside the window the rows are drawn across (0235, 0248).
   */
  it("travels toward where the population stands and arrives inside the window", () => {
    const { set, peek } = pictureOf(runOf("auto", "g0"));
    const over = fractalTravelSecs(set.windowSecs);
    expect(over).toBeGreaterThan(0);
    expect(set.toward).not.toEqual(fractalStopsRest());

    // A step of the travel, and the picture is neither where it was nor where it is going.
    readAt(set, peek, over / 8);
    expect(set.seed).not.toEqual(fractalStopsRest());
    expect(set.seed).not.toEqual(set.toward);
    // Nothing overshoots: every stop is between where it started and where it is going.
    for (const key of ["cx", "cy", "ratio", "turn"] as const) {
      const from = fractalStopsRest()[key];
      const to = set.toward[key];
      expect(Math.abs(set.seed[key] - from)).toBeLessThanOrEqual(Math.abs(to - from) + 1e-12);
      expect(Math.sign(set.seed[key] - from) * Math.sign(to - from)).toBeGreaterThanOrEqual(0);
    }

    // And a whole window's worth of travel arrives, exactly, and stays there.
    readAt(set, peek, over);
    expect(set.seed).toEqual(set.toward);
    readAt(set, peek, over);
    expect(set.seed).toEqual(set.toward);
  });

  /**
   * And a picture with no structure in it does not travel at all. The one place this parts from the
   * ground: a yard that is not jumping has a ground and stands on it outright, but a rack running
   * nothing has no plane — travelled with no window it would arrive at the stops an empty
   * population folds to, and `carryFractal` would hand those to the first run that arrives.
   */
  it("leaves the plane alone in a picture with no structure on it", () => {
    const set = moireRows([], [], 4, PLAIN_CUT, null, NO_GROWN, null, NO_MASTER);
    const peek = emptyDeckPeek();
    for (const elapsed of [ARRIVED, 1, 0.016]) {
      refillRows(
        set.rows,
        set.reads,
        peek,
        1,
        null,
        0,
        null,
        SILENT_MASTER,
        elapsed,
        FRESH,
        set.seed,
        set.toward,
        set.ink,
        [],
        set.jolt,
        shapeRest(),
      );
      expect(set.seed).toEqual(fractalStopsRest());
    }
  });

  /**
   * A rebuilt set is not a jump: a knob touch and a population turnover both build fresh rows, and
   * a picture that started its travel again from the plane's rest each time would be the swap the
   * travel replaced (0235, 0248).
   */
  it("carries the travel onto the set that replaces it", () => {
    const { set, peek } = pictureOf(runOf("auto", "g0"));
    readAt(set, peek, fractalTravelSecs(set.windowSecs) / 8);
    const halfway = { ...set.seed };
    expect(halfway).not.toEqual(fractalStopsRest());

    const next = pictureOf(runOf("auto", "g0", "g1")).set;
    carryFractal(set, next);
    // Where it had got to, and where the population standing now says it is going.
    expect(next.seed).toEqual(halfway);
    expect(next.toward).not.toEqual(set.toward);
  });

  /**
   * 0249, amending 0246 and 0213: a crossfade takes every place's presence to nought and back, and
   * a run that refused to build its rows there took the structure out of the picture entirely —
   * the blank the eye reads as a hard cut. The rows are held; what goes to nought is the depth, and
   * the wash may not raise it back, because a field with nothing standing in it has nothing to show.
   */
  it("holds the rows while the run stands nothing and cuts nothing through them at wash: 1", () => {
    const standing = runOf("auto", "g0");
    const between = new Map([["auto" as EffectInstanceId, [{ ...place("g0"), presence: 0 }]]]);

    const { set, peek } = pictureOf(between);
    readAt(set, peek, ARRIVED, RINGING_MASTER);
    const rows = set.rows.filter((row) => isFractalGeometry(row.geometry));
    // Both rows are still in the picture — no row arrives and none leaves across the crossfade.
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.depth)).toEqual([0, 0]);
    // And on the most smeared yard there is, they cut nothing and weigh nothing: the wash raises
    // every row that is in the picture and these two are not.
    for (const row of rows) expect(washedDepth(row, 1)).toBe(0);
    // And they bend nothing: the lens is the third reader of "is the structure there", and
    // `boldestRow` skips only a row with no period, so a held row claiming this most resonant of
    // outputs would slide the whole finished field through a structure nobody is standing.
    for (const row of rows) expect(row.lens).toBe(DRIFT_REST.lens);
    const dry = moireRows([], [], 4, PLAIN_CUT, null, NO_GROWN, null, NO_MASTER);
    expect(drawnGratings(set.rows, 1)).toBeCloseTo(drawnGratings(dry.rows, 1), 9);

    // The presence ramp carries the same rows back up with nothing rebuilt.
    const back = pictureOf(standing);
    readAt(back.set, back.peek, ARRIVED);
    expect(fractalRow(back.set.rows).depth).toBeGreaterThan(0);
  });

  /**
   * P179 widened the fold's ceiling with the picture's age, and 0243 took it back; 0246 keeps the
   * rule for the fractal row that replaced it. What says how hard the picture is cut is the
   * population standing and nothing else — an age has nothing to add to it.
   */
  it("cuts by the population standing, at any age, and never past the row's own bite", () => {
    // A population past the reach, so what the cut answers is the bite itself rather than what
    // the automator happened to be standing.
    const { set, peek } = pictureOf(runOf("auto", "g0", "g1", "g2", "g3"));
    const cutAt = (age: number): number => {
      refillRows(
        set.rows,
        set.reads,
        peek,
        1,
        null,
        0,
        null,
        SILENT_MASTER,
        ARRIVED,
        age,
        set.seed,
        set.toward,
        set.ink,
        [],
        set.jolt,
        shapeRest(),
      );
      return fractalRow(set.rows).depth;
    };
    // The deck that has just begun is cut as hard as the one that has sounded an hour: the run
    // bought the structure and an age has nothing to add to it.
    expect(cutAt(0)).toBeCloseTo(FRACTAL_BITE, 9);
    expect(cutAt(1)).toBeCloseTo(FRACTAL_BITE, 9);
  });

  /**
   * 0250: exactly one parameter claims the frame feedback (`delay.feedback`), so thirteen rows of a
   * fourteen-row picture could never reach it. What a run is standing is the floor under it, and
   * what it buys is the whole finished field laid back into itself — the picture zooming into its
   * own structure rather than a structure sitting on top of a picture.
   */
  it("asks the picture to fold back into itself at the depth the run is standing", () => {
    const { set, peek } = pictureOf(runOf("auto", "g0", "g1", "g2", "g3"));
    readAt(set, peek, ARRIVED);
    const rows = set.rows.filter((row) => isFractalGeometry(row.geometry));
    // One structure on two periods, so both rows ask for the same share and the max the painter
    // takes is that share and not twice it.
    expect(rows.map((row) => row.feedback)).toEqual([runFeedback(4, FRESH), runFeedback(4, FRESH)]);
    expect(rows[0]?.feedback).toBeGreaterThan(0);
    // A picture that has just begun gets the floor's share of the band and no more, and the whole
    // of it once the performance is as old as it gets — which is still only half the dimension, so
    // a delay wound past halfway outbids any run there is (`delay.feedback` is the one parameter
    // that claims this one).
    expect(rows[0]?.feedback).toBeLessThan(DRIFT_RUN_FEEDBACK.value);
    readAt(set, peek, ARRIVED, SILENT_MASTER, 1);
    expect(fractalRow(set.rows).feedback).toBeCloseTo(DRIFT_RUN_FEEDBACK.value, 9);

    // A run standing nothing lays nothing back — the rows are held across the trough and a held row
    // keeps no ghost, the same answer the depth and the lens give one reading earlier.
    const between = new Map([["auto" as EffectInstanceId, [{ ...place("g0"), presence: 0 }]]]);
    const held = pictureOf(between);
    readAt(held.set, held.peek, ARRIVED, RINGING_MASTER, 1);
    for (const row of held.set.rows.filter((each) => isFractalGeometry(each.geometry))) {
      expect(row.feedback).toBe(DRIFT_REST.feedback);
    }
    // And a yard growing nothing at all is exactly the picture it was: no row in it claims the
    // dimension, however old the performance behind it.
    const dry = moireRows([], [], 4, PLAIN_CUT, null, NO_GROWN, null, NO_MASTER);
    readAt(dry, emptyDeckPeek(), ARRIVED, RINGING_MASTER, 1);
    for (const row of dry.rows) expect(row.feedback).toBe(DRIFT_REST.feedback);
  });

  /**
   * 0251: the structure is one grating among the picture's own, so it stands where they stand.
   * Built through `plainRow` its rows rested in the middle of the picture and stayed there while
   * the reference row, the wash over it and the module's tiers all travelled with the ground —
   * which is a field travelling under a structure that does not, and a large part of why a grating
   * still read as a layer over one (0235).
   */
  it("stands its rows on the ground the yard is reading, and both of them on the one ground", () => {
    // A short loop at the top of a longer file, so a walk's ground has room to stand off the
    // loop's own in-point — which is where the rows stand before the walk does (0274).
    const loop: Loop = { in: 0, out: 1 };
    const secs = 8;
    const period = playerRowPeriod(JUMPING);
    const { set, peek } = pictureOf(runOf("auto", "g0"), period);
    const structure = set.rows.filter((row) => isFractalGeometry(row.geometry));
    expect(structure).toHaveLength(2);
    // A yard whose walk stands nowhere stands every row of the field on its loop (0274).
    readAt(set, peek, ARRIVED, SILENT_MASTER, FRESH, loop, secs);
    const rest = loopStand(loop, secs) ?? Number.NaN;
    for (const row of structure) expect(row.centre).toBe(rest);
    // And a ground standing carries both of them there — travelled and not written, like every
    // other row that rests on it: a frame of the move stands them between the two (0235).
    peek.player.step = { ...playerWalk(JUMPING)(), bed: 3 };
    const stood = playerRowStand(3, loop, secs)?.centre;
    expect(stood).not.toBe(rest);
    const ground = stood ?? 0;
    // A sliver of the travel: the ground is a few sixteenths of a short loop from the in-point.
    readAt(set, peek, playerGroundSecs(period) / 64, SILENT_MASTER, FRESH, loop, secs);
    for (const row of structure) {
      expect(row.centre).not.toBe(rest);
      expect(row.centre).not.toBe(ground);
      expect(Math.abs(row.centre - ground)).toBeLessThan(Math.abs(rest - ground));
    }
    // And it arrives, through the one anchor the reference row and the wash are carried by rather
    // than a second reading of the same stretch (0185).
    readAt(set, peek, ARRIVED, SILENT_MASTER, FRESH, loop, secs);
    for (const row of structure) expect(row.centre).toBe(ground);
    // One structure on two periods stands in one place: two anchors would beat the structure
    // against itself across the picture rather than at the scales it holds (`FRACTAL_BEAT`).
    expect(structure[0]?.centre).toBe(structure[1]?.centre);
  });

  /**
   * 0261: the flight through the structure is the picture's and no row's, so what the rows owe it
   * is the two periods it is *not* measured in — the window and the beat on it — and the field's
   * own reading of how long the yard has sounded, which is where the flight is taken from. The
   * window moves with what the picture is drawing (`moireWindowSecs`), which is exactly why a
   * flight counted in windows would jump when the population turned over.
   */
  it("stands its two rows on the window and the beat on it, and has sounded nothing yet", () => {
    const { set } = pictureOf(runOf("auto", "g0"));
    const flying = set.rows.filter((row) => isFractalGeometry(row.geometry));
    expect(flying).toHaveLength(2);
    expect(set.windowSecs).toBeGreaterThan(0);
    expect(flying[0]?.period).toBeCloseTo(set.windowSecs, 12);
    expect(flying[1]?.period).toBeCloseTo(set.windowSecs * FRACTAL_BEAT, 12);
    // And a picture nothing has sounded behind has flown nowhere through its structure, which is
    // the reading the read fills and the paint spends (`sounding`, `fractalFlight`).
    expect(set.sounding).toBe(0);
    expect(fractalFlight(set.sounding)).toBe(0);
  });
});
