/**
 * One test over the enumerable lists a tooltip is owed for, rather than one test per control: the
 * parameter registry, the icon vocabulary and the player's variations are each a list, and a
 * control with nothing written for it is a hole in one of them (P65). It lives in `src/ui`
 * because that is the tier where `src/lib`'s words and `src/audio`'s registry are both reachable
 * — the same reason the effect name pools are checked from the registry's own test.
 */
import { describe, expect, it } from "vitest";

import { PARAM_IDS } from "@/audio/params";
import {
  ACTION_TOOLTIPS,
  BYPASS_TOOLTIP,
  PARAM_TOOLTIPS,
  PLAYER_VARIATION_TOOLTIPS,
  RECURRENCE_TOOLTIP,
} from "@/lib/copy";
import { PLAYER_VARIATIONS } from "@/lib/player";
import { ACTION_ICONS } from "@/ui/icons";
import { TOOLTIP_DELAY_MS } from "@/ui/App";

/**
 * Both halves of "keyed by that list": nothing in the list without a sentence, and no sentence
 * left over from a renamed entry. Asked of the record itself rather than of what it inherits —
 * `ACTION_TOOLTIPS.constructor` is a function, not a sentence (principle 5) — and both halves are
 * asserted at once so a failure names every hole rather than the first.
 */
const agrees = (says: Record<string, string>, keys: readonly string[]) => {
  const silent = keys.filter((key) => !Object.hasOwn(says, key) || (says[key] ?? "").trim() === "");
  const stale = Object.keys(says).filter((key) => !keys.includes(key));
  expect({ silent, stale }).toEqual({ silent: [], stale: [] });
};

describe("the words every control says", () => {
  it("has a sentence for every parameter the registry declares", () => {
    agrees(PARAM_TOOLTIPS, PARAM_IDS);
  });

  it("has a sentence for every action the icon vocabulary declares", () => {
    agrees(ACTION_TOOLTIPS, Object.keys(ACTION_ICONS));
  });

  it("has a sentence for both of the player's walks", () => {
    agrees(PLAYER_VARIATION_TOOLTIPS, PLAYER_VARIATIONS);
  });

  // The two controls that are neither a parameter nor an action: a state carries no icon (0055)
  // and the recurrence is a figure in a unit that has to be explained (0080).
  it("says what the rack's switch and the drift's estimate mean", () => {
    expect(BYPASS_TOOLTIP.trim().length).toBeGreaterThan(0);
    expect(RECURRENCE_TOOLTIP.trim().length).toBeGreaterThan(0);
  });

  /**
   * Near a second, the way a native `title` is: at no delay a hand crossing a rack of a dozen
   * knobs flashes a popup over every one of them on the way past, which is the failure this
   * number exists to prevent.
   */
  it("waits about a second before it says any of it", () => {
    expect(TOOLTIP_DELAY_MS).toBeGreaterThanOrEqual(500);
    expect(TOOLTIP_DELAY_MS).toBeLessThanOrEqual(1500);
  });
});
