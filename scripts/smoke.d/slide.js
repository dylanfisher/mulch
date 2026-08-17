/** @role A loop that already exists: slid whole by a drag on its region, then trimmed by a handle. */
import { fail, report } from "./harness.js";
import { surfaceOf } from "./surface.js";

/**
 * P11 rides the same restored page, after the reload for the same reason P8 does (plan §3), and
 * after the archive so the loop those round trips carry is still the snapped one. Two gestures on
 * the handle strip of a loop that already exists: a press on the region between the handles slides
 * the whole segment — one deck.loop on release, its in edge snapped onto an onset and its length
 * exactly the one it started with — and a drag of the OUT handle to a point no onset is near
 * trims that edge alone. The clamped translate itself is pure maths with its own tests
 * (src/lib/timeline.ts); this is the gesture reaching it.
 */
export const slide = async ({ page, state }) => {
  const surface = await surfaceOf(page, "b");
  const before = await surface.loop();
  const inside = (loop) => (loop.in + loop.out) / 2;
  const gap = state.beats.onsets[2] - state.beats.onsets[1];
  await surface.dragRegion(inside(before), inside(before) + gap);
  const slid = await surface.loop();
  // The OUT handle of what the slide left, dragged in to the midpoint between two onsets: one
  // edge to raw seconds, with no candidate within tolerance of it, and the IN edge exactly
  // where the slide put it.
  const trimTo = slid.out - gap / 2;
  await surface.dragHandle("out", trimTo);
  const shaped = await surface.loop();

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
  if (shaped.in !== slid.in || Math.abs(shaped.out - trimTo) > surface.pixelSecs * 2) {
    fail(
      `a drag of the OUT handle did not trim that edge alone to ${trimTo} — ` +
        JSON.stringify({ shaped, slid }),
    );
  }
  if (state.beats.onsets.includes(shaped.out)) {
    fail(`a handle drag to a point no onset is near still snapped its edge — ${shaped.out}`);
  }
  report(
    `a drag on that loop's region slid it whole to ${slid.in.toFixed(3)}–` +
      `${slid.out.toFixed(3)}s at its own length, and a drag of its OUT handle ` +
      `trimmed that edge alone to ${shaped.out.toFixed(3)}s`,
  );
  // The loop the seek below clicks in, and has to leave exactly where this left it.
  state.shaped = shaped;
  state.gap = gap;
};
