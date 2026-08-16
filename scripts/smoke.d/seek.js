/** @role A press that travels nowhere: a seek inside the loop, and a refusal outside it. */
import { fail, report } from "./harness.js";
import { surfaceOf, SURFACE_SECS } from "./surface.js";

/**
 * P17, on the same surface and the same page: a press and release that travels nowhere is a seek,
 * not a drag. Inside the loop it moves the stopped deck's playhead — which is where its next play
 * begins — and outside it asks for nothing, because the loop is what is being performed (0041).
 * The loop the sweep left is untouched by either click.
 */
export const seek = async ({ page, state }) => {
  const surface = await surfaceOf(page, "b");
  const swept = state.swept;
  const gap = state.gap;
  const seekTo = (swept.in + swept.out) / 2;
  // The refusal only means anything if the click lands on this surface at all: past the buffer
  // it would land on whatever sits beside the canvas and pass for the wrong reason.
  if (swept.out + gap > SURFACE_SECS) {
    fail(`the outside-click target ${swept.out + gap}s is off the waveform`);
  }
  const inside = { asked: seekTo, held: await surface.clickAt(seekTo) };
  // Past the out marker by more than the grab tolerance, so this is a refusal and not a drag.
  const outside = { asked: swept.out + gap, held: await surface.clickAt(swept.out + gap) };
  const loop = await surface.loop();

  if (inside.held === null || Math.abs(inside.held - inside.asked) > surface.pixelSecs * 2) {
    fail(`a click in the loop did not seek there — ${JSON.stringify(inside)}`);
  }
  if (outside.held !== inside.held) {
    fail(`a click outside the loop moved the playhead — ${JSON.stringify({ inside, outside })}`);
  }
  if (loop.in !== swept.in || loop.out !== swept.out) {
    fail(`a click changed the loop it landed in — ${JSON.stringify({ loop, swept })}`);
  }
  report(
    `a click inside that loop moved the playhead to ${inside.held.toFixed(3)}s, ` +
      "and one outside it moved nothing",
  );
};
