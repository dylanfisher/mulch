/**
 * @role What the cast's pad offers and what one drag across it writes: every corner naming itself
 *   and its own share inside the picture (0252), a place among the six blended into one spec, and
 *   the song's own amounts left exactly where the hand put them (0152, 0158, 0259).
 */
import { isValidElement } from "react";
import type * as ReactTypes from "react";
// Over both caps: one case per thing the pad says and one per thing a press on it writes, each
// against the real spec and the real cast, so the counts track the pad's surface rather than this
// file's complexity. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies, max-lines-per-function
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * The three hooks this component calls, made callable outside a renderer so the pad's own handler
 * can be pressed — the stand-in `src/ui/PlayerDistance.tsx`'s suite uses, with the two cells this
 * one keeps added to it. The state's setters are dropped, because what is under test is what
 * reaches `patch` on the press and never what the pad looks like on the frame after; the ref is a
 * box carrying the element the handler measures, which is the one thing a server render has none of.
 */
const BOX = { left: 0, top: 0, width: 320, height: 200 };
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useState: (initial: unknown) => [initial, () => {}],
    useRef: () => ({ current: { getBoundingClientRect: () => BOX } }),
  };
});

import {
  PLAYER_BLEND_LABEL,
  PLAYER_CHARACTER_LABELS,
  PLAYER_LABEL,
  PLAYER_REDRAW_LABEL,
  RESEED_LABEL,
  yardLabel,
} from "@/lib/copy";
import { PLAYER_PART_KNOBS, type PlayerSpec } from "@/lib/player";
import { BLEND_CORNERS, BLEND_PAD, BLEND_SPILL, BLEND_VIEW } from "@/lib/playerBlend";
import { PLAYER_CAST_MAX, PLAYER_CHARACTERS } from "@/lib/playerCast";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_SONG_KNOBS } from "@/lib/playerKnobs";
import { ACTION_ICONS } from "@/ui/icons";
import { PlayerBlend } from "@/ui/PlayerBlend";

const DECK = "a";

/** The card's own spec, with a song and a ground on it so a drag can be caught touching either. */
const PLAYER: PlayerSpec = {
  ...PLAYER_DEFAULTS,
  seed: 9,
  cast: PLAYER_CAST_MAX,
  arrange: 1,
  arrangeGrow: 2,
  bed: -2,
  bedEvery: 3,
};

/** What the reseed beside the redraw is called, which the card builds and the pad only wears. */
const RESEED = `${RESEED_LABEL} ${PLAYER_LABEL} on ${yardLabel(DECK)}`;

const pad = (disabled = false) => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const reseed = vi.fn<() => void>();
  const element = PlayerBlend({
    deck: DECK,
    player: PLAYER,
    patch,
    reseed,
    reseedLabel: RESEED,
    disabled,
  });
  return { element, patch, reseed };
};

type Press = (event: unknown) => void;
type Node = {
  onPointerDown?: Press;
  press?: (index: number) => void;
  index?: number;
  children?: unknown;
};

/** The one press the picture carries, found by walking what the component returned. */
const pressOf = (element: unknown): Press => {
  const walk = (node: unknown): Press | null => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child);
        if (found !== null) return found;
      }
      return null;
    }
    if (!isValidElement<Node>(node)) return null;
    if (node.props.onPointerDown !== undefined) return node.props.onPointerDown;
    return walk(node.props.children);
  };
  const press = walk(element);
  if (press === null) throw new Error("the pad drew no press");
  return press;
};

/**
 * The press one corner's own name carries, found by the two props only a name is handed. A name is
 * a `<text>` inside the picture rather than a button beside it (0252), so there is no role to walk
 * to until it is rendered — what is under test is what reaches `patch`, which is the handler.
 */
const nameOf = (element: unknown, index: number): (() => void) => {
  const walk = (node: unknown): (() => void) | null => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child);
        if (found !== null) return found;
      }
      return null;
    }
    if (!isValidElement<Node>(node)) return null;
    const { press, index: on } = node.props;
    if (press !== undefined && on === index)
      return () => {
        press(on);
      };
    return walk(node.props.children);
  };
  const press = walk(element);
  if (press === null) throw new Error(`the pad drew no name at corner ${index}`);
  return press;
};

/** The press one labelled button on the row under the picture carries. */
const clickOf = (element: unknown, label: string): (() => void) => {
  const walk = (node: unknown): (() => void) | null => {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = walk(child);
        if (found !== null) return found;
      }
      return null;
    }
    if (!isValidElement<{ "aria-label"?: string; onClick?: () => void; children?: unknown }>(node))
      return null;
    const { onClick } = node.props;
    if (onClick !== undefined && node.props["aria-label"] === label) return onClick;
    return walk(node.props.children);
  };
  const press = walk(element);
  if (press === null) throw new Error(`the pad drew no button called ${label}`);
  return press;
};

/** A pointer coming down at a place in the pad's own coordinates, through the box above. */
const at = (x: number, y: number) => ({
  clientX: x + BLEND_SPILL,
  clientY: y,
  pointerId: 1,
  currentTarget: { setPointerCapture: () => {} },
});

describe("the cast's pad", () => {
  /**
   * The one question a pad exists to answer is whether a hand can find the character it wants, and
   * a pad whose corners are unlabelled cannot be asked it — so the names are inside the picture
   * with their weights beside them, and there is no legend anywhere (0252).
   */
  it("names every corner inside its own picture, with that corner's share beside it", () => {
    const markup = renderToStaticMarkup(pad().element);
    for (const character of PLAYER_CHARACTERS) {
      expect(markup).toContain(`data-corner="${character}"`);
      // The name and its share, inside the `<text>` the corner draws and not in a legend under it.
      expect(markup).toMatch(new RegExp(`<text[^>]*>${character}[^<]*\\d`, "u"));
      // And every one of them is a press, under the name a hand says out loud: the pad is the
      // card's whole road into the cast, so a character has to be askable by name on it (0259).
      expect(markup).toContain(`aria-label="${PLAYER_CHARACTER_LABELS[character]}"`);
    }
    // The corners are the module's own cast in the module's own order, so a name added to the cast
    // arrives here with no change (principle 1).
    expect(BLEND_CORNERS.map((corner) => corner.name)).toEqual([...PLAYER_CHARACTERS]);
  });

  /**
   * The box and the drawing share one ratio, because any other letterboxes the drawing inside the
   * element while the pointer maths stretch-fits — which hands the drag a place a few units off the
   * finger (0252).
   */
  it("draws its box at the drawing's own ratio, so the drag lands where the finger is", () => {
    const markup = renderToStaticMarkup(pad().element);
    expect(markup).toContain(`viewBox="${-BLEND_SPILL} 0 ${BLEND_VIEW} ${BLEND_PAD}"`);
    expect(BLEND_VIEW / BLEND_PAD).toBeCloseTo(320 / 200, 10);
    expect(markup).toContain("h-40 w-64");
  });

  it("says whose pad it is, and offers a second draw of the six beside a new seed", () => {
    const markup = renderToStaticMarkup(pad().element);
    expect(markup).toContain(`aria-label="${yardLabel(DECK)} ${PLAYER_BLEND_LABEL}"`);
    expect(markup).toContain(PLAYER_REDRAW_LABEL);
    // The two draws stand on one row: another six of the same cast, and the number they unfold
    // from. Both are "make this sound different", so neither is a row away from the other.
    expect(markup).toContain(`aria-label="${RESEED}"`);
    expect(markup.indexOf(PLAYER_REDRAW_LABEL)).toBeLessThan(markup.indexOf(RESEED));
    // Refused rather than absent while the switch is off, the way every dial on the card is.
    expect(renderToStaticMarkup(pad(true).element)).toContain("opacity-50");
    expect(markup).toContain("cursor-grab");
  });

  /**
   * One action, one icon, one sentence (0055, P74): the card hands the reseed down and the pad is
   * where it is drawn, so this is where the picture it wears is asserted — its own, and never the
   * copy's, which said a second pattern was being made rather than this one drawn again.
   */
  it("draws the reseed it is handed with its own picture, and presses it whole", () => {
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
    const { element, reseed } = pad();
    walk(element);
    expect(drawn.has(ACTION_ICONS.reseed)).toBe(true);
    expect(drawn.has(ACTION_ICONS.duplicate)).toBe(false);

    // And the press is the card's own call, handed on untouched: the pad decides nothing about a
    // seed, it only stands the gesture beside the other draw (0089).
    clickOf(element, RESEED)();
    expect(reseed).toHaveBeenCalledTimes(1);
  });
});

/**
 * What one press across the pad writes. A place in the pad and a `deck.player` are what this seam
 * is; a real pointer on a real element is `scripts/smoke.d/renderPlayer.js`'s to press (plan §4).
 */
describe("a press on the pad", () => {
  /** The six are drawn on the press that needs them, so the draw is a gesture's and not a frame's. */
  const pressed = (x: number, y: number) => {
    const { element, patch } = pad();
    pressOf(element)(at(x, y));
    const wrote = patch.mock.calls[0]?.[0];
    if (wrote === undefined) throw new Error("the press wrote nothing");
    return wrote;
  };

  it("leaves every one of the song's own amounts where the hand put them", () => {
    const fields = pressed(BLEND_PAD / 2, BLEND_PAD / 2);
    for (const knob of PLAYER_SONG_KNOBS) expect(fields[knob]).toBe(PLAYER[knob]);
  });

  /**
   * A press standing on a corner is that character at full strength, and one in the middle is the
   * six at once — which is the whole claim the pad makes, and the one thing the six names beside
   * it cannot do (0259).
   */
  it("writes a corner's own character on it, and something between all six in the middle", () => {
    const corner = BLEND_CORNERS[1];
    if (corner === undefined) throw new Error("the pad drew no corners");
    const stood = pressed(corner.x, corner.y);
    const between = pressed(BLEND_PAD / 2, BLEND_PAD / 2);
    // `stutter` names the shortest bursts in the cast; the middle of the pad cannot be there.
    expect(stood.burst).toBeLessThan(Number(between.burst));
    expect(stood.repeats).toBeGreaterThan(Number(between.repeats));
    // And whatever it writes is a whole count, because the repeat dial is a count and not a measure.
    expect(Number.isInteger(between.repeats)).toBe(true);
  });

  /**
   * A name pressed is that character whole and not the place its corner is drawn at: standing on
   * `plain` writes the very values the switch leaves, which the softened weighing at that same
   * point cannot (0259, `blendCorner`).
   */
  it("takes a named corner whole, where standing on it is four fifths of it", () => {
    const plain = PLAYER_CHARACTERS.indexOf("plain");
    const corner = BLEND_CORNERS[plain];
    if (corner === undefined) throw new Error("the pad drew no plain corner");

    const { element, patch } = pad();
    nameOf(element, plain)();
    const named = patch.mock.calls[0]?.[0];
    if (named === undefined) throw new Error("the name wrote nothing");
    for (const knob of PLAYER_PART_KNOBS) expect(named[knob]).toBe(PLAYER_DEFAULTS[knob]);
    // And the song's own amounts are left where the hand put them, the way a drag leaves them.
    for (const knob of PLAYER_SONG_KNOBS) expect(named[knob]).toBe(PLAYER[knob]);
    // The drag onto that very corner is not the same gesture: the softening that keeps the middle
    // an even six leaves a fifth of everything else in it.
    expect(pressed(corner.x, corner.y).burst).not.toBe(PLAYER_DEFAULTS.burst);
  });

  it("writes nothing at all while the switch is off", () => {
    const { element, patch } = pad(true);
    pressOf(element)(at(BLEND_PAD / 2, BLEND_PAD / 2));
    expect(patch).not.toHaveBeenCalled();
  });
});
