/**
 * @role A deck's waveform as the gesture surface three scenarios drive it as: its seconds axis,
 * the clicks they make on the peaks, and the drags they make on the loop's handle strip above
 * them — the only place a loop is shaped from (0053).
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
  const canvas = page.locator(`canvas[aria-label="yard ${deck} waveform"]`);
  const strip = page.locator(`[aria-label="yard ${deck} loop handles"]`);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (box === null) fail(`deck ${deck} waveform has no browser bounds`);
  // The strip shares the peaks' axis by construction — the same inner width, one row above — so
  // one seconds-to-x holds for both, and only the y a gesture lands at tells them apart.
  const stripBox = await strip.boundingBox();
  if (stripBox === null) fail(`deck ${deck} loop strip has no browser bounds`);
  const midY = box.y + box.height / 2;
  const handleY = stripBox.y + stripBox.height / 2;
  const atSecs = (secs) => box.x + (box.width * secs) / SURFACE_SECS;
  const loop = () => page.evaluate((id) => window.mulch.probe().decks[id].loop, deck);
  return {
    atSecs,
    loop,
    /** A pixel of the surface, in seconds — the resolution an edge can be asserted at. */
    pixelSecs: SURFACE_SECS / box.width,
    /**
     * A drag of one loop handle, pressed where it actually is: the handle brackets its edge
     * rather than straddling it, so the press is found through the element's own box and never
     * through the seconds the edge sits at. The edge follows the travel since that press, so
     * the pointer is moved by exactly the distance the edge has to cover.
     */
    dragHandle: async (kind, secs, modifier) => {
      const handle = page.locator(`[aria-label="yard ${deck} loop ${kind}"]`);
      const grip = await handle.boundingBox();
      if (grip === null) fail(`deck ${deck} shows no ${kind} handle to drag`);
      const loop = await page.evaluate((id) => window.mulch.probe().decks[id].loop, deck);
      if (loop === null) fail(`deck ${deck} has no loop for its ${kind} handle to shape`);
      const from = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
      const travel = (secs - loop[kind]) / SURFACE_SECS;
      await page.mouse.move(from.x, from.y);
      if (modifier !== undefined) await page.keyboard.down(modifier);
      await page.mouse.down();
      await page.mouse.move(from.x + travel * box.width, from.y);
      await page.mouse.up();
      if (modifier !== undefined) await page.keyboard.up(modifier);
    },
    /** A drag of the region between the handles, which slides the whole loop at its length. */
    dragRegion: async (fromSecs, toSecs) => {
      await page.mouse.move(atSecs(fromSecs), handleY);
      await page.mouse.down();
      await page.mouse.move(atSecs(toSecs), handleY);
      await page.mouse.up();
    },
    /** A press and release on the peaks themselves, and the playhead it left behind. */
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
