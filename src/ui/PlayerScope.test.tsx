/**
 * @role Tests the scope's wiring rather than its pixels: that a yard with no grid to jump around
 *   draws nothing, that the picture animates for exactly as long as the yard plays and at its own
 *   cadence, that the window is walked once and extended rather than re-walked at every landing,
 *   and that the song lane is the parts at their own shares.
 * @instead What a block is and where it sits → src/lib/playerScope.test.ts.
 */
// Over the dependency cap, and what is over it is the four modules a case has to build a real
// pattern out of — the spec, the song, the walk and the peek — beside the three this file stubs.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ScopeAim, ScopeGeometry } from "@/lib/playerScope";
import type * as PlayerWalk from "@/lib/playerWalk";

/** What a render asked the surface for: the paint it handed over, and the two arguments beside it. */
const surface = vi.hoisted(() => ({
  paints: [] as ((canvas: HTMLCanvasElement, color: string) => void)[],
  animate: [] as boolean[],
  everyMs: [] as number[],
}));

/** And what each painting drew, since a server render has no canvas to draw it on. */
const painted = vi.hoisted(() => ({
  geometries: [] as ScopeGeometry[],
  heads: [] as number[],
  /** The crosshair each painting was handed, which is null wherever there is nothing to grab. */
  aims: [] as (ScopeAim | null)[],
}));

/** How many walks the surface built. The whole claim of the cache is that this stays at one. */
const walks = vi.hoisted(() => ({ built: 0 }));

// The canvas is the one part of this that needs a DOM. Stubbed, the markup is unchanged and what
// the surface was asked for is readable — the same call src/ui/MoireStrip.test.tsx makes of the
// drift's own surface.
vi.mock("@/ui/canvasSurface", () => ({
  useCanvasSurface: (
    paint: (canvas: HTMLCanvasElement, color: string) => void,
    animate: boolean,
    everyMs: number,
  ) => {
    surface.paints.push(paint);
    surface.animate.push(animate);
    surface.everyMs.push(everyMs);
    return { rootRef: { current: null }, canvasRef: { current: null }, repaint: () => {} };
  },
  hairlinePx: () => 1,
}));

vi.mock("@/ui/playerScopeCanvas", () => ({
  paintScope: (
    _canvas: unknown,
    geometry: ScopeGeometry,
    head: number,
    _color: string,
    aim: ScopeAim | null,
  ) => {
    painted.geometries.push(geometry);
    painted.heads.push(head);
    painted.aims.push(aim);
  },
}));

// Counted rather than replaced: the walk itself is what the window is made of, so a stand-in would
// make this a test about a fake. What is asserted is how many times one is *built*.
vi.mock("@/lib/playerWalk", async (importOriginal) => {
  const walk = await importOriginal<typeof PlayerWalk>();
  return {
    ...walk,
    playerWalk: (...args: Parameters<typeof walk.playerWalk>) => {
      walks.built++;
      return walk.playerWalk(...args);
    },
  };
});

import { manualClock } from "@/app/clock";
import type { Instrument } from "@/app/facade";
import { createInstrument } from "@/app/facade";
import { emptyDeckPeek, type DeckPeek } from "@/audio/deckPeek";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_SCOPE_LANDINGS, PLAYER_SCOPE_PAINT_MS, scopeMark } from "@/lib/playerScope";
import { PLAYER_SCOPE_LABEL, yardLabel } from "@/lib/copy";
import { EXPLAIN_LABEL } from "@/lib/copyCard";
import { PLAYER_PART_DEFAULTS, type SongPart } from "@/lib/playerSong";
import { partVoice } from "@/lib/player";
import { playerSequence } from "@/lib/playerWalk";
import type { DeckState } from "@/state/store";
import { PlayerScope } from "@/ui/PlayerScope";
import { oneAlbum } from "@/lib/playerAlbum";

// oxlint-enable import/max-dependencies

const emptyDeck = (): DeckState => {
  const deck = createInstrument(manualClock()).state.getState().decks.a;
  if (deck === undefined) throw new Error("the initial session holds no deck a");
  return deck;
};

/** One peek, refilled by hand the way the transport refills it (0070). */
const peek: DeckPeek = emptyDeckPeek();

/** A stand-in for the one thing this surface asks the instrument for. */
// oxlint-disable-next-line no-unsafe-type-assertion -- the one member the surface reads
const instrument = { peek: () => peek } as unknown as Instrument;

const part = (id: string): SongPart => ({
  ...PLAYER_PART_DEFAULTS,
  id,
  name: id,
  voice: partVoice(PLAYER_DEFAULTS),
});

/** The card's patch, which every claim in this file is made without pressing. */
const patch = (): void => {};

const render = (state: DeckState, solo: string | null = null) =>
  renderToStaticMarkup(
    <PlayerScope instrument={instrument} deck="a" state={state} solo={solo} patch={patch} />,
  );

/** The last paint a render handed over, taken where it stands. */
const lastPaint = (): ((canvas: HTMLCanvasElement, color: string) => void) => {
  const paint = surface.paints.at(-1);
  if (paint === undefined) throw new Error("the scope asked for no painting");
  return paint;
};

// oxlint-disable-next-line no-unsafe-type-assertion -- the painter is stubbed and draws nothing
const nothing = null as unknown as HTMLCanvasElement;

// One flat list of the scope's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("PlayerScope", () => {
  // The rule the drift is held to, said for the picture that draws the walk itself: a loop with no
  // grid to jump around is one the transport plays straight past, so there is no walk to draw
  // (`playerJumps`, src/audio/playerGrid.ts; 0159).
  it("draws nothing for a yard with no grid to jump around", () => {
    expect(render(emptyDeck())).toBe("");
    expect(render({ ...emptyDeck(), loop: { in: 0, out: 0.001 } })).toBe("");
  });

  /**
   * 0198: the picture is a control and nothing on it said so — the sentence was on the eyebrow, a
   * hover target nothing named, and the pad under it was invisible. The press is the way into the
   * sentence, and it says both halves: what the shape means and what the crosshair does.
   */
  it("offers a press that explains the picture and the gesture across it", () => {
    const markup = render({ ...emptyDeck(), loop: { in: 0, out: 4 } });
    expect(markup).toContain(`${EXPLAIN_LABEL} ${yardLabel("a")} ${PLAYER_SCOPE_LABEL}`);
  });

  /**
   * And the crosshair itself, which is where the two numbers a drag writes actually stand. Handed
   * to the painter off the deck's own spec, so the handle is where a hand left it — null with no
   * spec, because there is then nothing to grab (0121, `scopeMark`).
   */
  it("hands the painter the crosshair the drag writes, and none without a spec", () => {
    const looped: DeckState = { ...emptyDeck(), loop: { in: 0, out: 4 } };
    render(looped);
    lastPaint()(nothing, "#fff");
    expect(painted.aims.at(-1)).toBe(null);

    const player = { seed: 3, ...PLAYER_DEFAULTS };
    render({ ...looped, player });
    lastPaint()(nothing, "#fff");
    expect(painted.aims.at(-1)).toEqual(scopeMark(player.distance, player.repeats));
  });

  it("animates for exactly as long as the yard plays, at its own cadence", () => {
    const looped: DeckState = { ...emptyDeck(), loop: { in: 0, out: 4 } };
    expect(render(looped)).toContain("<canvas");
    expect(surface.animate.at(-1)).toBe(false);
    expect(surface.everyMs.at(-1)).toBe(PLAYER_SCOPE_PAINT_MS);
    render({ ...looped, playing: true });
    expect(surface.animate.at(-1)).toBe(true);
  });

  /**
   * The whole of the cache's claim (0180): `playerWalk(spec, from)` burns `from` steps to reach the
   * tail, so a window rebuilt at every landing boundary would re-walk from zero at linearly growing
   * cost. Painted at three ordinals under one spec — the walk is built once, and the sheet it
   * draws holds still while the clock moves across it (0187).
   */
  it("walks its sheet once and holds it still while the clock crosses it", () => {
    const player = { seed: 12_345, ...PLAYER_DEFAULTS };
    const state: DeckState = { ...emptyDeck(), loop: { in: 0, out: 4 }, player, playing: true };
    const laid = playerSequence(player, 40);
    walks.built = 0;
    render(state);
    const paint = lastPaint();
    for (const at of [0, 1, 12]) {
      peek.player.at = at;
      peek.player.step = laid[at] ?? null;
      paint(nothing, "");
      const geometry = painted.geometries.at(-1);
      expect(geometry?.blocks).toHaveLength(PLAYER_SCOPE_LANDINGS);
      // The sheet is the same landings each time, and the clock is a position on it.
      expect(geometry?.blocks[0]?.slot).toBe(laid[0]?.slot);
      expect(geometry?.at).toBe(at);
      expect(geometry?.blocks[at]?.slot).toBe(laid[at]?.slot);
    }
    expect(walks.built).toBe(1);

    // And a spec that is a different object is a different pattern: the cache is thrown away and
    // walked again, which is the one thing that may cost a whole walk (0144).
    render({ ...state, player: { ...player } });
    lastPaint()(nothing, "");
    expect(walks.built).toBe(2);
  });

  /**
   * And at the end of a sheet it turns over whole: the next sheet's landings replace it and the
   * playhead goes back to the left edge, rather than the window sliding one landing at a time
   * (0187). The turn is a trim of what is already walked, so it costs no walk at all.
   */
  it("turns the sheet over whole at its end", () => {
    const player = { seed: 4, ...PLAYER_DEFAULTS };
    const state: DeckState = { ...emptyDeck(), loop: { in: 0, out: 4 }, player, playing: true };
    const laid = playerSequence(player, 3 * PLAYER_SCOPE_LANDINGS);
    walks.built = 0;
    render(state);
    const paint = lastPaint();
    const last = PLAYER_SCOPE_LANDINGS - 1;
    for (const at of [last, PLAYER_SCOPE_LANDINGS]) {
      peek.player.at = at;
      peek.player.step = laid[at] ?? null;
      paint(nothing, "");
    }
    const geometry = painted.geometries.at(-1);
    expect(geometry?.at).toBe(0);
    expect(geometry?.blocks[0]?.slot).toBe(laid[PLAYER_SCOPE_LANDINGS]?.slot);
    expect(geometry?.blocks[1]?.slot).toBe(laid[PLAYER_SCOPE_LANDINGS + 1]?.slot);
    expect(walks.built).toBe(1);
  });

  /**
   * And a pass wound forward by a whole part is a walk to there rather than a trim: an audition
   * moves the ordinal by as many landings as the parts before the one it names, and the trim
   * re-anchors `base` without re-anchoring the cursor — so a jump past the end of what is walked
   * would leave the picture drawing landings the graph is not playing, for the rest of the pass
   * (0159, 0181).
   */
  it("walks again for a pass cued past the end of what it has already walked", () => {
    const player = { seed: 7, ...PLAYER_DEFAULTS };
    const state: DeckState = { ...emptyDeck(), loop: { in: 0, out: 4 }, player, playing: true };
    const laid = playerSequence(player, 200);
    render(state);
    const paint = lastPaint();
    for (const at of [0, 1, 2]) {
      peek.player.at = at;
      peek.player.step = laid[at] ?? null;
      paint(nothing, "");
    }
    // Past the sheets the cache holds: two 64-jump parts before the one a hand auditions is
    // enough.
    const cued = 150;
    peek.player.at = cued;
    peek.player.step = laid[cued] ?? null;
    paint(nothing, "");
    const geometry = painted.geometries.at(-1);
    const on = cued % PLAYER_SCOPE_LANDINGS;
    // The sheet the cued landing is on, and the block after the standing one — the standing block
    // itself is the transport's own step whichever landing the cache thinks it is on.
    expect(geometry?.at).toBe(on);
    expect(geometry?.blocks[on + 1]?.slot).toBe(laid[cued + 1]?.slot);
  });

  /**
   * The grid is the transport's question, asked the transport's way: `gridOf` divides the loop by
   * the deck's own rate before it asks whether the slots can carry a seam, so a picture that asked
   * at unity would draw a walk a sped-up yard is not playing (0159, principle 1).
   */
  it("asks whether the yard jumps at the deck's own rate", () => {
    const loop = { in: 0, out: 0.1 };
    const slow: DeckState = { ...emptyDeck(), loop };
    expect(render(slow)).toContain("<canvas");
    // Twice the speed is half the loop in wall seconds, which is a grid too fine to seam — and a
    // deck the transport plays straight past has no walk to draw.
    const fast: DeckState = {
      ...slow,
      params: { ...slow.params, "deck.speed": 2 },
    };
    expect(render(fast)).toBe("");
  });

  /** The song as a shape: one segment per part, each at the share of the run it is played for. */
  it("draws the song as segments at the share of the run each part is played", () => {
    const song = [
      { ...part("one"), length: 1 },
      { ...part("two"), length: 3 },
    ];
    const markup = render({
      ...emptyDeck(),
      loop: { in: 0, out: 4 },
      player: { seed: 1, ...PLAYER_DEFAULTS, albums: oneAlbum(song) },
    });
    expect(markup).toContain("25%");
    expect(markup).toContain("75%");
    // A pattern drawing its own arrangement has no written list to draw as a shape: the run moves
    // as it plays and its own section shows it (0158).
    expect(
      render({
        ...emptyDeck(),
        loop: { in: 0, out: 4 },
        player: { seed: 1, ...PLAYER_DEFAULTS, albums: oneAlbum(song), arrange: 2 },
      }),
    ).not.toContain("25%");
    // And a count of nought is the skip, at the two tiers that count rounds: an album nothing
    // plays is none of the picture, exactly as a skipped part is none of it — a segment that
    // could never light would draw a run nobody is playing (P147, `songShare`).
    const [held] = oneAlbum(song);
    const played = {
      ...held!,
      id: "album-2",
      plays: 1,
      songs: [
        {
          ...held!.songs[0]!,
          id: "song-2",
          parts: [{ ...part("three"), id: "part-three", length: 1 }],
        },
      ],
    };
    const passed = render({
      ...emptyDeck(),
      loop: { in: 0, out: 4 },
      player: { seed: 1, ...PLAYER_DEFAULTS, albums: [{ ...held!, plays: 0 }, played] },
    });
    expect(passed).toContain("100%");
    expect(passed).not.toContain("25%");
  });

  /**
   * And while one part is soloed the picture is that part's: the sheet is walked from the same
   * soloed spec the transport lays its steps from, and the lane under it draws the run being heard
   * — one author of what a solo does, or the picture would show a song nobody is playing
   * (principle 1, 0190, `soloAlbums`).
   */
  it("draws the song being heard while one part is soloed", () => {
    const song = [
      { ...part("one"), length: 1 },
      { ...part("two"), length: 3 },
    ];
    const state = {
      ...emptyDeck(),
      loop: { in: 0, out: 4 },
      player: { seed: 1, ...PLAYER_DEFAULTS, albums: oneAlbum(song) },
    };
    const markup = render(state, "two");
    expect(markup).toContain("100%");
    expect(markup).not.toContain("25%");
    // And a part the run passes over is no solo at all: the song comes back whole.
    expect(render(state, "one")).toContain("100%");
    expect(render(state, "part-nobody-minted")).toContain("25%");
  });
});
