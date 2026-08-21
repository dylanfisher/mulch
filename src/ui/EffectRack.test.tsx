/** @role Which primitive each rack control is, and what state it reports (P25). */
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { EFFECT_NAMES, effectName } from "@/lib/copy";
import { addEffectCommand } from "@/ui/actions";
import { EffectRack, SlotControls } from "@/ui/EffectRack";

/** The rack as it renders right now, for whatever the instrument currently holds on deck a. */
const markupOf = (instrument: ReturnType<typeof createInstrument>): string => {
  const state = instrument.state.getState().decks.a!;
  return renderToStaticMarkup(<EffectRack instrument={instrument} deck="a" state={state} />);
};

/** What the switch on a card's head reports and what turning it sends. */
type SwitchProps = { checked?: boolean; onCheckedChange?: (next: boolean) => void };

/**
 * The switch one card's head renders, with its handler live: the controls are called inside a
 * render of their own, so their hooks run where hooks run and the element they build is the thing
 * under test — a static markup pass can read what the switch says but never turn it.
 */
const switchProps = (
  instrument: ReturnType<typeof createInstrument>,
  bypassed: boolean,
): Required<SwitchProps> => {
  const found: SwitchProps[] = [];
  function Probe(): null {
    const head = SlotControls({
      instrument,
      deck: "a",
      instance: "one",
      label: "Filter 1",
      bypassed,
    }) as ReactElement<{ children: ReactNode }>;
    for (const child of Children.toArray(head.props.children)) {
      if (isValidElement<SwitchProps>(child) && child.props.onCheckedChange)
        found.push(child.props);
    }
    return null;
  }
  renderToStaticMarkup(<Probe />);
  const { checked, onCheckedChange } = found[0] ?? {};
  if (checked === undefined || onCheckedChange === undefined) {
    throw new Error("the card's head rendered no switch.");
  }
  return { checked, onCheckedChange };
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
  // The switch is on when the effect is running and off when it is bypassed, which is the way
  // round every switch on the instrument reads (P57, 0055). Two instances of one entry report
  // independently (0030).
  it("reports the effect running as a switch per instance", () => {
    const markup = rackMarkup();
    expect(markup).toMatch(/data-slot="switch"[^>]*aria-label="Enable Filter 1 on Yard A"/u);
    // Filter 1 is running, so its switch is on; Filter 2 is bypassed, so its switch is off.
    expect(markup).toMatch(/aria-checked="true"[^>]*aria-label="Enable Filter 1 on Yard A"/u);
    expect(markup).toMatch(/aria-checked="false"[^>]*aria-label="Enable Filter 2 on Yard A"/u);
    // The word is gone with the flip: a toggle that reads right needs no caption (0055).
    expect(markup).not.toContain(">Bypass<");
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

describe("the switch's sense", () => {
  // Turning the switch off is the performer saying "stop running this", which is the bypass
  // command — the control's sense and the field's are opposite, and this is the seam where the
  // one is turned into the other (P57).
  it("sends the bypass the switch's new position means", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });

    const running = switchProps(instrument, false);
    expect(running.checked).toBe(true);
    running.onCheckedChange(false);
    expect(instrument.state.getState().decks.a!.effects[0]!.bypassed).toBe(true);

    switchProps(instrument, true).onCheckedChange(true);
    expect(instrument.state.getState().decks.a!.effects[0]!.bypassed).toBe(false);
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

  // The grey half beside the black one, one word from each of that effect's own pools (0075,
  // 0081) and picked by the id, so it is one name a card keeps rather than one it is handed.
  it("wears the name its effect's pools give its id", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    const [adjective, noun] = effectName("delay", "one").split(" ");
    expect(markupOf(instrument)).toContain(effectName("delay", "one"));
    expect(EFFECT_NAMES["delay"]?.adjectives).toContain(adjective);
    expect(EFFECT_NAMES["delay"]?.nouns).toContain(noun);
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
