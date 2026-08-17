/**
 * @role The rack's reorder gesture: a pointer drag of one card's handle, and the arrow keys on
 *   that same handle. Both ends in one `effect.reorder` naming the index the card landed on, so
 *   ./scripts/drive reaches reordering the way it reached the two buttons this replaced (0062).
 * @instead A drag that moves a loop rather than a list → src/ui/LoopHandles.tsx. The rack the
 *   handles sit in → src/ui/EffectRack.tsx.
 */

import {
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
} from "react";

import type { Instrument } from "@/app/facade";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { deckIn, type DeckId } from "@/state/store";
import { usePointerGesture } from "@/ui/gesture";

/**
 * One live drag. `centres` is where each card sat when the pointer went down — the cards move
 * under the gesture, so measuring against them live would move the ruler with the thing being
 * ruled (the same reason LoopHandles measures against the strip). `step` is how far a card the
 * drag passes has to shift: the dragged card's own outer height, which is what leaves its slot.
 */
type Drag = {
  pointerId: number;
  instance: EffectInstanceId;
  from: number;
  to: number;
  downClientY: number;
  cards: HTMLElement[];
  centres: number[];
  step: number;
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

/** What the rack gets back: the list to measure against and answer on, and one card's handle. */
export type RackDrag = {
  /** Wraps exactly the cards, in order — the gesture reads its geometry from these children. */
  listRef: RefObject<HTMLDivElement | null>;
  listProps: DragListProps;
  dragHandle: (index: number, instance: EffectInstanceId, last: number) => DragHandleProps;
};

/** The overlay under a live drag: the candidate order written straight to the elements (0031). */
const paint = (active: Drag, dy: number): void => {
  for (const [index, card] of active.cards.entries()) {
    if (index === active.from) {
      card.style.transform = `translateY(${dy}px)`;
      continue;
    }
    const shift =
      index > active.from && index <= active.to
        ? -active.step
        : index < active.from && index >= active.to
          ? active.step
          : 0;
    card.style.transform = shift === 0 ? "" : `translateY(${shift}px)`;
  }
};

/** Every card back where the session says it is, whatever ended the gesture. */
const clear = (active: Drag): void => {
  for (const card of active.cards) {
    card.style.transform = "";
    delete card.dataset["dragging"];
  }
};

/**
 * The rack's reorder gesture, owned by the rack rather than by a card: one drag at a time, and
 * the geometry it needs is the list's, not one card's. Over the line cap by design — this is one
 * gesture's whole down/move/up/cancel set plus the keyboard path that stands in for it, and the
 * pieces share the one drag ref. See docs/decisions/0007-reviewed-oversized-functions.md.
 */
// oxlint-disable-next-line max-lines-per-function
export function useRackDrag(instrument: Instrument, deck: DeckId): RackDrag {
  const listRef = useRef<HTMLDivElement>(null);
  const drag = usePointerGesture<Drag>();

  /** One command per gesture, on release — the same one the arrow buttons sent. */
  const reorder = useCallback(
    (instance: EffectInstanceId, index: number) => {
      instrument.send({ t: "effect.reorder", deck, instance, index });
    },
    [instrument, deck],
  );

  const begin = useCallback(
    (event: PointerEvent<HTMLElement>, from: number, instance: EffectInstanceId) => {
      const list = listRef.current;
      // The live drag is checked before the list is measured, not only by begin() below: reading
      // every card's geometry is the expensive part, and a second pointer cannot use it anyway.
      if (drag.held() !== null || event.button !== 0 || list === null) return;
      // The rack renders exactly the cards into this element, so its children are the list.
      const cards = [...list.querySelectorAll<HTMLElement>(":scope > *")];
      // Nothing to reorder past, so nothing to drag — and no ruler to measure against either.
      if (cards.length < 2) return;
      const rects = cards.map((card) => card.getBoundingClientRect());
      const first = rects[0]!;
      const second = rects[1]!;
      // Capture on the list, not on the grip: the list outlives any card the gesture moves.
      drag.begin(list, {
        pointerId: event.pointerId,
        instance,
        from,
        to: from,
        downClientY: event.clientY,
        cards,
        centres: rects.map((rect) => rect.top + rect.height / 2),
        // The gap between two cards is a rack constant, so the first pair measures it for all.
        step: rects[from]!.height + (second.top - first.bottom),
      });
      cards[from]!.dataset["dragging"] = "true";
    },
    [drag],
  );

  const move = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const active = drag.matched(event);
      if (active === null) return;
      const dy = event.clientY - active.downClientY;
      // The dragged card's centre against where its neighbours started: it lands past a card once
      // it has passed that card's centre, which is the same rule in both directions.
      const centre = active.centres[active.from]! + dy;
      let to = active.from;
      while (to > 0 && centre < active.centres[to - 1]!) to--;
      while (to < active.centres.length - 1 && centre > active.centres[to + 1]!) to++;
      active.to = to;
      paint(active, dy);
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
      // The store, not the press, says what there is to reorder: capture outlives the cards, so
      // a gesture held while an undo or a ./scripts/drive command edits the rack was measured
      // against a list that no longer exists, and the index it ended on would land the card
      // somewhere nobody dragged it. Same reason LoopHandles re-reads the loop on release.
      const effects = deckIn(instrument.state.getState().decks, deck).effects;
      if (effects.length !== active.cards.length) return;
      if (effects[active.from]?.id !== active.instance) return;
      reorder(active.instance, active.to);
    },
    [instrument, deck, drag, reorder],
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
    (index: number, instance: EffectInstanceId, last: number): DragHandleProps => ({
      onPointerDown: (event) => {
        begin(event, index, instance);
      },
      // The keyboard path to reordering, which the arrow buttons used to be: the same command,
      // one slot per press, and one slot is as far as a press goes (0062).
      onKeyDown: (event) => {
        const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
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
        reorder(instance, target);
      },
    }),
    [begin, drag, reorder],
  );

  const listProps = useMemo(
    () => ({ onPointerMove: move, onPointerUp: up, onPointerCancel: cancel }),
    [move, up, cancel],
  );

  return { listRef, listProps, dragHandle };
}
