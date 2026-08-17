/**
 * @role A deck's waveform as the gesture surface four scenarios drive it as: its seconds axis,
 * the clicks and Shift-held sweeps they make on the peaks, the drags they make on the loop's
 * handle strip above them, and where the strip's boundary lines land on the peaks (0053, 0066).
 */
import { yardLabel } from "../../src/lib/copy.ts";
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
  // The noun and its case come from src/lib/copy.ts, the way archive.js takes the archive's own
  // file facts from src/lib: a helper that rebuilt the label would keep the old word the day
  // copy.ts changes, and every gesture scenario would fail at a locator timeout instead (0057).
  const canvas = page.locator(`canvas[aria-label="${yardLabel(deck)} Waveform"]`);
  const strip = page.locator(`[aria-label="${yardLabel(deck)} Loop Handles"]`);
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
    dragHandle: async (kind, secs) => {
      // `kind` is the loop's own field name; the label says the same word in the case every
      // label in the instrument is written in (P29).
      const edge = `${kind[0].toUpperCase()}${kind.slice(1)}`;
      const handle = page.locator(`[aria-label="${yardLabel(deck)} Loop ${edge}"]`);
      const grip = await handle.boundingBox();
      if (grip === null) fail(`deck ${deck} shows no ${kind} handle to drag`);
      const loop = await page.evaluate((id) => window.mulch.probe().decks[id].loop, deck);
      if (loop === null) fail(`deck ${deck} has no loop for its ${kind} handle to shape`);
      const from = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
      const travel = (secs - loop[kind]) / SURFACE_SECS;
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x + travel * box.width, from.y);
      await page.mouse.up();
    },
    /**
     * A drag across the peaks themselves, Shift held or not: held, it sweeps both loop
     * boundaries from the press to the release (0066); plain, it is the press's seek and the
     * travel means nothing.
     */
    dragPeaks: async (fromSecs, toSecs, shift, whileDown) => {
      await page.mouse.move(atSecs(fromSecs), midY);
      if (shift) await page.keyboard.down("Shift");
      await page.mouse.down();
      await page.mouse.move(atSecs(toSecs), midY);
      // The draft is only on screen between the move and the release: a caller that wants to
      // see it has to read it here, with the button still down.
      const held = whileDown === undefined ? undefined : await whileDown();
      await page.mouse.up();
      if (shift) await page.keyboard.up("Shift");
      return held;
    },
    /**
     * The draft a live sweep paints over the peaks: where it starts and how long it is, on the
     * same seconds axis, or null while nothing is being swept.
     */
    draft: async () => {
      const painted = await page
        .locator(`canvas[aria-label="${yardLabel(deck)} Waveform"] ~ [data-slot="loop-sweep"]`)
        .boundingBox();
      if (painted === null) return null;
      return {
        in: ((painted.x - box.x) / box.width) * SURFACE_SECS,
        length: (painted.width / box.width) * SURFACE_SECS,
      };
    },
    /**
     * A boundary line the handles draw down through the peaks: the second it sits at on the
     * peaks' own axis, and how much of their height it actually covers.
     */
    lineAt: async (kind) => {
      const line = page.locator(
        `[aria-label="${yardLabel(deck)} Loop Handles"] [data-slot="loop-line-${kind}"]`,
      );
      const drawn = await line.boundingBox();
      if (drawn === null) fail(`deck ${deck} draws no ${kind} boundary line through its peaks`);
      return {
        secs: ((drawn.x - box.x) / box.width) * SURFACE_SECS,
        covers: (drawn.y + drawn.height - box.y) / box.height,
      };
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
