/** @role A loop that already exists: slid whole by a drag inside it, then swept across by another. */
import { fail, report } from "./harness.js";
import { surfaceOf, SURFACE_SECS } from "./surface.js";

/**
 * P11 rides the same restored page, after the reload for the same reason P8 does (plan §3), and
 * after the archive so the loop those round trips carry is still the swept one. Two gestures on a
 * loop that already exists: a press inside it, away from both markers, slides the whole segment —
 * one deck.loop on release, its in edge snapped onto an onset and its length exactly the one it
 * started with — and Shift sweeps a new one straight across it. The clamped translate itself is
 * pure maths with its own tests (src/lib/timeline.ts); this is the gesture reaching it.
 */
export const slide = async ({ page, state }) => {
  const surface = await surfaceOf(page, "b");
  const before = await surface.loop();
  const inside = (loop) => (loop.in + loop.out) / 2;
  const gap = state.beats.onsets[2] - state.beats.onsets[1];
  await surface.moveTo(inside(before));
  await surface.dragTo(inside(before) + gap);
  const slid = await surface.loop();
  // Shift, from inside what the slide left: a sweep across an existing loop, in raw seconds
  // because Shift is still the snap bypass it was on an edge drag.
  const sweptFrom = inside(slid);
  const sweptTo = Math.min(sweptFrom + gap * 1.5, SURFACE_SECS);
  await surface.moveTo(sweptFrom);
  await surface.dragTo(sweptTo, "Shift");
  const swept = await surface.loop();

  const loopLength = (loop) => loop.out - loop.in;
  if (Math.abs(loopLength(slid) - loopLength(before)) > 1e-9) {
    fail(
      `sliding a loop changed its length — ${JSON.stringify(before)} became ` +
        JSON.stringify(slid),
    );
  }
  if (slid.in <= before.in) {
    fail(`a drag inside a loop did not slide it — ${JSON.stringify(slid)}`);
  }
  if (!state.beats.onsets.includes(slid.in)) {
    fail(`a slid loop did not snap its in edge onto an onset — ${slid.in}`);
  }
  if (
    Math.abs(swept.in - sweptFrom) > surface.pixelSecs * 2 ||
    Math.abs(swept.out - sweptTo) > surface.pixelSecs * 2
  ) {
    fail(
      `a Shift drag across an existing loop did not sweep a new one from ${sweptFrom} ` +
        `to ${sweptTo} — ${JSON.stringify(swept)}`,
    );
  }
  report(
    `a drag inside that loop slid it whole to ${slid.in.toFixed(3)}–` +
      `${slid.out.toFixed(3)}s at its own length, and a shift drag swept a new ` +
      "one straight across it",
  );
  // The loop the seek below clicks in, and has to leave exactly where this left it.
  state.swept = swept;
  state.gap = gap;
};
