/** @role A loop taken from the peaks themselves: a Shift-held sweep, and the lines it leaves. */
import { SNAP_TOLERANCE_PX } from "../../src/lib/analysis.ts";
import { fail, report } from "./harness.js";
import { surfaceOf } from "./surface.js";

/**
 * P38, on the same restored page and after the reload (plan §3): Shift is the loop. A Shift-held
 * drag across the peaks sends one `deck.loop` on release with both boundaries where the gesture
 * put them, snapped by the deck's own toggle and not by a modifier (0066), and the handles then
 * draw those boundaries down through the peaks at exactly the seconds the loop holds — which is
 * the whole claim that the strip and the waveform agree. The same drag without Shift is the
 * press's seek and changes no loop at all, which is what one meaning for Shift means.
 */
export const sweepLoop = async ({ page, state }) => {
  const surface = await surfaceOf(page, "b");
  const onsets = state.beats.onsets;
  const near = (SNAP_TOLERANCE_PX / 2) * surface.pixelSecs;
  const wanted = { in: onsets[2], out: onsets[6] };

  // Read with the button still down: the draft is the only thing on screen that says what a
  // release would commit, and it is gone the instant the gesture ends.
  const draft = await surface.dragPeaks(wanted.in + near, wanted.out - near, true, surface.draft);
  await surface.loopIs(wanted);
  const swept = await surface.loop();
  // The lines the strip draws for that loop, measured on the peaks' own axis.
  const drawn = { in: await surface.lineAt("in"), out: await surface.lineAt("out") };
  // Plain, the same travel is the press's seek: Shift is the only thing that shapes a loop here.
  await surface.dragPeaks(swept.in + near, swept.out - near, false);
  const after = await surface.loop();

  for (const edge of ["in", "out"]) {
    if (Math.abs(drawn[edge].secs - swept[edge]) > surface.pixelSecs * 2) {
      fail(
        `the ${edge} boundary line is drawn at ${drawn[edge].secs.toFixed(3)}s for a loop whose ` +
          `${edge} is ${swept[edge].toFixed(3)}s`,
      );
    }
    // A line that stops short of the peaks does not show the boundary through them: it has to
    // reach the bottom of the canvas from the strip above it.
    if (drawn[edge].covers < 1) {
      fail(
        `the ${edge} boundary line covers only ${(drawn[edge].covers * 100).toFixed(0)}% of the ` +
          "peaks it is drawn down through",
      );
    }
  }
  if (
    draft === null ||
    Math.abs(draft.in - swept.in) > surface.pixelSecs * 2 ||
    Math.abs(draft.length - (swept.out - swept.in)) > surface.pixelSecs * 2
  ) {
    fail(
      `the sweep painted no draft of the loop it was about to commit — ` +
        JSON.stringify({ draft, swept }),
    );
  }
  if (after.in !== swept.in || after.out !== swept.out) {
    fail(`a drag on the peaks with no Shift moved the loop — ${JSON.stringify({ swept, after })}`);
  }
  report(
    `a shift drag on the peaks took the loop to ${swept.in.toFixed(3)}–${swept.out.toFixed(3)}s ` +
      `on the beat, the handles drew it at ${drawn.in.secs.toFixed(3)}–` +
      `${drawn.out.secs.toFixed(3)}s down the whole height of the peaks, and the same drag ` +
      `without shift moved nothing; the live draft read ${draft.length.toFixed(3)}s from ` +
      `${draft.in.toFixed(3)}s`,
  );
};
