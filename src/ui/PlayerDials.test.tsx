/**
 * @role What the three boxes of dials draw beside the Burst dial, which is the one control on them
 *   that is not a dial and the one that is not a number: the tap, and the toggle holding what is
 *   written to the beat — including that a deck with no grid refuses that toggle rather than
 *   losing it, and that a part's fold, which owns neither, draws the dial alone (P152, 0173,
 *   0176).
 */
import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { PLAYER_GROUP_LABELS, PLAYER_LABEL } from "@/lib/copy";
import { PLAYER_BEAT_LABEL, PLAYER_TAP_LABEL } from "@/lib/copyCard";
import type { PlayerSpec } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER } from "@/ui/playerCardDouble";
import { playerDials, type PlayerBurstProps } from "@/ui/PlayerDials";

const TAP = `${PLAYER_TAP_LABEL} ${PLAYER_LABEL} on Yard A`;
const BEAT = `${PLAYER_BEAT_LABEL} ${PLAYER_LABEL} on Yard A`;

type Node = {
  "aria-label"?: string;
  label?: string;
  knob?: string;
  disabled?: boolean;
  pressed?: boolean;
  onClick?: () => void;
  onPressedChange?: (pressed: boolean) => void;
  children?: unknown;
};

/** Every element under `node` in the order it is drawn, without calling one: a box's controls are
 *  its own children, so nothing here needs a renderer or a hook (src/ui/PlayerGroup.tsx). */
const flatten = (node: unknown): Node[] => {
  if (Array.isArray(node)) return node.flatMap((child) => flatten(child));
  if (!isValidElement<Node>(node)) return [];
  return [node.props, ...flatten(node.props.children)];
};

/** The box the burst is timed in, which is where both gestures belong (0195). */
const timing = (drawn: unknown): Node[] => {
  const box = flatten(drawn).find((node) => node.label === PLAYER_GROUP_LABELS.timing);
  if (box === undefined) throw new Error("the dials drew no How It Is Timed box");
  return flatten(box.children);
};

const found = (drawn: unknown, label: string): Node | undefined =>
  timing(drawn).find((node) => node["aria-label"] === label);

const dials = (burst?: PlayerBurstProps) =>
  playerDials({
    deck: "a",
    named: "",
    player: PLAYER,
    defaults: PLAYER_DEFAULTS,
    patch: vi.fn<(fields: Partial<PlayerSpec>) => void>(),
    // Spread rather than passed as `undefined`: a part's fold hands over no such prop at all, and
    // that is the case this stands in for (`exactOptionalPropertyTypes`).
    ...(burst === undefined ? {} : { burst }),
  });

const controls = (over: Partial<PlayerBurstProps> = {}): PlayerBurstProps => ({
  bpm: 120,
  held: false,
  onHeld: vi.fn<(held: boolean) => void>(),
  onTap: vi.fn<() => void>(),
  ...over,
});

// One case per claim about a control this box draws, and the box draws two of them: the length is
// the number of ways a gesture can be got wrong rather than a judgement of this suite's. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the burst's own two gestures", () => {
  /**
   * Both stand in the box the burst is timed in and after the dial they write, with nothing to
   * open first — the shape the ground's own Plant has (0195).
   */
  it("draws the tap and the hold after the dial they write", () => {
    const drawn = timing(dials(controls()));
    const at = (label: string): number => drawn.findIndex((node) => node["aria-label"] === label);
    const dial = drawn.findIndex((node) => node.knob === "burst");
    expect(dial).toBeGreaterThanOrEqual(0);
    expect(at(TAP)).toBeGreaterThan(dial);
    expect(at(BEAT)).toBeGreaterThan(at(TAP));
  });

  /** A press is a press: the card owns the times it is a mean of (src/ui/playerBurstControls.ts). */
  it("hands a press of the tap straight back to the card", () => {
    const burst = controls();
    found(dials(burst), TAP)?.onClick?.();
    expect(burst.onTap).toHaveBeenCalledTimes(1);
  });

  it("hands the hold's own state back the same way", () => {
    const burst = controls();
    found(dials(burst), BEAT)?.onPressedChange?.(true);
    expect(burst.onHeld).toHaveBeenCalledWith(true);
    expect(found(dials(controls({ held: true })), BEAT)?.pressed).toBe(true);
  });

  /**
   * A deck with no analysis, or one whose analysis found no tempo, has no grid — so the toggle is
   * refused and not absent, the way every control under an off switch is (0121, 0173). The tap
   * needs no grid at all and is offered on the same deck.
   */
  it("refuses the hold on a deck with no grid, and offers the tap anyway", () => {
    const drawn = dials(controls({ bpm: 0 }));
    expect(found(drawn, BEAT)?.disabled).toBe(true);
    const tap = found(drawn, TAP);
    expect(tap).toBeDefined();
    expect(tap?.disabled).toBeFalsy();
  });

  /** And both are refused with the module's own switch off, like every dial beside them. */
  it("refuses both while the switch is off", () => {
    const drawn = playerDials({
      deck: "a",
      named: "",
      player: PLAYER,
      defaults: PLAYER_DEFAULTS,
      patch: vi.fn<(fields: Partial<PlayerSpec>) => void>(),
      disabled: true,
      burst: controls(),
    });
    expect(found(drawn, TAP)?.disabled).toBe(true);
    expect(found(drawn, BEAT)?.disabled).toBe(true);
  });

  /**
   * And a part's fold draws the dial alone: it holds neither the yard's toggle nor the deck's
   * beat, and half a gesture drawn where the other half cannot follow is a control that means one
   * thing on the card and another under a part (0176).
   */
  it("draws neither where the card is not the one drawing them", () => {
    const drawn = dials();
    expect(timing(drawn).some((node) => node.knob === "burst")).toBe(true);
    expect(found(drawn, TAP)).toBeUndefined();
    expect(found(drawn, BEAT)).toBeUndefined();
  });
});
