/**
 * @role The colours a tile of the drift is read in, resolved: what a CSS colour is as the four
 *   channels a pixel is written in, read back out of a pixel the engine painted rather than parsed
 *   (`inkOf`), and a scene's five stops resolved off the theme and mixed toward the light the
 *   yard's air puts them under (`sceneStops`). Split out of the tile at the 800-line cap (0345) —
 *   these are what a build resolves once before its loop, and nothing here runs in it.
 * @instead The tile those stops are read along, a mark at a time → src/ui/moireScreenTile.ts. The
 *   ramp a value is read through → src/lib/moireColour.ts. Which stops a scene names →
 *   src/ui/scene/, under src/lib/moireScene.ts.
 */
import type { Ink } from "@/lib/moireColour";
import { type Scene, SCENE_LIGHT_TERMS, SCENE_RAMP_STOPS } from "@/lib/moireScene";
import type { YardScene } from "@/lib/yardScene";

/**
 * The one pixel every colour is read through. Its own rather than a corner of the tile: the tile is
 * a hundred pixels by a thousand and lives on the GPU, and reading a pixel back off it brings the
 * whole of it down.
 */
let swatch: CanvasRenderingContext2D | null = null;

/**
 * What `css` actually is, as the four channels a pixel is written in — read back out of a pixel the
 * engine painted it into rather than parsed here. Any colour a token can hold is a colour the
 * canvas already knows how to lay down, and a painter with its own colour parser would be a second
 * reading of the theme (principle 1). A canvas that will not give a context back leaves the colour
 * black and transparent, which draws nothing rather than drawing a guess.
 */
export function inkOf(css: string): Ink {
  if (swatch === null) {
    const pixel = document.createElement("canvas");
    pixel.width = 1;
    pixel.height = 1;
    swatch = pixel.getContext("2d", { willReadFrequently: true });
  }
  if (swatch === null) return [0, 0, 0, 0];
  swatch.clearRect(0, 0, 1, 1);
  swatch.fillStyle = css;
  swatch.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 0] = swatch.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a];
}

/** The five stops, resolved: one list refilled on a build, so a build allocates a ramp and no more. */
const stops: Ink[] = Array.from({ length: SCENE_RAMP_STOPS }, (): Ink => [0, 0, 0, 0]);

/**
 * The scene's own five stops, resolved and mixed toward the light the yard's air puts it under —
 * **when the air is one the field is stood in**. A light that falls *through* the field mixes no
 * stop at all: it is spent on where the read stands rather than on what colour is there, down the
 * tile from its top edge, and a stop mixed here as well would be that light paid for twice
 * (`build` below, 0324's two air words).
 * Refilled in place and handed back, for the reason every other matrix in this file is: this runs
 * on a build, and a build allocates a ramp and no more.
 *
 * Every one of the five is a token the scene names and none of them is the caller's own ink (0332):
 * a scene that wants the yard's own ink names the token the surface resolves it from, and the light
 * reaches that stop like any other, because an air is what the whole field is seen through and a
 * light that spared one stop would leave part of every yard the same colour under every sky.
 */
export function sceneStops(
  scene: Scene,
  yard: Readonly<YardScene>,
  style: CSSStyleDeclaration,
): readonly Ink[] {
  const light = SCENE_LIGHT_TERMS[yard.light];
  const wash = yard.spread === "wash" ? light.token : null;
  const lit = wash === null ? null : inkOf(style.getPropertyValue(wash).trim());
  scene.ramp.forEach((token, at) => {
    const stop = inkOf(style.getPropertyValue(token).trim());
    const own = stops[at] ?? [0, 0, 0, 0];
    for (const channel of [0, 1, 2, 3]) {
      const from = stop[channel] ?? 0;
      own[channel] = lit === null ? from : from + ((lit[channel] ?? 0) - from) * light.amount;
    }
    stops[at] = own;
  });
  return stops;
}
