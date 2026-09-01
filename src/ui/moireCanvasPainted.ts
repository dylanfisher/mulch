/**
 * @role The painter's stand-in canvas: `paintMoire` run against a recorder that keeps every fill it
 *   made, every matrix it aimed a grating with and every tile it wrote a pixel field into. Nothing
 *   in production imports this file — it holds the picture's own cases at the 800-line hard cap
 *   without separating them from the canvas they are all made against, the way src/lib/moireRow.ts
 *   holds the rows those same cases are written with.
 * @instead The painter itself → src/ui/moireCanvas.ts. What a row is → src/lib/moire.ts. The rows a
 *   yard actually holds → src/ui/moireRows.ts.
 */
import { fractalStopsRest, type FractalStops } from "@/lib/moireFractal";
import { paintMoire } from "@/ui/moireCanvas";
import { DRIFT_INK_SECS, inkTravelInto, screenInkRest } from "@/ui/moireScreen";
import type { Aim, MoireRow, ScreenInk } from "@/lib/moire";

/**
 * The picture's ink where the travel has already finished — what these rows claim, arrived. A whole
 * `DRIFT_INK_SECS` of elapsed covers a whole reach in one step, so this is the same call the read
 * makes rather than a second way of resolving an ink (`inkTravelInto`, principle 1). Every case
 * about something other than the travel itself paints through it, and the travel's own cases hand
 * the painter an ink partway there instead.
 */
export function arrivedInk(rows: readonly MoireRow[], wash = 0, age = 0): ScreenInk {
  const ink = screenInkRest();
  inkTravelInto(ink, rows, wash, age, DRIFT_INK_SECS, DRIFT_INK_SECS);
  return ink;
}

/**
 * How a case stubs a global for the length of one test — `vi.stubGlobal`, handed in rather than
 * imported, so nothing outside a test file pulls the runner into `src/`. Taken by the factory
 * below and closed over, so this file keeps no state of its own: a module-level slot would be one
 * test file's stub answering another file's painting the day the runner stops isolating them.
 */
export type StubGlobal = (name: string, value: unknown) => void;

/** The window every painting a case here is drawn across, in seconds. */
export const WINDOW = 20;

/** How far a deck reads between two paintings that are two frames, in seconds: one at sixty. */
const FRAME_SECS = 1 / 60;

/** The recorder, bound to one test file's way of stubbing a global. */
// The factory is its one recorder — see the recorder's own note below — so its length is that
// function's plus a return. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function painterOn(stubGlobal: StubGlobal) {
  /**
   * The painter run against a canvas of `width` × `height`, recording every fill it made and where
   * it aimed the grating for each one. `patterns` is how many of the two the engine will hand back:
   * at one the screen goes without and the picture is cut out of flat ink, at none there is no
   * picture to draw and the painter must lay nothing down.
   */
  return paintedOn;

  // Hoisted, so the factory reads as "here is the recorder" rather than as a hundred lines before
  // its one return.
  // And a stand-in canvas with every call it records is one function: the 2D context it fakes is
  // one object literal of methods, and each has to write into the same tally the recorder hands
  // back. See docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line no-inner-declarations, max-lines-per-function
  function paintedOn(
    width: number,
    height: number,
    rows: readonly MoireRow[],
    patterns = 2,
    windowSecs = WINDOW,
    // How many times the same canvas is painted, and how far the deck reads between one painting and
    // the next. One painting for every case but the ones about what a frame carries over from the
    // frame before it; and an `advance` of nothing is the same picture painted again — a commit
    // rather than a frame, which is every repaint a halted yard gets (0040).
    // `between` runs after each painting, so a case can take the rows away and hand them back the
    // way a rack does — the array is the one the painter is handed, so emptying it empties its next
    // painting.
    // And how washed the yard the picture is of sounded, which the painter spends over every row's
    // own depth at once (0213) — and how old the performance behind it is, which is the band its
    // ink is carried across (src/lib/moireAge.ts) — and where the picture's own structure has
    // travelled to, which belongs to the field the same way (0248) — and how long the deck behind
    // it has sounded, which is what the flight through that structure runs on (`fractalFlight`).
    {
      frames = 1,
      advance = FRAME_SECS,
      between,
      wash = 0,
      age = 0,
      seed = fractalStopsRest(),
      sounding = 0,
      // And where the picture's ink has travelled to. Arrived at whatever the rows claim unless a
      // case says otherwise, so every case about something else draws the picture those rows ask
      // for rather than one still on its way there (`inkTravelInto`, src/ui/moireScreen.ts).
      // Resolved once, before the frames below: a case that moves a row's colour inside `between`
      // is painting through the ink the *first* frame's rows claimed, and has to hand its own in.
      tint = arrivedInk(rows, wash, age),
      // And how far the standing rack's own tail has blown the field, in turns of one cell of the
      // screen's grid: nowhere unless a case says otherwise, which is the picture a dry rack draws
      // (`windTravelInto`, src/ui/moireWind.ts, 0267).
      wind = 0,
    }: {
      frames?: number;
      advance?: number;
      between?: (frame: number) => void;
      wash?: number;
      age?: number;
      seed?: FractalStops;
      sounding?: number;
      tint?: ScreenInk;
      wind?: number;
    } = {},
  ) {
    // The rows' gratings are aimed on the surface their product is built on; the screen is made on
    // the canvas itself. `patterns` is how many the engine will hand back across both, the product's
    // first — a surface that cannot make one draws no picture and must lay no ink anywhere.
    const aims: Aim[] = [];
    let handed = 0;
    const allowed = () => (handed += 1) <= patterns;
    // A context of its own per surface, never one shared: the painter creates four canvases in a
    // painting — the product, the grating's tile, the one pixel a colour is read back through, and
    // the screen's tile — and a single stub would file the colour probe's fills under the product's.
    const surfaces: {
      fills: { over: string; alpha: number }[];
      wrote: { width: number; height: number; data: Uint8ClampedArray }[];
      drew: { tile: unknown; over: string; alpha: number; move: Aim }[];
    }[] = [];
    const surface = () => {
      const fills: { over: string; alpha: number }[] = [];
      const wrote: { width: number; height: number; data: Uint8ClampedArray }[] = [];
      const drew: { tile: unknown; over: string; alpha: number; move: Aim }[] = [];
      // What a curved row is drawn with: the tile it was baked into, placed by a matrix rather than
      // rebuilt. One object refilled by the painter, so the recorder keeps a copy of each.
      let move: Aim = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
      surfaces.push({ fills, wrote, drew });
      return {
        fillStyle: "" as unknown,
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
        clearRect: () => {},
        setTransform: (matrix: Aim | number) => {
          move =
            typeof matrix === "number" ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } : { ...matrix };
        },
        // Which tile, and not only where: two rows of one kind hold their own fallbacks, so a case
        // about whose tile a row was handed has to be able to tell one from the other (0144, 0262).
        drawImage(tile: unknown): void {
          drew.push({ tile, over: this.globalCompositeOperation, alpha: this.globalAlpha, move });
        },
        createPattern: () => (allowed() ? { setTransform: (m: Aim) => aims.push({ ...m }) } : null),
        createImageData: (w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData: (field: { width: number; height: number; data: Uint8ClampedArray }) => {
          wrote.push(field);
        },
        // The colour probe reading its own fill back, and the only read-back left in the painter:
        // nothing here measures a picture any more, the fractal being a row whose weight
        // `gratingDepth` already solves rather than a layer whose coverage had to be measured
        // (0246). **A stub that answers 255 to a whole-picture read is a measurement that cannot
        // fail**, and one stood behind 0245's own compensation for its whole life — so if anything
        // ever reads a field back here again, it needs a stub that can say something else.
        getImageData: () => {
          const data = new Uint8ClampedArray(4);
          data.set([200, 120, 40, 255], 0);
          return { data };
        },
        fillRect(): void {
          fills.push({ over: this.globalCompositeOperation, alpha: this.globalAlpha });
        },
      };
    };
    // What went onto the canvas itself: the screen, and then the product taken back out of it —
    // whole, or in the slices a lens bends it through.
    const laid: { ink: unknown; over: string }[] = [];
    const slices: { top: number; deep: number; slid: number }[] = [];
    const context = {
      fillStyle: "" as unknown,
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      clearRect: () => {},
      setTransform: () => {},
      // The screen's, and it is placed after every row has been aimed, so it is the last of `aims`.
      createPattern: () => (allowed() ? { setTransform: () => {} } : null),
      drawImage(
        _field: unknown,
        _left?: number,
        top?: number,
        _wide?: number,
        deep?: number,
        slid?: number,
      ): void {
        laid.push({ ink: "the rows' own product", over: this.globalCompositeOperation });
        if (top !== undefined && deep !== undefined && slid !== undefined) {
          slices.push({ top, deep, slid });
        }
      },
      fillRect(): void {
        laid.push({ ink: this.fillStyle, over: this.globalCompositeOperation });
      },
    };
    // oxlint-disable-next-line no-unsafe-type-assertion
    const canvas = { width, height, getContext: () => context } as unknown as HTMLCanvasElement;
    const elements: { width: number; height: number }[] = [];
    stubGlobal("document", {
      createElement: () => {
        const made = surface();
        const element = { width: 0, height: 0, getContext: () => made };
        elements.push(element);
        return element;
      },
    });
    stubGlobal("getComputedStyle", () => ({
      getPropertyValue: (token: string) => `the ${token} the theme resolved`,
    }));
    for (let frame = 0; frame < frames; frame++) {
      paintMoire(
        canvas,
        rows,
        windowSecs,
        "the token the theme resolved",
        wash,
        age,
        seed,
        sounding,
        tint,
        wind,
      );
      // Between the paintings and never after the last, so a painting of one frame leaves the rows
      // it was handed exactly as it found them.
      between?.(frame);
      if (frame + 1 < frames) for (const each of rows) each.phase += advance;
    }
    // The product's own surface is the first one created.
    const product = surfaces[0]?.fills ?? [];
    return {
      aims,
      laid,
      slices,
      elements,
      surfaces,
      // The cuts alone: the solid ground the product starts from is a `source-over` fill and is not
      // one of them.
      cuts: product.filter((cut) => cut.over === "destination-out"),
      ground: product.filter((cut) => cut.over === "source-over"),
      // How the painter left the canvas, which no fill can show: the last thing it did was cut the
      // product out, so one that did not hand `destination-out` back would erase whatever drew next.
      left: context.globalCompositeOperation,
    };
  }
}

/** What one painting recorded. */
export type Painted = ReturnType<ReturnType<typeof painterOn>>;

/** How many tiles `wide` device pixels across one painting wrote a pixel field into. */
export const baked = (painted: Painted, wide: number): number =>
  painted.surfaces.filter(
    (surface, at) => surface.wrote.length > 0 && painted.elements[at]?.width === wide,
  ).length;
