/**
 * @role Gesture regression tests for the rack's reorder: which index a drag of a card's handle
 *   commits, and which one the arrow keys on that handle send.
 */
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

import { manualClock } from "@/app/clock";
import type { Command, Envelope } from "@/app/commands";
import { createInstrument } from "@/app/facade";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (compute: () => unknown) => compute(),
    useRef: (initial: unknown) => ({ current: initial }),
  };
});

import type { DragHandleProps, DragListProps } from "@/ui/rackDrag";
import { useRackDrag } from "@/ui/rackDrag";

/** Cards of 40x200 with an 8px gap, which is the geometry a drag measures against. */
const HEIGHT = 40;
const WIDTH = 200;
const GAP = 8;
const STEP = HEIGHT + GAP;
const COLUMN = WIDTH + GAP;
/** One pixel past a neighbour's centre, which is well inside that neighbour's slot. */
const PAST = STEP + 1;

/** A card as the gesture reads and writes it: a rect, a transform and the dragging flag. */
type Card = {
  style: { transform: string };
  dataset: Record<string, string>;
  getBoundingClientRect: () => {
    left: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  };
};

/** A card at one point of the layout — the gesture only ever asks it where it is. */
const cardAt = (left: number, top: number, height = HEIGHT): Card => ({
  style: { transform: "" },
  dataset: {},
  getBoundingClientRect: () => ({ left, top, bottom: top + height, width: WIDTH, height }),
});

/** One column of full-width cards: the layout a rack of one wide effect lays out as. */
const cardList = (count: number): Card[] =>
  Array.from({ length: count }, (_, index) => cardAt(0, index * STEP));

/**
 * Two abreast, wrapping — the layout half-width cards lay out as, and the one a column's single
 * axis cannot resolve a drop against: slots 0 and 1 share a row and differ only in x (P48).
 */
const cardGrid = (count: number): Card[] =>
  Array.from({ length: count }, (_, index) =>
    cardAt((index % 2) * COLUMN, Math.floor(index / 2) * STEP),
  );

/** A press on one handle, and a pointer somewhere over the list, as the handler receives them. */
const down = (handler: DragHandleProps["onPointerDown"], clientY: number, clientX = 0): void => {
  Reflect.apply(handler, undefined, [{ button: 0, pointerId: 1, clientX, clientY }]);
};

const at = (handler: DragListProps["onPointerMove"], clientY: number, clientX = 0): void => {
  Reflect.apply(handler, undefined, [{ pointerId: 1, clientX, clientY }]);
};

/** A key on a focused handle, and whether the handler took the press. */
const press = (handler: DragHandleProps["onKeyDown"], key: string): boolean => {
  let prevented = false;
  Reflect.apply(handler, undefined, [
    {
      key,
      preventDefault: () => {
        prevented = true;
      },
    },
  ]);
  return prevented;
};

/**
 * The hook as the rack holds it: a real deck holding `count` filters, whose instance ids are the
 * ones the handles name, and a recording send in front of the instrument the release re-reads.
 */
const useRack = (count: number, layout: (count: number) => Card[] = cardList) => {
  const sent: (Command | Envelope)[] = [];
  const instrument = createInstrument(manualClock());
  for (let index = 0; index < count; index++) {
    instrument.send({ t: "effect.add", deck: "a", id: `e${index}`, effect: "filter" });
  }
  const cards = layout(count);
  const placeholder = { hidden: true, style: {} as Record<string, string> };
  const drag = useRackDrag(
    {
      ...instrument,
      send: (command) => {
        sent.push(command);
      },
    },
    "a",
  );
  Reflect.set(drag.listRef, "current", {
    querySelectorAll: () => cards,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture: vi.fn(),
  });
  Reflect.set(drag.slotRef, "current", placeholder);
  const handle = (index: number): DragHandleProps => drag.dragHandle(index, `e${index}`, count - 1);
  return { sent, cards, placeholder, handle, list: drag.listProps, instrument };
};

const transforms = (cards: Card[]): string[] => cards.map((card) => card.style.transform);

// Seven gestures in one describe, each a few lines. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("the rack's drag to reorder", () => {
  // The card lands where its own centre ended up, which is the index the two buttons this
  // replaced would have sent — one command, on release.
  it("commits the index the dragged card's centre landed on", () => {
    const { sent, handle, list } = useRack(3);
    const first = handle(0);

    down(first.onPointerDown, 20);
    // Past the second card's centre (68) but not the third's (116).
    at(list.onPointerMove, 20 + PAST);
    at(list.onPointerUp, 20 + PAST);

    expect(sent).toEqual([{ t: "effect.reorder", deck: "a", instance: "e0", index: 1 }]);
  });

  // Upwards is the same rule read the other way, and it is the last card that proves the walk
  // does not stop at its neighbour.
  it("carries a card past every centre it crosses", () => {
    const { sent, handle, list } = useRack(3);
    const last = handle(2);

    down(last.onPointerDown, 116);
    at(list.onPointerMove, 116 - 2 * PAST);
    at(list.onPointerUp, 116 - 2 * PAST);

    expect(sent).toEqual([{ t: "effect.reorder", deck: "a", instance: "e2", index: 0 }]);
  });

  // A press that did not cross a centre is not a reorder: sending the index it started at would
  // be a durable no-op transaction on the undo stack.
  it("sends nothing when the card lands back in its own slot", () => {
    const { sent, handle, list } = useRack(3);
    const first = handle(0);

    down(first.onPointerDown, 20);
    at(list.onPointerMove, 24);
    at(list.onPointerUp, 24);

    expect(sent).toEqual([]);
  });

  // A cancelled gesture abandons: the pointer never released, so nothing was asked for.
  it("commits nothing on a cancelled drag", () => {
    const { sent, cards, handle, list } = useRack(3);
    const first = handle(0);

    down(first.onPointerDown, 20);
    at(list.onPointerMove, 20 + PAST);
    at(list.onPointerCancel, 20 + PAST);

    expect(sent).toEqual([]);
    expect(transforms(cards)).toEqual(["", "", ""]);
  });

  // The transforms are an overlay ahead of the store: the cards show the candidate order while
  // the drag is live, and every one of them is back on the store's order once it ends.
  it("shows the candidate order while dragging and clears it on release", () => {
    const { cards, handle, list } = useRack(3);
    const first = handle(0);

    down(first.onPointerDown, 20);
    at(list.onPointerMove, 20 + PAST);

    expect(cards[0]!.dataset["dragging"]).toBe("true");
    expect(transforms(cards)).toEqual([
      `translate(0px, ${PAST}px)`,
      `translate(0px, ${-STEP}px)`,
      "",
    ]);

    at(list.onPointerUp, 20 + PAST);
    expect(transforms(cards)).toEqual(["", "", ""]);
    expect(cards[0]!.dataset["dragging"]).toBeUndefined();
  });

  // The landing slot is shown as a filled box over the layout the gesture measured, because the
  // cards have moved off it — without it the destination reads as a gap rather than as a slot.
  it("fills the landing slot while the drag is live and hides it on release", () => {
    const { placeholder, handle, list } = useRack(3);

    down(handle(0).onPointerDown, 20);
    at(list.onPointerMove, 20 + PAST);

    expect(placeholder.hidden).toBe(false);
    expect(placeholder.style).toEqual({
      left: "0px",
      top: `${STEP}px`,
      width: `${WIDTH}px`,
      height: `${HEIGHT}px`,
    });

    at(list.onPointerUp, 20 + PAST);
    expect(placeholder.hidden).toBe(true);
  });
});

// Each gesture keeps its whole press-move-release timeline visible, laid over a two-row layout
// this describe builds once. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("the rack's drag across a wrapped layout", () => {
  // Two cards abreast differ only in x, so a column's single axis resolves every drop in a row to
  // the slot the card started in. The drop is the slot the card's centre is nearest (P48).
  it("commits the slot across the row a sideways drag landed on", () => {
    const { sent, handle, list } = useRack(4, cardGrid);
    const first = handle(0);

    down(first.onPointerDown, 20, 100);
    at(list.onPointerMove, 20, 100 + COLUMN);
    at(list.onPointerUp, 20, 100 + COLUMN);

    expect(sent).toEqual([{ t: "effect.reorder", deck: "a", instance: "e0", index: 1 }]);
  });

  // Halfway across is still the slot it came from: the card lands where its centre is nearest,
  // so a drag that has not reached the next slot has not left its own.
  it("keeps a card in its own slot until its centre passes the halfway point", () => {
    const { sent, handle, list } = useRack(4, cardGrid);
    const first = handle(0);

    down(first.onPointerDown, 20, 100);
    at(list.onPointerMove, 20, 100 + COLUMN / 2 - 1);
    at(list.onPointerUp, 20, 100 + COLUMN / 2 - 1);

    expect(sent).toEqual([]);
  });

  // A filter has one knob and an eq has three, so two cards abreast are two different heights
  // and share a top edge rather than a middle. The card that shifts along the row must not also
  // move up or down, which a shift measured between the two centres would make it do.
  it("shifts a card of another height straight along its own row", () => {
    const { cards, handle, list } = useRack(2, () => [cardAt(0, 0), cardAt(COLUMN, 0, HEIGHT * 3)]);

    down(handle(0).onPointerDown, HEIGHT / 2, 100);
    at(list.onPointerMove, HEIGHT / 2, 100 + COLUMN);

    expect(cards[1]!.style.transform).toBe(`translate(${-COLUMN}px, 0px)`);
  });

  // Down a row rather than along one: the card passes the slot beside it on the way, and the
  // cards it passed each shift to the slot next to their own — sideways for one, up a row for
  // the other, which a single vertical step could not express.
  it("carries a card onto the next row and shifts the ones it passed", () => {
    const { sent, cards, handle, list } = useRack(4, cardGrid);
    const first = handle(0);

    down(first.onPointerDown, 20, 100);
    at(list.onPointerMove, 20 + STEP, 100);
    expect(transforms(cards)).toEqual([
      `translate(0px, ${STEP}px)`,
      `translate(${-COLUMN}px, 0px)`,
      `translate(${COLUMN}px, ${-STEP}px)`,
      "",
    ]);
    at(list.onPointerUp, 20 + STEP, 100);

    expect(sent).toEqual([{ t: "effect.reorder", deck: "a", instance: "e0", index: 2 }]);
  });

  // One drag at a time: a second pointer landing mid-gesture must not steal it, or the first
  // pointer's transforms are orphaned with nobody left to clear them.
  it("ignores a second pointer landing mid-drag", () => {
    const { sent, handle, list } = useRack(3);

    down(handle(0).onPointerDown, 20);
    down(handle(1).onPointerDown, 60);
    at(list.onPointerMove, 20 + PAST);
    at(list.onPointerUp, 20 + PAST);

    expect(sent).toEqual([{ t: "effect.reorder", deck: "a", instance: "e0", index: 1 }]);
  });

  // A rack of one has nothing to reorder past, and no second card to measure the gap with.
  it("does not begin a drag on a rack of one", () => {
    const { sent, cards, handle, list } = useRack(1);
    const only = handle(0);

    down(only.onPointerDown, 20);
    at(list.onPointerMove, 200);
    at(list.onPointerUp, 200);

    expect(sent).toEqual([]);
    expect(transforms(cards)).toEqual([""]);
  });
});

describe("the rack's keyboard path to reorder", () => {
  // The arrows the two buttons used to be, now on the handle: the same command, one slot a press.
  it("sends one slot per arrow press, in both directions", () => {
    const { sent, handle } = useRack(3);

    // The page must not scroll under a reorder that took the press.
    expect(press(handle(1).onKeyDown, "ArrowUp")).toBe(true);
    expect(press(handle(1).onKeyDown, "ArrowDown")).toBe(true);
    expect(sent).toEqual([
      { t: "effect.reorder", deck: "a", instance: "e1", index: 0 },
      { t: "effect.reorder", deck: "a", instance: "e1", index: 2 },
    ]);
  });

  // Off either end sends nothing rather than an index execute would clamp back onto the slot the
  // card is already in — and the handle still takes the press, so the page does not scroll under
  // an arrow key a focused handle owns.
  it("refuses to walk a card off either end", () => {
    const { sent, handle } = useRack(3);

    expect(press(handle(0).onKeyDown, "ArrowUp")).toBe(true);
    expect(press(handle(2).onKeyDown, "ArrowDown")).toBe(true);
    expect(sent).toEqual([]);
  });

  // The rack wraps, so the slot before this one is as often to the left as it is above: all four
  // arrows walk the signal order one slot, whichever way the layout laid it out (P48).
  it("walks a slot on the sideways arrows too", () => {
    const { sent, handle } = useRack(3);

    expect(press(handle(1).onKeyDown, "ArrowLeft")).toBe(true);
    expect(press(handle(1).onKeyDown, "ArrowRight")).toBe(true);
    expect(sent).toEqual([
      { t: "effect.reorder", deck: "a", instance: "e1", index: 0 },
      { t: "effect.reorder", deck: "a", instance: "e1", index: 2 },
    ]);
  });

  // Every other key belongs to whatever is listening above the handle.
  it("leaves keys that are not the two arrows alone", () => {
    const { sent, handle } = useRack(3);

    expect(press(handle(1).onKeyDown, "Enter")).toBe(false);
    expect(sent).toEqual([]);
  });
});

describe("a rack edited under a live drag", () => {
  // Capture outlives the cards, so an undo or a ./scripts/drive command can empty a slot the
  // gesture measured. The index it ended on counts a list that no longer exists, so it commits
  // nothing rather than landing the card where nobody dragged it.
  it("commits nothing when another instance left the rack mid-gesture", () => {
    const { sent, handle, list, instrument } = useRack(3);

    down(handle(0).onPointerDown, 20);
    at(list.onPointerMove, 20 + PAST);
    instrument.send({ t: "effect.remove", deck: "a", instance: "e2" });
    at(list.onPointerUp, 20 + PAST);

    expect(sent).toEqual([]);
  });

  // The dragged instance itself: a reorder naming an instance the deck no longer holds is an
  // error event, and the gesture that would send it has already lost what it was moving.
  it("commits nothing when the dragged instance left the rack mid-gesture", () => {
    const { sent, handle, list, instrument } = useRack(3);

    down(handle(0).onPointerDown, 20);
    at(list.onPointerMove, 20 + PAST);
    instrument.send({ t: "effect.remove", deck: "a", instance: "e0" });
    at(list.onPointerUp, 20 + PAST);

    expect(sent).toEqual([]);
  });

  // One answer to "where does this card go" at a time: an arrow key taken while a pointer holds
  // the gesture would move the list that gesture is measuring against.
  it("ignores an arrow key while a pointer drag is live", () => {
    const { sent, handle, list } = useRack(3);

    down(handle(0).onPointerDown, 20);
    expect(press(handle(1).onKeyDown, "ArrowUp")).toBe(false);
    at(list.onPointerUp, 20);

    expect(sent).toEqual([]);
  });
});
