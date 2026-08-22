/**
 * @role What `renderOffline` refuses before it builds a context — the whole of the offline host
 *   that is reachable without a browser, and the guard a hand-written spec off ./scripts/drive
 *   meets first.
 * @instead What a render actually sounds like → scripts/smoke.d, which drives the real context.
 */
import { describe, expect, it } from "vitest";

import { RENDER_SAMPLE_RATE, renderOffline } from "./render";

describe("what a render refuses before it builds a context", () => {
  it("refuses a length that is not a positive number of seconds", async () => {
    await expect(renderOffline({ secs: 0, envelopes: [] })).rejects.toThrow(/positive length/u);
    await expect(renderOffline({ secs: Number.NaN, envelopes: [] })).rejects.toThrow(
      /positive length/u,
    );
  });

  it("refuses a positive length that rounds to no samples at all", async () => {
    // Above zero and below half a frame: OfflineAudioContext answers this with a DOMException,
    // which is not this file's own loud no.
    await expect(
      renderOffline({ secs: 1 / (RENDER_SAMPLE_RATE * 4), envelopes: [] }),
    ).rejects.toThrow(/shorter than one sample/u);
  });

  it("refuses a head that would drop the whole render", async () => {
    // Discovered here rather than ten minutes of rendering later, which is the reason it is a
    // preflight at all.
    await expect(renderOffline({ secs: 1, fromSecs: 1, envelopes: [] })).rejects.toThrow(
      /drops the whole/u,
    );
  });
});
