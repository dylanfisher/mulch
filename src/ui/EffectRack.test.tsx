/** @role Which primitive each rack control is, and what state it reports (P25). */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { EFFECT_NAMES, effectName } from "@/lib/copy";
import { addEffectCommand } from "@/ui/actions";
import { EffectRack } from "@/ui/EffectRack";

/** The rack as it renders right now, for whatever the instrument currently holds on deck a. */
const markupOf = (instrument: ReturnType<typeof createInstrument>): string => {
  const state = instrument.state.getState().decks.a!;
  return renderToStaticMarkup(<EffectRack instrument={instrument} deck="a" state={state} />);
};

/** A deck holding two filters, the second of them bypassed — the rack's two switch states. */
const rackMarkup = (): string => {
  const instrument = createInstrument(manualClock());
  instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
  instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "filter" });
  instrument.send({ t: "effect.bypass", deck: "a", instance: "two", bypassed: true });
  return markupOf(instrument);
};

/** Every label the rack writes, in the order it writes them. */
const labels = (markup: string): string[] =>
  [...markup.matchAll(/aria-label="([^"]*)"/gu)].map(([, label]) => label!);

describe("the effect rack's controls", () => {
  // Bypass is on or it is off and the instance is left in that state, which is what a Switch is
  // (0055). Two instances of one entry report independently (0030).
  it("reports bypass as a switch per instance", () => {
    const markup = rackMarkup();
    expect(markup).toMatch(/data-slot="switch"[^>]*aria-label="Bypass Filter 1 on Yard A"/u);
    expect(markup).toMatch(/aria-checked="false"[^>]*aria-label="Bypass Filter 1 on Yard A"/u);
    expect(markup).toMatch(/aria-checked="true"[^>]*aria-label="Bypass Filter 2 on Yard A"/u);
    // The state's own picture went with the Toggle: a state is a switch and an action has an
    // icon, never both (0055).
    expect(markup).not.toMatch(/data-slot="toggle"/u);
  });

  // Remove happens once per press, so it stays a button — and being icon-only, it keeps the
  // label that names which instance it acts on.
  it("keeps the once-per-press controls as labelled buttons", () => {
    const markup = rackMarkup();
    for (const label of ["Remove Filter 1 from Yard A", "Reorder Filter 2 on Yard A"]) {
      expect(markup).toMatch(new RegExp(`data-slot="button"[^>]*aria-label="${label}"`, "u"));
    }
    expect(markup).not.toMatch(/aria-pressed[^>]*aria-label="Remove Filter 1 from Yard A"/u);
  });

  // P34: the two arrow buttons are gone, and the handle is what reordering is reached through
  // — by drag, or by the arrow keys on it (0062).
  it("offers no earlier and later buttons", () => {
    const markup = rackMarkup();
    expect(markup).not.toContain("Earlier");
    expect(markup).not.toContain("Later");
    expect(markup).toContain('aria-label="Reorder Filter 1 on Yard A"');
  });
});

describe("what a card is called", () => {
  // The whole of 0076: both halves of a card's reading come from its instance's own durable id,
  // so a reorder moves the cards and renames nothing. A label derived from the rack index — which
  // is what this was — renumbers every card the drag passed.
  it("leaves every card's label byte-identical across a reorder", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });
    instrument.send({ t: "effect.add", deck: "a", id: "three", effect: "filter" });
    const before = labels(markupOf(instrument));

    instrument.send({ t: "effect.reorder", deck: "a", instance: "three", index: 0 });
    const after = labels(markupOf(instrument));

    // The same labels, in the rack's new order rather than in new words.
    expect(new Set(after)).toEqual(new Set(before));
    expect(before).toContain("Filter 1");
    expect(before).toContain("Filter 2");
    expect(before).toContain("Delay 1");
  });

  // A card is numbered by the rank of its id, so a fresh instance must mint an id that sorts after
  // the ones already there — a purely random mint lands in front of an existing card about half
  // the time and renumbers it, with no command naming that instance.
  it("numbers a fresh instance after the ones the rack already holds", () => {
    const instrument = createInstrument(manualClock());
    const count = 20;
    for (let index = 0; index < count; index++) instrument.send(addEffectCommand("a", "delay"));

    // Every add appends, so the rack reads in the order they arrived. A mint that landed in front
    // of a card already there would show up here as a card out of order — and that card's label,
    // its controls' labels and its knobs' names would all have changed with nothing naming it.
    const cards = [
      ...markupOf(instrument).matchAll(/data-slot="card"[^>]*aria-label="([^"]*)"/gu),
    ].map(([, label]) => label);
    expect(cards).toEqual(Array.from({ length: count }, (_, index) => `Delay ${index + 1}`));
  });

  // The grey half beside the black one, drawn from that effect's own pool (0075) and picked by
  // the id, so it is one name a card keeps rather than one it is handed.
  it("wears the name its effect's pool gives its id", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    const markup = markupOf(instrument);

    expect(markup).toContain(effectName("delay", "one"));
    expect(EFFECT_NAMES["delay"]).toContain(effectName("delay", "one"));
  });
});

describe("the effect rack's layout", () => {
  // P26: each instance occupies its own row, so two filters are two labelled, separately
  // controllable rows rather than one wrapping line in which they run together (0030).
  it("gives each instance its own card, distinguishable by label", () => {
    const markup = rackMarkup();

    // The section stacks its parts — the eyebrow, the cards and the picker.
    expect(markup).toMatch(
      /<section[^>]*class="[^"]*flex-col[^"]*"[^>]*aria-label="Yard A Effects"/u,
    );
    // A card declares its own width and the rack wraps, so two halves lay abreast on a wide
    // viewport and stack on a narrow one (P48). Both filters declare half.
    expect(markup).toMatch(/class="[^"]*flex-wrap[^"]*"/u);
    expect([...markup.matchAll(/sm:w-\[calc\(50%-0\.25rem\)\]/gu)]).toHaveLength(2);
    // P34: a row is a card, so its head can carry the handle and its controls above the knobs.
    expect(markup).toMatch(/data-slot="card"[^>]*aria-label="Filter 1"/u);
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
