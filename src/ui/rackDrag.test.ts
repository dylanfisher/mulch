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

/** Three cards of 40px stacked with an 8px gap, which is the geometry a drag measures against. */
const HEIGHT = 40;
const GAP = 8;
const STEP = HEIGHT + GAP;
/** One pixel past a neighbour's centre: the walk moves on a centre crossed, not touched. */
const PAST = STEP + 1;

/** A card as the gesture reads and writes it: a rect, a transform and the dragging flag. */
type Card = {
  style: { transform: string };
  dataset: Record<string, string>;
  getBoundingClientRect: () => { top: number; bottom: number; height: number };
};

const cardList = (count: number): Card[] =>
  Array.from({ length: count }, (_, index) => ({
    style: { transform: "" },
    dataset: {},
    getBoundingClientRect: () => ({
      top: index * STEP,
      bottom: index * STEP + HEIGHT,
      height: HEIGHT,
    }),
  }));

/** A press on one handle, and a pointer somewhere down the list, as the handler receives them. */
const down = (handler: DragHandleProps["onPointerDown"], clientY: number): void => {
  Reflect.apply(handler, undefined, [{ button: 0, pointerId: 1, clientY }]);
};

const at = (handler: DragListProps["onPointerMove"], clientY: number): void => {
  Reflect.apply(handler, undefined, [{ pointerId: 1, clientY }]);
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
const useRack = (count: number) => {
  const sent: (Command | Envelope)[] = [];
  const instrument = createInstrument(manualClock());
  for (let index = 0; index < count; index++) {
    instrument.send({ t: "effect.add", deck: "a", id: `e${index}`, effect: "filter" });
  }
  const cards = cardList(count);
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
    setPointerCapture: vi.fn(),
  });
  const handle = (index: number): DragHandleProps => drag.dragHandle(index, `e${index}`, count - 1);
  return { sent, cards, handle, list: drag.listProps, instrument };
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
    expect(transforms(cards)).toEqual([`translateY(${PAST}px)`, `translateY(${-STEP}px)`, ""]);

    at(list.onPointerUp, 20 + PAST);
    expect(transforms(cards)).toEqual(["", "", ""]);
    expect(cards[0]!.dataset["dragging"]).toBeUndefined();
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
