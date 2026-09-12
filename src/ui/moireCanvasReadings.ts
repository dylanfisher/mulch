/**
 * @role What a painter case reads off one painting, the fixtures it paints, and the one binding
 *   that paints a yard through both: the rows every scene case is drawn against, a rack's own rows,
 *   one arrived look, the tile a painting wrote, the pitch, lean and kept ink read back out of it,
 *   and `yardPainterOn`, which is the recorder beside this file bound to one file's stubbing and
 *   handed those rows. Declared once here because the painter's cases are spread across a dozen
 *   test files at the 800-line hard cap, and a reading taken two ways is two readings (principle
 *   1). Nothing in production imports this file.
 * @instead The recorder itself, and the inks it answers a token with → src/ui/moireCanvasPainted.ts.
 *   The painter → src/ui/moireCanvas.ts. What a row is → src/lib/moire.ts.
 */
// Over the dependency cap, and every one of them is a fixture's own declaration: a rack's rows come
// out of the registry, a look's out of the reading that answers with them, and a scene's out of the
// yard — restating any of them here would be a second copy of the shipped shape (principle 1).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { emptyMasterPeek } from "@/audio/context";
import type { EffectId } from "@/audio/effects/registry";
import { effectParamDefaults } from "@/audio/params";
import type { Aim, MoireRow } from "@/lib/moire";
import type { LookName, LookTerms } from "@/lib/moireLook";
import { type DriftProfile, PLAIN_PROFILE, profileBlock } from "@/lib/moireProfiles";
import { moireRow } from "@/lib/moireRow";
import { beatPx, gridPitchPx } from "@/lib/moireScreenFilm";
import { PLAIN_CUT } from "@/lib/moireSound";
import type { YardScene } from "@/lib/yardScene";
import { TILE_PX } from "@/ui/moireCanvas";
import { painterOn, type Painted, type StubGlobal, WINDOW } from "@/ui/moireCanvasPainted";
import { NO_GROWN } from "@/ui/moireGrown";
import type { MoireLook } from "@/ui/moireLooks";
import { moireRows, NO_MASTER } from "@/ui/moireRows";
import type { MoireRowSet } from "@/ui/moireRowsField";
import { SCREEN_TERMS, type ScreenTerm } from "@/ui/moireScreen";

/**
 * A row whose shape lands in the middle of `term`'s slice of the fold, so it claims that motion of
 * the screen and no other (`termTurns`, src/ui/moireScreen.ts, 0128). Here with the painter rather
 * than in any one case's file, because three of them paint rows claiming a term and the fold that
 * picks one is arithmetic nobody should write twice (principle 3).
 */
export const claiming = (term: ScreenTerm, over: Partial<MoireRow> = {}): MoireRow =>
  moireRow({
    period: 4,
    phase: 1,
    shape: ((SCREEN_TERMS.indexOf(term) + 0.5) / SCREEN_TERMS.length) * 2 ** 32,
    ...over,
  });

/** The rows a painting is made of where a case is about something else: one claiming row, and the
 * deck's own reference. Six test files painted these two rows out of six copies of this line before
 * they were one declaration (principle 1). */
export const ROWS = [moireRow({ period: 3 }), moireRow({ period: 4, phase: 1, reference: true })];

/**
 * A read with all the time in the world behind it, which is a ground move that has already finished
 * travelling: a case reading it is about the tiles a picture bakes, not about how it got where it is
 * (`easedCentre`, src/lib/moire.ts).
 */
export const ARRIVED = Number.POSITIVE_INFINITY;

/**
 * An output with nothing in it: a case reading it is about what the painter draws off a yard's own
 * rows, and not about the session's bus (`SILENT_MASTER`, src/ui/moireRows.test.ts).
 */
export const SILENT_MASTER = emptyMasterPeek();

/**
 * The picture a yard holding these rack instances draws — its rows and everything beside them that
 * belongs to the field — out of the one builder a session's picture is made with rather than out of
 * a fixture, the entry's own defaults but for what a case names. So a case here paints what a
 * session would paint, through the registry's own declared way into the picture and not through a
 * second copy of the walk that reads it.
 */
export const rackSet = (
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
      drawn: {},
      bounds: {},
    })),
    0,
    PLAIN_CUT,
    null,
    NO_GROWN,
    null,
    NO_MASTER,
  );

export const rackRows = (
  ...instances: readonly { id: string; effect: EffectId; params?: Record<string, number> }[]
): MoireRow[] => rackSet(...instances).rows;

/** A rack of `count` instances of one effect, which is how a chain is made long enough to slow. */
export const rackOf = (effect: EffectId, count: number): MoireRowSet =>
  rackSet(...Array.from({ length: count }, (_, at) => ({ id: `fx${at}`, effect })));

/**
 * One look of a standing rack, standing at `at` and arrived — the shape `rackLooks` answers with
 * (src/ui/moireLooks.ts). Built here rather than read off a rack of instances because what a case
 * taking one is about is the draw, and a knob's own range is the reading's case and not the
 * painter's.
 */
export const look = (
  name: LookName,
  terms: LookTerms = {},
  at = 1,
  key: string = name,
): MoireLook => ({
  key,
  look: name,
  presence: at,
  at,
  terms,
  held: 0,
  waited: 0,
});

/**
 * How far apart one aimed grating's fringes stand, back out of the matrix it was aimed with — here
 * rather than in each file that reads one, because a pitch read two ways is two pitches.
 */
export const pitchOf = (move: Aim | undefined): number =>
  Math.hypot(move?.a ?? 0, move?.b ?? 0) || Number.NaN;

/** Which way it leans, in turns of a circle. */
export const turnsIn = (move: Aim | undefined): number =>
  Math.atan2(move?.b ?? 0, move?.a ?? 0) / (2 * Math.PI);

/**
 * What one aimed grating keeps at a point of the canvas, cutting `depth`: the tile the painter
 * built, read back through the matrix it aimed that tile with. The field is these multiplied,
 * because `destination-out` leaves what is under it times one minus the grating.
 */
export const keptAt = (
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
 * The one tile `wide` device pixels across that a painting wrote a pixel field into, as its pixels.
 * Here rather than in each of the files that read it (principle 1), and it throws where a painting
 * wrote no such tile or more than one: either is a case reading a picture it did not paint.
 */
export function tileOf(painted: Painted, wide: number): Uint8ClampedArray {
  const written = painted.surfaces.flatMap((surface, at) =>
    painted.elements[at]?.width === wide ? surface.wrote : [],
  );
  if (written.length !== 1) {
    throw new Error(`A painting wrote ${written.length} tiles ${wide} wide, and not the one.`);
  }
  return written[0]?.data ?? new Uint8ClampedArray();
}

/** How many tiles `wide` device pixels across one painting wrote a pixel field into. */
export const baked = (painted: Painted, wide: number): number =>
  painted.surfaces.filter(
    (surface, at) => surface.wrote.length > 0 && painted.elements[at]?.width === wide,
  ).length;

/**
 * The screen's own tile out of one painting: the surface a beat cell wide, which is the only one
 * the screen writes a pixel field into (`beatPx`, src/ui/moireScreenTile.ts). Exactly one write,
 * which is a rule a scene case is about — the loop over a tile's pixels runs on a rebuild and
 * never on a frame (0129).
 */
export const screenTileOf = (painted: Painted): Uint8ClampedArray =>
  tileOf(painted, beatPx(gridPitchPx(2)));

/**
 * One painting of a yard reading as `yard`, on a display of two device pixels to the CSS one —
 * bound, like the recorder it is made of, to one test file's own way of stubbing a global. Three
 * files painted a scene through three copies of this before it was one declaration (principle 1).
 */
export const yardPainterOn = (stubGlobal: StubGlobal) => {
  const paintedOn = painterOn(stubGlobal);
  return (yard: Readonly<YardScene>, looks: readonly MoireLook[] = [], high = 128): Painted => {
    stubGlobal("devicePixelRatio", 2);
    return paintedOn(200, high, ROWS, 2, WINDOW, { yard, looks });
  };
};
