/**
 * @role The worker's analysis reaching the waveform: three drags covering snapping off, a
 * Shift-held override, and snapping on.
 */
import { SNAP_TOLERANCE_PX } from "../../src/lib/analysis.ts";
import { fail } from "./harness.js";
import { surfaceOf, SURFACE_SECS } from "./surface.js";

/**
 * P7: analysis of a loaded source arrives from the worker as data, and the waveform's existing
 * drag lands its loop on those onsets through the ordinary deck.loop command. Three gestures cover
 * the three affordances — snapping off, a Shift-held override, and snapping on — and what they
 * leave on deck b is the loop the save, the reload and the archive round trip after this have to
 * bring back exactly (0025). The worker has had the whole keyboard, automation and rack sequence
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
  const snapButton = page.getByRole("button", { name: "Snap deck b loops to beats" });
  const near = (SNAP_TOLERANCE_PX / 2) * surface.pixelSecs;
  const beat = { in: beats.onsets[1], out: beats.onsets[4] };
  const onOnset = (secs) => beats.onsets.includes(secs);

  // Off: a sweep aimed half a tolerance short of two onsets stays exactly where it landed.
  await snapButton.click();
  await surface.moveTo(beat.in + near);
  await surface.dragTo(beat.out - near);
  const unsnapped = await surface.loop();
  if (onOnset(unsnapped.in) || onOnset(unsnapped.out)) {
    fail(`a drag with snapping off still snapped — ${JSON.stringify(unsnapped)}`);
  }
  // On, but temporarily bypassed: the same out marker dragged with Shift held to the midpoint
  // between two onsets commits raw seconds, which is what overriding a snap is.
  await snapButton.click();
  await surface.moveTo(unsnapped.out);
  await surface.dragTo(beat.out - SURFACE_SECS / 16, "Shift");
  const overridden = await surface.loop();
  if (onOnset(overridden.out) || overridden.in !== unsnapped.in) {
    fail(`a Shift-held drag still snapped — ${JSON.stringify(overridden)}`);
  }
  // On: the same nudge, without Shift, moves both edges onto onsets exactly.
  await surface.dragTo(beat.out + near);
  await surface.loopIs(beat);
  // Three drags, three durable loop edits: undo returns the overridden one and redo the
  // snapped one, which is what the reload and the archive below then carry (0025).
  await page.getByRole("button", { name: "undo" }).click();
  await surface.loopIs(overridden);
  await page.getByRole("button", { name: "redo" }).click();
  await surface.loopIs(beat);

  const pressed = await snapButton.getAttribute("aria-pressed");
  if (pressed !== "true") fail(`the snap toggle did not come back on — aria-pressed ${pressed}`);
  // What every recall path below is measured against, and the claim they all end in.
  state.beats = beats;
  state.beat = beat;
};
