/**
 * @role The screen's stand-in canvas: `paintMoire` run against a recorder that keeps the tile the
 *   screen was built in, the pixels written into it, where each strip placed it and what every fill
 *   was made with. Nothing in production imports this file — it is the canvas the screen's own
 *   three case files are painted against, held apart from them so they share one recorder rather
 *   than three copies of it (principle 1). The five other screen test files paint the picture
 *   rather than the screen and go through src/ui/moireCanvasPainted.ts instead.
 * @instead The picture's own recorder, which records the rows' gratings instead →
 *   src/ui/moireCanvasPainted.ts. The screen itself → src/ui/moireScreen.ts. The terms it is cut
 *   with → src/lib/moireScreenFilm.ts.
 */
import type { MoireRow, ScreenInk } from "@/lib/moire";
import { fractalStopsRest } from "@/lib/moireFractal";
import { type YardScene, YARD_SCENE_REST } from "@/lib/yardScene";
import { paintMoire } from "@/ui/moireCanvas";
import { arrivedInk, PRODUCT, resolvedInk, type StubGlobal } from "@/ui/moireCanvasPainted";
import { type MoireShape, shapeRest } from "@/ui/moireShape";
import { tintRest } from "@/ui/moireTint";

/** Where the painter put the screen for one fill: the whole matrix, not just how far it rolled. */
export type Move = { a: number; b: number; c: number; d: number; e: number; f: number };

/** How far along the crawl's own axis one painting placed the screen. */
export const crawledTo = (painting: { moves: Move[] }): number => painting.moves[0]?.e ?? 0;

/**
 * A colour no other painting through this recorder asked for. The painter holds its tiles by what
 * they are
 * of rather than by who asked, which is the point of that cache and would otherwise leave one test
 * reading the tile another one built. Counted once for the three files, not once in each.
 */
let asked = 0;
export const nextColor = (): string => `the token the theme resolved ${(asked += 1)}`;

/**
 * The tile the painter builds its screen in: a stand-in whose context is real enough for `inkOf` to
 * read a colour back out of it, which is how the painter learns what a token resolved to without
 * parsing one, and which keeps the pixels it was handed so a test can read the screen itself.
 */
function tileStub() {
  let written: ImageData | null = null;
  let drawn: { width: number; height: number } | null = null;
  // One per `createElement`, because the painter asks for two: the tile, and the single pixel it
  // reads a colour back through. A stub shared between them would let one resize the other.
  const create = () => {
    const canvas = {
      width: 0,
      height: 0,
      // Enough of a context to be any of the three surfaces the painter now asks `createElement`
      // for: the screen's tile, the one pixel a colour is read back through, and the surface the
      // rows' product is built on — which is the one that needs a pattern and a composite mode.
      getContext: () => ({
        fillStyle: "",
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
        clearRect: () => {},
        fillRect: () => {},
        setTransform: () => {},
        createPattern: () => ({ setTransform: () => {} }),
        drawImage: () => {},
        getImageData(): { data: Uint8ClampedArray } {
          return { data: Uint8ClampedArray.from(resolvedInk(this.fillStyle)) };
        },
        createImageData: (w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData: (field: ImageData) => {
          written = field;
          drawn = canvas;
        },
      }),
    };
    return canvas;
  };
  return { create, taken: () => written, tile: () => drawn };
}

/** The screen's recorder, bound to the stubbing of whichever test file asks it for one. */
// The factory is its one recorder — the recorder and the painting it records are one function:
// every stub in it writes into the tally the painting returns, and a helper holding half of them
// would hand a case a recorder with nothing recorded in it.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function screenPainterOn(stubGlobal: StubGlobal) {
  return paintedOn;

  // Hoisted, so the factory reads as "here is the recorder" rather than as a hundred lines before
  // its one return.
  /**
   * The painter run against a canvas of `width` × `height` device pixels, recording the tile it
   * built, the pixels it wrote into it, where it put the screen, and what every fill was made with.
   *
   * `ink` is where the picture's ink stands, for the cases about the travel itself; every other case
   * paints through the ink these rows have already arrived at, which is the picture they claim. And
   * `wind` is how far the rack behind it has blown the field, in turns of one cell: nowhere for every
   * case but the wind's own, which is the picture a dry rack draws (0267). `color` is a token no other
   * painting asked for unless a case names one, which is how the wind's own case paints twice through
   * one tile.
   *
   * Two patterns come out of one context now — the picture's grating and this screen — so each gets
   * its own recorder rather than one shared: a test that could not tell them apart would read the
   * rows' aim as the screen's placement. The painter asks for the grating first, because a canvas
   * that cannot make one draws no picture and must lay no ink down at all.
   */
  // oxlint-disable-next-line no-inner-declarations, max-lines-per-function
  function paintedOn(
    width: number,
    height: number,
    rows: readonly MoireRow[],
    ink?: ScreenInk,
    wind = 0,
    color = nextColor(),
    yard: Readonly<YardScene> = YARD_SCENE_REST,
    shape: Readonly<MoireShape> = shapeRest(),
  ) {
    const { create, taken, tile } = tileStub();
    const made: { moves: Move[]; pattern: unknown }[] = [];
    const recorder = () => {
      const moves: Move[] = [];
      const pattern = { setTransform: (matrix: Move) => moves.push({ ...matrix }) };
      made.push({ moves, pattern });
      return pattern;
    };
    const inks: unknown[] = [];
    const context = {
      fillStyle: "" as unknown,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      clearRect: () => {},
      setTransform: () => {},
      createPattern: recorder,
      // The product, cut out of the screen in one go: what it holds is the picture and is asserted
      // in `moireCanvas.test.ts`; here it only has to happen.
      drawImage: () => inks.push(PRODUCT),
      fillRect(): void {
        inks.push(this.fillStyle);
      },
    };
    // The painter reaches for a size and a 2d context and nothing else, the way
    // src/ui/DebugConsole.test.tsx stands in for a collection its own caller only iterates.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const canvas = { width, height, getContext: () => context } as unknown as HTMLCanvasElement;
    stubGlobal("document", { createElement: create });
    // The channels arrive the way the browser hands them over — resolved, one per token — so the
    // painter is tested naming tokens and never colours (0130).
    stubGlobal("getComputedStyle", () => ({
      getPropertyValue: (token: string) => `the ${token} the theme resolved`,
    }));
    // Nothing scattering behind it: what a shatter does to the field is cut in `moireCanvas.test.ts`
    // and nothing here is about it (0269).
    paintMoire(
      canvas,
      rows,
      20,
      color,
      0,
      0,
      fractalStopsRest(),
      0,
      ink ?? arrivedInk(rows),
      { blown: 1, lean: wind, veer: 1 },
      0,
      [],
      shape,
      tintRest(),
      // Every case but the scene's own paints the meadow, which is seed heads since 0334: a ramp of
      // the leaf dark, the hot ink, its own tan, the lit leaf and a pale sky, warm for four stops of
      // the five (`YARD_SCENE_REST`, src/lib/yardScene.ts, 0329).
      yard,
      [],
      [],
      "marks",
      null,
      false,
    );
    // Only one pattern is made on *this* context now: the screen. The picture's grating belongs to
    // the surface the rows' product is built on, which is a canvas of its own (P93).
    const [screen] = made;
    return {
      tile: tile(),
      written: taken(),
      // The screen's own placement, which is what every test here is about. The grating's aims
      // belong to the picture and are asserted in `moireCanvas.test.ts`.
      moves: screen?.moves ?? [],
      screen: screen?.pattern,
      inks,
    };
  }
}
