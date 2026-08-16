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
    expect(markup).toContain("yard a waveform");
    expect(markup).toContain("touch-none border border-border select-none");
    // No loop and nothing playing: the overlay is hidden and no playhead is mounted.
    expect(markup).toContain("display:none");
    // The surface is a drop target, and nothing is over it yet (P19).
    expect(markup).toContain('data-dropping="false"');
  });

  // P25: snapping is a state the strip is left in, so its control is a Toggle and reports that
  // state itself. It starts on, and an unanalysed deck cannot be asked to snap to anything.
  it("reports snapping as a pressed state on a toggle, disabled until there is analysis", () => {
    const instrument = createInstrument(manualClock());
    const state = instrument.state.getState().decks.a!;
    const markup = renderToStaticMarkup(
      <Waveform instrument={instrument} deck="a" state={state} onFile={noFile} />,
    );
    expect(markup).toMatch(/data-slot="toggle"[^>]*aria-label="Snap yard a loops to beats"/u);
    expect(markup).toMatch(/aria-pressed="true"[^>]*aria-label="Snap yard a loops to beats"/u);
    expect(markup).toMatch(/disabled=""[^>]*aria-label="Snap yard a loops to beats"/u);
  });
});
