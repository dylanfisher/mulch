/**
 * @role A gesture let go where no move reported it, on all three surfaces a loop is shaped on:
 * the release is the only word on where it landed, and every one of them lands on it.
 */
import { fail, report } from "./harness.js";
import { surfaceOf } from "./surface.js";

/**
 * P86, on the same page and after the sweep that shaped the loop it moves: a drag of the OUT
 * handle whose moves the browser coalesced away entirely, so the page hears a press on the
 * handle and a release a good distance away with nothing in between. The bound that gets
 * committed is the pointer's last position — where the hand let go — and not its first, which is
 * where the handle already was and where a gesture read from its moves alone leaves it.
 *
 * The target is the midpoint between two onsets, for the reason `slide` picks one: the claim is
 * about the seconds the release carried and never about a candidate's, and this deck's snap is
 * off — which `sweep` above asserts on the same mount (0147).
 */
export const flick = async ({ page, state }) => {
  const surface = await surfaceOf(page, "b");
  const before = await surface.loop();
  const target = before.out - state.gap / 2;

  await surface.dragHandle("out", target, true);
  const after = await surface.loop();

  if (Math.abs(after.out - target) > surface.pixelSecs * 2) {
    fail(`a handle let go at ${target.toFixed(3)}s committed ${after.out.toFixed(3)}s`, {
      before,
      after,
      target,
    });
  }
  if (after.in !== before.in) {
    fail(`a flick of the OUT handle moved the IN edge — ${JSON.stringify({ before, after })}`);
  }
  // P125, on the same mount: the other two surfaces a loop is shaped on, each given the gesture
  // the page sees only as a press and a release. The peaks already read their release into the
  // record their moves write to (0123) and this is the assertion of it; the strip's own
  // background is where a press used to begin no gesture at all, so most of a short loop's strip
  // answered a drag with silence (0147).
  const peaks = { in: 0.8, out: 1.2 };
  await surface.flickPeaks(peaks.in, peaks.out);
  const swept = await surface.loop();
  // Well left of the IN handle, which brackets its edge and is 32px wide: this press lands on
  // the strip itself and on none of its three grips.
  const strip = { in: 0.15, out: 0.6 };
  await surface.flickStrip(strip.in, strip.out);
  const drawn = await surface.loop();

  for (const [what, wanted, got] of [
    ["a sweep of the peaks", peaks, swept],
    ["a sweep of the strip above them", strip, drawn],
  ]) {
    for (const edge of ["in", "out"]) {
      if (Math.abs(got[edge] - wanted[edge]) > surface.pixelSecs * 2) {
        fail(
          `${what}, inside one frame, asked for ${wanted[edge].toFixed(3)}s and committed ` +
            `${got[edge].toFixed(3)}s on its ${edge} edge`,
          { wanted, got },
        );
      }
    }
  }

  report(
    `a drag of the OUT handle the page saw only as a press and a release committed ` +
      `${after.out.toFixed(3)}s, where the pointer was let go, rather than ` +
      `${before.out.toFixed(3)}s, where it went down; the same one-frame gesture on the peaks ` +
      `swept ${swept.in.toFixed(3)}–${swept.out.toFixed(3)}s and on the strip's own background ` +
      `${drawn.in.toFixed(3)}–${drawn.out.toFixed(3)}s`,
  );
};
