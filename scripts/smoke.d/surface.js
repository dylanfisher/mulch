/**
 * @role A deck's waveform as the gesture surface three scenarios drive it as: its seconds axis,
 * and the drags, clicks and loop reads they make on it.
 */
import { fail } from "./harness.js";

/**
 * How long the source under every gesture surface is. The canvas fills the drag surface's padding
 * box, so its own box is the seconds axis — and one number turns a position on it into seconds.
 */
export const SURFACE_SECS = 2;

/**
 * The surface as it is on screen right now: scrolled to, measured, and answered in seconds. A
 * scenario that scrolled something else since opens its own rather than reusing an older box.
 */
export const surfaceOf = async (page, deck) => {
  const canvas = page.locator(`canvas[aria-label="Deck ${deck} waveform"]`);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (box === null) fail(`deck ${deck} waveform has no browser bounds`);
  const midY = box.y + box.height / 2;
  const atSecs = (secs) => box.x + (box.width * secs) / SURFACE_SECS;
  const loop = () => page.evaluate((id) => window.mulch.probe().decks[id].loop, deck);
  return {
    atSecs,
    loop,
    /** A pixel of the surface, in seconds — the resolution an edge can be asserted at. */
    pixelSecs: SURFACE_SECS / box.width,
    moveTo: (secs) => page.mouse.move(atSecs(secs), midY),
    /**
     * One move per drag: the surface reads the pointer's position, not its path. A drag that
     * follows another starts where that one left the pointer — exactly on the marker it moved —
     * so it needs no move of its own. A drag that follows a click on a toggle does.
     */
    dragTo: async (secs, modifier) => {
      if (modifier !== undefined) await page.keyboard.down(modifier);
      await page.mouse.down();
      await page.mouse.move(atSecs(secs), midY);
      await page.mouse.up();
      if (modifier !== undefined) await page.keyboard.up(modifier);
    },
    /** A press and release that travels nowhere, and the playhead it left behind. */
    clickAt: async (secs) => {
      await page.mouse.move(atSecs(secs), midY);
      await page.mouse.down();
      await page.mouse.up();
      return page.evaluate((id) => window.mulch.probe().decks[id].paused, deck);
    },
    // A gesture commits synchronously on release, so the loop is readable straight after it.
    loopIs: (wanted) =>
      page.waitForFunction(
        ({ id, wanted }) => {
          const current = window.mulch.probe().decks[id].loop;
          return current !== null && current.in === wanted.in && current.out === wanted.out;
        },
        { id: deck, wanted },
      ),
  };
};
