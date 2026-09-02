/**
 * @role Tests the curved rows' tile shop from the painter's side: that a picture-sized tile is
 *   baked once and placed by a matrix after that, that one painting bakes at most one of them, that
 *   a drifting anchor and a travelling ground are each walked up the ladder their tile is keyed on,
 *   and that no cap ever throws out a tile the painting it is inside is about to draw with.
 * @instead Every other case the painter has → src/ui/moireCanvas.test.ts, which this split out of
 *   at the 800-line hard cap (0045). The shop itself → src/ui/driftTiles.ts.
 */
// One import per thing a tile's key is built from, and the picture's own structure is the third of
// them: the count tracks what a bake reads, exactly as it does in the file this split out of (0007).
// oxlint-disable import/max-dependencies
// And over the soft file cap: every case here is one bake count taken off the one tile shop, and a
// second file of them would be the same fixtures declared twice. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { afterEach, describe, expect, it, vi } from "vitest";

import { effectParamDefaults } from "@/audio/params";
import { DRIFT_CENTRE_REACH, DRIFT_STEPS, type MoireRow } from "@/lib/moire";
import {
  FRACTAL_FLIGHT,
  FRACTAL_FLIGHT_SECS,
  fractalStopsRest,
  fractalTravelSecs,
  isFractalGeometry,
} from "@/lib/moireFractal";
import { DRIFT_PULSE_DB, PLAIN_CUT } from "@/lib/moireSound";
import { moireRow as row } from "@/lib/moireRow";
import { emptyDeckPeek, type DeckPeek } from "@/audio/deckPeek";
import { emptyMasterPeek } from "@/audio/context";
import { partVoice, type PlayerSpec } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import type { SessionEffect } from "@/state/session";
import type { MoireRowSet, RowRead } from "@/ui/moireRowsField";
import type { Loop } from "@/lib/timeline";
import { playerGroundSecs, playerRowPeriod } from "@/lib/playerDrift";
import { PLAYER_PART_DEFAULTS, type SongPart } from "@/lib/playerSong";
import { oneSong } from "@/lib/playerSongs";
import { playerWalk, type PlayerStep } from "@/lib/playerWalk";
import type { DriftBakeRequest, DriftBakeResult, DriftPort } from "@/app/drift";
import { forgetDriftTiles } from "@/ui/driftTiles";
import { NO_GROWN } from "@/ui/moireGrown";
import { joltRest } from "@/ui/moireJolt";
import { screenInkRest, stepped } from "@/ui/moireScreenInk";
import { moireRows, refillRows } from "@/ui/moireRows";
import { baked, painterOn, WINDOW, type Painted } from "@/ui/moireCanvasPainted";
import type { MoireLook } from "@/ui/moireLooks";
import { shapeRest } from "@/ui/moireShape";

/**
 * The automators' own looks folding the plane `folds` times: one apiece all the way in, and one
 * part of the way where the count is fractional, which is a fold still arriving (0279).
 */
const folding = (folds: number): MoireLook[] => {
  const whole = Math.floor(folds);
  const looks: MoireLook[] = Array.from({ length: whole }, (_each, at) => ({
    key: `automator ${at}`,
    look: "fold",
    presence: 1,
    at: 1,
    terms: {},
  }));
  if (folds > whole) {
    looks.push({ key: "arriving", look: "fold", presence: 1, at: folds - whole, terms: {} });
  }
  return looks;
};

import { LATTICE_GEOMETRY, LATTICE_TILE_PX } from "@/lib/moireLattice";
import { DRIFT_DISPERSE_REACH } from "@/lib/moire";

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

/**
 * An output with nothing in it: every case here is about what the painter bakes off a yard's own
 * rows, and none of them is about the session's bus.
 */
const SILENT_MASTER = emptyMasterPeek();

/** A part of a song, with the opaque badge every one carries (0076, 0157). */
const songPart = (id: string, length: number): SongPart => ({
  ...PLAYER_PART_DEFAULTS,
  id,
  name: id,
  voice: partVoice(PLAYER_DEFAULTS),
  length,
});

/**
 * A part whose badge cuts the module's row along a ring, and the yard jumping through it — what a
 * travelling ground has to be read on, because a straight row's anchor is a translate and costs
 * nothing where a curved row's is a picture-sized tile (0142).
 */
const CURVED_PART = songPart("curve", 2);
const CURVED_SPEC: PlayerSpec = { seed: 7, ...PLAYER_DEFAULTS, songs: oneSong([CURVED_PART]) };

/** The one place that run is standing, whole: what a read hands the picture about it (0204). */
const FAR_PLACE = {
  effect: "delay",
  instance: "a far place",
  presence: 1,
  remain: 30,
  life: 30,
  values: [],
};
/**
 * One automator standing one place, which is the smallest run that puts the picture's own structure
 * in a picture at all (`fractalInto`, src/ui/moireRowsField.ts).
 */
const ONE_PLACE = new Map([["an automator", [FAR_PLACE]]]);

/**
 * The same automator a place later, which is what a turnover leaves behind it: the structure is the
 * same structure — the automators standing are unchanged (`fractalKind`) — standing somewhere else
 * on the plane, with a row of the new place's own ahead of the two the structure is cut at.
 */
const TWO_PLACES = new Map([
  ["an automator", [FAR_PLACE, { ...FAR_PLACE, instance: "a nearer place" }]],
]);

/**
 * And the rack that holds it: the automator those places are filed under. A place only reaches the
 * picture as a row of its own where the instance holding it is in the rack (`grownInto`,
 * src/ui/moireRows.ts), so this is what makes a turnover move the order under the structure.
 */
const RUNNING: SessionEffect[] = [
  {
    id: "an automator",
    effect: "automator",
    bypassed: false,
    params: effectParamDefaults("automator", "an automator"),
    automation: {},
    bounds: {},
  },
];

/**
 * The per-frame read, with the five the field holds rather than a row: no master behind it, a fresh
 * performance, a structure standing on its own rest and an ink nothing here claims (`refillRows`).
 * Named once so a case reads as the read it is making rather than as thirteen arguments.
 */
const readRows = (
  rows: readonly MoireRow[],
  reads: readonly RowRead[],
  peek: Readonly<DeckPeek>,
  loop: Loop | null,
  duration: number,
  elapsed: number,
): void => {
  refillRows(
    rows,
    reads,
    peek,
    1,
    loop,
    duration,
    null,
    SILENT_MASTER,
    elapsed,
    0,
    STOOD,
    STOOD,
    screenInkRest(),
    [],
    joltRest(),
    shapeRest(),
  );
};

/**
 * One read of a yard standing `grown`, with all the time in the world behind it: the read that
 * gives the structure its depth, so its rows are drawn at all, and the read that lands the picture
 * where that population folds to rather than part-way there (`refillRows`, `ARRIVED`).
 */
const standingOn = (set: MoireRowSet, grown: DeckPeek["grown"]): void => {
  refillRows(
    set.rows,
    set.reads,
    { ...emptyDeckPeek(), grown },
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
};

/** What each row of one painting was actually drawn with, in the order the painter walked them. */
const drawnWith = (painted: Painted): unknown[] =>
  (painted.surfaces[0]?.drew ?? []).map((one) => one.tile);

/**
 * The two rows the structure is cut at, set apart on their own breaths: they share a shape, a
 * geometry and a profile, and at one turn of one cycle they would share a tile as well — so a case
 * about whose fallback is whose has to move them off each other first (`fractalZoom`).
 */
const apart = (set: MoireRowSet): void => {
  let which = 0;
  for (const each of set.rows) {
    if (!isFractalGeometry(each.geometry)) continue;
    each.phase = (each.period * which) / 4;
    which += 1;
  }
};

/**
 * A worker that records every tile it was asked for and answers them all when a case says so —
 * the path a browser with an `OffscreenCanvas` is on, and the one where a row's fallback is the
 * whole picture: a key the shop does not hold yet is never this painting's (src/ui/driftTiles.ts).
 * The tiles it sends back are stand-ins, because nothing here reads a pixel of one.
 */
function standInPort(): { make: () => DriftPort; asked: DriftBakeRequest[]; answer: () => void } {
  const asked: DriftBakeRequest[] = [];
  let heard: ((result: DriftBakeResult) => void) | null = null;
  return {
    asked,
    answer: () => {
      for (const request of asked) {
        // oxlint-disable-next-line no-unsafe-type-assertion -- only ever drawn, never read
        const tile = { name: request.key } as unknown as ImageBitmap;
        heard?.({ t: "baked", key: request.key, tile });
      }
    },
    make: () => ({
      bake: (request) => {
        asked.push(request);
      },
      listen: (onResult) => {
        heard = onResult;
      },
      listenFailure: () => {},
    }),
  };
}

/** A step of that walk, standing in that part on the ground `bed`. */
const curvedOn = (bed: number): PlayerStep => ({
  ...playerWalk(CURVED_SPEC)(),
  part: CURVED_PART.id,
  song: [CURVED_PART],
  bed,
});

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// One flat list of the tile shop's cases, all painted through the one stand-in canvas (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireCanvas tiles", () => {
  it("bakes a curved row once and moves it with a matrix after that", () => {
    // The cost a curved row is worth stating: its tile is the picture's own size and is written a
    // pixel at a time, so it is written on a rebuild and never on a frame (0129, 0142). Every
    // frame after the first is the same tile placed by a scale.
    const rings = row({ period: 3, phase: 0, geometry: "radial" });
    vi.stubGlobal("devicePixelRatio", 2);
    const first = paintedOn(96, 48, [rings]);
    const written = first.surfaces.findIndex(
      (surface, at) =>
        surface.wrote.length > 0 &&
        first.elements[at]?.width === 96 &&
        first.elements[at].height === 48,
    );
    expect(written).toBeGreaterThan(-1);
    // A ring family, not a comb: what it cuts moves down a column as well as along a row.
    const field = first.surfaces[written]?.wrote[0];
    const alpha = (x: number, y: number): number => field?.data[(y * 96 + x) * 4 + 3] ?? -1;
    expect(alpha(8, 4)).not.toBe(alpha(8, 40));
    // Cut into the product like every other row, and by drawing rather than by filling.
    const drew = first.surfaces[0]?.drew ?? [];
    expect(drew).toHaveLength(1);
    expect(drew[0]?.over).toBe("destination-out");
    // Painted again a third of the way round its cycle, the tile is the one already baked and only
    // the matrix is new — which is the whole claim a picture-sized tile rests on.
    vi.stubGlobal("devicePixelRatio", 2);
    const later = paintedOn(96, 48, [{ ...rings, phase: 1 }]);
    expect(
      later.surfaces.some(
        (surface, at) => surface.wrote.length > 0 && later.elements[at]?.width === 96,
      ),
    ).toBe(false);
    expect(later.surfaces[0]?.drew[0]?.move.a).not.toBeCloseTo(drew[0]?.move.a ?? 0, 9);
  });

  it("bakes one curved tile a painting, and none at all once it holds them", () => {
    // Two claims in one, at the size that breaks a cache. A picture-sized tile is taken at most
    // once a painting, so ten curved rows cost ten paintings and never ten bakes in one (0144) —
    // and more curved rows than the cache holds must still not degrade into a miss on every lookup
    // of every frame, which is what an eviction by age alone does when the rows are walked in the
    // same order each time.
    const many = [0, 0.2, 0.4, 0.6, 0.8].flatMap((centre) =>
      [3, 11].map((period) => row({ period, geometry: "radial", centre })),
    );
    vi.stubGlobal("devicePixelRatio", 2);
    // One painting each, with the rows left exactly where they stand: a commit and not a frame.
    const one = paintedOn(100, 50, many, 2, WINDOW, { frames: 1, advance: 0 });
    expect(baked(one, 100)).toBe(1);
    vi.stubGlobal("devicePixelRatio", 2);
    const rest = paintedOn(100, 50, many, 2, WINDOW, { frames: many.length, advance: 0 });
    expect(baked(rest, 100)).toBe(many.length - 1);
    vi.stubGlobal("devicePixelRatio", 2);
    expect(baked(paintedOn(100, 50, many), 100)).toBe(0);
  });

  // One scenario built out and read frame by frame: the length is the rack it needs plus the run of
  // anchors it walks, and a helper for either would have this one caller. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  it("walks a drifting anchor up the ladder its tile is keyed on, and bakes once a stop", () => {
    // What makes a moving anchor affordable at all. A curved row's tile is a picture-sized bake and
    // its key is built from the *stepped* anchor (0142), so a drift walks the ladder `stepped`
    // already quantises to and visits entries the shop is holding rather than baking new ones.
    // Written against the raw anchor the same step would be a bake a frame, which is the one thing
    // that must never reach the frame path (0129, 0144).
    forgetDriftTiles();
    const { rows, reads } = moireRows(
      [],
      [
        {
          id: "one",
          effect: "reverb",
          bypassed: false,
          params: effectParamDefaults("reverb", "one"),
          automation: {},
          bounds: {},
        },
      ],
      0,
      PLAIN_CUT,
      null,
      NO_GROWN,
      null,
    );
    const period = rows[0]?.period ?? 0;
    expect(period).toBeGreaterThan(0);
    const peek = { ...emptyDeckPeek(), position: 0 };
    // With the instance metered flat out for the whole sweep, so the travel is the swing and the
    // punch together — the widest an anchor ever goes, which is the number the bound is about.
    peek.meters.set("one", -DRIFT_PULSE_DB);
    // A whole cycle of that row's own period, read the way a frame reads it.
    const sweep = 48;
    const stopsSeen = new Set<number>();
    const standing = (): void => {
      stopsSeen.add(stepped(rows[0]?.centre ?? 0, DRIFT_CENTRE_REACH));
    };
    standing();
    vi.stubGlobal("devicePixelRatio", 2);
    const painted = paintedOn(100, 50, rows, 2, WINDOW, {
      frames: sweep,
      advance: 0,
      between: (frame) => {
        peek.position = ((frame + 1) / sweep) * period;
        readRows(rows, reads, peek, null, 0, ARRIVED);
        standing();
      },
    });
    const stops = baked(painted, 100);
    // It moved — a still anchor is one tile for the whole sweep — and it moved onto a handful of
    // stops rather than onto a tile a painting.
    expect(stops).toBeGreaterThan(1);
    expect(stops).toBeLessThanOrEqual(4);
    // And the bound is the ladder's and not the cache's: the anchor itself only ever stood on that
    // handful of stops, which is why the bakes are bounded rather than merely evicted.
    expect(stopsSeen.size).toBeLessThanOrEqual(4);
    expect(stopsSeen.size).toBeGreaterThan(1);
  });

  it("travels a moved ground up that same ladder, and bakes a stop rather than a frame", () => {
    // The load-bearing half of P174. An eased ground move is a picture-sized bake a frame unless it
    // walks the ladder `stepped` already quantises the tile key onto (0142, 0229): written against
    // the raw centre it is a bake a painting for as long as the move lasts (0129, 0144).
    forgetDriftTiles();
    const period = playerRowPeriod(CURVED_SPEC);
    const { rows, reads } = moireRows([], [], 0, PLAIN_CUT, period, NO_GROWN, null);
    const module = rows[0];
    if (module === undefined) throw new Error("the picture has no jumps row");
    // A loop of a second at the top of a four-second file, so a jump has three quarters of the
    // picture's own reach to travel across.
    const loop = { in: 0, out: 1 };
    const peek = emptyDeckPeek();
    peek.player.step = curvedOn(0);
    readRows(rows, reads, peek, loop, 4, ARRIVED);
    expect(module.geometry).not.toBe("linear");
    const from = module.centre;

    // The jump, read the way a frame reads it: forty frames across a whole reach of travel.
    peek.player.step = curvedOn(48);
    const frame = playerGroundSecs(period) / 40;
    const stopsSeen = new Set<number>();
    const stood = (): void => {
      stopsSeen.add(stepped(module.centre, DRIFT_CENTRE_REACH));
    };
    stood();
    vi.stubGlobal("devicePixelRatio", 2);
    const painted = paintedOn(100, 50, rows, 2, WINDOW, {
      frames: 40,
      advance: 0,
      between: () => {
        readRows(rows, reads, peek, loop, 4, frame);
        stood();
      },
    });
    // It travelled: a written ground stands on the two stops either end of the jump and nothing
    // between, where a travelled one walks every stop on the way — and onto the ladder's own stops
    // rather than onto a tile a painting, which is the bound.
    expect(module.centre).toBeGreaterThan(from);
    expect(stopsSeen.size).toBeGreaterThan(2);
    expect(stopsSeen.size).toBeLessThanOrEqual(DRIFT_STEPS + 1);
    expect(baked(painted, 100)).toBeLessThanOrEqual(DRIFT_STEPS + 1);
  });

  // One case, and what is over the cap is the sweep it is measured across: a whole travel read
  // frame by frame, with the per-frame read spelled out in full. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  it("walks a travelling structure up that same ladder, and bakes a stop rather than a frame", () => {
    // The third of the three things that move a picture-sized tile's key, and the one 0248 added:
    // the structure travels across the plane between the places a run stands, so unless the stops
    // are stepped onto the ladder `stepped` already quantises the anchor onto, a picture on the
    // move asks for a picture-sized bake at every frame for as long as the travel lasts (0142,
    // 0144). Two rows are on it, because one structure is cut at two periods (0246).
    forgetDriftTiles();
    vi.stubGlobal("devicePixelRatio", 2);
    const set = moireRows([], [], 4, PLAIN_CUT, null, ONE_PLACE, null);
    const peek = { ...emptyDeckPeek(), grown: ONE_PLACE };
    const over = fractalTravelSecs(set.windowSecs);
    expect(over).toBeGreaterThan(0);
    // A whole travel, read frame by frame the way a painting reads it, with every row's phase held
    // so the only thing moving in the picture is where its structure stands.
    const sweep = 32;
    const painted = paintedOn(100, 50, set.rows, 2, WINDOW, {
      frames: sweep,
      advance: 0,
      seed: set.seed,
      between: () => {
        refillRows(
          set.rows,
          set.reads,
          peek,
          1,
          null,
          0,
          null,
          SILENT_MASTER,
          over / sweep,
          0,
          set.seed,
          set.toward,
          set.ink,
          [],
          set.jolt,
          shapeRest(),
        );
      },
    });
    // It arrived, so the picture really did travel across the sweep.
    expect(set.seed).toEqual(set.toward);
    const stops = baked(painted, 100);
    // It moved — a standing structure is one tile a row for the whole sweep — and it moved onto a
    // handful of stops rather than onto a tile a painting for each of its two rows.
    // And no painting of that travel goes blank: only the first draws nothing — one bake a
    // painting, and neither row has a tile yet — and every painting after it draws both rows,
    // wherever on the plane the picture has got to (0144, 0248).
    expect(painted.surfaces[0]?.drew.length).toBe(2 * sweep - 2);
    expect(stops).toBeGreaterThan(2);
    expect(stops).toBeLessThanOrEqual(2 * DRIFT_STEPS);
  });

  it("opens a fractal row's tile with the age, and asks for none between two steps of one", () => {
    // 0251: the age reaches the picture's own structure now — it is a coefficient on the band the
    // row breathes through (`agedOpening`), so it lands in the tile's key like the other three
    // things that move one. Which is exactly why it is stepped: an age is a saturating exponential
    // that never stops moving, so unstepped it would ask for a picture-sized bake at every frame
    // for the whole of a performance (0142, 0144).
    forgetDriftTiles();
    vi.stubGlobal("devicePixelRatio", 2);
    const set = moireRows([], [], 4, PLAIN_CUT, null, ONE_PLACE, null);
    // The read that gives the structure its depth, so the rows are drawn at all — and then both of
    // them stood at the top of their own breath, where the opening is the whole band the age has
    // earned: at the bottom of it every age opens onto the same picture (`fractalZoom`).
    standingOn(set, ONE_PLACE);
    for (const each of set.rows) if (each.geometry !== "linear") each.phase = each.period / 2;
    const bakedAt = (age: number): number =>
      baked(
        paintedOn(100, 50, set.rows, 2, WINDOW, { frames: 3, advance: 0, age, seed: set.seed }),
        100,
      );
    // The structure is baked for the age the picture is first drawn at.
    const fresh = bakedAt(0);
    expect(fresh).toBeGreaterThan(0);
    // A performance that has been somewhere opens further into its own structure, which is that
    // many tiles again the shop is not holding.
    expect(bakedAt(1)).toBe(fresh);
    // And an age that has moved inside one step of the ladder is exactly the picture it was — as
    // is the age the picture was first drawn at, which the shop is still holding.
    expect(bakedAt(1 - 1e-6)).toBe(0);
    expect(bakedAt(0)).toBe(0);
  });

  it("flies a fractal row's tile through the structure as the yard sounds, and asks for none between two stops", () => {
    // 0268: the flight is a travel through the row's own coordinate rather than a second scale on
    // it, taken on the performance's own clock rather than on the row's phase — so it lands in the
    // tile's key exactly as the breath and the age do, and is stepped on the same ladder for the
    // same reason (`fractalFlight`).
    forgetDriftTiles();
    vi.stubGlobal("devicePixelRatio", 2);
    const set = moireRows([], [], 4, PLAIN_CUT, null, ONE_PLACE, null);
    // The read that gives the structure its depth, so the rows are drawn at all. Their phases stay
    // where it leaves them — at the bottom of the breath, where the opening is exactly one and the
    // only field of the key that moves below is the travel's own.
    standingOn(set, ONE_PLACE);
    const whole = FRACTAL_FLIGHT_SECS;
    const bakedAt = (sounding: number): number =>
      baked(
        paintedOn(100, 50, set.rows, 2, WINDOW, {
          frames: 3,
          advance: 0,
          seed: set.seed,
          sounding,
        }),
        100,
      );
    // The structure is baked where a yard that has sounded nothing stands.
    const fresh = bakedAt(0);
    expect(fresh).toBeGreaterThan(0);
    // A yard that has been sounding is deep in the same structure somewhere else, which is that
    // many tiles again the shop is not holding.
    expect(bakedAt(whole / 2)).toBe(fresh);
    // And a sounding that has moved inside one stop of the ladder is exactly the picture it was —
    // as is where the picture was first drawn, which the shop is still holding.
    expect(bakedAt(whole / 2 + 1e-6)).toBe(0);
    expect(bakedAt(0)).toBe(0);
  });

  it("roams a fractal row's tile across the plane as the yard sounds, and asks for none between two stops", () => {
    // 0273: the roam is laid over the population's travel on the performance's own clock, so it
    // lands in the tile's key through the stops the travel already steps on. A whole flight's
    // wrap on is the same level of the structure, and the picture has roamed somewhere else in it.
    forgetDriftTiles();
    vi.stubGlobal("devicePixelRatio", 2);
    const set = moireRows([], [], 4, PLAIN_CUT, null, ONE_PLACE, null);
    standingOn(set, ONE_PLACE);
    const level = FRACTAL_FLIGHT_SECS / FRACTAL_FLIGHT;
    const bakedAt = (sounding: number): number =>
      baked(
        paintedOn(100, 50, set.rows, 2, WINDOW, {
          frames: 3,
          advance: 0,
          seed: set.seed,
          sounding,
        }),
        100,
      );
    const fresh = bakedAt(0);
    expect(fresh).toBeGreaterThan(0);
    // The same level of the flight, exactly a level on — and a new tile, because the roam has
    // carried the picture a stop across the plane in the meantime.
    expect(bakedAt(level)).toBe(fresh);
    // And back where it began is the tile the shop is still holding.
    expect(bakedAt(0)).toBe(0);
  });

  // One case, and what is over the cap is the turnover it is read across: two whole populations
  // stood in turn, with the worker that makes a fallback the picture answering between them. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  it("keeps a fractal row's fallback across a seed step", () => {
    // The residue 0249 left: the structure holds through a crossfade now, and the *slot* its last
    // tile is held in did not. A slot carries where the row stands in the picture's own order, and
    // a place arriving pushes a row of its own in ahead of the two fractal rows — so a turnover
    // slid both of them one slot down at exactly the moment the travel stepped their keys: the
    // last of them had nothing at all to draw with, and the one before it drew the *other* row's
    // tile, which is the picture blinking at the edges of a crossfade the run holds through
    // (0144, 0248, 0249, 0262).
    // Read on the path a browser with a worker is on, because that is where the fallback is the
    // whole picture: a key the shop does not hold is asked for off this thread and answered a
    // painting or two later, so every stop of the travel is drawn with the tile the row was last
    // drawn with (0144).
    const worker = standInPort();
    forgetDriftTiles(worker.make);
    vi.stubGlobal("devicePixelRatio", 2);
    const stood = moireRows([], RUNNING, 4, PLAIN_CUT, null, ONE_PLACE, null);
    // The run standing where this population folds to. The first painting asks for every curved
    // row's tile — the automator's own and the two the structure is cut at — and draws nothing,
    // because no row holds one yet; once the worker answers, the painting after it draws all three,
    // which is what puts a tile in each row's own slot.
    standingOn(stood, ONE_PLACE);
    apart(stood);
    const first = paintedOn(100, 50, stood.rows, 2, WINDOW, { frames: 1, seed: stood.seed });
    expect(first.surfaces[0]?.drew).toHaveLength(0);
    // Three tiles asked for and no two of them one tile: the structure's two rows are each on a
    // breath of their own, so what one of them falls back to is never the other's picture. And a
    // fourth, the lattice's own cell, which is a pattern and is never drawn as a tile (0278).
    expect(new Set(worker.asked.map((one) => one.key)).size).toBe(4);
    worker.answer();
    const held = paintedOn(100, 50, stood.rows, 2, WINDOW, { frames: 1, seed: stood.seed });
    expect(held.surfaces[0]?.drew).toHaveLength(3);
    // Then the turnover: one more place under the same automator, so the rows are rebuilt with the
    // new place's row among them — ahead of the structure's own two — and the structure has
    // travelled to where the larger population folds to.
    const turned = moireRows([], RUNNING, 4, PLAIN_CUT, null, TWO_PLACES, null);
    standingOn(turned, TWO_PLACES);
    apart(turned);
    expect(turned.rows.length).toBeGreaterThan(stood.rows.length);
    const asked = worker.asked.length;
    const after = paintedOn(100, 50, turned.rows, 2, WINDOW, { frames: 1, seed: turned.seed });
    // The travel really did step: the shop is asked for a tile it does not hold, and asks the
    // worker for it rather than baking one here.
    expect(worker.asked.length).toBeGreaterThan(asked);
    expect(baked(after, 100)).toBe(0);
    // And every row draws anyway, each with the tile its *own* slot still holds — the picture the
    // painting before it drew, placed where that picture was baked, rather than a blank at the
    // edges of the turnover or the neighbour's structure about this row's own breath.
    expect(drawnWith(after)).toHaveLength(3);
    expect(new Set(drawnWith(after)).size).toBe(3);
    expect(drawnWith(after)).toEqual(drawnWith(held));
    // And the stand-in worker put down, so the cases after this one bake on this thread as they
    // always have: the shop's port is a module's and outlives one test (`forgetDriftTiles`).
    forgetDriftTiles();
  });

  it("gives two rows of one kind their own fallback, and not each other's", () => {
    // A row's shape is folded off its *parameter*, so two lanes on the same knob of two instances
    // of one effect are one shape, one geometry and one profile. Sharing a fallback, the row whose
    // bake this painting could not afford would be drawn with the other row's tile about the other
    // row's anchor — a wrong ring family rather than a late one, which is worse than not drawing it
    // (0144).
    forgetDriftTiles();
    vi.stubGlobal("devicePixelRatio", 2);
    const alike = [row({ period: 3, geometry: "radial" }), row({ period: 11, geometry: "radial" })];
    const { surfaces } = paintedOn(100, 50, alike, 2, WINDOW, { frames: 1 });
    // One bake a painting, and the row that did not get it has nothing of its own yet: it draws
    // nothing this painting rather than the other row's rings.
    expect(surfaces[0]?.drew ?? []).toHaveLength(1);
  });

  // P169: a row an automator grew is drawn at as many scales as the run is holding, and a *swept*
  // row's tile is keyed by the cycles its pitch comes to — so one row is a picture-wide bake per
  // scale, and the keys one painting touches now outrun a cap of twelve (0230).
  it("keeps every swept tile the painting it is inside is about to draw with", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    // Twenty distinct keys against a cap of twelve: four sweeps the ladder tells apart, at five
    // spacings the band tells apart — which is one automator's run of five chirping effects drawn
    // at three scales each, and then some. Every one of them is a picture-wide pixel loop.
    const swept = [0.15, 0.3, 0.45, 0.6].flatMap((chirp) =>
      [0.5, 1, 2, 3, 5].map((period) => row({ period, chirp })),
    );
    const painted = paintedOn(400, 128, swept, 200, WINDOW, { frames: 3, advance: 0 });
    // Each baked once and then held. Evicting by age alone is a miss on every lookup of every
    // painting — the rows are walked in the same order each time, so the entry thrown out is
    // always the one asked for next — which is the one thing this cap may never do (0144).
    expect(baked(painted, 400)).toBe(swept.length);
  });

  it("bakes a folded row once a fold stop, keyed on the fold, and never between two", () => {
    // A fold is baked: the automators standing fold the plane every curved row is cut on, so a
    // fold arriving walks the tile's key up its own ladder and asks for one bake a stop — and a
    // picture whose fold has not moved asks for nothing (0278).
    const spiral = row({ period: 3, phase: 0, geometry: "spiral", centre: 0.5 });
    const folded = (folds: number, frames = 1) => {
      vi.stubGlobal("devicePixelRatio", 2);
      return paintedOn(96, 48, [spiral], 2, WINDOW, {
        frames,
        advance: 0,
        // A fold is the automator's own declared look: one per automator standing, and fractional
        // where one of them is still arriving (0279).
        looks: folding(folds),
      });
    };
    expect(baked(folded(0), 96)).toBe(1);
    expect(baked(folded(0), 96)).toBe(0);
    // One fold is a different tile — and its own key, so the unfolded tile is still held.
    expect(baked(folded(1), 96)).toBe(1);
    expect(baked(folded(1), 96)).toBe(0);
    expect(baked(folded(0), 96)).toBe(0);
    // A fold a hair further on is the same stop and the same tile; a whole stop on is a bake.
    expect(baked(folded(1 + 0.4 / DRIFT_STEPS), 96)).toBe(0);
    expect(baked(folded(1 + 1 / DRIFT_STEPS), 96)).toBe(1);
    // And what was baked is the mirror the fold promises: the tile's two halves about the anchor's
    // own row agree, where the unfolded spiral's did not.
    const written = folded(2).surfaces.find((surface) => surface.wrote.length > 0);
    const field = written?.wrote[0];
    expect(field).toBeDefined();
    const alpha = (x: number, y: number): number => field?.data[(y * 96 + x) * 4 + 3] ?? -1;
    for (let x = 4; x < 96; x += 8) {
      for (let k = 1; k < 20; k += 3) {
        expect(Math.abs(alpha(x, 24 - k) - alpha(x, 24 + k))).toBeLessThanOrEqual(1);
      }
    }
  });
  it("bakes the lattice's cell once a rim stop, square, and asks for nothing when it tightens", () => {
    // The lattice is a pattern: one cell, its own size whatever the picture's, and everything a
    // frame does to it is a matrix — so a lattice tightening, turning or breathing asks the shop for
    // nothing, and only the rim's width, which is baked, asks for a cell (0278).
    const worker = standInPort();
    forgetDriftTiles(worker.make);
    vi.stubGlobal("devicePixelRatio", 2);
    const set = moireRows([], RUNNING, 4, PLAIN_CUT, null, NO_GROWN, null);
    standingOn(set, new Map());
    const cells = () => worker.asked.filter((one) => one.geometry === LATTICE_GEOMETRY);
    paintedOn(100, 50, set.rows, 3, WINDOW, { frames: 1, shape: { ...shapeRest(), cells: 2 } });
    expect(cells()).toHaveLength(1);
    expect(cells()[0]?.width).toBe(LATTICE_TILE_PX);
    expect(cells()[0]?.height).toBe(LATTICE_TILE_PX);
    worker.answer();
    vi.stubGlobal("devicePixelRatio", 2);
    paintedOn(100, 50, set.rows, 3, WINDOW, {
      frames: 1,
      shape: { ...shapeRest(), cells: 3.5, lean: 0.1 },
    });
    expect(cells()).toHaveLength(1);
    // A picture of another size shares the cell: it is not a place.
    vi.stubGlobal("devicePixelRatio", 2);
    paintedOn(400, 128, set.rows, 3, WINDOW, { frames: 1, shape: { ...shapeRest(), cells: 3.5 } });
    expect(cells()).toHaveLength(1);
    // And the ink dispersed all the way is a rim a stop wider, which is one more cell, keyed apart.
    vi.stubGlobal("devicePixelRatio", 2);
    paintedOn(100, 50, set.rows, 3, WINDOW, {
      frames: 1,
      tint: { ...screenInkRest(), disperse: DRIFT_DISPERSE_REACH },
    });
    expect(cells()).toHaveLength(2);
    expect(cells()[0]?.key).not.toBe(cells()[1]?.key);
  });
});
