/** @role A press that travels nowhere: a seek inside the loop, and a refusal outside it. */
import { yardLabel } from "../../src/lib/copy.ts";
import { fail, report } from "./harness.js";
import { surfaceOf, SURFACE_SECS } from "./surface.js";

/**
 * P17, on the same surface and the same page: a press and release that travels nowhere is a seek,
 * not a drag. Inside the loop it moves the stopped deck's playhead — which is where its next play
 * begins — and outside it asks for nothing, because the loop is what is being performed (0041).
 * The loop the handle drags left is untouched by either click.
 */
export const seek = async ({ page, state }) => {
  const surface = await surfaceOf(page, "b");
  const shaped = state.shaped;
  const gap = state.gap;
  const seekTo = (shaped.in + shaped.out) / 2;
  // The refusal only means anything if the click lands on this surface at all: past the buffer
  // it would land on whatever sits beside the canvas and pass for the wrong reason.
  if (shaped.out + gap > SURFACE_SECS) {
    fail(`the outside-click target ${shaped.out + gap}s is off the waveform`);
  }
  const inside = { asked: seekTo, held: await surface.clickAt(seekTo) };
  // Past the OUT handle, and on the peaks rather than the strip: a refusal, and never a drag.
  const outside = { asked: shaped.out + gap, held: await surface.clickAt(shaped.out + gap) };
  const loop = await surface.loop();

  if (inside.held === null || Math.abs(inside.held - inside.asked) > surface.pixelSecs * 2) {
    fail(`a click in the loop did not seek there — ${JSON.stringify(inside)}`);
  }
  if (outside.held !== inside.held) {
    fail(`a click outside the loop moved the playhead — ${JSON.stringify({ inside, outside })}`);
  }
  if (loop.in !== shaped.in || loop.out !== shaped.out) {
    fail(`a click changed the loop it landed in — ${JSON.stringify({ loop, shaped })}`);
  }
  // P32: folding a yard shut and open again remounts its waveform, and a held playhead is what
  // the frame loop is not moving — so the remount's own paint is the only thing that can put it
  // back where it was. Driven here rather than in a scenario of its own because this deck is
  // already held at a known second, and here is after the reload (plan §3).
  const fold = page.getByRole("button", { name: `Collapse ${yardLabel("b")}` });
  await fold.click();
  await page
    .locator(`canvas[aria-label="${yardLabel("b")} Waveform"]`)
    .waitFor({ state: "detached" });
  await fold.click();
  const refolded = await surfaceOf(page, "b");
  const painted = await page.evaluate((id) => {
    const surface = document.querySelector(`canvas[aria-label="${id} Waveform"]`)?.parentElement;
    const head = surface?.querySelector('[data-slot="playhead"]');
    if (head === null || head === undefined) return null;
    return head.getBoundingClientRect().left - surface.getBoundingClientRect().left;
  }, yardLabel("b"));

  if (painted === null) fail("the reopened yard drew no playhead");
  const paintedSecs = painted * refolded.pixelSecs;
  if (Math.abs(paintedSecs - inside.held) > refolded.pixelSecs * 2) {
    fail(`a folded and reopened yard put its held playhead at ${paintedSecs.toFixed(3)}s`, {
      painted,
      paintedSecs,
      held: inside.held,
    });
  }

  report(
    `a click inside that loop moved the playhead to ${inside.held.toFixed(3)}s, ` +
      `one outside it moved nothing, and folding the yard shut and open left it at ` +
      `${paintedSecs.toFixed(3)}s`,
  );
};
