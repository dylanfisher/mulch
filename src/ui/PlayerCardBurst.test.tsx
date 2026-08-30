/**
 * @role What the mulcher card's two burst gestures send: a tap, whose mean interval is written as
 *   the burst, and the hold, which rounds whatever is written — the tap, the dial, a typed number
 *   — onto the nearest whole division of the sounding beat (P152, 0119, 0201).
 * @instead Which controls are drawn and when they are refused → src/ui/PlayerDials.test.tsx. The
 *   arithmetic under both → src/lib/playerBurst.test.ts. Every other gesture the card sends →
 *   src/ui/PlayerCard.test.tsx, and its folds → src/ui/PlayerCardFolds.test.tsx.
 */
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The hooks this card calls, made callable outside a renderer — the same stand-in
// src/ui/PlayerCard.test.tsx uses, and it has to be declared per file (`vi.mock` is hoisted into
// the module that asks for it).
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    useRef: (initial: unknown) => ({ current: initial }),
  };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { PLAYER_LABEL } from "@/lib/copy";
import { PLAYER_BEAT_LABEL, PLAYER_TAP_LABEL } from "@/lib/copyCard";
import { PlayerFront } from "@/ui/PlayerFront";
import { PLAYER, playerCard, type CardView } from "@/ui/playerCardDouble";
import type { DeckState } from "@/state/store";

const TAP = `${PLAYER_TAP_LABEL} ${PLAYER_LABEL} on Yard A`;
const BEAT = `${PLAYER_BEAT_LABEL} ${PLAYER_LABEL} on Yard A`;
/** A deck the analysis found a tempo on: 120bpm at the deck's own rate is a beat of half a
 *  second, so the divisions a hold may land on are 0.5s down to 0.015625s. */
const HEARD: Partial<DeckState> = {
  player: PLAYER,
  analysis: { bpm: 120, onsets: [], crest: 1 },
};

type Press = (...args: unknown[]) => void;
type Node = {
  "aria-label"?: string;
  knob?: unknown;
  onClick?: Press;
  onPressedChange?: Press;
  onChange?: Press;
  children?: unknown;
};

const card = (over: Partial<DeckState>, view: CardView = {}) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send").mockImplementation(() => {});
  return { element: playerCard(instrument, over, view), sent };
};

/** The handler on the control the card names rather than draws a knob for. */
const pressLabelled = (element: unknown, label: string): Press => {
  const walk = (node: unknown): Press | null => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child);
        if (found !== null) return found;
      }
      return null;
    }
    if (!isValidElement<Node>(node)) return null;
    const press = node.props.onClick ?? node.props.onPressedChange;
    if (node.props["aria-label"] === label && press !== undefined) return press;
    return walk(node.props.children);
  };
  const press = walk(element);
  if (press === null) throw new Error(`no control labelled ${label}`);
  return press;
};

/**
 * One dial of the card by the knob it draws, called for the handler underneath: a dial is a
 * component named by its knob, and the identity `useCallback` above is what makes calling it the
 * same as writing it out (src/ui/PlayerDial.tsx).
 */
const turnKnob = (element: unknown, knob: string): Press => {
  const walk = (node: unknown): Press | null => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child);
        if (found !== null) return found;
      }
      return null;
    }
    if (!isValidElement<Node>(node)) return null;
    if (node.props.onChange !== undefined) return node.props.onChange;
    const { type, props } = node;
    if (typeof type === "function" && props.knob === knob) {
      // A function component and a class one are both functions to `typeof`, and only one is
      // callable; this tree holds no class components.
      // oxlint-disable-next-line no-unsafe-type-assertion
      return walk((type as (props: Node) => unknown)(props));
    }
    return props.knob === undefined ? walk(props.children) : null;
  };
  const turn = walk(element);
  if (turn === null) throw new Error(`no dial drawing ${knob}`);
  return turn;
};

/** The patch the card's own front writes with — the fourth writer of a burst on this card, and
 *  the one that writes twenty other fields with it (src/ui/PlayerFront.tsx). */
const frontPatch = (element: unknown): Press => {
  const walk = (node: unknown): Press | null => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child);
        if (found !== null) return found;
      }
      return null;
    }
    if (!isValidElement<{ patch?: Press; children?: unknown }>(node)) return null;
    if (node.type === PlayerFront) return node.props.patch ?? null;
    return walk(node.props.children);
  };
  const patch = walk(element);
  if (patch === null) throw new Error("the card drew no front");
  return patch;
};

/** One `deck.player` carrying the whole spec, with one field moved (0089). */
const wrote = (burst: number) => ({
  t: "deck.player",
  deck: "a",
  player: { ...PLAYER, burst },
});

describe("the card's tap", () => {
  /**
   * The second way of arriving at a burst, writing the same field the dial writes: the mean
   * interval between presses as one ordinary `deck.player`. One press names no interval at all,
   * so it writes nothing rather than writing a nought.
   */
  it("writes the interval a hand tapped, and nothing at all on one press", () => {
    const { element, sent } = card({ player: PLAYER });
    const tap = pressLabelled(element, TAP);
    const now = vi.spyOn(performance, "now").mockReturnValue(1000);
    tap();
    expect(sent).not.toHaveBeenCalled();
    now.mockReturnValue(1500);
    tap();
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent).toHaveBeenCalledWith(wrote(0.5));
    now.mockRestore();
  });
});

// One case per state the hold can be in when a burst is written: the length is that list rather
// than a judgement of this suite's. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the card's hold", () => {
  /**
   * It rounds whatever is written, which is what makes it one rule rather than one control's
   * behaviour: the tap and the dial land on the same divisions of the *sounding* beat — the
   * analysis's tempo at the rate the deck reads its buffer (0031).
   */
  it("holds a tapped burst and a turned one alike to a division of the beat", () => {
    const { element, sent } = card(HEARD, { burstHeld: true });
    // 0.36s is nearer the beat itself than its half on the dial's own logarithmic travel.
    const tap = pressLabelled(element, TAP);
    const now = vi.spyOn(performance, "now").mockReturnValue(1000);
    tap();
    now.mockReturnValue(1360);
    tap();
    expect(sent).toHaveBeenLastCalledWith(wrote(0.5));
    now.mockRestore();
    turnKnob(element, "burst")(0.3);
    expect(sent).toHaveBeenLastCalledWith(wrote(0.25));
  });

  /** And with it off, the same two gestures write exactly what they were given. */
  it("leaves both alone while it is off", () => {
    const { element, sent } = card(HEARD);
    turnKnob(element, "burst")(0.3);
    expect(sent).toHaveBeenLastCalledWith(wrote(0.3));
  });

  /**
   * Turning it on is itself a write: a toggle that said nothing until the next turn of the dial
   * would be a control a hand cannot tell it pressed. One `deck.player`, so it undoes like any
   * other edit (0089).
   */
  it("rounds the standing burst the moment it goes on, and says so to the yard", () => {
    const setBurstHeld = vi.fn<(held: boolean) => void>();
    const { element, sent } = card(HEARD, { setBurstHeld });
    pressLabelled(element, BEAT)(true);
    expect(setBurstHeld).toHaveBeenCalledWith(true);
    // The spec's own burst is a whole second, and the beat's longest division is half of one.
    expect(sent).toHaveBeenCalledWith(wrote(0.5));
  });

  /**
   * And the card's own front, which draws every dial at once: a character carries a burst of its
   * own, so a hold that let one through would be a toggle standing pressed over a burst it did not
   * hold. Every other field it writes passes through untouched (0152, 0219).
   */
  it("holds a burst the front writes with twenty other fields", () => {
    const { element, sent } = card(HEARD, { burstHeld: true });
    frontPatch(element)({ burst: 0.3, gate: 0.75 });
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, burst: 0.25, gate: 0.75 },
    });
  });

  /** Turning it off writes nothing: a burst it rounded is a burst, and there is nothing to undo
   *  it to (0119 — the number on the dial is the whole of what a burst is). */
  it("writes nothing when it goes off", () => {
    const { element, sent } = card(HEARD, { burstHeld: true });
    pressLabelled(element, BEAT)(false);
    expect(sent).not.toHaveBeenCalled();
  });

  /**
   * And a deck with no grid never rounds at all, however the toggle is standing: the control is
   * refused on such a deck, and the rounding behind it refuses the same way rather than dividing
   * by a tempo nobody found (principle 5, src/lib/playerBurst.ts).
   */
  it("writes a burst untouched on a deck the analysis found no tempo on", () => {
    const { element, sent } = card({ player: PLAYER }, { burstHeld: true });
    turnKnob(element, "burst")(0.3);
    expect(sent).toHaveBeenLastCalledWith(wrote(0.3));
  });
});
