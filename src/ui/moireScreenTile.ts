/**
 * @role The theme side of one screen tile: the scene's five stops resolved off the canvas's own
 *   computed style, put into the one plain order a bake reads, and
 *   handed to the shop. **Nothing here loops over a pixel** — since 0354 that loop runs in a worker
 *   where the browser has one and in bands under a per-frame budget where it does not, so what is
 *   left on this side is the half that needs a document: a `getComputedStyle`, and the count of how
 *   many times a hand has moved a tunable, which is part of every tile's key.
 * @instead The loop itself, and everything one tile is made of → src/lib/moireScreenField.ts. The
 *   terms it spends — the gratings, the blobs, the channels, the band and the pitches →
 *   src/lib/moireScreenFilm.ts. Which tile is wanted, which one is drawn meanwhile and where the
 *   bake runs → src/ui/moireScreenShop.ts. Where a tile is put and what moves it →
 *   src/ui/moireScreen.ts, this file's only caller in the painter. The stops' own resolution →
 *   src/ui/moireScreenStops.ts. The grounds the scenes lay down → src/lib/scene/.
 */
import type { ScreenInk } from "@/lib/moire";
import type { AlphabetName } from "@/lib/moireAlphabets";
import type { MoireCells } from "@/lib/moireCells";
import type { Ink } from "@/lib/moireColour";
import type { ScreenBake } from "@/lib/moireScreenField";
import { subscribeTuning } from "@/lib/moireTuning";
import { sceneOf } from "@/lib/scene/scenes";
import type { YardScene } from "@/lib/yardScene";
import {
  screenBaking,
  screenStanding,
  screenStood,
  screenTileFor,
  type ScreenStanding,
} from "@/ui/moireScreenShop";
import { inkOf, sceneStops } from "@/ui/moireScreenStops";

/**
 * How many times a tunable has moved since the page loaded. **Part of every tile's key**, because a
 * scene's numbers are read inside the bake and nothing else in that key names them: without this, a
 * slider the bench argues a ground on would be inert — the shop would answer for a ground that is no
 * longer what the scene draws, out of a tile baked under the number before the move
 * (`moireTuning.ts` @instead: a number a tile is baked under). One counter and not the values
 * themselves, because the key is written on the frame path and reading a dozen handles there would
 * allocate (0070).
 */
let tuned = 0;
subscribeTuning(() => {
  tuned += 1;
});

/** How many times a tunable has moved, for the key its caller writes (`screenOf`). */
export const tuneStamp = (): number => tuned;

/**
 * Which canvas is asking, so a canvas that has been drawn before has something to draw meanwhile.
 * A name minted once per element and held weakly: the shop's fallback is keyed by a string, and a
 * canvas that has gone leaves a slot its own cap drops by age.
 */
const slots = new WeakMap<HTMLCanvasElement, string>();
let slotted = 0;
function canvasSlot(canvas: HTMLCanvasElement): string {
  const already = slots.get(canvas);
  if (already !== undefined) return already;
  slotted += 1;
  const made = `screen-${slotted}`;
  slots.set(canvas, made);
  return made;
}

/** One resolved colour, copied: the order outlives the list `sceneStops` refills in place. */
const inkCopy = (stop: Ink): Ink => [stop[0], stop[1], stop[2], stop[3]];

/**
 * The tile `key` names, as the shop answers for it: the one already built, or the one this canvas
 * was last drawn with while the one asked for is baked. Everything the theme says is resolved here
 * and crosses as numbers — the caller's own ink and the scene's five stops under the yard's air —
 * because the loop that spends them runs where there is no document to ask (0354).
 *
 * **The order is built fresh on a miss and never refilled in place.** Every other object on this
 * path is one refilled object for 0070's sake, and this one may not be: a bake outlives the
 * painting that asked for it — by a `postMessage` at least and by a slice a frame at worst — so an
 * order refilled by the next painting would be the next painting's tile baked under this one's key.
 * A miss is the only time it is built, and a miss is the only time anything is baked at all.
 */
export function screenTile(
  key: string,
  width: number,
  height: number,
  canvas: HTMLCanvasElement,
  color: string,
  pitch: number,
  rowPitch: number,
  tint: Readonly<ScreenInk>,
  yard: Readonly<YardScene>,
  cell: number,
  cells: readonly MoireCells[],
  beat: number,
  alphabet: AlphabetName,
  armed: AlphabetName | null,
): ScreenStanding | null {
  const slot = canvasSlot(canvas);
  const held = screenStanding(key, slot);
  if (held !== null) return held;
  // A bake already out wants nothing built: below is a `getComputedStyle` and the scene's own five
  // stops off a painted pixel, and a bake outlasts a hundred paintings at a window's size
  // (0070, 0354).
  if (screenBaking(key)) return screenStood(slot);
  const style = getComputedStyle(canvas);
  const scene = sceneOf(yard.scene);
  // Resolved once a tile, as they were before the read moved into the loop: what costs per pixel is
  // the mix between two of them and never a `getComputedStyle`. Copied out of the one list
  // `sceneStops` refills, because this order outlives the painting that filled it.
  const order: ScreenBake = {
    key,
    width,
    height,
    // The canvas's own height stands beside the tile's: what a stand's shade is placed against is
    // what is shown of the tile and not the whole of it (`seen`, src/lib/moireScene.ts, 0335).
    seen: Math.min(height, canvas.height),
    pitch,
    rowPitch,
    cell,
    beat,
    own: inkOf(color),
    lift: sceneStops(scene, yard, style).map((stop) => inkCopy(stop)),
    tint: { ...tint },
    yard: { ...yard },
    // Deep to the terms: `rackCells` hands back slots it refills every painting (0349, 0070).
    cells: cells.map((pass) => ({ ...pass, terms: { ...pass.terms } })),
    // One name, which is what crosses a `postMessage`: the table it stands for is the worker's own
    // constant (`ALPHABETS`, src/lib/moireAlphabets.ts). And the queued part's name beside it, or
    // null where none is queued — the last cell column's own hand.
    alphabet,
    armed,
  };
  return screenTileFor(order, slot);
}
