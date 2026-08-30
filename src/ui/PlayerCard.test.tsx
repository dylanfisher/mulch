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
    // And the one the burst's own gestures keep their presses in: a box per call, which is what a
    // suite calling the card once per case wants anyway (src/ui/playerBurstControls.ts).
    useRef: (initial: unknown) => ({ current: initial }),
  };
});

import { manualClock } from "@/app/clock";
import { partVoice, PLAYER_KNOBS, PLAYER_SEED_MAX } from "@/lib/player";
import { PLAYER_FINE_LABEL } from "@/lib/copyCard";
import { PLAYER, playerCard } from "@/ui/playerCardDouble";
import { createInstrument } from "@/app/facade";
import { PLAYER_PART_DEFAULTS, type SongPartId } from "@/lib/playerSong";
import type { DeckState } from "@/state/store";
import { PLAYER_LABEL, PLANT_LABEL, RESEED_LABEL, SEED_LABEL } from "@/lib/copy";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { ACTION_ICONS } from "@/ui/icons";
import { PLAYER_BED_PERS } from "@/lib/playerBed";
import { PlayerFront } from "@/ui/PlayerFront";
import { playerSequence } from "@/lib/playerWalk";
import { emptyDeckPeek } from "@/audio/deckPeek";
import { onFrame } from "@/ui/frame";
import type { PlayerVoiceReader } from "@/ui/PlayerDial";
import { oneAlbum } from "@/lib/playerAlbum";

const strip = (
  over: Partial<DeckState>,
  folded = false,
  selected: SongPartId | null = null,
  fine = false,
  ground = false,
  arrange = false,
  song: string | null = null,
) => {
  const instrument = createInstrument(manualClock());
  const sent = vi.spyOn(instrument, "send").mockImplementation(() => {});
  const setFolded = vi.fn<(folded: boolean) => void>();
  // Every fold open, because what nearly every claim below reads is a control under one of them:
  // the yard opens three of them shut and that is the yard's own claim, made once where the state
  // lives (src/ui/playerCardDouble.ts, src/ui/Deck.tsx).
  const element = playerCard(instrument, over, {
    folded,
    setFolded,
    selected,
    fine,
    ground,
    arrange,
    song,
  });
  return { element, instrument, sent, setFolded };
};

/** The press on the one control the card names rather than draws a knob for. */
const pressLabelled = (element: unknown, label: string): (() => void) => {
  const walk = (node: unknown): (() => void) | null => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child);
        if (found !== null) return found;
      }
      return null;
    }
    if (
      !isValidElement<{ "aria-label"?: string; onClick?: () => void; children?: unknown }>(node)
    ) {
      return null;
    }
    if (node.props["aria-label"] === label && node.props.onClick !== undefined) {
      return node.props.onClick;
    }
    return walk(node.props.children);
  };
  const press = walk(element);
  if (press === null) throw new Error(`no control labelled ${label}`);
  return press;
};

/** A reader and not a voice: the only thing on a `voice` prop that is callable is the card's own. */
const isReader = (value: unknown): value is PlayerVoiceReader => typeof value === "function";

/**
 * The one reader the card hands every dial the song is painting. Found by being a function on a
 * `voice` prop: the front carries a *voice* under that same word — the numbers Add Part would
 * capture — and that one is an object (0176, src/ui/PlayerCard.tsx).
 */
const voiceReader = (element: unknown): PlayerVoiceReader => {
  const walk = (node: unknown): PlayerVoiceReader | null => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child);
        if (found !== null) return found;
      }
      return null;
    }
    if (!isValidElement<{ voice?: unknown; children?: unknown }>(node)) return null;
    const { voice } = node.props;
    if (isReader(voice)) return voice;
    return walk(node.props.children);
  };
  const found = walk(element);
  if (found === null) throw new Error("the card handed no dial a voice to paint");
  return found;
};

/**
 * One frame of the one loop, raised by hand: the browser's own scheduler stood in for, the way
 * src/ui/frame.test.ts stands it in, so a per-frame read can be asked twice on two frames. Safe to
 * unstub straight after because this suite mounts nothing — it calls the card and renders its
 * markup — so the subscription taken here is the only one the loop has and `off` leaves it with
 * no frame scheduled.
 */
const raiseFrame = (): void => {
  const scheduled: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (run: FrameRequestCallback) => {
    scheduled.push(run);
    return scheduled.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const off = onFrame(() => {});
  const due = scheduled.shift();
  if (due === undefined) throw new Error("the loop asked for no frame");
  due(0);
  off();
  vi.unstubAllGlobals();
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
    // that possible — and only for a dial: the runs beside them are components with hooks of
    // their own that no stand-in covers, and their amounts are their own suites' business
    // (src/ui/PlayerDial.tsx, src/ui/PlayerRun.tsx).
    // The card's front, called rather than descended into for the reason a dial is: the reseed it
    // holds is one of this card's own gestures, and the front takes no hooks, so calling it is
    // exactly writing its contents out here. The six names inside it are `PlayerCharacter`'s own
    // suite's business, the way a run's amounts are (src/ui/PlayerFront.tsx).
    if (type === PlayerFront) {
      // oxlint-disable-next-line no-unsafe-type-assertion
      walk((type as (props: Control) => unknown)(props));
      return;
    }
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
   * P130: a card with no spec draws its whole body anyway — every dial, every amount and both
   * corner actions — greyed and unturnable, painting `PLAYER_DEFAULTS`. A refused control is what 0121
   * asks for everywhere else on this card, and a body that is not there cannot say what the module
   * offers or at what settings it would start (0173).
   */
  it("draws its dials refused rather than absent while the switch is off", () => {
    const off = renderToStaticMarkup(strip({ player: null }).element);
    expect(off).toContain(PLAYER_LABEL);
    expect(off).toContain(PLAYER_KNOB_LABELS.distance);
    expect(off).toContain(RESEED_LABEL);
    // Every dial the module declares is refused — all of them, because none of them is behind
    // anything any more (0195) — and each is painted from the switch's own values rather than from
    // a spec the card invented: the gate a press of that switch would send is 0. The three beyond
    // them are the clock the ground's period is counted on, which is a press per word (0192).
    const refused = PLAYER_KNOBS.length + PLAYER_BED_PERS.length;
    expect(off.match(/aria-disabled="true"/gu)?.length).toBe(refused);
    expect(off).toContain(`aria-label="${PLAYER_KNOB_LABELS.gate}" aria-valuemin="0"`);
    expect(off).toContain(`aria-valuenow="${PLAYER_DEFAULTS.gate}"`);
    const on = renderToStaticMarkup(strip({ player: PLAYER }).element);
    expect(on).not.toContain('aria-disabled="true"');
    expect(on).toContain(`aria-valuenow="${PLAYER.gate}"`);
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
    const [, , , , gate, drop, spark, sparkLevel, sparkDelay, reverse] = handlers(element);
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
  // burst is the card's own; the repeats, the vary, the rest and the hold are each a dial with its
  // own run of amounts beside it, pressed in src/ui/PlayerRepeats.test.tsx, PlayerVary.test.tsx,
  // PlayerRest.test.tsx and PlayerRate.test.tsx (P87, 0135, 0195).
  /**
   * The second half of 0157 reversed, which is what 0176 is: a dial used to patch the pattern the
   * parts were a distance from whatever was standing, and now it patches the part a hand pointed
   * it at — the whole spec still, in one `deck.player`, with only that part moved. A part is the
   * dials it was captured from, so the dials have to be able to reach it.
   */
  it("writes into the selected part rather than into the pattern", () => {
    const held = { ...PLAYER_PART_DEFAULTS, id: "part-one", name: "ONE", voice: partVoice(PLAYER) };
    const player = { ...PLAYER, albums: oneAlbum([held]) };
    const { element, sent } = strip({ player }, false, held.id);
    const [, , , , gate] = handlers(element);
    gate?.(0.25);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...player, albums: oneAlbum([{ ...held, voice: { ...held.voice, gate: 0.25 } }]) },
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
    const player = { ...PLAYER, albums: oneAlbum([held]) };
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
   * And a selection reaches the open song alone. A part id names one part in the whole spec
   * (0157), but the Select toggle is drawn on the rows the section is showing — so a selection
   * left behind when a hand opens another song is a card pointed at a part no gesture on screen
   * can take it off, and a dial turned then would edit a row nobody can see (P147, 0176).
   */
  it("takes the dials off a part of a song the section is not showing", () => {
    const held = { ...PLAYER_PART_DEFAULTS, id: "part-one", name: "ONE", voice: partVoice(PLAYER) };
    const [album] = oneAlbum([held]);
    const player = {
      ...PLAYER,
      albums: [
        { ...album!, songs: [...album!.songs, { id: "song-2", name: "Two", plays: 1, parts: [] }] },
      ],
    };
    // The second song is the one open, and the selection names a part of the first.
    const { element, sent } = strip({ player }, false, held.id, false, false, false, "song-2");
    expect(renderToStaticMarkup(element)).not.toContain('data-selected="true"');
    const [, , , , gate] = handlers(element);
    gate?.(0.25);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...player, gate: 0.25 },
    });
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
    const player = { ...PLAYER, albums: oneAlbum([held]), arrange: 3 };
    const { element, sent } = strip({ player }, false, held.id);
    expect(renderToStaticMarkup(element)).not.toContain('data-selected="true"');
    const [, , , , gate] = handlers(element);
    gate?.(0.25);
    expect(sent).toHaveBeenLastCalledWith({
      t: "deck.player",
      deck: "a",
      player: { ...player, gate: 0.25 },
    });
  });

  it("offers the burst as a knob on the same spec", () => {
    const { element, sent } = strip({ player: PLAYER });
    // Nine dials before it: the Ground box is the song's since 0184, so it stands with the
    // arrangement *below* the three boxes a part carries rather than between How It Sounds and
    // How It Is Timed — and nothing of it is ahead of the burst any more.
    const [, , , , , , , , , , burst] = handlers(element);
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
    // Every knob the module declares, because every one of them is on the card at once (0195) —
    // and a rest that is rolled rather than placed is the state this spec is in, which is the one
    // fork that draws fewer than all of them (0163).
    expect(markup.match(/h-\[2lh\]/gu)?.length).toBe(PLAYER_KNOBS.length);
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
   * heading — outside the fold and outside the card. The control that draws a new one no longer
   * stands in a corner behind an icon: it is on the card's front, beside the six names that fill
   * every dial at once, because those are the two gestures a hand reaching for "make this sound
   * different" wants and they belong in one place (0089, 0107, 0152, 0197).
   */
  it("reads its seed beside the heading and puts reseed on the card's front", () => {
    const markup = renderToStaticMarkup(strip({ player: PLAYER }).element);

    expect(markup).toMatch(
      new RegExp(
        `<span class="type-readout text-muted-foreground">${SEED_LABEL} ${PLAYER.seed}<`,
        "u",
      ),
    );
    // The corner is gone entirely: there is nothing left in the card's header for it to hold, and
    // a header with an empty action is a shape kept for a control that moved (0197).
    expect(markup).not.toContain('data-slot="card-action"');
    // The front comes first inside the card, and the reseed is in it: the picture, then the names
    // that fill the dials under them, then the number they all unfold from.
    expect(markup.indexOf('data-slot="player-scope"')).toBeLessThan(
      markup.indexOf(`${RESEED_LABEL} `),
    );
    expect(markup.indexOf(`${RESEED_LABEL} `)).toBeLessThan(markup.indexOf(PLAYER_FINE_LABEL));
    // And the heading the seed reads beside is outside the card rather than in its header (0106).
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
   * The card reads as a full-width card of the rack rather than as a bare section beside them: one
   * card primitive and the width the rack's `full` entries take (P87). It carries no header at
   * all now — the two gestures its corner held stand on the front instead, and a header kept for
   * nothing is a shape claiming room it does not use (0197, the argument P130 made for the fold).
   */
  it("draws itself as a full-width card whose body begins at its front", () => {
    const markup = renderToStaticMarkup(strip({ player: PLAYER }).element);
    expect(markup).toContain('data-slot="card"');
    expect(markup).not.toContain('data-slot="card-header"');
    expect(markup).toContain("w-full");
    // The front is the first thing inside the card, ahead of every dial (0197).
    expect(markup.indexOf('data-slot="card-content"')).toBeLessThan(
      markup.indexOf('data-slot="player-scope"'),
    );
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
   * may not outlive one — and until P130 the unmount did that, because the menu was not drawn at
   * all while the switch was off. Drawn refused instead, it is the same instance across a clear,
   * and dragging Amount would blend a fresh spec toward a character nobody pressed on it. Its
   * identity is what says so: the menu the off card draws is not the menu the on card draws.
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
        // The first control carrying a spec and no defaults, which is the corner's own menu: the
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
      // The front holds the reseed now, and it takes no hooks — so it is called rather than left
      // as an element whose contents this walk never reaches (src/ui/PlayerFront.tsx).
      if (node.type === PlayerFront) {
        // oxlint-disable-next-line no-unsafe-type-assertion
        walk((node.type as (props: unknown) => unknown)(node.props));
        return;
      }
      walk(node.props.children);
    };
    walk(strip({ player: PLAYER }).element);
    expect(drawn.has(ACTION_ICONS.reseed)).toBe(true);
    expect(drawn.has(ACTION_ICONS.duplicate)).toBe(false);
  });

  /**
   * Plant, which is the one gesture on this card that says nothing about the pattern: it writes
   * the ground the walk has wandered onto back as the deck's loop, as an ordinary `deck.loop`
   * (P139). The ground is read off the peek at the press, so the test stands the walk somewhere.
   */
  it("plants the ground the walk is standing on as an ordinary loop command", () => {
    const { element, instrument, sent } = strip({ player: PLAYER });
    const step = playerSequence(PLAYER, 1)[0]!;
    // Eight sixteenths into a one-second loop of a two-second buffer: half a bed in, which is a
    // place no index of loop lengths can name (`bedGround`, src/lib/playerBed.ts).
    vi.spyOn(instrument, "peek").mockReturnValue({
      ...emptyDeckPeek(),
      player: { step: { ...step, bed: 8 }, at: 0, sparkPosition: null },
    });
    pressLabelled(element, `${PLANT_LABEL} ${PLAYER_LABEL} on Yard A`)();
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent).toHaveBeenCalledWith({ t: "deck.loop", deck: "a", in: 0.5, out: 1.5 });
  });

  it("plants nothing while the walk is standing on the loop itself", () => {
    const { element, instrument, sent } = strip({ player: PLAYER });
    const step = playerSequence(PLAYER, 1)[0]!;
    vi.spyOn(instrument, "peek").mockReturnValue({
      ...emptyDeckPeek(),
      player: { step: { ...step, bed: 0 }, at: 0, sparkPosition: null },
    });
    pressLabelled(element, `${PLANT_LABEL} ${PLAYER_LABEL} on Yard A`)();
    expect(sent).not.toHaveBeenCalled();
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

  /**
   * And the one read all of those dials share is taken once a frame, however many of them ask. A
   * peek refills the deck's whole read — the meter's own window and the two reductions over it
   * among them — and forty of those a frame, for a number that cannot move inside one frame, was
   * about half of everything the one loop was doing while this card played (P151, 0218).
   *
   * Counted rather than timed: what the drag got back is the thirty-nine peeks it stopped taking,
   * and a count is the only form of that a test can hold (0051 keeps the timings).
   */
  it("peeks once a frame for every dial the song is painting, and again on the next", () => {
    const { element, instrument } = strip({
      player: { ...PLAYER, arrange: 3 },
      playing: true,
    });
    const read = voiceReader(element);
    const peeked = vi.spyOn(instrument, "peek");
    for (const knob of PLAYER_KNOBS) read(knob);
    expect(peeked).toHaveBeenCalledTimes(1);
    // And the read belongs to the yard rather than to whoever asked, which is the half of this a
    // memo cannot be trusted with: the drag that costs the frame redraws this card on every move,
    // and a reader rebuilt by one of those must find the frame already read (P151).
    voiceReader(playerCard(instrument, { player: { ...PLAYER, arrange: 3 }, playing: true }))(
      "gate",
    );
    expect(peeked).toHaveBeenCalledTimes(1);
    // And the frame after it is a fresh read: a cached voice that outlived its frame would be a
    // dial painting where the pattern was, which is the halted lane 0040 refuses.
    raiseFrame();
    for (const knob of PLAYER_KNOBS) read(knob);
    expect(peeked).toHaveBeenCalledTimes(2);
  });
});
