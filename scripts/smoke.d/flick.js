/** @role A handle let go where no move reported it: the release is the only word on where it landed. */
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
  report(
    `a drag of the OUT handle the page saw only as a press and a release committed ` +
      `${after.out.toFixed(3)}s, where the pointer was let go, rather than ` +
      `${before.out.toFixed(3)}s, where it went down`,
  );
};
