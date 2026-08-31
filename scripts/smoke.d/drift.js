/**
 * @role The drift opens where it is looked at: the strip's click zooms the picture over this page,
 * only the zoomed header's own button pays for a browser window (0139), and Option on the strip
 * skips straight to that window (0138).
 */
import { fail, report } from "./harness.js";

/** The copy the gestures are found by, imported rather than restated (principle 1). */
import { driftTitle, MOIRE_POP_OUT, MOIRE_STRIP, yardLabel } from "../../src/lib/copy.ts";
import { DRIFT_PAINT_MS } from "../../src/lib/moire.ts";
import { WASH_CREST_STRUCK } from "../../src/lib/moireSound.ts";

/** The automator this scenario adds and takes away again, so it leaves the page as it found it. */
const GROWN_ID = "drift-auto";

/** And the reverb it smears the yard with, for the same length of time (P146). */
const WASH_ID = "drift-wash";

/**
 * What the picture asks of the reading once the yard is soaked: a crest of at least one, which is
 * the arithmetic floor of a window with any sound in it at all and so is what says the number came
 * off a live analyser rather than off zeros; and under the crest a struck dry window reads, which
 * is what says a full-wet tail is heard as a wash rather than as transients. A tail with no dry
 * signal beside it is at that end whatever file is under it — where exactly the two ends of the
 * scale sit is measured where the maths is (src/ui/moireRowsField.test.ts).
 */
const LIVE_CREST = 1;
const washedRead = (wash) => wash >= LIVE_CREST && wash <= WASH_CREST_STRUCK;

/** Two of the drift's own paintings, so the picture has certainly drawn since the run filled. */
const DRIFT_PAINTS_MS = Math.ceil(DRIFT_PAINT_MS * 2);

/** How many shades a picture of crossing gratings carries before it counts as drawn at all. */
const INK_SHADES = 8;

/**
 * After the rack scenarios, because a yard with nothing running has no strip to click
 * (src/ui/MoireStrip.tsx) — what ./picker.js and ./rackRow.js left in yard A is what this reads.
 * It leaves the page as it found it: the picture closes and the window it opened is closed.
 */
export const driftOpens = async ({ page }) => {
  const strip = page.getByLabel(`${yardLabel("a")} ${MOIRE_STRIP}`);
  await strip.scrollIntoViewIfNeeded();
  const picture = page.getByLabel(driftTitle("a"));
  const before = page.context().pages().length;

  // The cheap gesture: it zooms in place, and it does not pay for a window.
  await strip.click();
  await picture.waitFor();
  if (page.context().pages().length !== before) {
    fail("drift smoke: the strip's own click opened a browser window", {
      before,
      after: page.context().pages().length,
    });
  }

  // And the window is asked for from the header of the picture already open.
  const popped = page.context().waitForEvent("page");
  await picture.getByRole("button", { name: MOIRE_POP_OUT }).click();
  const second = await popped;
  await second.waitForLoadState("domcontentloaded");
  const title = await second.title();
  if (title !== driftTitle("a")) {
    fail("drift smoke: the popped-out window is not the yard's own picture", { title });
  }
  // The picture is handed over rather than drawn twice: this page stops covering itself.
  await picture.waitFor({ state: "detached" });
  // Waited for and then counted, not counted off `domcontentloaded`: the window's own React has
  // to mount before there is a canvas in it to count, and a bare `count()` reads whatever is
  // there at that instant. Read too early it says 0, which is indistinguishable from a window
  // that never drew — the failure looks like the claim rather than like the race it is.
  const canvas = second.locator("canvas");
  await canvas.first().waitFor();
  const canvases = await canvas.count();
  if (canvases !== 1) fail("drift smoke: the window holds no one picture", { canvases });

  // And the strip behind it is not a second way in: clicking it again while the window holds the
  // picture would draw the same yard twice, on two frame loops, for one of it (0070, 0139).
  await strip.click();
  await page.waitForTimeout(50);
  if (await picture.isVisible()) {
    fail("drift smoke: the strip drew a second picture behind the window already holding one");
  }

  await second.close();
  // The window is gone from the browser, not merely from this page's view of it.
  if (page.context().pages().length !== before) {
    fail("drift smoke: closing the popped-out picture left a window behind", {
      before,
      after: page.context().pages().length,
    });
  }
  // The hidden gesture, which is the whole of the shortcut's claim: Option on the strip skips the
  // zoom and opens the window itself, so the picture never covers the instrument on the way (0138).
  const straight = page.context().waitForEvent("page");
  await strip.click({ modifiers: ["Alt"] });
  const skipped = await straight;
  await skipped.waitForLoadState("domcontentloaded");
  if (await picture.isVisible()) {
    fail("drift smoke: the Option press covered this page on its way to a window");
  }
  const straightTitle = await skipped.title();
  if (straightTitle !== driftTitle("a")) {
    fail("drift smoke: Option opened something other than the yard's own picture", {
      straightTitle,
    });
  }
  await skipped.close();

  // P145: what a run is holding is drawn. An automator's six grown effects arrived as no rows at
  // all, because a run is drawn from a seed and lives in no session (0204) — so what the picture
  // shows had nothing to do with what the yard was actually running. The rows themselves are
  // counted where rows are measurable (src/ui/moireRows.test.ts); what only a browser can say is
  // that the strip goes on painting a picture the run has grown rows onto, through the one frame
  // loop and off the one per-frame read.
  await page.evaluate((id) => {
    window.mulch.send({ t: "effect.add", deck: "a", id, effect: "automator" });
    // Short enough that the run has filled by the time the picture is looked at, rather than the
    // scenario waiting out a default life.
    window.mulch.send({
      t: "param.set",
      deck: "a",
      instance: id,
      param: "auto.stays",
      value: 5,
    });
    window.mulch.send({ t: "deck.play", deck: "a" });
  }, GROWN_ID);
  await page.waitForFunction(
    (id) => (window.mulch.peek("a").grown.get(id)?.length ?? 0) > 0,
    GROWN_ID,
  );
  // Long enough for the drift's own cadence to paint, which is slower than a frame on purpose
  // (0144) — a picture read before it has drawn once says nothing about what it draws.
  await page.waitForTimeout(DRIFT_PAINTS_MS);
  const drawn = await strip.locator("canvas").evaluate((canvas) => {
    const surface = canvas.getContext("2d");
    if (surface === null) return null;
    const { data } = surface.getImageData(0, 0, canvas.width, canvas.height);
    const seen = new Set();
    for (let at = 0; at < data.length; at += 4) seen.add(data[at]);
    return seen.size;
  });
  const holding = await page.evaluate(
    (id) => window.mulch.peek("a").grown.get(id)?.length ?? 0,
    GROWN_ID,
  );
  // The picture is a product of gratings, so a live one is many shades: one shade is a blank
  // canvas, which is what a picture that threw on a row it could not cut would leave behind.
  if (drawn === null || drawn < INK_SHADES) {
    fail("drift smoke: the strip drew no picture while the run was holding", { drawn, holding });
  }
  // P146: and the yard soaked. The reading is the crest of the deck's own output window, which
  // falls as a reverb fills the gaps between the transients — so a full-wet tail is a washed field,
  // and the picture goes on drawing with every row's depth and the screen's own lattices carried up
  // together (0213). The maths is measured where the cuts and the pulses are
  // (src/ui/moireRowsField.test.ts); what only a browser can say is that the number comes off a
  // real graph, through a real reverb, and reaches the one per-frame read the picture paints from.
  const dry = await page.evaluate((id) => {
    const before = window.mulch.peek("a").crest;
    window.mulch.send({ t: "effect.add", deck: "a", id, effect: "reverb" });
    window.mulch.send({ t: "param.set", deck: "a", instance: id, param: "reverb.wet", value: 1 });
    return before;
  }, WASH_ID);
  await page.waitForFunction(
    ([live, struck]) => {
      const { crest } = window.mulch.peek("a");
      return crest >= live && crest <= struck;
    },
    [LIVE_CREST, WASH_CREST_STRUCK],
  );
  const wash = await page.evaluate(() => window.mulch.peek("a").crest);
  if (!washedRead(wash)) {
    fail("drift smoke: a full-wet yard did not read as a live washed crest", { wash, dry });
  }
  await page.waitForTimeout(DRIFT_PAINTS_MS);
  const washed = await strip.locator("canvas").evaluate((canvas) => {
    const surface = canvas.getContext("2d");
    if (surface === null) return null;
    const { data } = surface.getImageData(0, 0, canvas.width, canvas.height);
    const seen = new Set();
    for (let at = 0; at < data.length; at += 4) seen.add(data[at]);
    return seen.size;
  });
  if (washed === null || washed < INK_SHADES) {
    fail("drift smoke: the strip drew no picture while the yard was washed", { washed, dry });
  }

  await page.evaluate(
    ([grown, wash]) => {
      window.mulch.send({ t: "deck.stop", deck: "a" });
      window.mulch.send({ t: "effect.remove", deck: "a", instance: grown });
      window.mulch.send({ t: "effect.remove", deck: "a", instance: wash });
    },
    [GROWN_ID, WASH_ID],
  );

  report(
    `the strip's click zoomed the drift over the page without a window, "${MOIRE_POP_OUT}" handed it to one titled ${title}, an Option press opened that window on its own, and the strip behind it opened nothing more; and the strip went on drawing a picture of ${drawn} shades while the yard's automator held a run of ${holding}; and it drew ${washed} shades of a yard a full-wet reverb had smeared to a crest of ${wash.toFixed(3)}, from ${dry.toFixed(3)} dry`,
  );
};
