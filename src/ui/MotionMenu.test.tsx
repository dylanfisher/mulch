/**
 * @role The knob menu's two rows as controls: the characters and the counts are one shape, each
 *   pressed on what the session holds for this lane (0314).
 * @instead What a press then sends, and what a drawn lane does per frame →
 *   src/ui/ParameterKnobMenu.test.tsx. What each character draws → src/lib/motion.ts.
 */
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The two hooks the rows call, made callable outside a renderer — the stand-in every suite over
// a hand-built mount in this directory declares for itself (`vi.mock` is hoisted per module).
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
  };
});

import { isValidElement, type ReactElement } from "react";

import { MOTION_CHARACTER_LABELS } from "@/lib/copyMotion";
import { type MotionCharacter, type MotionDrawn, type MotionRedraw } from "@/lib/motion";
import { MotionMenu } from "@/ui/MotionMenu";

/** Every element the menu drew, flattened — the rows and the items inside them. */
function* elements(node: unknown): Generator<ReactElement<Record<string, unknown>>> {
  if (Array.isArray(node)) {
    for (const child of node) yield* elements(child);
    return;
  }
  if (!isValidElement<{ children?: unknown }>(node)) return;
  // The rows are components of their own, so they are called rather than walked into: what a
  // suite outside a renderer sees is one level of the tree per call.
  yield node as ReactElement<Record<string, unknown>>;
  yield* elements(node.props.children);
}

/** One group's press, as the handler a toggle group hands its items. */
const pressOf = (group: ReactElement<Record<string, unknown>>): ((next: string[]) => void) => {
  const press = group.props["onValueChange"];
  if (typeof press !== "function") throw new Error("that row has no press");
  // The props of a walked element are `unknown` by construction; this is the one shape a toggle
  // group's `onValueChange` has.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return press as (next: string[]) => void;
};

/** The two toggle groups the menu draws, in the order it draws them: characters, then counts. */
const rows = (drawn: MotionDrawn | null) => {
  const onDraw = vi.fn<(character: MotionCharacter) => void>();
  const onEvery = vi.fn<(passes: MotionRedraw) => void>();
  const menu = MotionMenu({ named: "Yard A Gain", drawn, onDraw, onEvery });
  const called: ReactElement<Record<string, unknown>>[] = [];
  for (const element of elements(menu)) {
    // The rows are function components, so the way to see what they drew is to call them — which
    // the react stand-in above is what makes possible outside a renderer.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const row = element.type as ((props: Record<string, unknown>) => unknown) | string;
    if (typeof row === "function") called.push(...elements(row(element.props)));
  }
  const groups = called.filter((element) => Array.isArray(element.props["value"]));
  const [characters, counts] = groups;
  if (characters === undefined || counts === undefined) throw new Error("no rows");
  return { characters, counts, onDraw, onEvery };
};

describe("the motion menu's character row", () => {
  it("presses nothing while no motion drew the lane, and offers every character", () => {
    const { characters } = rows(null);
    expect(characters.props["value"]).toEqual([]);
    // One item per character, in the order they are declared: the row offers all five whether or
    // not one is standing.
    const offered = [...elements(characters)]
      .map((element) => element.props["character"])
      .filter((character) => typeof character === "string");
    expect(offered).toEqual(Object.keys(MOTION_CHARACTER_LABELS));
  });

  // The row is pressed on the character the session holds, which is what makes the standing one
  // visible at all (0314).
  it("presses the stored character", () => {
    expect(rows({ character: "creep", redraw: 0 }).characters.props["value"]).toEqual(["creep"]);
  });

  it("draws in the character pressed, and in the standing one when the lit item is pressed", () => {
    const { characters, onDraw } = rows({ character: "creep", redraw: 2 });
    const onValueChange = pressOf(characters);

    onValueChange(["pulse"]);
    // Base UI clears the group when the pressed item was already on, and that is a redraw in the
    // same character rather than a press that says nothing (0311).
    onValueChange([]);

    expect(onDraw.mock.calls).toEqual([["pulse"], ["creep"]]);
  });
});

describe("the motion menu's redraw row", () => {
  // A lane nothing drew is never redrawn, so there is no count to set on one (0311, 0314).
  it("stands disabled and off while no motion drew the lane", () => {
    const { counts } = rows(null);
    expect(counts.props["disabled"]).toBe(true);
    expect(counts.props["value"]).toEqual(["0"]);
  });

  it("presses the stored count and sends the one that was pressed", () => {
    const { counts, onEvery } = rows({ character: "smooth", redraw: 4 });
    expect(counts.props["disabled"]).toBe(false);
    expect(counts.props["value"]).toEqual(["4"]);
    const onValueChange = pressOf(counts);

    onValueChange(["2"]);
    // An empty selection is a press on the lit count, which is already what it says: nothing.
    onValueChange([]);

    expect(onEvery.mock.calls).toEqual([[2]]);
  });
});
