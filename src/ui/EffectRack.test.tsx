/** @role Which primitive each rack control is, and what state it reports (P25). */
import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { createInstrument } from "@/app/facade";
import { EFFECT_NAMES, effectName } from "@/lib/copy";
import { addEffectCommand } from "@/ui/actions";
import { EffectRack, SlotControls } from "@/ui/EffectRack";

/** The rack as it renders right now, for whatever the instrument currently holds on deck a. */
const markupOf = (
  instrument: ReturnType<typeof createInstrument>,
  fold: [boolean, (folded: boolean) => void] = [false, () => {}],
): string => {
  const state = instrument.state.getState().decks.a!;
  return renderToStaticMarkup(
    <EffectRack instrument={instrument} deck="a" state={state} fold={fold} />,
  );
};

/** One press-able control out of a held tree: the props of the element carrying this label. */
type Labelled = {
  "aria-label"?: string;
  children?: ReactNode;
  /** What a tooltip's trigger becomes: the control itself, handed over rather than wrapped. */
  render?: ReactNode;
  onClick?: () => void;
  pressed?: boolean;
  onPressedChange?: (next: boolean) => void;
  checked?: boolean;
  onCheckedChange?: (next: boolean) => void;
};

function findLabelled(node: ReactNode, label: string): Labelled | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Labelled>(child)) continue;
    if (child.props["aria-label"] === label) return child.props;
    const found = findLabelled(child.props.children ?? null, label);
    if (found !== null) return found;
    // A control that says what it does after a rest is the same element, reached through its
    // tooltip trigger's `render` rather than as a child of it (P65).
    const said = findLabelled(child.props.render ?? null, label);
    if (said !== null) return said;
  }
  return null;
}

/**
 * The rack's own element tree, held rather than serialised, so a control in it can be pressed.
 * It is built inside a render of its own, which is where the rack's hooks — the drag's refs and
 * the fold's state — run.
 */
const rackTree = (
  instrument: ReturnType<typeof createInstrument>,
  fold: [boolean, (folded: boolean) => void] = [false, () => {}],
): ReactNode => {
  let tree: ReactNode = null;
  function Probe(): null {
    tree = EffectRack({
      instrument,
      deck: "a",
      state: instrument.state.getState().decks.a!,
      fold,
    });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return tree;
};

const labelled = (
  instrument: ReturnType<typeof createInstrument>,
  label: string,
  fold: [boolean, (folded: boolean) => void] = [false, () => {}],
): Labelled => {
  const found = findLabelled(rackTree(instrument, fold), label);
  if (found === null) throw new Error(`no control labelled ${label}`);
  return found;
};

/**
 * The head of one card, held the same way — its controls are a component of their own, called
 * inside a render so their hooks run where hooks run and the element they build is the thing
 * under test. A static markup pass can read what a control says but never press it.
 */
const headControl = (
  instrument: ReturnType<typeof createInstrument>,
  instance: EffectInstanceId,
  label: string,
  control: string,
  bypassed = false,
): Labelled => {
  let head: ReactNode = null;
  function Probe(): null {
    head = SlotControls({ instrument, deck: "a", instance, label, bypassed });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  const found = findLabelled(head, control);
  if (found === null) throw new Error(`no control labelled ${control}`);
  return found;
};

/** The switch on one card's head, which is that same lookup by the name the switch carries. */
const switchProps = (
  instrument: ReturnType<typeof createInstrument>,
  bypassed: boolean,
): Required<Pick<Labelled, "checked" | "onCheckedChange">> => {
  const { checked, onCheckedChange } = headControl(
    instrument,
    "one",
    "Filter 1",
    "Enable Filter 1 on Yard A",
    bypassed,
  );
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
    // icon, never both (0055). The one Toggle in the rack is the section's fold, which is a view
    // preference rather than anything a card reports (P64).
    expect(markup.match(/data-slot="toggle"/gu)).toHaveLength(1);
    expect(markup).toContain('aria-label="Collapse Effects on Yard A"');
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

describe("copying a card", () => {
  // One press, one command: the copy's values and its bypass are the reducer's, so the card's
  // head never sends the add, the values and the bypass itself (0078, 0092).
  it("sends one effect.duplicate naming the card it sits on", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    const sent = vi.spyOn(instrument, "send");

    headControl(instrument, "one", "Filter 1", "Duplicate Filter 1 on Yard A").onClick?.();

    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({ t: "effect.duplicate", deck: "a", instance: "one" }),
    );
    // The copy's id is minted at the press the way an add's is, and it is never the original's:
    // the card it grows reads a name and an ordinal of its own out of it (0076, 0081).
    expect(sent).not.toHaveBeenCalledWith(expect.objectContaining({ id: "one" }));
  });
});

describe("the rack's own fold", () => {
  // A view preference and nothing else, exactly like the yard's own fold: no command, nothing
  // durable, no history entry (plan §2).
  it("writes nothing durable when it is folded shut", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    const before = JSON.stringify(instrument.probe().decks.a);
    const sent = vi.spyOn(instrument, "send");
    const folds: boolean[] = [];

    const fold = labelled(instrument, "Collapse Effects on Yard A", [
      false,
      (next) => {
        folds.push(next);
      },
    ]);
    expect(fold.pressed).toBe(false);
    fold.onPressedChange?.(true);

    // The flag went to whoever holds it and nowhere else: no command, nothing durable.
    expect(folds).toEqual([true]);
    expect(sent).not.toHaveBeenCalled();
    expect(JSON.stringify(instrument.probe().decks.a)).toBe(before);
  });

  // The state is the yard's, not this component's: the rack is rendered under the yard's own
  // fold, so a rack that held its own would forget it every time that one was used (P64).
  it("draws what the fold it was handed says, holding none of its own", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });

    const shut = markupOf(instrument, [true, () => {}]);
    expect(shut).toMatch(/aria-pressed="true"[^>]*data-slot="toggle"/u);
    // Everything under the heading, gone: the cards, the landing slot and the add control.
    expect(shut).not.toContain('aria-label="Filter 1"');
    expect(shut).not.toContain('data-slot="rack-landing"');
    expect(shut).not.toContain('aria-label="Add an Effect to Yard A"');

    expect(markupOf(instrument, [false, () => {}])).toContain('aria-label="Filter 1"');
  });

  // The section already carries "Yard A Effects" as its own name; a control whose label contains
  // another's is two things one query finds, in the smoke and in a reader alike.
  it("names the fold apart from the section it folds", () => {
    const markup = rackMarkup();

    expect(markup).toContain('aria-label="Collapse Effects on Yard A"');
    expect(markup).toMatch(/aria-pressed="false"[^>]*data-slot="toggle"/u);
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

/**
 * The tape is the one effect whose state a person can watch, so its card carries a picture of it
 * and nobody else's does (P71). What that picture draws is asserted in src/ui/TapeReels.test.tsx;
 * what this asks is that the card it belongs to is the one it is on.
 */
describe("the card that draws itself", () => {
  it("gives a tape its reels and leaves every other card its knobs alone", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "tape" });
    const withTape = markupOf(instrument);
    expect(withTape).toContain("<canvas");

    const other = createInstrument(manualClock());
    other.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    expect(markupOf(other)).not.toContain("<canvas");
  });
});
