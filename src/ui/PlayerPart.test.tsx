/**
 * @role What one part's row promises: the two inks it may be lit in and never both, what it says
 *   about itself when a part carries a spec and no character — the signature and the bar — the one
 *   action it refuses until there is something to hear, and the dials its own fold opens, which
 *   write into that part and nothing else (0172, 0176).
 * @instead What the list around it sends — add, copy, skip, remove, reorder, and the whole `song`
 *   every one of them patches → src/ui/PlayerSong.test.tsx. The maths behind the bar and the
 *   signature → src/lib/playerSong.test.ts and src/lib/playerCharacter.test.ts.
 */
// Over the dependency cap, and what is over it is the row's own case: the toggle's variants,
// because the ink a pressed control wears is read off the primitive rather than copied here, and
// `node:fs`, because the value behind a token is only in the one file that declares it. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { readFileSync } from "node:fs";

import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as ReactTypes from "react";
import { describe, expect, it, vi } from "vitest";

// The two hooks a row calls, made callable outside a renderer so a control's own handler can be
// pressed — the same stand-in src/ui/PlayerCard.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    // And the memo beside it, for the same reason: a row called outside a renderer has no hook
    // dispatcher, and what `useMemo` is *for* here is identity across renders there are none of.
    useMemo: (factory: () => unknown) => factory(),
  };
});

import { partVoice, PLAYER_PART_KNOBS, type PlayerSpec } from "@/lib/player";
import { PLAYER_CHARACTER_LABELS, PLAYER_RATE_LABEL } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_PART_DEFAULTS, PLAYER_SONG_MAX, type SongPart } from "@/lib/playerSong";
import { toggleVariants } from "@/ui/components/toggle";
import { PartCard } from "@/ui/PlayerPart";
// oxlint-enable import/max-dependencies

/** What a colour token is declared as, read out of the one file every colour in the instrument is
 *  declared in (boundaries.md). Two utilities naming two tokens are two inks only if the tokens
 *  are two values, which is the whole of what the standing case below asserts. */
const tokenValue = (token: string): string => {
  const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
  const found = new RegExp(`^\\s*--${token}:([^;]+);`, "mu").exec(css);
  if (found === null) throw new Error(`No --${token} declared in tokens.css.`);
  return found[1]!.trim();
};

/** Every ink a pressed toggle of the row's own variant is filled with — read off the primitive
 *  rather than copied here, so the claim tracks the control (src/ui/components/toggle.tsx). */
const pressedInks = (): string[] =>
  [
    ...toggleVariants({ variant: "outline", size: "sm" }).matchAll(
      /(?:aria-pressed|data-\[state=on\]):bg-([a-z-]+)/gu,
    ),
  ].map(([, token]) => token!);

const PLAYER: PlayerSpec = { seed: 3, ...PLAYER_DEFAULTS };

let minted = 0;
const part = (over: Partial<SongPart> = {}): SongPart => ({
  id: `part-${++minted}`,
  name: `part-${minted}`,
  ...PLAYER_PART_DEFAULTS,
  voice: partVoice(PLAYER_DEFAULTS),
  ...over,
});

/** Whatever a control's own handler takes — this row's job is what it hands its list. */
type Press = (...args: unknown[]) => void;
type Control = {
  onClick?: Press;
  onChange?: Press;
  onPressedChange?: Press;
  onValueChange?: Press;
  disabled?: boolean;
  knob?: unknown;
  "aria-label"?: string;
  children?: unknown;
};

const HANDLERS = ["onValueChange", "onChange", "onPressedChange", "onClick"] as const;

/** One row, drawn: the element tree and the markup it renders to. */
const row = (over: Partial<SongPart> = {}, open = false, selected = false, song?: SongPart[]) => {
  const held = part(over);
  const onChange = vi.fn<(at: number, part: SongPart) => void>();
  const element = PartCard({
    deck: "a",
    at: 0,
    part: held,
    song: song ?? [held],
    player: PLAYER,
    selected,
    open,
    handle: { onPointerDown: () => {}, onKeyDown: () => {} },
    onChange,
    onSelect: () => {},
    onOpen: () => {},
    onDuplicate: () => {},
    onRemove: () => {},
  });
  return { part: held, element, markup: renderToStaticMarkup(element), onChange };
};

/** One row's own class list, off the attribute it carries the part it draws under. */
const classes = (markup: string): string =>
  /data-part="[^"]*" class="([^"]*)"/u.exec(markup)?.[1] ?? "";

/** One control of the row, by the name it wears. */
const labelled = (node: unknown, label: string): Control | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = labelled(child, label);
      if (found !== null) return found;
    }
    return null;
  }
  if (!isValidElement<Control>(node)) return null;
  if (node.props["aria-label"] === label) return node.props;
  return labelled(node.props.children, label);
};

/** Every handler the fold's dials carry, in render order — a dial is a component named by the
 *  knob it draws, so its own handler is one layer in (src/ui/PlayerCard.test.tsx). */
const dialHandlers = (node: unknown, found: Press[] = [], inside = false): Press[] => {
  if (Array.isArray(node)) {
    for (const child of node) dialHandlers(child, found, inside);
    return found;
  }
  if (!isValidElement<Control>(node)) return found;
  const { type, props } = node;
  if (typeof type === "function" && props.knob !== undefined) {
    // A function component and a class one are both functions to `typeof`, and only one is
    // callable; this tree holds no class components.
    // oxlint-disable-next-line no-unsafe-type-assertion
    dialHandlers((type as (props: Control) => unknown)(props), found, true);
    return found;
  }
  // Only what a dial carries: the row's own controls answer to the list above it, and the claim
  // here is about the fold's dials alone.
  if (inside) {
    for (const key of HANDLERS) {
      const handler = props[key];
      if (handler !== undefined) found.push(handler);
    }
  }
  dialHandlers(props.children, found, inside);
  return found;
};

// One case per thing a row says or refuses. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("one part of a song, as a row", () => {
  /**
   * The row a walk is standing on is lit in an ink no control on it is filled with. `accent` and
   * `muted` are one value in both schemes, so the one control on the row whose whole job is to be
   * read at a glance — the chorus toggle then, the Select toggle now — went invisible on exactly
   * the row where reading it matters (0172, 0176). Asserted against the declared tokens rather
   * than against the class names, because the class names never agreed: the values did.
   */
  it("lights the standing row in an ink no pressed control wears", () => {
    const standing = /data-\[standing=true\]:bg-([\w./-]+)/u.exec(row().markup)?.[1];
    expect(standing).toBeDefined();
    const pressed = pressedInks();
    expect(pressed.length).toBeGreaterThan(0);
    for (const token of pressed) {
      expect(tokenValue(token)).not.toBe(tokenValue(standing!.split("/")[0]!));
    }
  });

  /**
   * And the row a hand has pointed the card's dials at is lit in neither of those: what the walk's
   * ink says is that a part is *playing*, and what this one says is that the dials above are that
   * part's, so a surface drawing the two the same would report the wrong one of them (0172, 0176).
   * The hand's mark wins where both are true — a selected row draws no standing variant at all —
   * because what a selected row is for is the dials, and the walk moves on by itself.
   */
  it("lights the selected row in an ink that is neither the standing one nor a control's", () => {
    const walked = classes(row().markup);
    const picked = classes(row({}, false, true).markup);
    const standing = /data-\[standing=true\]:bg-([\w./-]+)/u.exec(walked)?.[1];
    const selected = /(?:^|\s)bg-([\w./-]+)/u.exec(picked)?.[1];
    expect(standing).toBeDefined();
    expect(selected).toBeDefined();
    expect(picked).not.toContain("data-[standing=true]:bg-");
    expect(tokenValue(selected!.split("/")[0]!)).not.toBe(tokenValue(standing!.split("/")[0]!));
    for (const token of pressedInks()) {
      expect(tokenValue(token)).not.toBe(tokenValue(selected!.split("/")[0]!));
    }
  });

  /**
   * What a part can say about itself now that it carries a spec and no character: the three dials
   * it is furthest from plain on, each spelled the way its own dial spells it — and, for a part
   * left exactly where the switch leaves it, the character menu's own word for that point rather
   * than three knobs listed as though they meant something (0174, 0176).
   */
  it("reads out the dials it is furthest from plain on, and says so when it is at plain", () => {
    const { markup } = row({
      voice: partVoice({
        ...PLAYER_DEFAULTS,
        gate: PLAYER_DEFAULTS.gate + 0.4,
        drop: PLAYER_DEFAULTS.drop + 0.3,
        reverse: PLAYER_DEFAULTS.reverse + 0.2,
      }),
    });
    expect(markup).toContain(`${PLAYER_KNOB_LABELS.gate} 0.4`);
    expect(markup).toContain(`${PLAYER_KNOB_LABELS.drop} 0.3`);
    expect(markup).toContain(`${PLAYER_KNOB_LABELS.reverse} 0.2`);
    expect(row().markup).toContain(PLAYER_CHARACTER_LABELS.plain);
  });

  /**
   * And how much of the song it is, drawn rather than counted: the bar is its jumps over the jumps
   * of every part the walk actually plays (`songShare`, src/lib/playerSong.ts).
   */
  it("draws its bar at its share of the parts the walk plays", () => {
    const other = part({ length: 3 });
    const skipped = part({ length: 12, skip: true });
    const { markup } = row({ length: 1 }, false, false, [part({ length: 1 }), other, skipped]);
    // Its own part is not the one in that list — the row is handed the song it is measured
    // against — so a share of a quarter is one jump of the four being played.
    expect(markup).toContain("width:25%");
  });

  /**
   * The one action refused rather than absent: there is nothing to audition until Step 4 gives it
   * something to play, and a control that is not drawn leaves nothing on screen saying the gesture
   * exists (0121).
   */
  it("refuses the audition rather than leaving it off the row", () => {
    const found = labelled(row().element, "Audition Yard A Song Part 1");
    expect(found).not.toBeNull();
    expect(found?.disabled).toBe(true);
  });

  /**
   * The ceiling the copy shares with the add: a ninth part on a song of eight is a spec the one
   * validator refuses, so the control that would write it is refused instead of writing a session
   * that will not load (0121, src/lib/player.ts).
   */
  it("refuses the copy on a song already at its ceiling", () => {
    const full = Array.from({ length: PLAYER_SONG_MAX }, () => part());
    const at = (song: SongPart[]): boolean | undefined =>
      labelled(row({}, false, false, song).element, "Duplicate Yard A Song Part 1")?.disabled;
    expect(at(full)).toBe(true);
    expect(at(full.slice(1))).toBe(false);
  });

  /**
   * An open fold draws the very boxes the card draws, so every dial in it would be a second slider
   * under one word — and every door in it a second trigger under one label — unless the part it
   * belongs to is in front of them. A caption is a dial's whole accessible name, which is what the
   * prefix exists for (0055, src/ui/PlayerDial.tsx, src/ui/PlayerMore.tsx).
   */
  it("names the dials its fold opens after the part they belong to", () => {
    const markup = row({}, true).markup;
    expect(markup).toContain(`aria-label="Yard A Song Part 1 ${PLAYER_KNOB_LABELS.gate}"`);
    expect(markup).not.toContain(`aria-label="${PLAYER_KNOB_LABELS.gate}"`);
    // The doors on those boxes too, which are named for the yard when they are the card's own.
    expect(markup).toContain(`aria-label="Yard A Song Part 1 ${PLAYER_RATE_LABEL}"`);
    expect(markup).not.toContain(`aria-label="Yard A ${PLAYER_RATE_LABEL}"`);
  });

  /**
   * The fold's whole point: a hand edits a part where it stands rather than pointing the card's
   * dials at it and reaching back up. The dials are the card's own boxes, and turning one writes
   * the whole part back — the four the song is drawn by are not among a part's, so no dial in this
   * fold can reach them (0158, 0176).
   */
  it("opens the part's own dials, which write the whole part back", () => {
    const shut = row();
    expect(dialHandlers(shut.element)).toHaveLength(0);
    const open = row({}, true);
    const dials = dialHandlers(open.element);
    expect(dials.length).toBeGreaterThan(0);
    dials[0]?.(0.5);
    const [, written] = open.onChange.mock.calls[0] ?? [];
    expect(written?.id).toBe(open.part.id);
    expect(written?.length).toBe(open.part.length);
    // One field moved and the rest of the captured spec exactly as it was.
    const moved = PLAYER_PART_KNOBS.filter(
      (knob) => written?.voice[knob] !== open.part.voice[knob],
    );
    expect(moved).toHaveLength(1);
  });
});
