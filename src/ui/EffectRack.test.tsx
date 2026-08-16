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
    expect(markup).toMatch(/data-slot="toggle"[^>]*aria-label="Bypass Filter 1 on Yard A"/u);
    expect(markup).toMatch(/aria-pressed="false"[^>]*aria-label="Bypass Filter 1 on Yard A"/u);
    expect(markup).toMatch(/aria-pressed="true"[^>]*aria-label="Bypass Filter 2 on Yard A"/u);
  });

  // The reorder and remove controls happen once per press, so they stay buttons — and being
  // icon-only, each keeps the label that names which instance it acts on.
  it("keeps the once-per-press controls as labelled buttons", () => {
    const markup = rackMarkup();
    for (const label of [
      "Move Filter 1 Later on Yard A",
      "Move Filter 2 Earlier on Yard A",
      "Remove Filter 1 from Yard A",
    ]) {
      expect(markup).toMatch(new RegExp(`data-slot="button"[^>]*aria-label="${label}"`, "u"));
    }
    expect(markup).not.toMatch(/aria-pressed[^>]*aria-label="Remove Filter 1 from Yard A"/u);
  });
});

describe("the effect rack's layout", () => {
  // P26: each instance occupies its own row, so two filters are two labelled, separately
  // controllable rows rather than one wrapping line in which they run together (0030).
  it("gives each instance its own row, distinguishable by label", () => {
    const markup = rackMarkup();

    // The rack stacks its children; without this the rows wrap into one line together.
    expect(markup).toMatch(
      /<section[^>]*class="[^"]*flex-col[^"]*"[^>]*aria-label="Yard A Effects"/u,
    );
    const first = markup.indexOf('aria-label="Filter 1"');
    const second = markup.indexOf('aria-label="Filter 2"');
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    // Each row carries its own controls, named by instance rather than by effect.
    expect(markup).toContain('aria-label="Remove Filter 1 from Yard A"');
    expect(markup).toContain('aria-label="Remove Filter 2 from Yard A"');
  });

  // The add affordance is one picker outside the instance rows, not a button per registry entry.
  it("offers one add control rather than a button per effect", () => {
    const markup = rackMarkup();

    expect(markup).toContain('aria-label="Add an Effect to Yard A"');
    expect(markup).not.toContain("add Filter");
    expect(markup).not.toContain("add Delay");
  });
});
