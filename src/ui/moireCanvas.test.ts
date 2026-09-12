/**
 * @role Tests that the picture is one field of gratings rather than a stack of drawn rows: that
 *   every row is cut out of ink laid down exactly once, that a row's period is its pitch and its
 *   parameter its angle, that the reference is the axis the rest are read against, and that a
 *   canvas which cannot make the pattern lays down no ink at all.
 * @instead What a rack's settings and a song's parts draw → src/ui/moireCanvasSession.test.ts. The
 *   frame the picture lays back into itself → src/ui/moireCanvasFeedback.test.ts. The tile shop's
 *   own cases → src/ui/moireCanvasTiles.test.ts. The band every spacing is held inside →
 *   src/ui/moireCanvasBand.test.ts. All of them split out of this file at the 800-line hard cap
 *   (0045), and all of them paint through the one harness in src/ui/moireCanvasPainted.ts and read
 *   it back through src/ui/moireCanvasReadings.ts.
 */
// One over the dependency cap, and the one over it is the session's own row builder: a case that
// paints what a session paints has to reach the picture the way a yard does rather than through a
// second copy of the walk from a rack instance to a row (principle 1).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";
import { EFFECTS } from "@/audio/effects/registry";
import { DECK_AUTOMATION_PARAM_IDS, effectAutomationParamIds } from "@/audio/params";
import { fold } from "@/lib/copy";
import { DRIFT_PAINT_MS, DRIFT_TRAVEL_CYCLES } from "@/lib/moire";
import { gratingDepth, gratingTurns, latticeCellPx, PICTURE_FLOOR } from "@/lib/moireGrating";
import { octaveShare } from "@/lib/moireOctaves";
import { LATTICE_GEOMETRY, LATTICE_TILE_PX } from "@/lib/moireLattice";
import { DRIFT_PROFILES, profileBlock } from "@/lib/moireProfiles";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import {
  LOOK_FULL_RATE,
  LOOK_SLOW_HZ,
  looksPaintMs,
  looksTravelInto,
  type MoireLook,
} from "@/ui/moireLooks";
import { carryLooks } from "@/ui/moireCarry";
import { drawnGratings, TILE_PX } from "@/ui/moireCanvas";
import { painterOn, PRODUCT, WINDOW } from "@/ui/moireCanvasPainted";
import { ARRIVED, keptAt, pitchOf, rackOf, rackRows, turnsIn } from "@/ui/moireCanvasReadings";
import { STAMP_PICTURE_DRAWS } from "@/ui/moireCanvasMarks";
import { SHAPE_SECS, shapeRest } from "@/ui/moireShape";
import type { Aim } from "@/lib/moire";
import { moireRow as row } from "@/lib/moireRow";
/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

/** The whole-field passes a rack of `count` reverbs chains, which is what the cadence is read off. */
const passes = (count: number): MoireLook[] => rackOf("reverb", count).looks;

afterEach(() => {
  vi.unstubAllGlobals();
  resetTuning();
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
    // In one strip, so this case is about the shape of a painting and not about the gust: a wind
    // that gusts lays the same screen down once per strip of the picture, which is the case beside
    // the scene's own in src/ui/moireCanvasScene.test.ts.
    setTuning("wind.strips", 1);
    const rows = [row({ period: 3 }), row({ period: 4 }), row({ period: 5, reference: true })];
    const { laid, cuts, ground, left } = paintedOn(400, 128, rows);
    // One solid ground on the product's surface, then one cut per row out of it.
    expect(ground).toHaveLength(1);
    expect(cuts).toHaveLength(rows.length);
    // Every cut at the depth that holds the field's brightness where it belongs.
    for (const cut of cuts) expect(cut.alpha).toBeCloseTo(gratingDepth(rows.length), 10);
    // And on the canvas itself: the screen laid down once, and the whole product taken back out of
    // it in one stroke — so the picture is ink everywhere the gratings block and a window wherever
    // they agree — and then laid back over as marks, in the one draw 0353 holds the stamp to.
    expect(laid).toHaveLength(2 + STAMP_PICTURE_DRAWS);
    expect(laid[0]?.over).toBe("source-over");
    expect(laid[1]).toEqual({ ink: PRODUCT, over: "destination-out" });
    expect(left).toBe("source-over");
  });

  // 0341: the cut is aimed at a field now, and a dozen rows is what a grown run draws. The window
  // the whole stack agrees on has to stay a sparse moiré of holes rather than a veil over the
  // scene, which is a claim about where `grating.floor` rests and not about the arithmetic above.
  it("leaves the field standing under a dozen rows at rest", () => {
    vi.stubGlobal("devicePixelRatio", 2);
    setTuning("wind.strips", 1);
    const rows = Array.from({ length: 12 }, (_, at) => row({ period: 3 + at }));
    const { cuts } = paintedOn(400, 128, rows);
    expect(cuts).toHaveLength(rows.length);
    // One grating keeps `1 - depth / 2` of the ink on average, `halfCosine` averaging a half, so
    // the window the stack agrees on is their product and the picture is one minus it.
    const window = cuts.reduce((agreed, cut) => agreed * (1 - cut.alpha / 2), 1);
    expect(window).toBeCloseTo(PICTURE_FLOOR.value, 6);
    // And at rest the field keeps better than five sixths of its own ink — nine tenths of it, as
    // it happens. Under that bound the moiré is a haze over every head rather than holes cut
    // between them (0341). The bound is written out and not read off `PICTURE_FLOOR`: it is a
    // claim about where the rest sits, and one phrased against the declaration could not fail
    // when the rest moved, which is the whole of what this case is for.
    expect(1 - window).toBeGreaterThan(0.85);
  });

  it("lays down no ink at all where the engine will not make the pattern", () => {
    // A canvas that cannot make a grating cannot draw this picture. An empty canvas says so; the
    // base fill on its own would be a solid rectangle claiming to be a yard's drift (principle 5).
    vi.stubGlobal("devicePixelRatio", 2);
    expect(paintedOn(400, 128, [row({ period: 3 })], 0).laid).toHaveLength(0);
    // And with only one to hand, the screen is what goes without: the picture is still the rows,
    // cut out of the flat ink the caller resolved; the stamp needs no pattern since 0353.
    const { laid, cuts } = paintedOn(400, 128, [row({ period: 3 })], 1);
    expect(laid).toHaveLength(2 + STAMP_PICTURE_DRAWS);
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
    expect(laid.surfaces[0]?.frame).toEqual([]);
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
