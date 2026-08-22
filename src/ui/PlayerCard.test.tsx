/**
 * @role What the jumps card offers and which command each gesture sends — including that a seed
 *   is drawn at the gesture and carried in the command, never left to a later draw (0089), that
 *   its dials are the rack's own size and caption box (0093), and that folding it says nothing to
 *   the instrument at all (P74).
 */
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The one hook this strip calls, made callable outside a renderer so a control's own handler can
// be pressed — the same stand-in src/ui/DeckTransport.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return { ...react, useCallback: (callback: unknown) => callback };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { PLAYER_SEED_MAX, type PlayerSpec } from "@/lib/player";
import type { DeckState } from "@/state/store";
import { PLAYER_LABEL, RESEED_LABEL } from "@/lib/copy";
import { ACTION_ICONS } from "@/ui/icons";
import { PLAYER_KNOBS, PLAYER_MENU_KNOBS } from "@/lib/player";
import { PlayerCard } from "@/ui/PlayerCard";

const PLAYER: PlayerSpec = {
  seed: 9,
  variation: "wander",
  distance: 3,
  repeats: 4,
  gate: 0.5,
  burst: 1,
  vary: 0,
  varyChance: 1,
  rest: 0,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
};

/** A looped, loaded deck — the only state this strip reads beyond the player itself. */
const deckState = (over: Partial<DeckState>): DeckState => {
  const state = createInstrument(manualClock()).state.getState().decks.a!;
  return { ...state, duration: 2, loop: { in: 0, out: 1 }, ...over };
};

const strip = (over: Partial<DeckState>, folded = false) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send").mockImplementation(() => {});
  const setFolded = vi.fn<(folded: boolean) => void>();
  const element = PlayerCard({
    instrument,
    deck: "a",
    state: deckState(over),
    fold: [folded, setFolded],
  });
  return { element, sent, setFolded };
};

/** Whatever a control's own handler takes — the strip's job is which command it sends. */
type Press = (...args: unknown[]) => void;

/** The props a control of this strip may carry, as this test needs to read them. */
type Control = Partial<Record<(typeof HANDLER_KEYS)[number], Press>> & {
  children?: unknown;
};

const HANDLER_KEYS = [
  "onPressedChange",
  "onCheckedChange",
  "onValueChange",
  "onChange",
  "onClick",
] as const;

/** Every handler the strip put on a control, in render order — one press is one command. */
const handlers = (element: unknown): Press[] => {
  const found: Press[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    for (const key of HANDLER_KEYS) {
      const handler = node.props[key];
      if (handler !== undefined) found.push(handler);
    }
    walk(node.props.children);
  };
  walk(element);
  return found;
};

/**
 * Where the switch is among the handlers: the card's heading folds it and comes first, because
 * the heading is the fold (0106) — the switch that holds the pattern is the control after it, in
 * the card's own top-right corner (P87).
 */
const SWITCH = 1;

// One case per gesture the card offers. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the jumps card", () => {
  it("offers nothing on a deck with no loop to jump around", () => {
    expect(strip({ loop: null, player: null }).element).toBeNull();
  });

  // A cleared loop leaves the pattern durably in place, so the one control that can switch it off
  // has to stay reachable — otherwise it is saved, captured into clips, and starts jumping again
  // the moment a loop comes back, with nothing on screen that says so (0089).
  it("keeps offering the switch for a pattern a cleared loop left behind", () => {
    const { element, sent } = strip({ loop: null, player: PLAYER });
    expect(element).not.toBeNull();
    expect(renderToStaticMarkup(element)).toContain(PLAYER_LABEL);
    handlers(element)[SWITCH]?.(false);
    expect(sent).toHaveBeenCalledWith({ t: "deck.player", deck: "a", player: null });
  });

  it("offers the switch alone until the player is on", () => {
    const off = renderToStaticMarkup(strip({ player: null }).element);
    expect(off).toContain(PLAYER_LABEL);
    expect(off).not.toContain(RESEED_LABEL);
    const on = renderToStaticMarkup(strip({ player: PLAYER }).element);
    expect(on).toContain(RESEED_LABEL);
    expect(on).toContain("Wander");
    expect(on).toContain("Forward");
  });

  // The seed is drawn here, at the gesture, and travels in the command — which is the whole of
  // why a replay of the log is the same performance (0089).
  it("draws a seed at the gesture and carries it in the command", () => {
    const { element, sent } = strip({ player: null });
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    handlers(element)[SWITCH]?.(true);
    random.mockRestore();
    const command = sent.mock.calls[0]?.[0];
    expect(command).toMatchObject({ t: "deck.player", deck: "a" });
    // Pinned, so this reads the draw rather than accepting any number: half of the seed range.
    expect(command).toHaveProperty("player.seed", (PLAYER_SEED_MAX + 1) / 2);
    expect(command).toHaveProperty("player.gate", 0);
  });

  it("switches off by sending null rather than a spec that means off", () => {
    const { element, sent } = strip({ player: PLAYER });
    handlers(element)[SWITCH]?.(false);
    expect(sent).toHaveBeenCalledWith({ t: "deck.player", deck: "a", player: null });
  });

  // Every knob sends the whole spec back with one field moved: there is one durable record and
  // no gesture may leave half of it behind.
  it("sends the whole spec back with one field moved", () => {
    const { element, sent } = strip({ player: PLAYER });
    const [, , variation, distance] = handlers(element);
    variation?.(["forward"]);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, variation: "forward" },
    });
    distance?.(7.4);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, distance: 7 },
    });
  });

  // The player's own clock reaches the strip as more knobs on the one spec, in the order the
  // module declares them — a field with no control is a durable number nobody can turn (P67). The
  // burst is the card's own; the vary, the rest and the hold are each a group with a menu at the
  // dial's corner, pressed in src/ui/PlayerVary.test.tsx, PlayerRest.test.tsx and
  // PlayerRate.test.tsx (P87).
  it("offers the burst as a knob on the same spec", () => {
    const { element, sent } = strip({ player: PLAYER });
    const [, , , , , , burst] = handlers(element);
    burst?.(0.5);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, burst: 0.5 },
    });
  });

  /**
   * The card is drawn in the rack's own language, and the part of that language a row's height
   * depends on is the caption: every dial spends both line boxes whatever its one word says, so a
   * row holding this card measures one height rather than standing a line taller than the cards
   * beside it (0093). One box per number the module declares — a knob at the compact size draws
   * no caption at all, which is what this would catch.
   */
  it("gives every one of its dials the rack's own two-line caption box", () => {
    const markup = renderToStaticMarkup(strip({ player: PLAYER }).element);
    // Every knob the module declares except the ones behind a marker, which are not drawn until
    // one is opened and so cannot stand a row taller than its neighbours (0118, P87).
    const onTheRow = PLAYER_KNOBS.length - PLAYER_MENU_KNOBS.length;
    expect(markup.match(/h-\[2lh\]/gu)?.length).toBe(onTheRow);
  });

  /**
   * The two controls are separate and this is the whole of that: folding is a view preference —
   * no command, nothing durable, no history entry (plan §2) — so putting the module away must not
   * touch the spec. The card's body goes under the fold; the switch stays in the corner every
   * card's switch is in, above it, so silencing the module is never something a fold can hide
   * (0107, P87).
   */
  it("folds without sending anything, and leaves the switch in its corner", () => {
    const { element, sent, setFolded } = strip({ player: PLAYER });
    handlers(element)[0]?.(true);
    expect(setFolded).toHaveBeenCalledWith(true);
    expect(sent).not.toHaveBeenCalled();

    const folded = strip({ player: PLAYER }, true);
    const markup = renderToStaticMarkup(folded.element);
    expect(markup).toContain(PLAYER_LABEL);
    expect(markup).not.toContain(RESEED_LABEL);
    // The heading's own fold and the switch beside it, and nothing else.
    expect(handlers(folded.element).length).toBe(2);
    // And it is in the card's action corner rather than in its body — the same slot the rack's
    // cards put theirs in (src/ui/EffectRack.tsx).
    expect(markup).toContain('data-slot="card-action"');
  });

  /**
   * The card reads as a full-width card of the rack rather than as a bare section beside them:
   * one card primitive, its own header, and the width the rack's `full` entries take (P87).
   */
  it("draws itself as a full-width card", () => {
    const markup = renderToStaticMarkup(strip({ player: PLAYER }).element);
    expect(markup).toContain('data-slot="card"');
    expect(markup).toContain('data-slot="card-header"');
    expect(markup).toContain("w-full");
  });

  /**
   * A fold is only refused while there is no pattern; it is not undone by one going away. A spec
   * cleared from somewhere else — the palette, a restore, a clip — leaves the heading pressed and
   * disabled, and if the switch stayed under that fold the module would be unreachable by the one
   * control that can turn it back on.
   */
  it("brings the switch back when a folded card's pattern is cleared elsewhere", () => {
    const { element, sent, setFolded } = strip({ player: null }, true);
    // The heading is honest about it: a fold with nothing under it draws open, so the caret does
    // not sit turned over a body that is on screen.
    expect(renderToStaticMarkup(element)).not.toContain('aria-pressed="true"');
    handlers(element)[SWITCH]?.(true);
    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({ t: "deck.player", deck: "a" }) as unknown,
    );
    // And turning it on opens the fold rather than being swallowed by it: the next render has a
    // pattern, and the switch that was just pressed would otherwise go under it with the focus.
    expect(setFolded).toHaveBeenCalledWith(false);
  });

  /**
   * One action, one icon, one sentence: reseed borrowed the copy's picture as well as its words,
   * and a control that borrows the picture borrows the words with it (0055, src/lib/copy.ts). It
   * now carries its own of each, so the copy's picture may not appear on this card at all.
   */
  it("draws its reseed with its own picture rather than the copy's", () => {
    const drawn = new Set<unknown>();
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        for (const child of node) walk(child);
        return;
      }
      if (!isValidElement<{ children?: unknown }>(node)) return;
      drawn.add(node.type);
      walk(node.props.children);
    };
    walk(strip({ player: PLAYER }).element);
    expect(drawn.has(ACTION_ICONS.reseed)).toBe(true);
    expect(drawn.has(ACTION_ICONS.duplicate)).toBe(false);
  });

  /**
   * With the switch off there is nothing under the heading to fold — the card is its own heading
   * and that one switch — so the fold is offered and cannot be pressed into turning its caret over
   * a body that was never there.
   */
  it("offers no fold while there is nothing under it", () => {
    // The attribute itself: every toggle's class list carries a `disabled:` variant whatever
    // state it is in, so the word alone would pass on a control that is not disabled at all.
    expect(renderToStaticMarkup(strip({ player: null }).element)).toContain('disabled=""');
    expect(renderToStaticMarkup(strip({ player: PLAYER }).element)).not.toContain('disabled=""');
  });
});
