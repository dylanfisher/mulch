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
  MOIRE_POP_OUT_TOOLTIP,
  PARAM_TOOLTIPS,
  PLAYER_AMOUNT_LABEL,
  PLAYER_AMOUNT_TOOLTIP,
  PLAYER_CHARACTER_LABEL,
  PLAYER_CHARACTER_LABELS,
  PLAYER_CHARACTER_TOOLTIPS,
  PLAYER_KNOB_LABELS,
  PLAYER_KNOB_TOOLTIPS,
  PLAYER_TOOLTIP,
  PLAYER_VARIATION_TOOLTIPS,
  RECURRENCE_TOOLTIP,
  TRANSPORT_ACTIONS,
  TRANSPORT_ALL_LABELS,
  TRANSPORT_ALL_TOOLTIPS,
} from "@/lib/copy";
import { PLAYER_CHARACTERS, PLAYER_KNOBS, PLAYER_VARIATIONS } from "@/lib/player";
import {
  PLAYER_MENU_KNOBS,
  PLAYER_RATE_KNOBS,
  PLAYER_REPEATS_KNOBS,
  PLAYER_REST_KNOBS,
  PLAYER_VARY_KNOBS,
} from "@/lib/playerKnobs";

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

// One case per list the instrument's words are keyed by: the length tracks how many such lists
// there are rather than how much this file decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the words every control says", () => {
  it("has a sentence for every parameter the registry declares", () => {
    agrees(PARAM_TOOLTIPS, PARAM_IDS);
  });

  it("has a sentence for every action the icon vocabulary declares", () => {
    agrees(ACTION_TOOLTIPS, Object.keys(ACTION_ICONS));
  });

  // The header's three buttons carry a picture and no word, so the label is the only name a
  // screen reader has for them and the sentence is the only thing that says these move every
  // yard rather than one (P66).
  it("names and explains each of the whole instrument's transport gestures", () => {
    agrees(TRANSPORT_ALL_LABELS, TRANSPORT_ACTIONS);
    agrees(TRANSPORT_ALL_TOOLTIPS, TRANSPORT_ACTIONS);
    // Every one of them is an action the icon vocabulary already has a picture for.
    expect(TRANSPORT_ACTIONS.filter((action) => !Object.hasOwn(ACTION_ICONS, action))).toEqual([]);
  });

  it("has a sentence for both of the player's walks", () => {
    agrees(PLAYER_VARIATION_TOOLTIPS, PLAYER_VARIATIONS);
  });

  /**
   * And one for every character, which carries no icon either: a character is a name and a
   * sentence, and the sentence is the only thing saying what a press will sound like before it is
   * pressed — the whole reason the menu exists rather than twenty tooltips over twenty dials
   * (0152). The amount under them is neither a parameter nor a character, so it is asked for on
   * its own.
   */
  it("names and explains every character a pattern can be drawn as", () => {
    agrees(PLAYER_CHARACTER_LABELS, PLAYER_CHARACTERS);
    agrees(PLAYER_CHARACTER_TOOLTIPS, PLAYER_CHARACTERS);
    expect(PLAYER_CHARACTER_LABEL.trim().length).toBeGreaterThan(0);
    expect(PLAYER_AMOUNT_LABEL.trim().length).toBeGreaterThan(0);
    expect(PLAYER_AMOUNT_TOOLTIP.trim().length).toBeGreaterThan(0);
  });

  // Every number the jumps card offers. None of them is a registry parameter — the spec is one
  // durable record rather than a list of declared params (0124) — so the list they are keyed by is
  // the module's own, and a field with no caption or no sentence is a hole here (P74).
  it("names and explains every number the jumps card offers", () => {
    agrees(PLAYER_KNOB_LABELS, PLAYER_KNOBS);
    agrees(PLAYER_KNOB_TOOLTIPS, PLAYER_KNOBS);
  });

  /**
   * A caption is a dial's whole accessible name (src/ui/Knob.tsx), so two dials on screen at once
   * carrying one word are two sliders nothing can tell apart — a screen reader's problem and a
   * locator's. Only one menu opens at a time, so what is on screen at once is the card's own row
   * plus one menu, and it is those sets the words have to be unique within. Across two menus they
   * may repeat, which is what lets a chance be called Chance wherever it is (0124, P87).
   */
  it("gives no two dials on screen at once the same caption", () => {
    const onTheRow = PLAYER_KNOBS.filter((knob) => !PLAYER_MENU_KNOBS.some((m) => m === knob));
    for (const menu of [
      PLAYER_REPEATS_KNOBS,
      PLAYER_VARY_KNOBS,
      PLAYER_REST_KNOBS,
      PLAYER_RATE_KNOBS,
    ]) {
      const shown = [...onTheRow, ...menu].map((knob) => PLAYER_KNOB_LABELS[knob]);
      expect(new Set(shown).size).toBe(shown.length);
    }
  });

  // The two controls that are neither a parameter nor an action: a state carries no icon (0055)
  // and the recurrence is a figure in a unit that has to be explained (0080).
  it("says what the rack's switch and the drift's estimate mean", () => {
    expect(BYPASS_TOOLTIP.trim().length).toBeGreaterThan(0);
    expect(RECURRENCE_TOOLTIP.trim().length).toBeGreaterThan(0);
  });

  // And the jumps card's other two, which are neither a parameter nor a number: the switch is a
  // state, and reseed is an action that borrowed both the picture and the words for duplicating a
  // thing until P74 — one action, one icon, one sentence, so neither may be the copy's.
  it("says what the jumps switch and its reseed do, in their own words", () => {
    expect(PLAYER_TOOLTIP.trim().length).toBeGreaterThan(0);
    expect(ACTION_TOOLTIPS.reseed).not.toBe(ACTION_TOOLTIPS.duplicate);
    expect(ACTION_ICONS.reseed).not.toBe(ACTION_ICONS.duplicate);
  });

  // And the drift's pop-out, whose sentence is also the only place the strip's hidden gesture is
  // written down (0138, 0139): a press with Option hands the picture straight to a window, and a
  // gesture nothing says is a gesture nobody finds.
  it("says what the pop-out is for, and names the gesture that skips to it", () => {
    expect(MOIRE_POP_OUT_TOOLTIP.trim().length).toBeGreaterThan(0);
    expect(MOIRE_POP_OUT_TOOLTIP).toContain("Option");
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
