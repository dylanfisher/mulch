import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { silentEngine } from "@/app/engineDouble";
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
    expect(markup).toContain("Yard A Waveform");
    expect(markup).toContain("touch-none border border-border select-none");
    // No loop and nothing playing: the overlay is hidden and no playhead is mounted.
    expect(markup).toContain("display:none");
    // The surface is a drop target, and nothing is over it yet (P19).
    expect(markup).toContain('data-dropping="false"');
  });

  // P25: snapping is a state the strip is left in, so its control is a Toggle and reports that
  // state itself. It starts OFF (0147) — a silent correction of an edge onto a candidate nothing
  // draws is the loop not landing where the hand let go — and an unanalysed deck cannot be asked
  // to snap to anything either way.
  it("reports snapping as an unpressed state on a toggle, disabled until there is analysis", () => {
    const instrument = createInstrument(manualClock());
    const state = instrument.state.getState().decks.a!;
    const markup = renderToStaticMarkup(
      <Waveform instrument={instrument} deck="a" state={state} onFile={noFile} />,
    );
    expect(markup).toMatch(/data-slot="toggle"[^>]*aria-label="Snap Yard A Loops to Beats"/u);
    expect(markup).toMatch(/aria-pressed="false"[^>]*aria-label="Snap Yard A Loops to Beats"/u);
    expect(markup).toMatch(/disabled=""[^>]*aria-label="Snap Yard A Loops to Beats"/u);
  });
});

/**
 * The one source that draws itself: everything about the surface is the same, and the ink in it
 * is not (P70).
 */
describe("Waveform holding a tone", () => {
  /**
   * P70: a tone draws the wave itself, live, where an imported file draws the peak reduction of
   * what was decoded. It is the same box, the same gestures and the same playhead — only the ink
   * inside it differs, which is why the peaks path is untouched by it.
   */
  it("draws a tone's own wave inside the same box, and nothing else's", () => {
    const instrument = createInstrument(manualClock(), () => silentEngine());
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "tone", secs: 1 } });
    const withTone = instrument.state.getState().decks.a!;
    const markup = renderToStaticMarkup(
      <Waveform instrument={instrument} deck="a" state={withTone} onFile={noFile} />,
    );
    expect(markup).toContain("Yard A Waveform");
    expect(markup).toContain("pointer-events-none absolute inset-0 text-primary");
    // A wave with no beginning has no boundary to place, so the strip that places one is not
    // drawn on it (0110) — the box, the playhead and the meter around it are unchanged.
    expect(markup).not.toContain("Yard A Loop Handles");

    instrument.send({ t: "deck.load", deck: "a", source: { gen: "click-train", secs: 2, hz: 4 } });
    const withClicks = instrument.state.getState().decks.a!;
    const peaks = renderToStaticMarkup(
      <Waveform instrument={instrument} deck="a" state={withClicks} onFile={noFile} />,
    );
    expect(peaks).toContain("Yard A Waveform");
    expect(peaks).not.toContain("pointer-events-none absolute inset-0 text-primary");
    expect(peaks).toContain("Yard A Loop Handles");
  });
});
