/**
 * @role The reorder gesture both of the instrument's ordered lists wear: a pointer drag of one
 *   item's handle, and the arrow keys on that same handle. Both ends in one command naming the
 *   index the item landed on, so ./scripts/drive reaches reordering the way it reached the two
 *   buttons this replaced (0062). The rack was the first list and the yards are the second, and
 *   exactly two things differed — the command and the order re-read on release (0111).
 * @instead A drag that moves a loop rather than a list → src/ui/LoopHandles.tsx. The lists that
 *   wear this → src/ui/EffectRack.tsx and src/ui/App.tsx.
 */

import {
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
} from "react";

import { usePointerGesture } from "@/ui/gesture";

/**
 * One slot of the layout as it stood when the pointer went down, relative to the list: the corner
 * the drop is resolved against, and the box the landing placeholder fills.
 */
type Slot = { left: number; top: number; width: number; height: number };

/**
 * One live drag. `slots` is where each card sat when the pointer went down — the cards move under
 * the gesture, so measuring against them live would move the ruler with the thing being ruled
 * (the same reason LoopHandles measures against the strip). A card declares its own width, so the
 * rack wraps and a slot is a point rather than a row: there is no single step a passed card
 * shifts by, and each one moves to the slot next to its own (P48).
 */
type Drag = {
  pointerId: number;
  item: string;
  from: number;
  to: number;
  downClientX: number;
  downClientY: number;
  /**
   * The list itself and where its own corner sat when the slots below were measured. A rack is a
   * handful of cards and never moved the page; a yard is a panel, so the page scrolls under the
   * drag and the ruler taken at the press is a viewport one. How far the list has travelled since
   * is exactly how far it scrolled, which is what puts the whole gesture back in the frame it was
   * measured in — asked of the list rather than of the window, because a scrolling ancestor moves
   * it just as a scrolling page does. Zero for a rack, so its arithmetic is unchanged (0111).
   */
  list: HTMLElement;
  downLeft: number;
  downTop: number;
  cards: HTMLElement[];
  slots: Slot[];
  /** The landing placeholder, or null when the list rendered without one. */
  placeholder: HTMLElement | null;
};

/** The props one card's handle needs; spread at the call site so the element owns no logic. */
export type DragHandleProps = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/**
 * The props the list itself needs. The gesture is captured by and answered on the list rather
 * than on the handle that started it, because a card can leave under a live drag — an undo, a
 * removal from ./scripts/drive — and a handler on the card it took with it would never run, so
 * the drag record and the transforms on the surviving cards would be stranded for good.
 */
export type DragListProps = {
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
};

/**
 * The two things a list has to answer for itself, read at the release rather than at the press.
 * The store is what says there is still something to reorder: capture outlives the items, so a
 * gesture held while an undo or a ./scripts/drive command edits the list was measured against a
 * list that no longer exists, and the index it ended on would land the item somewhere nobody
 * dragged it. Same reason LoopHandles re-reads the loop on release.
 */
export type ListDragOwner<Id extends string> = {
  /** The list as the session holds it now, in order — one id per item, the gesture's own ids. */
  order: () => readonly Id[];
  /** The one command this list's reorder is, sent once per gesture (0062, 0111). */
  reorder: (item: Id, index: number) => void;
};

/** What the list gets back: what to measure against and answer on, and one item's handle. */
export type ListDrag<Id extends string> = {
  /**
   * The drag dropped where it stands, for a caller about to unmount the list it was captured on
   * — the rack's own fold. Capture on the list is what lets a *card* leave under a live drag; the
   * list leaving is the one thing capture cannot survive, because the release fires at an element
   * React has already detached and no handler is left to clear the record (P64).
   */
  abandon: () => void;
  /** Wraps exactly the cards, in order — the gesture reads its geometry from these children. */
  listRef: RefObject<HTMLDivElement | null>;
  /** The one absolutely-positioned element the landing slot is shown as, hidden between drags. */
  slotRef: RefObject<HTMLDivElement | null>;
  listProps: DragListProps;
  dragHandle: (index: number, item: Id, last: number) => DragHandleProps;
};

/** The attribute a list marks its items with, so the placeholder beside them is not one. */
export const DRAG_CARD_ATTRIBUTE = "data-drag-card";

/** The overlay under a live drag: the candidate order written straight to the elements (0031). */
const paint = (active: Drag, dx: number, dy: number): void => {
  for (const [index, card] of active.cards.entries()) {
    if (index === active.from) {
      card.style.transform = `translate(${dx}px, ${dy}px)`;
      continue;
    }
    // Each card the drag passes takes the slot next to its own, in whichever direction it was
    // passed. In a wrapped layout that is a move sideways as often as it is a move up or down.
    const target =
      index > active.from && index <= active.to
        ? index - 1
        : index < active.from && index >= active.to
          ? index + 1
          : index;
    const own = active.slots[index]!;
    const slot = active.slots[target]!;
    // Corner to corner, not centre to centre: the rack lays its cards out `items-start`, so two
    // cards in one row share a top edge and not a middle, and a card with more knobs than its
    // neighbour is taller. A centre delta would shift a purely sideways swap vertically by half
    // the difference in height.
    card.style.transform =
      target === index ? "" : `translate(${slot.left - own.left}px, ${slot.top - own.top}px)`;
  }
  const { placeholder } = active;
  if (placeholder === null) return;
  // The slot the card would land in, filled while the gesture is live: the cards have moved off
  // it, so without this the drop reads as a gap rather than as a destination.
  const landing = active.slots[active.to]!;
  placeholder.style.left = `${landing.left}px`;
  placeholder.style.top = `${landing.top}px`;
  placeholder.style.width = `${landing.width}px`;
  placeholder.style.height = `${landing.height}px`;
  placeholder.hidden = false;
};

/** Every card back where the session says it is, whatever ended the gesture. */
const clear = (active: Drag): void => {
  for (const card of active.cards) {
    card.style.transform = "";
    delete card.dataset["dragging"];
  }
  if (active.placeholder !== null) active.placeholder.hidden = true;
};

/**
 * The reorder gesture, owned by the list rather than by an item: one drag at a time, and the
 * geometry it needs is the list's, not one item's. Over the line cap by design — this is one
 * gesture's whole down/move/up/cancel set plus the keyboard path that stands in for it, and the
 * pieces share the one drag ref. See docs/decisions/0007-reviewed-oversized-functions.md.
 */
// oxlint-disable-next-line max-lines-per-function
export function useListDrag<Id extends string>(owner: ListDragOwner<Id>): ListDrag<Id> {
  const listRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  // A gesture the browser ended reorders nothing and puts every card back where the session says
  // it is — the same thing a `pointercancel` does with it (0114).
  const drag = usePointerGesture<Drag>(clear);
  const { order, reorder } = owner;

  const begin = useCallback(
    (event: PointerEvent<HTMLElement>, from: number, item: Id) => {
      const list = listRef.current;
      // The live drag is checked before the list is measured, not only by begin() below: reading
      // every card's geometry is the expensive part, and a second pointer cannot use it anyway.
      if (drag.held() !== null || event.button !== 0 || list === null) return;
      // The cards, and only the cards: the landing placeholder is the list's other child, and a
      // gesture that counted it would think the list held one more slot than it does.
      const cards = [...list.querySelectorAll<HTMLElement>(`:scope > [${DRAG_CARD_ATTRIBUTE}]`)];
      // Nothing to reorder past, so nothing to drag — and no ruler to measure against either.
      if (cards.length < 2) return;
      const bounds = list.getBoundingClientRect();
      // Capture on the list, not on the grip: the list outlives any card the gesture moves.
      drag.begin(list, event, {
        pointerId: event.pointerId,
        item,
        from,
        to: from,
        downClientX: event.clientX,
        downClientY: event.clientY,
        list,
        downLeft: bounds.left,
        downTop: bounds.top,
        cards,
        slots: cards.map((card) => {
          const rect = card.getBoundingClientRect();
          return {
            left: rect.left - bounds.left,
            top: rect.top - bounds.top,
            width: rect.width,
            height: rect.height,
          };
        }),
        placeholder: slotRef.current,
      });
      cards[from]!.dataset["dragging"] = "true";
    },
    [drag],
  );

  const move = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const active = drag.matched(event);
      if (active === null) return;
      // The scroll delta is part of the move: the slots were measured in viewport coordinates at
      // the press, so a list that has scrolled under the drag has to be put back where it was
      // measured before anything is compared to them. Zero for a rack, which never scrolls.
      const now = active.list.getBoundingClientRect();
      const dx = event.clientX - active.downClientX + (active.downLeft - now.left);
      const dy = event.clientY - active.downClientY + (active.downTop - now.top);
      // The card lands in the slot whose *leading corner* its own leading corner is nearest to:
      // the corner is where the landing placeholder is drawn, so the rule and the picture flip at
      // the same instant. Corners and not centres, for the same reason `paint` shifts by them: a
      // rack lays out `items-start` and a card declares its own width, so two slots in one row
      // share a top edge and nothing else, and a slot's middle is half a card away from the seam
      // a hand is aiming at. Against centres a half-width card asking to go in front of a
      // full-width one had to travel past that card's midpoint — half the rack — before its own
      // centre was nearest, so the drop the hand asked for was refused and the one it did not ask
      // for was taken (0155). Nearest is still the one rule that reads on both layouts: sideways
      // across a row, downwards onto the next, and diagonally between them (P48). What it costs
      // in a column of unequal heights — a folded yard beside an open one — is one threshold, and
      // 0155 says which and why the alternative was refused.
      const from = active.slots[active.from]!;
      const x = from.left + dx;
      const y = from.top + dy;
      let to = active.from;
      let nearest = Infinity;
      for (const [index, slot] of active.slots.entries()) {
        const distance = (slot.left - x) ** 2 + (slot.top - y) ** 2;
        if (distance < nearest) {
          nearest = distance;
          to = index;
        }
      }
      active.to = to;
      paint(active, dx, dy);
    },
    [drag],
  );

  const end = useCallback(
    (event: PointerEvent<HTMLElement>, commit: boolean) => {
      const active = drag.ended(event);
      if (active === null) return;
      // Unconditionally, and before the send: the cards' own transforms are an overlay ahead of
      // the store, and the render that follows the command must not find one left behind.
      clear(active);
      if (!commit || active.to === active.from) return;
      // The store, not the press, says what there is to reorder (see `ListDragOwner`).
      const held = order();
      if (held.length !== active.cards.length) return;
      const item = held[active.from];
      if (item === undefined || item !== active.item) return;
      reorder(item, active.to);
    },
    [drag, order, reorder],
  );

  const up = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      end(event, true);
    },
    [end],
  );
  const cancel = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      end(event, false);
    },
    [end],
  );

  const dragHandle = useCallback(
    (index: number, item: Id, last: number): DragHandleProps => ({
      onPointerDown: (event) => {
        begin(event, index, item);
      },
      // The keyboard path to reordering, which the arrow buttons used to be: the same command,
      // one slot per press, and one slot is as far as a press goes (0062).
      onKeyDown: (event) => {
        // All four arrows, because the rack wraps: index 0 and index 1 are side by side on a wide
        // viewport and stacked on a narrow one, and a slot is a slot whichever way the layout put
        // it (P48). One press is still one slot along the signal order (0062).
        const step =
          event.key === "ArrowUp" || event.key === "ArrowLeft"
            ? -1
            : event.key === "ArrowDown" || event.key === "ArrowRight"
              ? 1
              : 0;
        // A pointer already has the gesture, and a second answer to "where does this card go"
        // would move the list the live drag is measuring against.
        if (step === 0 || drag.held() !== null) return;
        // Taken whether or not it moves the card: a focused handle owns the two arrows, and one
        // that scrolled the page at the end of the rack would be a surprise at exactly the
        // moment the old buttons went grey.
        event.preventDefault();
        const target = index + step;
        // Off the end sends nothing rather than an index execute would clamp back onto the card
        // it started on — a command that changes nothing still costs a durable transaction.
        if (target < 0 || target > last) return;
        reorder(item, target);
      },
    }),
    [begin, drag, reorder],
  );

  const abandon = useCallback(() => {
    const active = drag.held();
    if (active === null) return;
    drag.ended(active);
    // The same clear a cancel does, and for the same reason: the transforms are an overlay ahead
    // of the store, and nothing else is going to take them off these cards.
    clear(active);
  }, [drag]);

  const listProps = useMemo(
    () => ({ onPointerMove: move, onPointerUp: up, onPointerCancel: cancel }),
    [move, up, cancel],
  );

  return { listRef, slotRef, listProps, dragHandle, abandon };
}
