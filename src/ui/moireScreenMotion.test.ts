/**
 * @role Tests that every motion of the screen belongs to a parameter and not one of them moves when
 *   the picture does not: that each of the screen's terms is owned by the fold and by nobody else,
 *   that the whole placement holds where a halted yard stopped, that the rack's tail and the
 *   output's louder side lean the crawl in whole cells and bake nothing, that the turn sweeps the
 *   lattice through square rather than around it, and that the lattice is leaned and placed exactly
 *   once however many rows a yard holds.
 * @instead What the tile itself is, and the three channels in it → src/ui/moireScreen.test.ts,
 *   which this was split out of at the 800-line hard cap (0045). The crawl's own ground →
 *   src/ui/moireScreenCrawl.test.ts. The recorder these paint through →
 *   src/ui/moireScreenPainted.ts.
 */
// oxlint-disable import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { YARD_SCENE_REST } from "@/lib/yardScene";
import { termTurns, SCREEN_TERMS } from "@/ui/moireScreen";
import { gridPitchPx } from "@/lib/moireScreenFilm";
import { leanCells } from "@/lib/moireLattice";
import { shapeRest } from "@/ui/moireShape";
import { moireRow as row } from "@/lib/moireRow";
import { crawledTo, nextColor, screenPainterOn } from "@/ui/moireScreenPainted";
import { claiming } from "@/ui/moireCanvasReadings";
/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireScreenPainted.ts). */
const paintedOn = screenPainterOn((name, value) => {
  vi.stubGlobal(name, value);
});

// The stand-in document and display live for exactly the one test that asks for them.
afterEach(() => {
  vi.unstubAllGlobals();
  resetTuning();
});

// One flat list of the motions' cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the screen's own motions", () => {
  it("gives each of the screen's motions a parameter of its own, and none to no one", () => {
    // The system the motions hang off: a parameter owns exactly one of them, picked by the same
    // fold that already picks its waveform, so a rack of them drives all four against each other
    // (0128). Every term is reachable — a term no fold can claim is a motion that never happens.
    for (const term of SCREEN_TERMS) {
      expect(termTurns([claiming(term)], term)).toBeCloseTo(0.25, 10);
      // And nobody else's: a row in one term's slice moves that term and no other.
      for (const other of SCREEN_TERMS)
        if (other !== term) expect(termTurns([claiming(term)], other)).toBe(0);
    }
    // No row in a term's slice leaves it still — the honest answer, not a fall back to some other
    // row's phase, because nothing is automating it (principle 5).
    for (const term of SCREEN_TERMS) expect(termTurns([], term)).toBe(0);
    // The reference row is skipped whatever it folds to: it already owns the band's roll (0126).
    expect(termTurns([row({ period: 4, phase: 1, reference: true })], SCREEN_TERMS[0])).toBe(0);
    // P146: and so is a row with no depth of its own, whatever slot it folds into. The field's own
    // row is a reading spread over the picture and belongs to no parameter, so it may not turn one
    // of the four motions a parameter owns — a yard nobody is automating would otherwise breathe
    // because it is playing (0128, 0213).
    for (const term of SCREEN_TERMS) {
      expect(termTurns([claiming(term, { depth: 0 })], term)).toBe(0);
      // And it does not stand in front of a row that does own the term, either.
      expect(termTurns([claiming(term, { depth: 0 }), claiming(term)], term)).toBeCloseTo(0.25, 10);
    }
  });

  it("moves the screen on the picture's own phases and holds every one of them where it stops", () => {
    // The whole of 0040 for the whole of the screen, and the failure this step most invites: four
    // more motions is four more chances to reach for a wall clock. Paint twice with nothing moved
    // and the matrix has to be the same matrix, cell for cell.
    vi.stubGlobal("devicePixelRatio", 2);
    // The three sub-pixel motions rest at nought since 0346; what is read here is the mechanism.
    setTuning("screen.turn", 0.006);
    setTuning("screen.breath", 0.5);
    setTuning("screen.shear", 0.02);
    const rows = [
      ...SCREEN_TERMS.map((term) => claiming(term)),
      row({ period: 3, phase: 2, reference: true }),
    ];
    const first = paintedOn(200, 64, rows).moves;
    vi.stubGlobal("devicePixelRatio", 2);
    expect(paintedOn(200, 64, rows).moves).toEqual(first);
    // And it is moving: with every term claimed, no cell is left at rest.
    const [placed] = first;
    expect(placed?.e).not.toBe(0);
    expect(placed?.f).not.toBe(0);
    expect(placed?.b).not.toBe(0);
    expect(placed?.a).not.toBe(1);
  });

  it("leans the whole screen by the rack's tail, in whole cells, and bakes nothing to do it", () => {
    // The fourteenth step of the block: the one travel the lattice makes across the picture is the
    // walk's ground (`crawlCells`, src/ui/moireCrawl.ts), so what the standing rack's tail buys is
    // a lean of a few marks along that same axis and never a travel of its own — a second one-way
    // drift with no ground under it would be two motions with one name (0267). A lean on any other
    // cell of the matrix would be a second motion, and one in the tile's key would be a
    // picture-sized bake per frame (0129).
    vi.stubGlobal("devicePixelRatio", 2);
    const pitch = gridPitchPx(2);
    const rows = [claiming("crawl"), row({ period: 4, phase: 1, reference: true })];
    const colour = nextColor();
    const still = paintedOn(200, 64, rows, undefined, 0, colour);
    vi.stubGlobal("devicePixelRatio", 2);
    const blown = paintedOn(200, 64, rows, undefined, 2, colour);
    const held = still.moves[0];
    const moved = blown.moves[0];
    // Exactly the cells it says, on the crawl's own axis: the reading is whole cells of the marks
    // before it arrives here, so the lattice lands where 0346 says without being rounded twice.
    expect((moved?.e ?? 0) - (held?.e ?? 0)).toBe(2 * pitch);
    for (const cell of ["a", "b", "c", "d", "f"] as const)
      expect(moved?.[cell]).toBeCloseTo(held?.[cell] ?? 0, 10);
    // And the second painting wrote no tile at all: the first one's answered it, because the wind
    // is a term on the transform and touches nothing the tile is keyed by.
    expect(still.tile).toBeDefined();
    expect(blown.tile).toBeNull();
  });

  it("leans the crawl toward the louder of the output's two sides, and bakes nothing to do it", () => {
    // The eleventh step of the block: the output's two sides reach the picture, and the crawl is
    // the one travel the lattice makes across it — so the lattice is pulled toward the side the
    // sound is louder on, in whole cells of the marks and on no other cell of the matrix.
    vi.stubGlobal("devicePixelRatio", 2);
    const pitch = gridPitchPx(2);
    const rows = [claiming("crawl"), row({ period: 4, phase: 1, reference: true })];
    const colour = nextColor();
    const panned = (sides: number) => {
      vi.stubGlobal("devicePixelRatio", 2);
      return paintedOn(200, 64, rows, undefined, 0, colour, YARD_SCENE_REST, {
        ...shapeRest(),
        sidesCells: leanCells(sides, 0),
      });
    };
    const even = panned(0);
    const left = panned(1);
    const right = panned(-1);
    // Toward the louder side: the left pulls the lattice back along the axis and the right pushes
    // it on, by the same distance either way.
    expect(crawledTo(left)).toBeLessThan(crawledTo(even));
    expect(crawledTo(right)).toBeGreaterThan(crawledTo(even));
    expect(crawledTo(even) - crawledTo(left)).toBeCloseTo(crawledTo(right) - crawledTo(even), 10);
    // By whole cells of the marks, like every other motion of the lattice since 0346.
    expect((crawledTo(even) - crawledTo(left)) % pitch).toBeCloseTo(0, 10);
    // And by more than one of them: a lean of a single cell is inside the swing the crawl already
    // has and would not read as a side at all.
    expect(crawledTo(even) - crawledTo(left)).toBeGreaterThan(pitch);
    // The cells are whole where they are read and not where they are spent, so what the crawl is
    // handed is exactly what it leans by (`leanCells`, src/lib/moireLattice.ts).
    expect(crawledTo(even) - crawledTo(left)).toBe(leanCells(1, 0) * pitch);
    // And on that one cell of the matrix and no other: a lean on any of the rest would be a second
    // motion rather than the crawl's own.
    for (const cell of ["a", "b", "c", "d", "f"] as const)
      expect(left.moves[0]?.[cell]).toBeCloseTo(even.moves[0]?.[cell] ?? 0, 10);
    // And no tile at all: the sides are a term on the transform and touch nothing the tile is keyed
    // by, so a mix panned all day bakes nothing (0129).
    expect(even.tile).not.toBeNull();
    expect(left.tile).toBeNull();
    expect(right.tile).toBeNull();
  });

  it("sweeps the lattice through square rather than around it", () => {
    // Where the effect actually is: the blobs only reach full size as the turn passes through
    // zero. A turn that never reached it would draw one fixed hatch and never a blob.
    vi.stubGlobal("devicePixelRatio", 2);
    setTuning("screen.turn", 0.006);
    const leans = [0, 0.25, 0.5, 0.75].map(
      (turns) =>
        paintedOn(200, 64, [claiming("turn", { period: 1, phase: turns })]).moves[0]?.b ?? 0,
    );
    expect(Math.min(...leans)).toBeLessThan(0);
    expect(Math.max(...leans)).toBeGreaterThan(0);
    expect(leans.some((lean) => lean === 0)).toBe(true);
  });

  it("leans the whole lattice once, and places the screen once however many rows there are", () => {
    // The lean is now a skew on the tile rather than a tilt under each row: no row is drawn on its
    // own any more, so there is nothing for a per-row lean to be under (0128 amended). What that
    // buys is the cost 0128 called its one exception — a `setTransform` and a `fillStyle` per row
    // drawn — so the screen is placed exactly once whatever a yard holds.
    vi.stubGlobal("devicePixelRatio", 2);
    // In one strip, so what is counted is the rows and not the strips of a gust.
    setTuning("wind.strips", 1);
    setTuning("screen.shear", 0.02);
    const others = [row({ period: 3, phase: 1 }), row({ period: 5, phase: 4 })];
    const leaned = paintedOn(200, 64, [claiming("shear"), ...others]).moves;
    expect(leaned).toHaveLength(1);
    vi.stubGlobal("devicePixelRatio", 2);
    const flat = paintedOn(200, 64, others).moves;
    expect(flat).toHaveLength(1);
    // Owned, the lattice leans; owned by nobody it is square, which is the honest answer and not a
    // fall back to some other row's phase (principle 5).
    expect(leaned[0]?.c).not.toBeCloseTo(flat[0]?.c ?? 0, 10);
    expect(flat[0]?.c).toBeCloseTo(-(flat[0]?.b ?? 0), 10);
  });
});
