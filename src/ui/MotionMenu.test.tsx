/**
 * @role The knob menu's rows as controls: the characters and the counts are one shape, each
 *   pressed on what the session holds for this lane (0314), and under them the two presses that
 *   carry a whole motion off one knob and onto another (0319).
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
    // The clipboard row reads the one motion in hand; outside a renderer that read is the
    // snapshot, which is the module's own state and is what the presses below change.
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
  };
});

import { isValidElement, type ReactElement } from "react";

import type { AutomationLane, AutomationPoint, AutomationRange } from "@/lib/automation";
import { MOTION_CHARACTER_LABELS, MOTION_COPY, MOTION_PASTE } from "@/lib/copyMotion";
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

/** This knob's own range, and the one another knob's motion was drawn in. */
const HERE = { min: 0, max: 1 };
const THERE = { min: 200, max: 8000 };

/**
 * The two toggle groups the menu draws, in the order it draws them: characters, then counts —
 * and, under them, the presses that carry a motion off the knob and onto it.
 */
const rows = (
  drawn: MotionDrawn | null,
  lane: readonly AutomationPoint[] | null = null,
  range: AutomationRange = HERE,
) => {
  const onDraw = vi.fn<(character: MotionCharacter) => void>();
  const onEvery = vi.fn<(passes: MotionRedraw) => void>();
  const onPaste = vi.fn<(points: AutomationLane, drawn: MotionDrawn | null) => void>();
  const menu = MotionMenu({ named: "Yard A Gain", lane, range, drawn, onDraw, onEvery, onPaste });
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
  const presses = called.filter((element) => typeof element.props["onPress"] === "function");
  const press = (word: string) => {
    const button = presses.find((element) => element.props["word"] === word);
    if (button === undefined) return null;
    const onPress = button.props["onPress"];
    if (typeof onPress !== "function") throw new Error("that press has no press");
    // The props of a walked element are `unknown` by construction; a press takes nothing this
    // suite hands it.
    // oxlint-disable-next-line no-unsafe-type-assertion
    return { props: button.props, click: onPress as () => void };
  };
  return { characters, counts, onDraw, onEvery, onPaste, press };
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

// The clipboard is module state and dies with the tab, so these run in the order they are
// written: nothing is carried until the first copy below (0319).
describe("the motion menu's clipboard row", () => {
  const COPY = MOTION_COPY;
  const PASTE = MOTION_PASTE;
  const lane = [
    { at: 0, value: 200 },
    { at: 1, value: 8000 },
  ];

  it("offers no paste while nothing is carried, and cannot copy off a knob with no lane", () => {
    const empty = rows(null);
    expect(empty.press(PASTE)).toBeNull();
    expect(empty.press(COPY)?.props["disabled"]).toBe(true);
    empty.press(COPY)?.click();
    expect(rows(null).press(PASTE)).toBeNull();
  });

  it("carries the lane, its range and what drew it, and pastes it onto this knob's range", () => {
    rows({ character: "pulse", redraw: 4 }, lane, THERE).press(COPY)?.click();

    const here = rows(null, null, HERE);
    here.press(PASTE)?.click();
    // Both ends of the range it was drawn in, on both ends of the range it landed in.
    expect(here.onPaste.mock.calls).toEqual([
      [
        [
          { at: 0, value: 0 },
          { at: 1, value: 1 },
        ],
        { character: "pulse", redraw: 4 },
      ],
    ]);
  });

  it("pastes a lane a hand rode with nothing having drawn it", () => {
    rows(null, lane, THERE).press(COPY)?.click();

    const here = rows({ character: "creep", redraw: 2 }, null, HERE);
    here.press(PASTE)?.click();
    expect(here.onPaste.mock.calls[0]?.[1]).toBeNull();
  });
});
