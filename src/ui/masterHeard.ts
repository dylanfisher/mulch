/**
 * @role The session's once-a-frame read of what the master bus is putting out: the one call the
 *   meter and every yard's drift share, and the per-frame memo behind it (0218).
 * @instead The read itself, and the object it refills → `masterPeek` in src/app/facade.ts. One
 *   yard's own meter → `peek()` on the same facade. The frame stamp itself → src/ui/frame.ts.
 */
import type { Instrument, MasterPeek } from "@/app/facade";
import { frameStamp } from "@/ui/frame";

/** Which frame the facade's scratch was last filled on, and whose scratch it was. */
let readAt = -1;
let heardOf: Instrument | null = null;
let heard: Readonly<MasterPeek> | null = null;

/**
 * What the whole output is doing this frame, asked once however many surfaces want it. The meter
 * has always read it; since P167 so does every open drift, and two yards side by side are two more
 * askers — each one a pair of analyser fetches and three scans of each window, to answer a question
 * that cannot move inside one frame (0218). Every caller comes through here, the meter included:
 * one that went to the facade direct would refill the object the others are holding.
 *
 * The memo lives here rather than behind the facade because the loop's stamp does: `src/app` may
 * not import `src/ui` (docs/map.md), and a wall clock would be a second cadence beside the one
 * loop. The facade's own object is handed straight back, so this adds no allocation and no copy —
 * what it saves is the refill.
 *
 * Read from inside the loop, exactly as `standingVoice` is: the stamp moves only inside the tick.
 * A drift painted between two frames — a commit, a resize, a theme change (src/ui/canvasSurface.ts)
 * — is the one caller that is not on it, and it draws the session's layer from the last frame's
 * reading rather than taking a fresh one. That is a frame old on a picture whose other rows are
 * current, and it is the whole of the error: with nothing sounding the loop is not running and the
 * reading it holds is silence, which is the answer either way
 * (src/ui/playerStandingRead.ts, src/ui/frame.ts).
 */
export function masterHeard(instrument: Instrument): Readonly<MasterPeek> {
  const frame = frameStamp();
  // The facade keeps the object; all this decides is whether it is refilled. Whose it is, as well
  // as when: a second instrument in one page is a second output, and handing one of them the
  // other's window would be a picture of a session nobody is listening to (principle 5).
  // Three module numbers and no object, because a memo that allocated once a frame would be the
  // cost it exists to save (0070).
  if (heard === null || heardOf !== instrument || readAt !== frame) {
    readAt = frame;
    heardOf = instrument;
    heard = instrument.masterPeek();
  }
  return heard;
}
