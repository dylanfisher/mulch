/** @role A loop taken from the peaks themselves: a plain sweep, and the lines it leaves. */
import { fail, report } from "./harness.js";
import { surfaceOf } from "./surface.js";

/**
 * P38, rewritten by P109, on the same restored page and after the reload (plan §3): a drag on the
 * peaks sweeps a loop, with no modifier held at all, and it lands where the pointer was let go.
 *
 * It aims where a person aims — two fifths of the way between one onset and the next, which is
 * nowhere near a candidate and nowhere near the middle either — and asserts those seconds. The
 * scenario this replaces aimed at `onset ± SNAP_TOLERANCE_PX / 2` and asserted the onset, which
 * is a test agreeing with the implementation rather than with the gesture, and is why this kept
 * passing while the instrument felt broken (0147). The handles then draw those boundaries down
 * through the peaks at exactly the seconds the loop holds — the whole claim that the strip and
 * the waveform agree — and a press that does not travel is still the seek it always was.
 */
export const sweepLoop = async ({ page, state }) => {
  const surface = await surfaceOf(page, "b");
  const onsets = state.beats.onsets;
  const gap = onsets[2] - onsets[1];
  // Snapping is off, and this asserts it rather than assuming it: `slide` turned it on for its
  // own claim, and the fold `seek` shut and opened above remounted this waveform, which is the
  // whole life of a view preference (0147). The sweep is about where the hand went, so the
  // scenario states the state it is measuring in instead of leaving it to the order.
  const snapButton = page.getByRole("button", { name: "Snap Yard B Loops to Beats" });
  const resting = await snapButton.getAttribute("aria-pressed");
  if (resting !== "false") fail(`the sweep is measured with snapping on — aria-pressed ${resting}`);
  const wanted = { in: onsets[2] + gap * 0.4, out: onsets[6] - gap * 0.4 };

  // Read with the button still down: the draft is the only thing on screen that says what a
  // release would commit, and it is gone the instant the gesture ends.
  const draft = await surface.dragPeaks(wanted.in, wanted.out, surface.draft);
  const swept = await surface.loop();
  // The lines the strip draws for that loop, measured on the peaks' own axis.
  const drawn = { in: await surface.lineAt("in"), out: await surface.lineAt("out") };
  // A press that does not travel is the seek it always was — the surface answers every gesture.
  const seeked = await surface.clickAt(wanted.in + gap * 0.2);
  const after = await surface.loop();

  for (const edge of ["in", "out"]) {
    // The whole of the step: the boundary is the second the pointer was let go at, not the
    // second the analysis would have preferred.
    if (Math.abs(swept[edge] - wanted[edge]) > surface.pixelSecs * 2) {
      fail(
        `a sweep let go at ${wanted[edge].toFixed(3)}s committed its ${edge} edge at ` +
          `${swept[edge].toFixed(3)}s`,
        { wanted, swept },
      );
    }
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
    fail(`a press that never travelled moved the loop — ${JSON.stringify({ swept, after })}`);
  }
  if (seeked === null || Math.abs(seeked - (wanted.in + gap * 0.2)) > surface.pixelSecs * 2) {
    fail(`a press inside the loop seeked to ${String(seeked)} rather than into it`);
  }
  report(
    `a plain drag on the peaks took the loop to ${swept.in.toFixed(3)}–${swept.out.toFixed(3)}s, ` +
      `off the beat and exactly where the pointer was let go; the handles drew it at ` +
      `${drawn.in.secs.toFixed(3)}–${drawn.out.secs.toFixed(3)}s down the whole height of the ` +
      `peaks, the live draft read ${draft.length.toFixed(3)}s from ${draft.in.toFixed(3)}s, and ` +
      `a press that never travelled seeked to ${seeked.toFixed(3)}s and moved no boundary`,
  );
};
