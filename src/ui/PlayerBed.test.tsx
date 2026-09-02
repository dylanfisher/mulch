/**
 * @role What the ground's own run offers and which field each gesture patches: the clock its
 *   period is counted on — jumps, parts or whole rounds of the song — and the three rows of words
 *   a move is said in, whether it wanders, how far and which way (0192, 0277, P158).
 */
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The two hooks this component calls, made callable outside a renderer so a control's own handler
// can be pressed — the same stand-in src/ui/PlayerDistance.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
  };
});

// One import per bound the run's controls are asserted against, so the count tracks how many
// amounts the module declares rather than anything this suite does. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_BED_PERS, PLAYER_BED_REACHES, PLAYER_BED_WAYS } from "@/lib/playerBed";
import {
  PLAYER_BED_PER_LABEL,
  PLAYER_BED_PER_LABELS,
  PLAYER_BED_REACH_LABEL,
  PLAYER_BED_REACH_LABELS,
  PLAYER_BED_WANDERS_LABEL,
  PLAYER_BED_WANDERS_LABELS,
  PLAYER_BED_WAY_LABEL,
  PLAYER_BED_WAY_LABELS,
} from "@/lib/copyGround";
import { PlayerBed } from "@/ui/PlayerBed";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";

const PLAYER: PlayerSpec = {
  bypassed: false,
  bed: 0,
  bedPer: "jump",
  beds: [],
  bedEvery: 0,
  bedWanders: true,
  bedReach: "nudge",
  bedWay: "either",
  seed: 9,
  bias: 0.5,
  stride: 0.25,
  home: 0.1,
  phrase: 0,
  phraseKeep: 4,
  phraseChance: 0,
  phraseReturn: 0,
  arrange: 0,
  arrangeKeep: 4,
  arrangeChance: 0,
  arrangeReturn: 0,
  arrangeAmount: 1,
  arrangeGrow: 0,
  arrangeSpan: 0,
  arrangeApart: 0,
  distance: 3,
  repeats: 4,
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  ratchet: 0,
  gate: 0.5,
  drop: 0,
  reverse: 0,
  spark: 0,
  sparkLevel: 0.5,
  sparkDelay: 0,
  burst: 0.25,
  vary: 0,
  varyChance: 1,
  rest: 0,
  restPulses: 0,
  restSpan: 8,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
  climb: 0,
  songs: [],
  cast: PLAYER_CAST_MAX,
};

const DEFAULTS: PlayerDefaults = { ...PLAYER };

type Group = {
  onValueChange?: (value: string[]) => void;
  value?: unknown;
  "aria-label"?: string;
  dial?: unknown;
  children?: readonly unknown[];
  words?: readonly string[];
};

/**
 * One row of the board, found by the eyebrow its group is named under: the rows are a component
 * of the run's own, so it is called rather than descended into — the identity `useCallback` above
 * is what makes that possible (the shape `handlers` takes for a dial, src/ui/playerCardDouble.ts).
 */
const row = (element: unknown, eyebrow: string): Group | null => {
  let found: Group | null = null;
  const walk = (node: unknown): void => {
    if (found !== null) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Group>(node)) return;
    const { type, props } = node;
    if (typeof type === "function" && props.words !== undefined) {
      // A function component and a class one are both functions to `typeof`, and only one is
      // callable; this tree holds no class components.
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Group) => unknown)(props));
      return;
    }
    if (props.onValueChange !== undefined && props["aria-label"]?.endsWith(eyebrow) === true) {
      found = props;
      return;
    }
    walk(props.dial);
    walk(props.children);
  };
  walk(element);
  return found;
};

const run = (player: PlayerSpec = PLAYER) => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerBed({
    deck: "a",
    named: "",
    player,
    defaults: DEFAULTS,
    patch,
  });
  return { element, patch };
};

/** The four rows, each with the words its presses are mapped from and how each spells. */
const ROWS: readonly (readonly [string, readonly string[], Record<string, string>])[] = [
  [PLAYER_BED_PER_LABEL, PLAYER_BED_PERS, PLAYER_BED_PER_LABELS],
  [PLAYER_BED_WANDERS_LABEL, ["stays", "wanders"], PLAYER_BED_WANDERS_LABELS],
  [PLAYER_BED_REACH_LABEL, PLAYER_BED_REACHES, PLAYER_BED_REACH_LABELS],
  [PLAYER_BED_WAY_LABEL, PLAYER_BED_WAYS, PLAYER_BED_WAY_LABELS],
] as const;

// One case per control the run offers and per row it declares; the length tracks how many of
// those there are rather than any logic inside the block.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the ground's run", () => {
  /**
   * One clock per press, sent as the whole spec the card patches (0089) — and the press on the one
   * already live sends nothing: Base UI clears the group when a pressed item is pressed again, and
   * a period is always counted on one of the three, so an empty selection is no change rather than
   * a spec with no clock (principle 5).
   */
  it("patches the clock a press names, and sends nothing for an empty selection", () => {
    const { element, patch } = run();
    const group = row(element, PLAYER_BED_PER_LABEL);
    group?.onValueChange?.(["part"]);
    expect(patch).toHaveBeenCalledExactlyOnceWith({ bedPer: "part" });
    // The third press, named rather than left to the loop below: the round the song comes back on
    // is a clock a hand can reach only if this group sends it (P158).
    group?.onValueChange?.(["song"]);
    expect(patch).toHaveBeenLastCalledWith({ bedPer: "song" });
    group?.onValueChange?.([]);
    group?.onValueChange?.(["bar"]);
    expect(patch).toHaveBeenCalledTimes(2);
  });

  /**
   * And the three rows the move is said in, each patching the one word it is a row of — the
   * switchboard's whole claim is that a press is the setting, with no number behind it (0277).
   * Whether it wanders is the one row whose word is a flag in the spec rather than the word itself.
   */
  it("patches the word a press on each of the three rows names", () => {
    const { element, patch } = run();
    row(element, PLAYER_BED_REACH_LABEL)?.onValueChange?.(["bed"]);
    expect(patch).toHaveBeenLastCalledWith({ bedReach: "bed" });
    row(element, PLAYER_BED_WAY_LABEL)?.onValueChange?.(["back"]);
    expect(patch).toHaveBeenLastCalledWith({ bedWay: "back" });
    row(element, PLAYER_BED_WANDERS_LABEL)?.onValueChange?.(["stays"]);
    expect(patch).toHaveBeenLastCalledWith({ bedWanders: false });
    row(element, PLAYER_BED_WANDERS_LABEL)?.onValueChange?.(["wanders"]);
    expect(patch).toHaveBeenLastCalledWith({ bedWanders: true });
    // A stranger and an empty selection send nothing, on every row (principle 5).
    row(element, PLAYER_BED_REACH_LABEL)?.onValueChange?.(["far"]);
    row(element, PLAYER_BED_WAY_LABEL)?.onValueChange?.([]);
    expect(patch).toHaveBeenCalledTimes(4);
  });

  /**
   * Every word of every row is on the board at once, under its own eyebrow — nothing on this card
   * is behind anything, so what a hand can press is what it can see (0195, 0277). And the words
   * total: one for every member and none left over from a renamed one, asked both ways at once so
   * a missing word and a stale word are the same failure (P158, principle 1).
   */
  it("lays every word of every row on the board, under its eyebrow", () => {
    const drawn = renderToStaticMarkup(run().element);
    for (const [eyebrow, words, labels] of ROWS) {
      expect(drawn).toContain(eyebrow);
      for (const word of words) expect(drawn).toContain(`>${labels[word]}</button>`);
      expect(new Set(Object.keys(labels))).toEqual(new Set(words));
      for (const word of words) expect(labels[word]?.trim()).not.toBe("");
    }
  });

  it("holds the word the spec is on, on every row", () => {
    const element = run({
      ...PLAYER,
      bedPer: "song",
      bedWanders: false,
      bedReach: "anywhere",
      bedWay: "on",
    }).element;
    expect(row(element, PLAYER_BED_PER_LABEL)?.value).toEqual(["song"]);
    expect(row(element, PLAYER_BED_WANDERS_LABEL)?.value).toEqual(["stays"]);
    expect(row(element, PLAYER_BED_REACH_LABEL)?.value).toEqual(["anywhere"]);
    expect(row(element, PLAYER_BED_WAY_LABEL)?.value).toEqual(["on"]);
    // And the presses are mapped from the module's own list, in its order.
    const items = row(element, PLAYER_BED_PER_LABEL)?.children ?? [];
    expect(
      items.map((item) => (isValidElement<{ value: string }>(item) ? item.props.value : null)),
    ).toEqual([...PLAYER_BED_PERS]);
  });
});
