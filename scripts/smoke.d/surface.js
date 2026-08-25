/**
 * @role A deck's waveform as the gesture surface five scenarios drive it as: its seconds axis,
 * the clicks and sweeps they make on the peaks, the drags they make on the loop's handle strip
 * above them, and where the strip's boundary lines land on the peaks (0053, 0147).
 */
import { yardLabel } from "../../src/lib/copy.ts";
import { GEN_SECS } from "../../src/lib/waveform.ts";
import { fail, settledBox } from "./harness.js";

/**
 * How long the source under every gesture surface is. Every one of them is a drawn source, and a
 * drawn source is one length (P127) — read off the app rather than restated here. The canvas
 * fills the drag surface's padding box, so its own box is the seconds axis, and this one number
 * turns a position on it into seconds.
 */
export const SURFACE_SECS = GEN_SECS;

/**
 * The click rate of the source under those surfaces, and how many onsets the worker therefore
 * finds in it — one fact, because three scenarios wait on that count and the yard is loaded by a
 * fourth (./keyboard.js).
 */
export const SURFACE_CLICK_HZ = 4;
export const SURFACE_ONSETS = SURFACE_CLICK_HZ * SURFACE_SECS;

/**
 * The surface as it is on screen right now: settled, measured, and answered in seconds. A
 * scenario that scrolled something else since opens its own rather than reusing an older box.
 */
export const surfaceOf = async (page, deck) => {
  // The noun and its case come from src/lib/copy.ts, the way archive.js takes the archive's own
  // file facts from src/lib: a helper that rebuilt the label would keep the old word the day
  // copy.ts changes, and every gesture scenario would fail at a locator timeout instead (0057).
  const canvas = page.locator(`canvas[aria-label="${yardLabel(deck)} Waveform"]`);
  const strip = page.locator(`[aria-label="${yardLabel(deck)} Loop Handles"]`);
  // The settle for every gesture this surface hands out: each one is raw `page.mouse` at a
  // coordinate derived from this box, so it is taken once, here, and the strip and handles below
  // are measured against the viewport it leaves at rest (0084).
  const box = await settledBox(canvas, `deck ${deck}'s waveform`);
  // The strip shares the peaks' axis by construction — the same inner width, one row above — so
  // one seconds-to-x holds for both, and only the y a gesture lands at tells them apart.
  const stripBox = await strip.boundingBox();
  if (stripBox === null) fail(`deck ${deck} loop strip has no browser bounds`);
  const midY = box.y + box.height / 2;
  const handleY = stripBox.y + stripBox.height / 2;
  const atSecs = (secs) => box.x + (box.width * secs) / SURFACE_SECS;
  const loop = () => page.evaluate((id) => window.mulch.probe().decks[id].loop, deck);
  /**
   * A gesture the page sees only as a press and a release: a drag with every move of it
   * coalesced away, which is what Chromium reports when the whole of it happened inside one
   * frame. Raw CDP because `page.mouse.up()` releases wherever `page.mouse.move()` last went,
   * which is the move a flick does not have. Every one-frame gesture this surface hands out is
   * this function; only the row and the two x's tell them apart.
   */
  const flickPx = async (fromX, toX, y) => {
    const cdp = await page.context().newCDPSession(page);
    const press = { button: "left", clickCount: 1, y };
    await cdp.send("Input.dispatchMouseEvent", {
      ...press,
      type: "mousePressed",
      buttons: 1,
      x: fromX,
    });
    await cdp.send("Input.dispatchMouseEvent", {
      ...press,
      type: "mouseReleased",
      buttons: 0,
      x: toX,
    });
    await cdp.detach();
  };
  /** The same gesture aimed in seconds rather than at a grip's own box. */
  const flickAcross = (fromSecs, toSecs, y) => flickPx(atSecs(fromSecs), atSecs(toSecs), y);
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
     *
     * `flick` is the same gesture with every move of it coalesced away — Chromium reports the
     * moves of a frame at most once, so a drag inside one frame reaches the page as a press and
     * a release and nothing between, which is `flickPx` above.
     */
    dragHandle: async (kind, secs, flick = false) => {
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
      const to = from.x + travel * box.width;
      if (flick) return flickPx(from.x, to, from.y);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to, from.y);
      await page.mouse.up();
    },
    /**
     * A drag across the peaks themselves, holding nothing: it sweeps both loop boundaries from
     * the press to the release. No modifier is offered because none exists — a gesture that
     * travelled is a loop and one that did not is a seek, and the release decides (0147).
     */
    dragPeaks: async (fromSecs, toSecs, whileDown) => {
      await page.mouse.move(atSecs(fromSecs), midY);
      await page.mouse.down();
      await page.mouse.move(atSecs(toSecs), midY);
      // The draft is only on screen between the move and the release: a caller that wants to
      // see it has to read it here, with the button still down.
      const held = whileDown === undefined ? undefined : await whileDown();
      await page.mouse.up();
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
    /** The same coalesced-away drag across the peaks themselves, which sweeps a loop. */
    flickPeaks: (fromSecs, toSecs) => flickAcross(fromSecs, toSecs, midY),
    /**
     * And across the strip above them, which sweeps the same loop from the same two seconds —
     * aimed where neither handle nor the region is, so it lands on the strip's own background.
     */
    flickStrip: (fromSecs, toSecs) => flickAcross(fromSecs, toSecs, handleY),
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
