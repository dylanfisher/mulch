/**
 * @role Which of the mulcher card's registers each of its folds puts away, and which of them wears
 *   a bordered box: the fine tune's stack of boxes (0198), the ground's fold beside it (0217) and
 *   the arrangement's below that (0200) — each opening only its own half, and none of them saying
 *   anything to the instrument, because a fold is a view preference and never an edit (plan §2).
 * @instead What each gesture on the card sends → src/ui/PlayerCard.test.tsx. The props both
 *   suites hand the card → src/ui/playerCardDouble.ts. What a box is → src/ui/PlayerGroup.tsx.
 */
// Four dependencies over the cap, and every one of them is a word this card says or a control it
// says it with: four copy modules for the labels a fold hides, and the three components the walk
// below names by identity rather than by a string of its own (principle 1). Read and judged — see
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The one hook this strip calls, made callable outside a renderer — the same stand-in
// src/ui/PlayerCard.test.tsx uses, and it has to be declared per file (`vi.mock` is hoisted into
// the module that asks for it).
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    // And the one the burst's own gestures keep their presses in: a box per call, which is what a
    // suite calling the card once per case wants anyway (src/ui/playerBurstControls.ts).
    useRef: (initial: unknown) => ({ current: initial }),
  };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import {
  PLAYER_CAST_LABEL,
  PLAYER_GROUP_LABELS,
  PLAYER_LABEL,
  PLANT_LABEL,
  RESEED_LABEL,
} from "@/lib/copy";
import { PLAYER_BED_PER_LABEL } from "@/lib/copyGround";
import { PLAYER_FINE_LABEL, PLAYER_FRONT_LABEL } from "@/lib/copyCard";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PlayerArrange } from "@/ui/PlayerArrange";
import { PlayerBed } from "@/ui/PlayerBed";
import { PlayerDial } from "@/ui/PlayerDial";
import { PlayerGroup } from "@/ui/PlayerGroup";
import { PLAYER, playerCard, type CardView } from "@/ui/playerCardDouble";

/** The card on a looped, loaded deck holding a pattern, with the folds this case is about set. */
const card = (view: CardView = {}) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send").mockImplementation(() => {});
  return { element: playerCard(instrument, { player: PLAYER }, view), sent };
};

/** That card as markup, which is what a fold's claim is read off. */
const drawn = (view: CardView = {}): string => renderToStaticMarkup(card(view).element);

/** How many bordered boxes the card drew. */
const boxes = (markup: string): number => markup.match(/data-slot="player-group"/gu)?.length ?? 0;

/** The boxes the card has left once the two folds that wear none are counted out (0200, 0217). */
const BOXED = Object.keys(PLAYER_GROUP_LABELS).length - 2;

/** The props a control of this card carries, as this walk needs to read them. */
type Control = {
  children?: unknown;
  /** The two a control of the module carries and nothing else on this card does: the spec it
   *  reads and what it snaps back to (src/ui/PlayerMore.tsx). */
  player?: unknown;
  defaults?: unknown;
};

/**
 * Every control of the module the card drew outside the fine tune's boxes: a dial or one of the
 * runs, which are what carry both the spec and what it snaps back to. The claim is that the fine
 * tune has no ungrouped *row* left to put a dial on (0173), so what this finds is exactly the two
 * folds beside it — the ground's controls and the arrangement's run, each a fold of the card
 * rather than a question inside its fine tune (0200, 0217).
 */
const ungrouped = (element: unknown): string[] => {
  const found: string[] = [];
  const walk = (node: unknown, inside: boolean): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child, inside);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    const { type, props } = node;
    if (props.player !== undefined && props.defaults !== undefined) {
      if (!inside) found.push(typeof type === "function" ? type.name : type);
      return;
    }
    walk(props.children, inside || type === PlayerGroup);
  };
  walk(element, false);
  return found;
};

// One case per fold the card has, and each is a paragraph of claims about what that fold took
// with it. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the mulcher card's folds", () => {
  /**
   * P130: the body is bordered boxes with an eyebrow each rather than one wrap of fourteen
   * controls at the same distance from one another, and every control the fine tune holds stands
   * inside one of them — a dial added to the module joins a box, because there is no ungrouped row
   * left under that fold to put it on (0173).
   */
  it("draws the fine tune's dials in its boxes and nothing outside them", () => {
    const markup = drawn();
    for (const label of Object.values(PLAYER_GROUP_LABELS)) expect(markup).toContain(label);
    // Two boxes short of the labels: the ground's word and the arrangement's are folds of the card
    // rather than eyebrows on boxes, and a lone box under either would be a frame around the only
    // thing there (0200, 0217). Every other question is a box.
    expect(boxes(markup)).toBe(BOXED);
    // Every control the card draws inside the fine tune is inside a box: the walk above finds each
    // one's ancestry, and an ungrouped dial under that fold is what it fails on. The ground's two
    // and the arrangement are the things outside them, in the order the card draws them, because
    // neither is one of the fine tune's (0200, 0217).
    expect(ungrouped(card().element)).toEqual([
      PlayerDial.name,
      PlayerBed.name,
      PlayerArrange.name,
    ]);
  });

  /**
   * 0198: the fine tune is a fold and the yard opens it shut, so what a card is met by is the
   * front. The boxes go with it and the front stays — the picture, the six names and the reseed
   * are above the word, not under it — and nothing is sent either way (plan §2, 0107).
   */
  it("folds its fine tune away without taking the front with it", () => {
    const open = drawn();
    const shut = drawn({ fine: true });
    // The word itself stands either way: it is the control that opens the boxes back up.
    expect(shut).toContain(PLAYER_FINE_LABEL);
    // And every box it holds is behind it, which is the whole of what the fold does — every box
    // but the ground's and the arrangement's, which are not its own and stand on folds beside it
    // (0200, 0217).
    for (const [key, label] of Object.entries(PLAYER_GROUP_LABELS)) {
      expect(open).toContain(label);
      if (key === "arrange" || key === "ground") expect(shut).toContain(label);
      else expect(shut).not.toContain(label);
    }
    expect(boxes(shut)).toBe(0);
    // The front is not: a press on a name and a reseed are the shortest road to a pattern worth
    // hearing, and a fold that put them away would be the fold 0197 refused (0152, 0197).
    expect(shut).toContain(RESEED_LABEL);
    expect(shut).toContain(PLAYER_FRONT_LABEL);
    expect(card({ fine: true }).sent).not.toHaveBeenCalled();
  });

  /**
   * 0217: which ground the loop is read on is not a fine tune of it either. It is out of that fold
   * and on one of its own above the arrangement's, whose eyebrow is the box's own heading and
   * whose box is gone — one word and one door, rather than a frame around the only thing under it.
   * Its picture, its dials and its kept grounds go behind it, the fine tune's boxes stay, and each
   * fold moves only its own half, which is what says the two are beside each other rather than one
   * inside the other. Nothing is sent either way (plan §2).
   */
  it("folds the ground on its own eyebrow, beside the fine tune and not inside it", () => {
    const open = drawn();
    const shut = drawn({ ground: true });
    // The heading stands either way — it is the control — and it is said once, not twice: the box
    // that used to carry the word is gone, and the fold's own toggle is what carries it now.
    expect(shut.match(new RegExp(PLAYER_GROUP_LABELS.ground, "gu"))?.length).toBe(1);
    // Everything it held goes: the dial the bed is set on, the periods behind the strip beside it,
    // and the gesture that keeps a ground.
    expect(open).toContain(PLAYER_KNOB_LABELS.bed);
    expect(shut).not.toContain(PLAYER_KNOB_LABELS.bed);
    expect(shut).not.toContain(PLAYER_BED_PER_LABEL);
    expect(shut).not.toContain(`${PLANT_LABEL} ${PLAYER_LABEL} on Yard A`);
    // And the fine tune's boxes all stay: none of them was ever this fold's, because it has no box
    // of its own to take away (0217).
    expect(boxes(shut)).toBe(BOXED);
    expect(shut).toContain(PLAYER_FINE_LABEL);
    // Each fold moves its own half and no more: the fine tune shut leaves the ground's own word
    // and dials on the card, which is the whole of what "beside it" means (0217).
    const fineShut = drawn({ fine: true });
    expect(fineShut).toContain(PLAYER_KNOB_LABELS.bed);
    expect(fineShut).toContain(PLAYER_GROUP_LABELS.ground);
    expect(shut).toContain(PLAYER_KNOB_LABELS.distance);
    expect(card({ ground: true }).sent).not.toHaveBeenCalled();
  });

  /**
   * 0200: how a pattern is arranged is not a fine tune of it. The box is out of that fold and on
   * one of its own, whose eyebrow is the box's own heading — one word and one door, rather than a
   * toggle above a box repeating what the box already says. Its dials go behind it and every other
   * box stays, and nothing is sent either way (plan §2).
   */
  it("folds the arrangement on its own eyebrow, beside the fine tune and not inside it", () => {
    const open = drawn();
    const shut = drawn({ arrange: true });
    // The heading stands either way — it is the control — and it is said once, not twice.
    expect(shut.match(new RegExp(PLAYER_GROUP_LABELS.arrange, "gu"))?.length).toBe(1);
    // The run behind it goes — the cast among it, which is the one word only the arrangement says
    // — and every box of the card stays: the fine tune is untouched, and none of them was ever
    // this one's, because it has no box of its own to take away (0200).
    expect(open).toContain(PLAYER_CAST_LABEL);
    expect(shut).not.toContain(PLAYER_CAST_LABEL);
    expect(shut).toContain(PLAYER_KNOB_LABELS.distance);
    expect(shut).toContain(PLAYER_FINE_LABEL);
    expect(boxes(shut)).toBe(BOXED);
    expect(card({ arrange: true }).sent).not.toHaveBeenCalled();
  });
});
