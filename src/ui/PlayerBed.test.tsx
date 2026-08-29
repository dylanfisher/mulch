/**
 * @role What the ground's own run offers and which field each gesture patches: the clock its
 *   period is counted on — jumps, parts or whole rounds of the song — and the three amounts a move
 *   is shaped by (0192, 0183).
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

import { type PlayerDefaults, type PlayerSpec } from "@/lib/player";
import { PLAYER_BED_DISTANCE_MAX, PLAYER_BED_DISTANCE_MIN, PLAYER_BED_PERS } from "@/lib/playerBed";
import { PLAYER_BED_KNOBS } from "@/lib/playerKnobs";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { PLAYER_BED_PER_LABEL, PLAYER_BED_PER_LABELS } from "@/lib/copyGround";
import { PlayerBed } from "@/ui/PlayerBed";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";

const PLAYER: PlayerSpec = {
  bed: 0,
  bedPer: "jump",
  beds: [],
  bedEvery: 0,
  bedDistance: 2,
  bedBias: 0,
  bedHome: 0,
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
  song: [],
  cast: PLAYER_CAST_MAX,
};

const DEFAULTS: PlayerDefaults = { ...PLAYER };

type Group = {
  onValueChange?: (value: string[]) => void;
  value?: unknown;
  dial?: unknown;
  children?: unknown;
};

/** The one control in this run that is a set of presses rather than a dial, found by the
 *  handler it carries: the three clocks a period may be counted on (0192). */
const clocks = (element: unknown): Group | null => {
  let found: Group | null = null;
  const walk = (node: unknown): void => {
    if (found !== null) return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Group>(node)) return;
    const { props } = node;
    if (props.onValueChange !== undefined) {
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

describe("the ground's run", () => {
  /**
   * One clock per press, sent as the whole spec the card patches (0089) — and the press on the one
   * already live sends nothing: Base UI clears the group when a pressed item is pressed again, and
   * a period is always counted on one of the three, so an empty selection is no change rather than
   * a spec with no clock (principle 5).
   */
  it("patches the clock a press names, and sends nothing for an empty selection", () => {
    const { element, patch } = run();
    const group = clocks(element);
    group?.onValueChange?.(["part"]);
    expect(patch).toHaveBeenCalledExactlyOnceWith({ bedPer: "part" });
    group?.onValueChange?.([]);
    group?.onValueChange?.(["bar"]);
    expect(patch).toHaveBeenCalledTimes(1);
  });

  /**
   * And it offers exactly the clocks the module declares, with the live one pressed: a fourth word
   * here would be a clock the walk has no counter for, and a missing one would be a spec a hand
   * could reach but not leave (principle 1).
   */
  it("draws the three words beside the dial they count for", () => {
    // In the Every dial's own run and on the card from the start: nothing on this card is behind
    // anything, so what a hand can turn is what it can see (0195).
    const drawn = renderToStaticMarkup(run().element);
    for (const per of PLAYER_BED_PERS) expect(drawn).toContain(PLAYER_BED_PER_LABELS[per]);
    expect(drawn).toContain(PLAYER_BED_PER_LABEL);
    // And each of the three amounts named for the dial it shapes, because the jump's own Distance
    // and Home are on the same card (0135, 0195).
    for (const knob of PLAYER_BED_KNOBS) {
      expect(drawn).toContain(`${PLAYER_KNOB_LABELS.bedEvery} ${PLAYER_KNOB_LABELS[knob]}`);
    }
  });

  it("draws every clock the module declares, and holds the one the spec is on", () => {
    const group = clocks(run({ ...PLAYER, bedPer: "song" }).element);
    expect(group?.value).toEqual(["song"]);
    const items = Array.isArray(group?.children) ? group.children : [];
    expect(
      items.map((item) => (isValidElement<{ value: string }>(item) ? item.props.value : null)),
    ).toEqual([...PLAYER_BED_PERS]);
    for (const per of PLAYER_BED_PERS) expect(PLAYER_BED_PER_LABELS[per]).not.toBe("");
  });

  /**
   * The distance is whole sixteenths in the spec and a share of the sample under the dial, which
   * is the whole of 0193: the top of it reads a hundred percent because a move there may land
   * anywhere in the file, and the crawl at the bottom keeps a decimal so its readings differ.
   */
  it("spells how far one move may travel as the share of the sample it crosses", () => {
    const open = (bedDistance: number) =>
      renderToStaticMarkup(run({ ...PLAYER, bedDistance }).element);
    expect(open(PLAYER_BED_DISTANCE_MAX)).toContain("100%");
    expect(open(PLAYER_BED_DISTANCE_MIN)).toContain("0.1%");
    // One bed a move — the ceiling this dial had before it could cross the file.
    expect(open(PLAYER_SLOTS)).toContain("1.6%");
  });
});
