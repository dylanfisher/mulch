/** @role Which primitive each rack control is, and what state it reports (P25). */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { EffectRack } from "@/ui/EffectRack";

/** A deck holding two filters, the second of them bypassed — the rack's two pressed states. */
const rackMarkup = (): string => {
  const instrument = createInstrument(manualClock());
  instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
  instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "filter" });
  instrument.send({ t: "effect.bypass", deck: "a", instance: "two", bypassed: true });
  const state = instrument.state.getState().decks.a!;
  return renderToStaticMarkup(<EffectRack instrument={instrument} deck="a" state={state} />);
};

describe("the effect rack's controls", () => {
  // Bypass is a state an instance is left in, so it is a Toggle and reports it itself — not a
  // button wearing a different variant. Two instances of one entry report independently (0030).
  it("reports bypass as a pressed state per instance", () => {
    const markup = rackMarkup();
    expect(markup).toMatch(/data-slot="toggle"[^>]*aria-label="Bypass Filter 1 on deck a"/u);
    expect(markup).toMatch(/aria-pressed="false"[^>]*aria-label="Bypass Filter 1 on deck a"/u);
    expect(markup).toMatch(/aria-pressed="true"[^>]*aria-label="Bypass Filter 2 on deck a"/u);
  });

  // The reorder and remove controls happen once per press, so they stay buttons — and being
  // icon-only, each keeps the label that names which instance it acts on.
  it("keeps the once-per-press controls as labelled buttons", () => {
    const markup = rackMarkup();
    for (const label of [
      "Move Filter 1 later on deck a",
      "Move Filter 2 earlier on deck a",
      "Remove Filter 1 from deck a",
    ]) {
      expect(markup).toMatch(new RegExp(`data-slot="button"[^>]*aria-label="${label}"`, "u"));
    }
    expect(markup).not.toMatch(/aria-pressed[^>]*aria-label="Remove Filter 1 from deck a"/u);
  });
});
