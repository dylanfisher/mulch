import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { Waveform } from "@/ui/Waveform";

/** Nothing is dropped in a server render; the gesture itself is proved in fileDrop.test.ts. */
const noFile = () => {};

/**
 * The engine-less instrument is the pure host: peaks() is null, peek() reads zeros, and the
 * server render proves nothing on the way in touches `window` — drawing and gestures are all
 * effects, which never run here.
 */
describe("Waveform", () => {
  it("renders without a DOM, empty, from a silent instrument", () => {
    const instrument = createInstrument(manualClock());
    const state = instrument.state.getState().decks.a!;
    const markup = renderToStaticMarkup(
      <Waveform instrument={instrument} deck="a" state={state} onFile={noFile} />,
    );
    expect(markup).toContain("Deck a waveform");
    expect(markup).toContain("touch-none border border-border select-none");
    // No loop and nothing playing: the overlay is hidden and no playhead is mounted.
    expect(markup).toContain("display:none");
    // The surface is a drop target, and nothing is over it yet (P19).
    expect(markup).toContain('data-dropping="false"');
  });
});
