/**
 * @role What the kept row sends: every gesture hands back the whole list, a count is stepped
 *   inside the bound the module declares, the `+` adds the ground the window is on and never takes
 *   one away, and a ground nobody has kept says so rather than drawing an empty row (0194, P165).
 * @instead When a kept ground actually comes round → src/lib/playerBed.test.ts. What keeping one
 *   does to the list → src/lib/playerGround.test.ts. The picture the same list is drawn on, and
 *   the Option press that writes it there → src/ui/PlayerGround.test.tsx.
 */
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The two hooks the row calls, made callable outside a renderer so a control's own handler can be
// pressed, with `useState` beside them because which kept ground is lit is this component's own
// view state (plan §2, src/ui/PlayerStrip.test.tsx).
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    // Held at the row's first ground, which is what a fresh row is pointed at: these cases are
    // about what a press sends and never about which press lit what.
    useState: (initial: unknown) => [initial, () => {}],
  };
});

import {
  PLAYER_BEDS_EMPTY,
  PLAYER_BEDS_EVERY,
  PLAYER_BEDS_FULL,
  PLAYER_BEDS_KEEP,
  PLAYER_BEDS_KEPT,
  PLAYER_BEDS_REMOVE,
} from "@/lib/copyGround";
import {
  PLAYER_BED_ROUND,
  PLAYER_BED_ROUND_MAX,
  PLAYER_BEDS_MAX,
  type PlantedBed,
} from "@/lib/playerBed";
import { PlayerBeds } from "@/ui/PlayerBeds";

const KEPT: PlantedBed[] = [
  { bed: -2, every: 4 },
  { bed: 5, every: 16 },
];

const NAMED = "Yard A Which Ground";

type Control = {
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
  beds?: readonly PlantedBed[];
  kept?: PlantedBed;
  children?: unknown;
};

/**
 * One control of the row, by the name it wears. The row and each kept ground on it are components
 * of their own — which is what keeps a handler off the parent's render (src/ui/PlayerBeds.tsx) —
 * so the walk calls those two and descends into everything else.
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
  const own = props.beds !== undefined || props.kept !== undefined;
  if (typeof type === "function" && own) {
    // A function component and a class one are both functions to `typeof`, and only one is
    // callable; this tree holds no class components.
    // oxlint-disable-next-line no-unsafe-type-assertion
    return labelled((type as (props: Control) => unknown)(props), label);
  }
  return labelled(props.children, label);
};

const row = (
  beds: readonly PlantedBed[],
  onChange: (next: readonly PlantedBed[]) => void,
  bed = 0,
) => <PlayerBeds named={NAMED} beds={beds} bed={bed} onChange={onChange} />;

// One case per gesture the row offers, and P165 made the `+` two of them — the add and the two
// refusals it says out loud. Read and judged, well under the file's own cap; see
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the row of kept grounds", () => {
  /** A pattern that keeps nothing only wanders, which is not a failure and says so in words. */
  it("says a ground nobody kept is a ground that only wanders", () => {
    expect(renderToStaticMarkup(row([], () => {}))).toContain(PLAYER_BEDS_EMPTY);
  });

  /** Each kept ground reads out which one it is and how often the song comes back to it. */
  it("draws which ground each one is and the count it comes round on", () => {
    const markup = renderToStaticMarkup(row(KEPT, () => {}));
    expect(markup).toContain("-2 ×4");
    expect(markup).toContain("+5 ×16");
  });

  /**
   * The `+` keeps the ground the window is on and adds nothing else: pressing it on one window and
   * then on another leaves both kept, where the toggle it used to write emptied the row on the
   * second press (P165).
   */
  it("keeps the ground the window is on, a second and a third time over", () => {
    const sent = vi.fn<(next: readonly PlantedBed[]) => void>();
    labelled(row([], sent, 3), `${PLAYER_BEDS_KEEP} ${NAMED}`)?.onClick?.();
    expect(sent).toHaveBeenCalledWith([{ bed: 3, every: PLAYER_BED_ROUND }]);
    const one: PlantedBed[] = [{ bed: 3, every: PLAYER_BED_ROUND }];
    labelled(row(one, sent, -1), `${PLAYER_BEDS_KEEP} ${NAMED}`)?.onClick?.();
    expect(sent).toHaveBeenLastCalledWith([{ bed: -1, every: PLAYER_BED_ROUND }, ...one]);
    const two = [{ bed: -1, every: PLAYER_BED_ROUND }, ...one];
    labelled(row(two, sent, 7), `${PLAYER_BEDS_KEEP} ${NAMED}`)?.onClick?.();
    expect(sent).toHaveBeenLastCalledWith([...two, { bed: 7, every: PLAYER_BED_ROUND }]);
  });

  /**
   * And says why it is unavailable rather than sitting dead — as the accessible name and not only
   * as the tooltip, because a disabled control opens no tooltip (principle 5).
   */
  it("refuses the ground it already holds, and says which refusal it is", () => {
    const sent = vi.fn<(next: readonly PlantedBed[]) => void>();
    const kept = labelled(row(KEPT, sent, 5), `${PLAYER_BEDS_KEPT} ${NAMED}`);
    expect(kept?.disabled).toBe(true);
    expect(labelled(row(KEPT, sent, 5), `${PLAYER_BEDS_KEEP} ${NAMED}`)).toBeNull();
    const full: PlantedBed[] = Array.from({ length: PLAYER_BEDS_MAX }, (_, at) => ({
      bed: at + 1,
      every: 4,
    }));
    expect(labelled(row(full, sent, 0), `${PLAYER_BEDS_FULL} ${NAMED}`)?.disabled).toBe(true);
    // And already-kept wins where both are true: a full row whose window is on a ground it holds
    // is not fixed by letting one go, so "let one go" is the wrong sentence to say.
    expect(labelled(row(full, sent, 1), `${PLAYER_BEDS_KEPT} ${NAMED}`)?.disabled).toBe(true);
    expect(sent).not.toHaveBeenCalled();
  });

  /** Every other gesture hands back the whole list, which the card sends as one spec (0089). */
  it("steps the lit ground's count and clamps it at the module's own ceiling", () => {
    const sent = vi.fn();
    labelled(row(KEPT, sent), `${PLAYER_BEDS_EVERY} up ${NAMED}`)?.onClick?.();
    expect(sent).toHaveBeenCalledWith([{ bed: -2, every: 5 }, KEPT[1]]);
    const top: PlantedBed[] = [{ bed: -2, every: PLAYER_BED_ROUND_MAX }];
    labelled(row(top, sent), `${PLAYER_BEDS_EVERY} up ${NAMED}`)?.onClick?.();
    expect(sent).toHaveBeenLastCalledWith(top);
  });

  it("lets the lit ground go, leaving the rest of the list where it was", () => {
    const sent = vi.fn();
    labelled(row(KEPT, sent), `${PLAYER_BEDS_REMOVE} ${NAMED}`)?.onClick?.();
    expect(sent).toHaveBeenCalledWith([KEPT[1]]);
  });
});
