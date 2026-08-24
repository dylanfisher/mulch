/**
 * @role The worker's analysis reaching the loop's handles: the button that makes the loop, then
 * drags covering snapping off and snapping on.
 */
import { SNAP_TOLERANCE_PX } from "../../src/lib/analysis.ts";
import { fail } from "./harness.js";
import { surfaceOf, SURFACE_SECS } from "./surface.js";

/**
 * P7: analysis of a loaded source arrives from the worker as data, and a drag of the loop's IN
 * and OUT handles lands it on those onsets through the ordinary deck.loop command. The loop
 * itself is the loop button's, because the peaks are where a loop is swept and this is about the
 * strip (0053, 0147). The handle drags cover the toggle's two positions — its default, which is
 * off, so that an edge lands where the hand let go and nothing corrects it onto a candidate
 * nothing draws, and then on — and what they leave on deck b is the loop the save, the reload and
 * the archive round trip after this have to bring back exactly (0025). The worker has had the whole keyboard, automation and rack sequence
 * to answer for the click train `keyboard` loaded; this is where the answer is read, not where it
 * is waited for.
 */
export const snap = async ({ page, state }) => {
  const beats = await page
    .waitForFunction(
      () => {
        const analysis = window.mulch.probe().decks.b.analysis;
        return analysis?.onsets.length === 8 ? analysis : null;
      },
      undefined,
      { timeout: 5_000 },
    )
    .then((handle) => handle.jsonValue());
  if (beats.bpm !== 120) fail(`worker analysis found ${beats.bpm}bpm in a 4Hz click train`);
  const surface = await surfaceOf(page, "b");
  const snapButton = page.getByRole("button", { name: "Snap Yard B Loops to Beats" });
  const near = (SNAP_TOLERANCE_PX / 2) * surface.pixelSecs;
  const beat = { in: beats.onsets[1], out: beats.onsets[5] };
  const onOnset = (secs) => beats.onsets.includes(secs);

  // The loop the handles then shape: deck b has none, and the button is what makes one (0053).
  await page
    .locator('section[aria-label^="Yard B"]')
    .getByRole("button", { name: "Loop", exact: true })
    .click();
  const made = await surface.loop();
  if (made === null) fail("the loop button left deck b without a loop to shape");
  // Off is where the toggle starts: nothing corrects an edge that was not asked to be corrected,
  // so the two drags below need no click first (0147).
  const resting = await snapButton.getAttribute("aria-pressed");
  if (resting !== "false") fail(`the snap toggle does not start off — aria-pressed ${resting}`);
  // Each handle dragged to half a tolerance short of an onset lands on the second it was let go
  // at, not on the candidate the analysis would have preferred — which is the whole complaint.
  const aimed = { in: beat.in + near, out: beat.out - near };
  await surface.dragHandle("in", aimed.in);
  await surface.dragHandle("out", aimed.out);
  const unsnapped = await surface.loop();
  for (const edge of ["in", "out"]) {
    if (Math.abs(unsnapped[edge] - aimed[edge]) > surface.pixelSecs * 2) {
      fail(
        `a handle let go at ${aimed[edge].toFixed(3)}s committed ${unsnapped[edge].toFixed(3)}s`,
        { aimed, unsnapped },
      );
    }
  }
  if (onOnset(unsnapped.in) || onOnset(unsnapped.out)) {
    fail(`a handle drag with snapping off still snapped — ${JSON.stringify(unsnapped)}`);
  }
  // Still off: the same OUT handle dragged to the midpoint between two onsets commits raw
  // seconds. The toggle is the whole of that choice — no modifier reaches it (0147).
  await surface.dragHandle("out", beat.out - SURFACE_SECS / 16);
  const offBeat = await surface.loop();
  if (onOnset(offBeat.out) || offBeat.in !== unsnapped.in) {
    fail(`a drag with snapping off still snapped — ${JSON.stringify(offBeat)}`);
  }
  // On: the same nudge moves both edges onto onsets exactly — the IN handle is half a
  // tolerance from its own onset, so the gesture that snaps one edge snaps the pair.
  await snapButton.click();
  await surface.dragHandle("out", beat.out + near);
  await surface.loopIs(beat);
  // Every drag is one durable loop edit: undo returns the off-beat loop and redo the snapped
  // one, which is what the reload and the archive below then carry (0025).
  await page.getByRole("button", { name: "undo" }).click();
  await surface.loopIs(offBeat);
  await page.getByRole("button", { name: "redo" }).click();
  await surface.loopIs(beat);

  const pressed = await snapButton.getAttribute("aria-pressed");
  if (pressed !== "true") fail(`the snap toggle did not come back on — aria-pressed ${pressed}`);
  // What every recall path below is measured against, and the claim they all end in.
  state.beats = beats;
  state.beat = beat;
};
