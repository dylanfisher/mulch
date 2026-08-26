/**
 * @role What the jumps card offers and which command each gesture sends — including that a seed
 *   is drawn at the gesture and carried in the command, never left to a later draw (0089), that
 *   its dials are the rack's own size and caption box (0093), and that folding it says nothing to
 *   the instrument at all (P74).
 */
// One dependency over the cap, and the one over it is where the module's knob lists now live: this
// suite renders the real card and asserts against `PLAYER_KNOBS` and the partition of it that is
// drawn behind a marker, and P118 split those two facts across src/lib/player.ts and
// src/lib/playerKnobs.ts to keep the first of them under the hard line cap. Read and judged — see
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
// And over the 400-line soft cap: this file is one case per gesture the card offers, and the card
// draws one control per number the module declares — so its length is that vocabulary's, exactly
// as src/ui/PlayerCard.tsx's own waiver says of the card. Read and judged, well under the hard cap
// docs/map.md sets — see docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { isValidElement } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The one hook this strip calls, made callable outside a renderer so a control's own handler can
// be pressed — the same stand-in src/ui/DeckTransport.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
  };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { partVoice, PLAYER_KNOBS, PLAYER_SEED_MAX, type PlayerSpec } from "@/lib/player";
import { PLAYER_PART_DEFAULTS, type SongPartId } from "@/lib/playerSong";
import type { DeckState } from "@/state/store";
import {
  PLAYER_CHARACTER_LABEL,
  PLAYER_GROUP_LABELS,
  PLAYER_RATE_LABEL,
  PLAYER_LABEL,
  RESEED_LABEL,
  SEED_LABEL,
} from "@/lib/copy";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { ACTION_ICONS } from "@/ui/icons";
import { PLAYER_MENU_KNOBS } from "@/lib/playerKnobs";
import { PlayerCard } from "@/ui/PlayerCard";
import { PlayerGroup } from "@/ui/PlayerGroup";
import { doorKey } from "@/ui/PlayerMore";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";

const PLAYER: PlayerSpec = {
  seed: 9,
  bias: 0,
  stride: 0,
  home: 0,
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
  burst: 1,
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

/** A looped, loaded deck — the only state this strip reads beyond the player itself. */
const deckState = (over: Partial<DeckState>): DeckState => {
  const state = createInstrument(manualClock()).state.getState().decks.a!;
  return { ...state, duration: 2, loop: { in: 0, out: 1 }, ...over };
};

const strip = (
  over: Partial<DeckState>,
  folded = false,
  selected: SongPartId | null = null,
  doors: string | null = null,
) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send").mockImplementation(() => {});
  const setFolded = vi.fn<(folded: boolean) => void>();
  const setDoors = vi.fn<(open: string | null) => void>();
  const element = PlayerCard({
    instrument,
    deck: "a",
    state: deckState(over),
    fold: [folded, setFolded],
    // The section under the dials keeps its own fold, held by the yard for the reason this one is
    // (0157). Nothing in this file presses it.
    songFold: [false, () => {}],
    // And which of its parts the dials are pointed at, held there for the same reason (0176).
    songSelect: [selected, () => {}],
    // And which of them has its own dials open under it, held there for the same reason again.
    songOpen: [null, () => {}],
    // And which of its doors stand open, held there for the same reason a fourth time: shut,
    // which is the state every claim in this file but one is made in (P135).
    doors: [doors, setDoors],
  });
  return { element, sent, setFolded, setDoors };
};

/**
 * Every control of the module the card drew outside its four boxes: a dial or one of the doors,
 * which are what carry both the spec and what it snaps back to. Empty is the claim — the card has
 * no ungrouped row left to put a dial on (0173).
 */
const ungrouped = (element: unknown): string[] => {
  const found: string[] = [];
  const walk = (node: unknown, inside: boolean): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child, inside);
      return;
    }
    if (!isValidElement<Control>(node)) return;
    const { type, props } = node;
    if (props.player !== undefined && props.defaults !== undefined) {
      if (!inside) found.push(typeof type === "function" ? type.name : type);
      return;
    }
    walk(props.children, inside || type === PlayerGroup);
  };
  walk(element, false);
  return found;
};

/** Whatever a control's own handler takes — the strip's job is which command it sends. */
type Press = (...args: unknown[]) => void;

/** The props a control of this strip may carry, as this test needs to read them. */
type Control = Partial<Record<(typeof HANDLER_KEYS)[number], Press>> & {
  children?: unknown;
  /** What a dial is named by, and how this walk tells one from the frame around it. */
  knob?: unknown;
  /** The two a control of the module carries and nothing else on this card does: the spec it
   *  reads and what it snaps back to (src/ui/PlayerMore.tsx). */
  player?: unknown;
  defaults?: unknown;
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
    const { type, props } = node;
    // A dial on this row is a component named by the knob it draws, so its own handler is one
    // layer in. Called rather than descended into — the identity `useCallback` above is what makes
    // that possible — and only for a dial: the doors beside them are components with hooks of
    // their own that no stand-in covers, and their amounts are their own suites' business
    // (src/ui/PlayerDial.tsx, src/ui/PlayerMore.tsx).
    if (typeof type === "function" && props.knob !== undefined) {
      // A function component and a class one are both functions to `typeof`, and only one is
      // callable; this tree holds no class components.
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Control) => unknown)(props));
      return;
    }
    for (const key of HANDLER_KEYS) {
      const handler = props[key];
      if (handler !== undefined) found.push(handler);
    }
    walk(props.children);
  };
  walk(element);
  return found;
};

/**
 * Where the switch is among the handlers: the heading folds the card and comes first, because the
 * heading is the fold (0106) — and the switch stands at the other end of that same heading, ahead
 * of the card's own corner, whether or not there is a pattern (0107 amended, 0173).
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

  /**
   * P130: a card with no spec draws its whole body anyway — every dial, every door and both corner
   * actions — greyed and unturnable, painting `PLAYER_DEFAULTS`. A refused control is what 0121
   * asks for everywhere else on this card, and a body that is not there cannot say what the module
   * offers or at what settings it would start (0173).
   */
  it("draws its dials refused rather than absent while the switch is off", () => {
    const off = renderToStaticMarkup(strip({ player: null }).element);
    expect(off).toContain(PLAYER_LABEL);
    expect(off).toContain(PLAYER_KNOB_LABELS.distance);
    expect(off).toContain(RESEED_LABEL);
    // Every dial on the row is refused, and each is painted from the switch's own values rather
    // than from a spec the card invented: the gate a press of that switch would send is 0.
    const onTheRow = PLAYER_KNOBS.length - PLAYER_MENU_KNOBS.length;
    expect(off.match(/aria-disabled="true"/gu)?.length).toBe(onTheRow);
    expect(off).toContain(`aria-label="${PLAYER_KNOB_LABELS.gate}" aria-valuemin="0"`);
    expect(off).toContain(`aria-valuenow="${PLAYER_DEFAULTS.gate}"`);
    const on = renderToStaticMarkup(strip({ player: PLAYER }).element);
    expect(on).not.toContain('aria-disabled="true"');
    expect(on).toContain(`aria-valuenow="${PLAYER.gate}"`);
  });

  /**
   * P130: the body is four bordered boxes with an eyebrow each rather than one wrap of fourteen
   * controls at the same distance from one another, and every control of the module stands inside
   * one of them — a dial added to the module joins a box, because there is no ungrouped row left
   * to put it on (0173).
   */
  it("draws its dials in the four boxes and nothing outside them", () => {
    const markup = renderToStaticMarkup(strip({ player: PLAYER }).element);
    for (const label of Object.values(PLAYER_GROUP_LABELS)) expect(markup).toContain(label);
    expect(markup.match(/data-slot="player-group"/gu)?.length).toBe(
      Object.keys(PLAYER_GROUP_LABELS).length,
    );
    // Every control the card draws is inside a box: the walk below finds each one's ancestry, and
    // an ungrouped dial is what it fails on.
    expect(ungrouped(strip({ player: PLAYER }).element)).toEqual([]);
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

  /**
   * And it shuts every door on the way out. The open set is held by the yard so that neither this
   * card's fold nor a part's can throw it away (P135) — which is exactly why no remount inside the
   * card can drop it either, so the one gesture that clears the spec clears it. A module switched
   * back on opens the way a new one does rather than at whatever a hand left open on a pattern
   * that is gone. Switching *on* leaves it alone: there is nothing stale to drop.
   */
  it("shuts the open door when the switch goes off, and only then", () => {
    const off = strip({ player: PLAYER }, false, null, doorKey("", PLAYER_RATE_LABEL));
    handlers(off.element)[SWITCH]?.(false);
    expect(off.setDoors).toHaveBeenCalledWith(null);

    const on = strip({ player: null });
    handlers(on.element)[SWITCH]?.(true);
    expect(on.setDoors).not.toHaveBeenCalled();
  });

  /**
   * And a pattern that went away without a press takes the open door with it. A spec is cleared by
   * undo, by a redo landing on nothing and by a restore as well as by that switch (0089), none of
   * which is a gesture on this card — so what the doors read is derived from whether there is a
   * spec at all, and a door left open across one of those draws no greyed amounts for a pattern
   * that is gone (P135).
   */
  it("reads no door open while the module holds no spec", () => {
    const held = doorKey("", PLAYER_RATE_LABEL);
    expect(renderToStaticMarkup(strip({ player: PLAYER }, false, null, held).element)).toContain(
      PLAYER_KNOB_LABELS.spread,
    );
    expect(renderToStaticMarkup(strip({ player: null }, false, null, held).element)).not.toContain(
      PLAYER_KNOB_LABELS.spread,
    );
  });

  /**
   * Escape shuts it, and it is bound on the card rather than on the document: a door standing in
   * this card's own flow may not answer a press aimed at a layer opened over it — the drift's
   * overlay binds the document because it covers the page (0109) — and a press something inside
   * the card has already answered is not also this one's (P135).
   */
  it("shuts the open door on Escape from inside the card, and answers no other press", () => {
    const escape = (open: string | null, key: string, prevented = false) => {
      const { element, setDoors } = strip({ player: PLAYER }, false, null, open);
      const defaults = vi.fn<() => void>();
      const card = isValidElement<{ onKeyDown?: (event: unknown) => void }>(element)
        ? element.props
        : {};
      card.onKeyDown?.({ key, defaultPrevented: prevented, preventDefault: defaults });
      return { setDoors, defaults };
    };
    const shut = escape(doorKey("", PLAYER_RATE_LABEL), "Escape");
    expect(shut.setDoors).toHaveBeenCalledWith(null);
    expect(shut.defaults).toHaveBeenCalled();
    // Nothing open: the press is somebody else's and this card does not take it.
    expect(escape(null, "Escape").defaults).not.toHaveBeenCalled();
    // Nor another key, nor an Escape something in the card has already answered.
    expect(escape(doorKey("", PLAYER_RATE_LABEL), "Enter").defaults).not.toHaveBeenCalled();
    expect(escape(doorKey("", PLAYER_RATE_LABEL), "Escape", true).defaults).not.toHaveBeenCalled();
  });

  // Every knob sends the whole spec back with one field moved: there is one durable record and
  // no gesture may leave half of it behind.
  it("sends the whole spec back with one field moved", () => {
    const { element, sent } = strip({ player: PLAYER });
    const [, , , gate, drop, spark, sparkLevel, sparkDelay, reverse] = handlers(element);
    gate?.(0.5);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, gate: 0.5 },
    });
    drop?.(0.25);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, drop: 0.25 },
    });
    reverse?.(0.75);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, reverse: 0.75 },
    });
    // The three a spark is, beside them on the same row and on the same one command (P123, 0175).
    spark?.(0.5);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, spark: 0.5 },
    });
    sparkLevel?.(0.25);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, sparkLevel: 0.25 },
    });
    // And the third, which is how far into the landing that one begins (0175).
    sparkDelay?.(0.5);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, sparkDelay: 0.5 },
    });
  });

  // The player's own clock reaches the strip as more knobs on the one spec, in the order the
  // module declares them — a field with no control is a durable number nobody can turn (P67). The
  // burst is the card's own; the repeats, the vary, the rest and the hold are each a group with a
  // door at the dial's corner, pressed in src/ui/PlayerRepeats.test.tsx, PlayerVary.test.tsx,
  // PlayerRest.test.tsx and PlayerRate.test.tsx (P87, 0135).
  /**
   * The second half of 0157 reversed, which is what 0176 is: a dial used to patch the pattern the
   * parts were a distance from whatever was standing, and now it patches the part a hand pointed
   * it at — the whole spec still, in one `deck.player`, with only that part moved. A part is the
   * dials it was captured from, so the dials have to be able to reach it.
   */
  it("writes into the selected part rather than into the pattern", () => {
    const held = { ...PLAYER_PART_DEFAULTS, id: "part-one", name: "ONE", voice: partVoice(PLAYER) };
    const player = { ...PLAYER, song: [held] };
    const { element, sent } = strip({ player }, false, held.id);
    const [, , , gate] = handlers(element);
    gate?.(0.25);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...player, song: [{ ...held, voice: { ...held.voice, gate: 0.25 } }] },
    });
  });

  /**
   * And it reads it: the dials show what the selected part plays, with its own mark in the corner
   * where a dial the song can move wears the walk's — so a dial standing somewhere the hand did
   * not leave it never reads as one the hand moved, either way round (0157, 0172, 0176).
   */
  it("reads the selected part on its dials, and marks the ones it reaches", () => {
    const held = {
      ...PLAYER_PART_DEFAULTS,
      id: "part-one",
      name: "ONE",
      voice: { ...partVoice(PLAYER), gate: 0.125 },
    };
    const player = { ...PLAYER, song: [held] };
    const markup = renderToStaticMarkup(strip({ player }, false, held.id).element);
    expect(markup).toContain('aria-valuenow="0.125"');
    // The mark, in the ink the selected row wears and never the one a standing part paints with.
    const marks = markup.match(/data-selected="true"/gu) ?? [];
    expect(marks.length).toBeGreaterThan(0);
    expect(markup).not.toContain('data-voiced="true"');
    // And nothing on the card is marked while the dials are the pattern's own.
    expect(renderToStaticMarkup(strip({ player }).element)).not.toContain('data-selected="true"');
  });

  /**
   * And a selection is over the moment the written list stops being the arrangement: the Select
   * toggle goes with the rows the pattern's own run replaces, so a selection that outlived it
   * would leave every dial pointed at a part of a list the walk is not reading, marked, and no
   * longer painting what the pattern is standing at — with nothing on screen able to take them off
   * it (0158, 0176).
   */
  it("takes the dials off a selected part while the pattern draws its own arrangement", () => {
    const held = { ...PLAYER_PART_DEFAULTS, id: "part-one", name: "ONE", voice: partVoice(PLAYER) };
    const player = { ...PLAYER, song: [held], arrange: 3 };
    const { element, sent } = strip({ player }, false, held.id);
    expect(renderToStaticMarkup(element)).not.toContain('data-selected="true"');
    const [, , , gate] = handlers(element);
    gate?.(0.25);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...player, gate: 0.25 },
    });
  });

  it("offers the burst as a knob on the same spec", () => {
    const { element, sent } = strip({ player: PLAYER });
    const [, , , , , , , , , burst] = handlers(element);
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
  it("folds without sending anything, and leaves the switch on the heading", () => {
    const { element, sent, setFolded } = strip({ player: PLAYER });
    handlers(element)[0]?.(true);
    expect(setFolded).toHaveBeenCalledWith(true);
    expect(sent).not.toHaveBeenCalled();

    const folded = strip({ player: PLAYER }, true);
    const markup = renderToStaticMarkup(folded.element);
    expect(markup).toContain(PLAYER_LABEL);
    // The seed the pattern unfolds from stands above the fold: a folded card still says which
    // pattern it is holding (P98).
    expect(markup).toContain(`${SEED_LABEL} ${PLAYER.seed}`);
    // P130: a module put away is its heading and nothing else — no frame, no header, none of the
    // corner's actions (0173). So the fold and the switch are the whole of it, and the reseed goes
    // with the body it belongs to.
    expect(markup).not.toContain('data-slot="card"');
    expect(markup).not.toContain('data-slot="card-action"');
    expect(markup).not.toContain(RESEED_LABEL);
    expect(handlers(folded.element).length).toBe(2);
  });

  /**
   * P98: the seed is the one number that makes a pattern reproducible, so it reads out beside the
   * heading — outside the fold and outside the card — and the control that draws a new one stands
   * in the card's corner immediately left of the switch, where a hand looks for what a card does
   * to itself (0089, 0107).
   */
  it("reads its seed beside the heading and puts reseed in the corner", () => {
    const markup = renderToStaticMarkup(strip({ player: PLAYER }).element);

    expect(markup).toMatch(
      new RegExp(
        `<span class="type-readout text-muted-foreground">${SEED_LABEL} ${PLAYER.seed}<`,
        "u",
      ),
    );
    // In the corner and in order: the character menu that draws every dial, the reseed that draws
    // the number they unfold from, then the switch that holds the whole pattern (0152, P98).
    expect(markup).toMatch(
      new RegExp(
        `data-slot="card-action"[^>]*><button[^>]*aria-label="${PLAYER_CHARACTER_LABEL} `,
        "u",
      ),
    );
    expect(markup.indexOf(`${PLAYER_CHARACTER_LABEL} `)).toBeLessThan(
      markup.indexOf(`${RESEED_LABEL} `),
    );
    // And the heading it reads beside is outside the card rather than in its header (0106).
    expect(markup.indexOf(PLAYER_LABEL)).toBeLessThan(markup.indexOf('data-slot="card"'));
  });

  /**
   * P130: the switch leaves the card's corner for the right-hand end of the heading the fold is
   * on. It is the one durable control this module has, and a folded card is now its heading and
   * nothing else — so a switch in the corner would be a durable control a view preference could
   * put away, which is the very thing 0107 was written to rule out (0107 amended, 0173).
   */
  it("stands its switch at the right of the heading rather than in the card", () => {
    const markup = renderToStaticMarkup(strip({ player: PLAYER }).element);
    expect(markup.indexOf('role="switch"')).toBeLessThan(markup.indexOf('data-slot="card"'));
    expect(markup).toMatch(/data-slot="player-heading"[^>]*>.*role="switch"/su);
    // Right-aligned inside it: the fold is at one end of the heading and the switch at the other.
    expect(markup).toMatch(/role="switch"[^>]*class="[^"]*ml-auto/u);
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
   * A fold is not undone by a pattern going away. A spec cleared from somewhere else — the
   * palette, a restore, a clip — leaves the card folded, and the switch that can turn it back on
   * is on the heading the fold is, above everything the fold takes (0173).
   */
  it("keeps the switch on the heading when a folded card's pattern is cleared elsewhere", () => {
    const { element, sent, setFolded } = strip({ player: null }, true);
    // The heading and its switch, and nothing else: the body went away with the fold, and the one
    // control that can turn the module back on did not (0173).
    const markup = renderToStaticMarkup(element);
    expect(markup).toContain('role="switch"');
    expect(markup).not.toContain('data-slot="card"');
    handlers(element)[SWITCH]?.(true);
    expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({ t: "deck.player", deck: "a" }) as unknown,
    );
    // And turning it on opens the fold rather than leaving the module a person just switched on
    // put away: the next render has a pattern and a body, and the fold is standing over both.
    expect(setFolded).toHaveBeenCalledWith(false);
  });

  /**
   * The character menu holds three cells nothing durable may: which name was last pressed, the
   * draw under it, and how far into it the amount goes (0152). They describe a pattern, so they
   * may not outlive one — and until P130 the unmount did that, because the door was not drawn at
   * all while the switch was off. Drawn refused instead, it is the same instance across a clear,
   * and dragging Amount would blend a fresh spec toward a character nobody pressed on it. Its
   * identity is what says so: the door the off card draws is not the door the on card draws.
   */
  it("gives the character menu a new identity when the pattern is cleared", () => {
    const identity = (over: Partial<DeckState>): unknown => {
      let found: unknown = null;
      const walk = (node: unknown): void => {
        if (Array.isArray(node)) {
          for (const child of node) walk(child);
          return;
        }
        if (found !== null || !isValidElement<Control>(node)) return;
        // The first control carrying a spec and no defaults, which is the corner's own door: the
        // song section below it is the other, and is drawn only where there is a pattern.
        if (node.props.player !== undefined && node.props.defaults === undefined) {
          found = node.key;
          return;
        }
        walk(node.props.children);
      };
      walk(strip(over).element);
      return found;
    };
    const off = identity({ player: null });
    expect(off).not.toBeNull();
    expect(identity({ player: PLAYER })).not.toBe(off);
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
   * P130: the fold is no longer refused while the switch is off, because the dials are drawn
   * whether or not it is on — there is always something under the heading to put away, and a
   * module a person is not using is exactly the one they want folded (0173).
   */
  it("folds a card that holds no pattern, because its dials are drawn anyway", () => {
    const open = renderToStaticMarkup(strip({ player: null }).element);
    const away = renderToStaticMarkup(strip({ player: null }, true).element);
    expect(open).toContain(PLAYER_KNOB_LABELS.distance);
    expect(away).not.toContain(PLAYER_KNOB_LABELS.distance);
    // The heading itself and not the section's own name, which carries the word whatever is drawn.
    expect(away).toContain(`<span class="type-eyebrow">${PLAYER_LABEL}<`);
  });
});
