/**
 * @role The rack and the run's rows mounted outside a renderer, and the walks that read what they
 *   built — written once, because what the rack's controls send and what a grown row is made of
 *   are two suites over exactly one element (src/ui/playerCardDouble.ts is the same shape a
 *   surface over). A card wears a pool entry's picture in three places and a row is one of them,
 *   so both suites need the pool and the drawing; two copies of either would be two lists to keep
 *   in step (principle 1).
 * @instead What the rack's controls send, and what a card is made of →
 *   src/ui/EffectRack.test.tsx. What one row of an automator's run is →
 *   src/ui/GrownRows.test.tsx. Nothing here is production code; it exists so a suite can call the
 *   rack as a function and read the element it returns.
 */
import { Children, createElement, isValidElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { Instrument, createInstrument } from "@/app/facade";
import type { EffectInstanceId, GrownEffect } from "@/audio/effects/contract";
import { EffectRack } from "@/ui/EffectRack";
import type { RackBeat } from "@/ui/ParameterBeat";
import { GrownRows } from "@/ui/GrownRows";

/**
 * A rack's beat as a fixture: a tempo, nothing held, and a hold nobody reads back. A suite that
 * presses the hold hands its own, so this is what every other case gets — one spelling, because
 * two would be two racks to keep in step (principle 1).
 */
export const rackBeat = (bpm = 0): RackBeat => ({
  bpm,
  holds: new Set<string>(),
  setHold: () => {},
});

/** The rack as it renders right now, for whatever the instrument currently holds on deck a. */
export const markupOf = (
  instrument: ReturnType<typeof createInstrument>,
  fold: [boolean, (folded: boolean) => void] = [false, () => {}],
  beat: RackBeat = rackBeat(),
): string => {
  const state = instrument.state.getState().decks.a!;
  return renderToStaticMarkup(
    <EffectRack instrument={instrument} deck="a" state={state} fold={fold} beat={beat} />,
  );
};

/**
 * Which controls a card draws, by the name each one carries: every one of them is one marked
 * wrapper whose control names it first, so this is the row read out in the order it is laid — a
 * dial or a picker alike, which is the point of the mark (0325). Here rather than in either
 * suite, because both read the row and two spellings of the read are two rows (principle 1).
 */
export const dialsOf = (markup: string): string[] =>
  markup
    .split('data-automation="')
    .slice(1)
    .map((control) => {
      const named = /aria-label="([^"]*)"/u.exec(control);
      if (named === null) throw new Error("a control rendered with no name");
      return named[1]!;
    });

/**
 * Every label a rendered rack writes, in the order it writes them. Here rather than in either
 * suite, because both read a card by the names its controls carry (principle 1).
 */
export const labels = (markup: string): string[] =>
  [...markup.matchAll(/aria-label="([^"]*)"/gu)].map(([, label]) => label!);

/** One press-able control out of a held tree: the props of the element carrying this label. */
export type Labelled = {
  "aria-label"?: string;
  children?: ReactNode;
  /** What a tooltip's trigger becomes: the control itself, handed over rather than wrapped. */
  render?: ReactNode;
  onClick?: () => void;
  /** Refused rather than absent, which is how every control under a missing fact is drawn (0121). */
  disabled?: boolean;
  pressed?: boolean;
  onPressedChange?: (next: boolean) => void;
  checked?: boolean;
  onCheckedChange?: (next: boolean) => void;
  onValueChange?: (value: number) => void;
  onValueCommitted?: (value: number) => void;
};

export function findLabelled(node: ReactNode, label: string): Labelled | null {
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
export const grownPlace = (instance: EffectInstanceId): GrownEffect => ({
  effect: "eq",
  instance,
  presence: 1,
  remain: 3,
  life: 10,
  values: [],
});

/**
 * The run's rows as an element tree, built inside a render of its own — where the component's refs
 * and callbacks run — the way `rackTree` builds the rack's. `sends` is what a control on a row is
 * pressed through and `holds` is the instrument the card's own values are read off.
 */
export const grownTree = (sends: Instrument, holds: Instrument): ReactNode => {
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
 * The picture one registry entry declares, as its drawing alone — the svg's contents, without the
 * tag whose class and aria depend on where it is worn. Two entries draw two different things, so
 * this is how a card is asserted to be wearing its own icon rather than merely some icon (0055).
 */
export const drawingOf = (plugin: { icon: ComponentType }): string => {
  const svg = renderToStaticMarkup(createElement(plugin.icon));
  return svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
};

/** The pool an automator draws from, as the registry states it once (0374). */
export { POOL } from "@/audio/effects/registry";
