/** @role Which primitive each rack control is, and what state it reports (P25). */
import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { createInstrument, type Instrument } from "@/app/facade";
import { EFFECTS_LABEL } from "@/lib/copy";
import { EFFECT_NAMES, effectName } from "@/lib/copyNames";
import { AUTOMATOR_RUN_LABEL, BOUNDS_MENU, dismissLabel } from "@/lib/copyAuto";
import { GROWTH_COUNT_MAX } from "@/lib/effectGrowth";
import { drawnParamIds } from "@/audio/effects/automator";
import { EFFECTS, effectById, isBoundableParam, isGrowable } from "@/audio/effects/registry";
import { PARAMS } from "@/audio/params";
import { BoundsEntry } from "@/ui/BoundsMenu";
import { WEIGHT_OF } from "@/audio/effects/automatorParams";
import { addEffectCommand } from "@/ui/actions";
import { EffectRack, SlotControls, WIDTH_CLASS } from "@/ui/EffectRack";
import { GrownRows } from "@/ui/GrownRows";
import { silentEngine } from "@/app/engineDouble";
import type { Command, Envelope } from "@/app/commands";
import type { GrownEffect } from "@/audio/effects/contract";

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

/** One place a run is holding, as the per-frame read hands it over — the shape, not a real draw. */
const grownPlace = (instance: EffectInstanceId): GrownEffect => ({
  effect: "filter",
  instance,
  presence: 1,
  remain: 3,
  life: 10,
  values: [],
});

/**
 * The run's rows as an element tree, built inside a render of its own — where the component's refs
 * and callbacks run — the way `rackTree` below builds the rack's. `sends` is what a control on a
 * row is pressed through and `holds` is the instrument the card's own values are read off.
 */
const grownTree = (sends: Instrument, holds: Instrument): ReactNode => {
  let tree: ReactNode = null;
  function Probe(): null {
    tree = GrownRows({
      instrument: sends,
      deck: "a",
      instance: "one",
      params: holds.probe().decks.a!.effects[0]!.params,
      playing: false,
    });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return tree;
};

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

/** The words a held element renders, flattened — how a control is found by what it says. */
const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((child) =>
      typeof child === "string"
        ? child
        : isValidElement<Labelled>(child)
          ? textOf(child.props.children ?? null)
          : "",
    )
    .join("");

/**
 * The one pressable in a held tree whose own text is this heading — the whole of what P73 moved:
 * the words are inside the control, so pressing them is pressing it and they are also its name.
 */
function findHeading(node: ReactNode, text: string): Labelled | null {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Labelled>(child)) continue;
    const says = textOf(child.props.children ?? null) === text;
    if (child.props.onPressedChange !== undefined && says) return child.props;
    // Through a tooltip trigger's `render` as well, the way findLabelled reaches one: the yard's
    // own fold is built that way and this one is a `Says` away from being.
    const found =
      findHeading(child.props.children ?? null, text) ??
      findHeading(child.props.render ?? null, text);
    if (found !== null) return found;
  }
  return null;
}

const heading = (
  instrument: ReturnType<typeof createInstrument>,
  text: string,
  fold: [boolean, (folded: boolean) => void] = [false, () => {}],
): Labelled => {
  const found = findHeading(rackTree(instrument, fold), text);
  if (found === null) throw new Error(`no fold reading ${text}`);
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

/**
 * Which of a card's knobs wears a badge in its corner, by the name of the dial itself: each knob
 * is one wrapper, its own dial names it first, and the corner is drawn inside that wrapper — so
 * a badge is read against the knob it is worn by rather than against the card as a whole.
 */
const cornersOf = (markup: string): Map<string, boolean> =>
  new Map(
    markup
      .split('data-automation="')
      .slice(1)
      .map((knob) => {
        const named = /aria-label="([^"]*)"/u.exec(knob);
        if (named === null) throw new Error("a knob rendered with no name");
        return [named[1]!, knob.includes('data-slot="knob-corner"')];
      }),
  );

/** The pool an automator draws from: every entry that says how it is turned down to nothing. */
const POOL = EFFECTS.filter((effect) => isGrowable(effect));

/** Which parameters a held popover offers a window on, in the order its rows are laid. */
function paramsOf(node: ReactNode): string[] {
  const found: string[] = [];
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ param?: unknown; children?: ReactNode }>(child)) continue;
    if (typeof child.props.param === "string") found.push(child.props.param);
    found.push(...paramsOf(child.props.children ?? null));
  }
  return found;
}

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
    expect(markup).toContain(`>${EFFECTS_LABEL}<`);
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

    const fold = heading(instrument, EFFECTS_LABEL, [
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

  // P73: the heading is the control. What the two cases above press is the heading's own text,
  // so the accessible name is that word rather than a label written beside it — and the section
  // around it is what says which yard's effects these are.
  it("carries the heading as its whole accessible name", () => {
    const markup = rackMarkup();
    expect(markup).toMatch(new RegExp(`data-slot="toggle"[^>]*><span[^>]*>${EFFECTS_LABEL}<`, "u"));
    expect(markup).not.toContain(`Collapse ${EFFECTS_LABEL} on Yard A`);
  });
});

describe("the effect rack's layout", () => {
  // P26: each instance occupies its own row, so two filters are two labelled, separately
  // controllable rows rather than one wrapping line in which they run together (0030).
  it("gives each instance its own card, distinguishable by label", () => {
    const markup = rackMarkup();

    // The section stacks its parts — the eyebrow, the cards and the picker.
    expect(markup).toMatch(/<section[^>]*class="[^"]*flex-col[^"]*"[^>]*aria-label="Yard A/u);
    expect(markup).toContain(`aria-label="Yard A ${EFFECTS_LABEL}"`);
    // A card declares its own width and the rack wraps, so two halves lay abreast on a wide
    // viewport and stack on a narrow one (P48). Both filters declare half.
    expect(markup).toMatch(/class="[^"]*flex-wrap[^"]*"/u);
    expect(markup.split(WIDTH_CLASS.half).length - 1).toBe(2);
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
 * No card draws anything. The tape was the one that did until P128 took its reels away, so it is
 * the card this asks about: what an effect is doing is read in the drift, where a tape has
 * declared a row of its own since P99, and the card is knobs like every other card's (0171).
 */
describe("a card is its knobs", () => {
  it("gives a tape no picture and the same half-width every other card declares", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "tape" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "filter" });
    const markup = markupOf(instrument);

    // Its knobs are there: a card that lost a drawing and not one that lost anything else.
    expect(markup).toContain('aria-label="Tape 1"');
    expect(markup).not.toContain("<canvas");
    // Two cards, two halves — the tape lays abreast of its neighbour rather than taking the row.
    expect(markup.split(WIDTH_CLASS.half).length - 1).toBe(2);
  });

  // The card's body is keyed on the face its entry declares, never on which effect it is (0205).
  it("gives an automator the whole row and a box of rows under its knobs", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "automator" });
    const markup = markupOf(instrument);

    expect(markup).toContain('aria-label="Automator 1"');
    // It takes the row rather than half of it, and it is the only entry that does.
    expect(markup).toContain(WIDTH_CLASS.full);
    expect(markup.split(WIDTH_CLASS.half).length - 1).toBe(0);
    // Its knobs are an ordinary rack card's, and the run it holds sits under them.
    expect(markup).toContain(AUTOMATOR_RUN_LABEL);
    expect(markup).toContain('data-slot="grown-rows"');
    // Every row the run could hold is mounted once, so turning over costs no render.
    expect(markup.split('data-slot="grown-row"').length - 1).toBe(GROWTH_COUNT_MAX);
    // And every dial the widest arrival in the pool is drawn at has a place in each row: a run
    // that drew more values than a row could paint would drop the last of them without a word
    // (0208). The tape is the widest and its presence is one of the seven.
    const widest = Math.max(...POOL.map((plugin) => drawnParamIds(plugin).length));
    expect(widest).toBeGreaterThan(0);
    expect(markup.split('data-slot="grown-value"').length - 1).toBe(widest * GROWTH_COUNT_MAX);
    // The window a hand puts on what it draws is worn by the knob saying how often it is drawn:
    // one badge per pool entry, in that entry's corner, and the pool read out once rather than
    // twice — no row of its own under the knobs (P153).
    expect(markup).not.toContain('data-slot="bounds-menu"');
    for (const entry of POOL) {
      expect(markup).toContain(`aria-label="Automator 1 ${entry.label} ${BOUNDS_MENU}"`);
    }
    expect(markup.split('data-slot="knob-corner"').length - 1).toBe(POOL.length);
  });

  it("badges the knob that says how often an entry is drawn, and no other knob", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "automator" });
    const worn = cornersOf(markupOf(instrument));
    const weights = new Set<string>(POOL.map((entry) => WEIGHT_OF[entry.id]!));

    // Every dial the automator declares is answered for: the ones that say how often an entry is
    // drawn wear its window, and the rest of them — the wait, the odds, the fade — wear nothing.
    const dials = effectById("automator").params;
    expect(worn.size).toBe(dials.length);
    expect(weights.size).toBeLessThan(dials.length);
    for (const param of dials) {
      expect(worn.get(PARAMS[param.id].label)).toBe(weights.has(param.id));
    }
  });

  it("opens the window of the entry whose weight the badge is worn by", () => {
    const instrument = createInstrument(manualClock());
    for (const plugin of POOL) {
      const held = BoundsEntry({
        instrument,
        deck: "a",
        instance: "one",
        plugin,
        bounds: {},
        name: "Automator 1",
      });

      // The popover the badge opens holds exactly the parameters that entry's arrivals are drawn
      // at — read off the entry itself, so no badge can open another's rows (0208).
      expect(paramsOf(held)).toEqual(drawnParamIds(plugin).filter((id) => isBoundableParam(id)));
    }
  });

  // A run grows and lets go on its own clock; nothing under it should move when it does.
  it("keeps the run's box one size however many places are filled", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "automator" });
    const markup = markupOf(instrument);

    // No row is dropped out of the layout: an empty one is invisible, and still a line high.
    expect(markup).not.toContain('hidden data-slot="grown-row"');
    expect(markup.split("invisible").length - 1).toBe(GROWTH_COUNT_MAX);
    expect(markup.split("h-[1lh]").length - 1).toBe(GROWTH_COUNT_MAX);
    // And the word for an empty run is laid over those rows rather than taking a height of its own.
    expect(markup).toContain('data-slot="grown-empty" class="absolute');
  });

  /**
   * The one control a run's own rows carry. It is mounted with the row rather than added to it —
   * every row is already mounted once whether or not it is holding anything, and nothing per-frame
   * may go through state (docs/boundaries.md, 0070).
   */
  it("draws a × per row of the run, reachable by a keyboard as well as a pointer", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "automator" });
    const markup = markupOf(instrument);

    expect(markup.split('data-slot="grown-go"').length - 1).toBe(GROWTH_COUNT_MAX);
    expect(markup.split(`aria-label="${dismissLabel(null)}"`).length - 1).toBe(GROWTH_COUNT_MAX);
    // A real button rather than a pressable span, and one that shows itself to a focus as well as
    // to a hovering pointer: a control only a pointer can reach is one no keyboard and no
    // ./scripts/drive can press (docs/plan.md §4).
    expect(markup.split('<button type="button" tabindex="0" data-slot="grown-go"').length - 1).toBe(
      GROWTH_COUNT_MAX,
    );
    expect(markup).toContain("focus-visible:opacity-100");
  });

  /**
   * Which place a press names is read off `peek()` at the press and never off a prop: a row
   * addressed by its slot alone would let go of whatever had rolled into that slot while the
   * pointer travelled (0204).
   */
  it("names the place the peek is holding, and says nothing on a row holding none", () => {
    for (const holding of [true, false]) {
      const instrument = createInstrument(manualClock(), () =>
        silentEngine({
          peek: (_deck, out) => {
            out.grown.set("one", holding ? [grownPlace("auto:0:0:0:filter")] : []);
          },
        }),
      );
      instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "automator" });
      const sent: (Command | Envelope)[] = [];
      const rows = grownTree(
        {
          ...instrument,
          send: (input) => {
            sent.push(input);
          },
        },
        instrument,
      );

      findLabelled(rows, dismissLabel(null))?.onClick?.();
      expect(sent).toEqual(
        holding
          ? [{ t: "effect.dismiss", deck: "a", instance: "one", place: "auto:0:0:0:filter" }]
          : [],
      );
    }
  });

  it("gives an entry that declares the knobs face no such box", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    const markup = markupOf(instrument);

    expect(markup).toContain('aria-label="Delay 1"');
    expect(markup).not.toContain('data-slot="grown-rows"');
  });
});
