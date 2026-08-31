/**
 * @role What the written row sends: every gesture hands back the whole row, a cell's number is
 *   stepped inside the bound the module declares, the slot wraps because the grid is a ring, and a
 *   part nobody has written says so rather than drawing an empty row (0188).
 * @instead What the walk does with a row → src/lib/playerStrip.test.ts. The one `deck.player` this
 *   row's `onChange` becomes → src/ui/PlayerPart.tsx and src/ui/PlayerSong.test.tsx. What a cell
 *   is → src/lib/playerStrip.ts.
 */
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The three hooks the row calls, made callable outside a renderer so a control's own handler can
// be pressed — the same stand-in src/ui/PlayerSong.test.tsx uses, with `useState` beside them
// because which cell is lit is this component's own view state (plan §2).
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    // Held at the row's first cell, which is what a fresh row is pointed at: what these cases are
    // about is what a press sends, and never which cell a previous press lit.
    useState: (initial: unknown) => [initial, () => {}],
  };
});

import { PLAYER_STRIP_ADD, PLAYER_STRIP_EMPTY, PLAYER_STRIP_LABELS } from "@/lib/copyStrip";
import { PLAYER_REPEATS_MIN } from "@/lib/playerRepeats";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import type { PartStep } from "@/lib/playerStrip";
import { PlayerStrip } from "@/ui/PlayerStrip";

const ROW: PartStep[] = [
  { slot: 0, repeats: 4, rest: 0 },
  { slot: 3, repeats: 2, rest: 1 },
];

type Control = {
  onClick?: () => void;
  onPressedChange?: (pressed: boolean) => void;
  "aria-label"?: string;
  steps?: readonly PartStep[];
  cell?: PartStep;
  field?: { key: string };
  children?: unknown;
};

/**
 * One control of the row, by the name it wears. The row, its cells and its steppers are components
 * of their own — which is what keeps a handler off the parent's render (src/ui/PlayerStrip.tsx) —
 * so the walk calls those three and descends into everything else.
 */
const labelled = (node: unknown, label: string): Control | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = labelled(child, label);
      if (found !== null) return found;
    }
    return null;
  }
  if (!isValidElement<Control>(node)) return null;
  const { type, props } = node;
  if (props["aria-label"] === label) return props;
  const own = props.steps !== undefined || props.cell !== undefined || props.field !== undefined;
  if (typeof type === "function" && own) {
    // A function component and a class one are both functions to `typeof`, and only one is
    // callable; this tree holds no class components.
    // oxlint-disable-next-line no-unsafe-type-assertion
    return labelled((type as (props: Control) => unknown)(props), label);
  }
  return labelled(props.children, label);
};

const row = (steps: readonly PartStep[], onChange: (next: readonly PartStep[]) => void) => (
  <PlayerStrip named="Yard A Part 1" steps={steps} onChange={onChange} />
);

describe("the row a part is written as", () => {
  /** A part with no row is drawn by its dials, which is not a failure and says so in words. */
  it("says a part nobody wrote is drawn by its dials", () => {
    const markup = renderToStaticMarkup(row([], () => {}));
    expect(markup).toContain(PLAYER_STRIP_EMPTY);
  });

  /** Each cell reads out its three numbers, and the number between two of them is the jump. */
  it("draws each cell and the jump between two of them", () => {
    const markup = renderToStaticMarkup(row(ROW, () => {}));
    expect(markup).toContain("00 ×4");
    expect(markup).toContain("03 ×2 ·1");
    expect(markup).toContain("+3");
  });

  /** Every gesture hands back the whole row: the part sends one `deck.player` for it (0089). */
  it("appends a cell at the last one's own numbers", () => {
    const sent = vi.fn<(next: readonly PartStep[]) => void>();
    labelled(row(ROW, sent), `${PLAYER_STRIP_ADD} Yard A Part 1`)?.onClick?.();
    expect(sent).toHaveBeenCalledWith([...ROW, ROW[1]]);
    // And the first cell of an empty row opens at the top of the loop, where a play begins.
    labelled(row([], sent), `${PLAYER_STRIP_ADD} Yard A Part 1`)?.onClick?.();
    expect(sent).toHaveBeenLastCalledWith([{ slot: 0, repeats: PLAYER_REPEATS_MIN, rest: 0 }]);
  });

  /**
   * The slot wraps and the amounts clamp, which is the difference between a place and an amount:
   * the grid is a ring the walk itself wraps a jump onto (0162), and a count is not.
   */
  it("wraps the slot round the grid and clamps the numbers that are not places", () => {
    const sent = vi.fn<(next: readonly PartStep[]) => void>();
    const top: PartStep[] = [{ slot: PLAYER_SLOTS - 1, repeats: 1, rest: 0 }];
    labelled(row(top, sent), `${PLAYER_STRIP_LABELS.slot} up Yard A Part 1`)?.onClick?.();
    expect(sent).toHaveBeenCalledWith([{ slot: 0, repeats: 1, rest: 0 }]);
    // The count is already at its floor, so a press down leaves it there rather than going under.
    labelled(row(top, sent), `${PLAYER_STRIP_LABELS.repeats} down Yard A Part 1`)?.onClick?.();
    expect(sent).toHaveBeenLastCalledWith(top);
  });
});
