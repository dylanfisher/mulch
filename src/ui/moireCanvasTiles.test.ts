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
import { DRIFT_CENTRE_REACH, DRIFT_STEPS } from "@/lib/moire";
import { FRACTAL_FLIGHT_SECS, fractalStopsRest, fractalTravelSecs } from "@/lib/moireFractal";
import { DRIFT_PULSE_DB, PLAIN_CUT } from "@/lib/moireSound";
import { moireRow as row } from "@/lib/moireRow";
import { emptyDeckPeek } from "@/audio/deckPeek";
import { emptyMasterPeek } from "@/audio/context";
import { partVoice, type PlayerSpec } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { playerGroundSecs, playerRowPeriod } from "@/lib/playerDrift";
import { PLAYER_PART_DEFAULTS, type SongPart } from "@/lib/playerSong";
import { oneSong } from "@/lib/playerSongs";
import { playerWalk, type PlayerStep } from "@/lib/playerWalk";
import { forgetDriftTiles } from "@/ui/driftTiles";
import { NO_GROWN } from "@/ui/moireGrown";
import { stepped } from "@/ui/moireScreen";
import { moireRows, refillRows } from "@/ui/moireRows";
import { baked, painterOn, WINDOW } from "@/ui/moireCanvasPainted";

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

/**
 * One automator standing one place, which is the smallest run that puts the picture's own structure
 * in a picture at all (`fractalInto`, src/ui/moireRowsField.ts).
 */
const ONE_PLACE = new Map([
  [
    "an automator",
    [{ effect: "delay", instance: "a far place", presence: 1, remain: 30, life: 30, values: [] }],
  ],
]);

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
        refillRows(rows, reads, peek, 1, null, 0, null, SILENT_MASTER, ARRIVED, 0, STOOD, STOOD);
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
    refillRows(rows, reads, peek, 1, loop, 4, null, SILENT_MASTER, ARRIVED, 0, STOOD, STOOD);
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
        refillRows(rows, reads, peek, 1, loop, 4, null, SILENT_MASTER, frame, 0, STOOD, STOOD);
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
    refillRows(
      set.rows,
      set.reads,
      { ...emptyDeckPeek(), grown: ONE_PLACE },
      1,
      null,
      0,
      null,
      SILENT_MASTER,
      ARRIVED,
      0,
      set.seed,
      set.toward,
    );
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
    // 0261: the flight is the second thing that opens the row, on the performance's own clock
    // rather than on the row's phase — so it lands in the tile's key exactly as the breath and the
    // age do, and is stepped on the same ramp for the same reason (`fractalFlight`).
    forgetDriftTiles();
    vi.stubGlobal("devicePixelRatio", 2);
    const set = moireRows([], [], 4, PLAIN_CUT, null, ONE_PLACE, null);
    // The read that gives the structure its depth, so the rows are drawn at all. Their phases stay
    // where it leaves them — at the bottom of the breath, where the opening is the flight's alone.
    refillRows(
      set.rows,
      set.reads,
      { ...emptyDeckPeek(), grown: ONE_PLACE },
      1,
      null,
      0,
      null,
      SILENT_MASTER,
      ARRIVED,
      0,
      set.seed,
      set.toward,
    );
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
});
