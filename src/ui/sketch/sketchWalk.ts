/**
 * @role The one made-up walk every sketch on the bench draws — a fixed run of landings with the
 *   character, length and loudness each was drawn with — plus the fake part list and the fake
 *   planted grounds beside it. Deterministic and hand-written: a sketch is an argument about a
 *   surface, and a surface that redraws itself between two screenshots is arguing with itself.
 * @instead The real walk, which comes off a seed → src/lib/player.ts. The picture the card
 *   actually draws it with → src/ui/PlayerScope.tsx.
 */
import { PLAYER_CHARACTERS, type PlayerCharacter } from "@/lib/playerCast";
import { PLAYER_SLOTS } from "@/lib/playerSlots";

/** One landing of the made-up walk: where in the loop it opens, how long it holds, and how it sounds. */
export type SketchLanding = {
  /** Where it opens, as a fraction of the loop. */
  at: number;
  /** How long it holds, as a fraction of the loop. */
  span: number;
  /** How many times the landing is struck before the next jump. */
  repeats: number;
  /** How loud, nought to one — what the block's fill is spent on. */
  level: number;
  /** Which of the six the landing was drawn as. */
  character: PlayerCharacter;
  /**
   * Which slot of the loop it reads — where on the *source* it came from, which is the one thing
   * `at` does not say. The jump's three amounts are only visible against this: a step's size is
   * the distance, its side is the bias, and a return to slot nought is the walk coming home.
   */
  slot: number;
};

/**
 * Sixteen landings across one loop, written by hand rather than seeded: the shape is the point —
 * a dense cluster, a long hold, a scatter, and one silence — and a generator would have to be
 * tuned until it produced exactly that anyway.
 */
export const SKETCH_WALK: readonly SketchLanding[] = [
  { at: 0.02, span: 0.05, repeats: 1, level: 0.9, character: "plain", slot: 0 },
  { at: 0.08, span: 0.02, repeats: 4, level: 0.75, character: "stutter", slot: 3 },
  { at: 0.11, span: 0.02, repeats: 4, level: 0.7, character: "stutter", slot: 7 },
  { at: 0.14, span: 0.02, repeats: 3, level: 0.62, character: "stutter", slot: 5 },
  { at: 0.19, span: 0.09, repeats: 1, level: 1, character: "riff", slot: 0 },
  { at: 0.3, span: 0.04, repeats: 2, level: 0.55, character: "scatter", slot: 4 },
  { at: 0.36, span: 0.01, repeats: 6, level: 0.42, character: "scatter", slot: 6 },
  { at: 0.39, span: 0.03, repeats: 1, level: 0.6, character: "scatter", slot: 10 },
  { at: 0.46, span: 0.12, repeats: 1, level: 0.35, character: "breathe", slot: 0 },
  { at: 0.62, span: 0.06, repeats: 1, level: 0.85, character: "riff", slot: 2 },
  { at: 0.7, span: 0.03, repeats: 3, level: 0.68, character: "slide", slot: 6 },
  { at: 0.75, span: 0.03, repeats: 3, level: 0.72, character: "slide", slot: 10 },
  { at: 0.8, span: 0.02, repeats: 5, level: 0.5, character: "stutter", slot: 8 },
  { at: 0.84, span: 0.07, repeats: 1, level: 0.95, character: "plain", slot: 0 },
  { at: 0.93, span: 0.02, repeats: 2, level: 0.44, character: "scatter", slot: 3 },
  { at: 0.96, span: 0.03, repeats: 1, level: 0.3, character: "breathe", slot: 7 },
];

/**
 * The three amounts the walk above was drawn with, read back off it rather than invented beside
 * it: the longest step it takes, which side its steps lean to, and how often it comes home to the
 * top of the loop instead of travelling. A picture that drew a reach the landings do not obey
 * would be a legend rather than a reading of them.
 *
 * The distance is what the walk *did*, which is a floor under the dial that let it: the dial is a
 * cap and a jump draws inside it (`leanStep`, src/lib/playerWalk.ts). A hand-written walk short of
 * its own cap is the normal case and not a fault, so the picture says the reach it can show.
 */
export const SKETCH_REACH = ((): { distance: number; bias: number; home: number } => {
  const steps = SKETCH_WALK.slice(1).map((landing, index) => {
    const from = SKETCH_WALK[index];
    // Not a default: an index inside a `slice(1)` cannot be missing, and a nought standing in for
    // a slot nobody read would be a step of the wrong size drawn as a fact (principle 5).
    if (from === undefined) throw new Error(`The walk fixture holds no landing ${index}.`);
    const by = landing.slot - from.slot;
    // The real jump wraps at the loop's edge, so a move of +4 from slot 14 lands on slot 2 and
    // reads here as a step back of twelve (`travelFrom`, src/lib/playerWalk.ts). Nothing this file
    // draws unwraps one, so the fixture stays clear of the edge and says so loudly if it stops:
    // a wrapped pair would put a distance on the picture that no jump ever travelled.
    // Only of a step that travelled: coming home is a jump to the top of the loop however far
    // that is, so a return from slot ten is not a step of ten (`leanStep` returns null for it).
    if (landing.slot !== 0 && Math.abs(by) > PLAYER_SLOTS / 2) {
      throw new Error(
        `The walk fixture steps ${by} slots, which is the loop's wrap and not a jump.`,
      );
    }
    return { to: landing.slot, by };
  });
  const travelled = steps.filter((step) => step.to !== 0);
  if (travelled.length === 0) {
    throw new Error("The walk fixture never leaves the top of the loop, so it has no reach.");
  }
  const forward = travelled.filter((step) => step.by > 0).length;
  return {
    distance: Math.max(...travelled.map((step) => Math.abs(step.by))),
    // The module's own reading of a side: a bias of nought is even, one is every step forward
    // (`leanStep`, src/lib/playerWalk.ts) — so it is twice the forward share less one, and not
    // the share itself.
    bias: (2 * forward) / travelled.length - 1,
    home: (steps.length - travelled.length) / steps.length,
  };
})();

/** Where the walk is standing while the bench is looked at, so one landing can be drawn lit. */
export const SKETCH_STANDING = 9;

/**
 * How each of the six reads as a fill, as an opacity on the one accent — the palette has a single
 * hue outside `destructive` (src/ui/tokens.css), so a character is a weight and not a colour, and
 * a sketch that invented a seventh ink would be arguing about the palette instead (0236).
 */
export const SKETCH_CHARACTER_WEIGHT: Record<PlayerCharacter, string> = {
  plain: "bg-primary",
  stutter: "bg-primary/70",
  riff: "bg-primary/85",
  scatter: "bg-primary/45",
  breathe: "bg-primary/25",
  slide: "bg-primary/55",
};

/**
 * The same weight as a number, for the pictures drawn in SVG — where `bg-primary/70` is not a fill
 * and an `opacity` is. Read off the map above rather than written out a second time (principle 1):
 * the share after the slash in a Tailwind token *is* the weight, and a token whose shape this
 * cannot read is a mistake rather than a full-strength fill.
 */
export function characterInk(character: PlayerCharacter): number {
  const token = SKETCH_CHARACTER_WEIGHT[character];
  const share = /^bg-primary(?:\/(\d+))?$/u.exec(token);
  if (share === null) throw new Error(`No weight can be read out of the token "${token}".`);
  const much = share[1];
  return much === undefined ? 1 : Number(much) / 100;
}

/** The six in the order the module declares them, so a sketch's row is the module's row. */
export const SKETCH_CAST = PLAYER_CHARACTERS;

/** A made-up arrangement: what the song list would hold while the bench is looked at. */
export const SKETCH_PARTS = [
  { name: "Open", bars: 4, character: "plain" },
  { name: "Chew", bars: 8, character: "stutter" },
  { name: "Wide", bars: 4, character: "breathe" },
  { name: "Chew Again", bars: 8, character: "scatter" },
] as const satisfies readonly { name: string; bars: number; character: PlayerCharacter }[];

/**
 * One entry of a hand-written fixture, or a throw naming what was asked for. Every picture on the
 * bench indexes a fixture somewhere, and a fixture is written by hand so there is nothing to fall
 * back to: an index nobody wrote is a picture drawn of nothing, never a nought (principle 5).
 */
export function fixtureAt<T>(list: readonly T[], index: number, of: string): T {
  const one = list[index];
  if (one === undefined) throw new Error(`The bench fixture holds no ${of} ${index}.`);
  return one;
}

/** One planted ground: a name, where it opens and how much of the source it holds. */
export type SketchBed = { name: string; at: number; span: number };

/** Made-up planted grounds — the chips `Which Ground` keeps, as fractions of the whole source. */
export const SKETCH_BEDS: readonly SketchBed[] = [
  { name: "Head", at: 0.04, span: 0.1 },
  { name: "Break", at: 0.31, span: 0.16 },
  { name: "Tail", at: 0.72, span: 0.09 },
] as const;

/** How many loop-lengths of source the made-up file holds — how many beds there are to walk over. */
export const SKETCH_SOURCE_BEDS = 4;

/**
 * How many of the loop's own sixteenths the made-up file holds end to end — its length said in the
 * unit the crawl is counted in, so a picture of the source and a picture of its beds are two
 * readings of one measure rather than two made-up scales (`PLAYER_SLOTS`, src/lib/playerSlots.ts).
 */
export const SKETCH_SOURCE_SLOTS = SKETCH_SOURCE_BEDS * PLAYER_SLOTS;

/**
 * The source the beds are planted on, as a made-up run of loudness across the whole file. Written
 * by hand for the same reason the walk is: the shape is the argument — a quiet head, a loud break
 * in the middle, and a tail that decays — and a waveform a hand cannot recognise is a texture.
 */
export const SKETCH_SOURCE: readonly number[] = [
  0.12, 0.28, 0.44, 0.36, 0.52, 0.4, 0.3, 0.46, 0.34, 0.22, 0.18, 0.26, 0.38, 0.5, 0.62, 0.74, 0.88,
  0.96, 0.82, 0.9, 0.7, 0.86, 0.64, 0.78, 0.58, 0.72, 0.5, 0.6, 0.42, 0.54, 0.36, 0.48, 0.6, 0.44,
  0.56, 0.4, 0.5, 0.34, 0.42, 0.28, 0.36, 0.24, 0.3, 0.2, 0.24, 0.16, 0.18, 0.1,
];

/**
 * The five amounts of `Which Ground`, which are the song's and never a part's (0184) — so there is
 * one of these and not one per part, which is itself the thing the sketch has to draw. Written out
 * rather than read off a deck: the bench is wired to nothing (0247).
 */
export const SKETCH_GROUND: {
  bed: number;
  standing: number;
  every: number;
  distance: number;
  bias: number;
  home: number;
} = {
  /**
   * Which bed of the sample the song opens on, in the loop's own beds — nought is the loop itself
   * (`PLAYER_BED_MIN`…`MAX`, src/lib/playerBed.ts) — and it is what a move that comes home comes
   * home to. Not an index into `SKETCH_BEDS`: those are the grounds a hand planted, which is a
   * different list from the beds the crawl walks over.
   */
  bed: 0,
  /**
   * How far the ground has crawled from it, in the loop's own sixteenths. A bed is `PLAYER_SLOTS`
   * of them, so this stands a bed and a half along — part-way into one, which is the whole of the
   * crawl and the thing whole beds cannot say.
   */
  standing: 24,
  /** How many passes of the loop go by before the loop moves along the sample. */
  every: 4,
  /**
   * How far one move may travel, **in the loop's own sixteenths and never in whole beds** — the
   * card's own unit, which `src/lib/playerBed.ts` is emphatic about because it is what lets the
   * loop crawl out of step with the sample rather than hopping bed to bed.
   */
  distance: 24,
  /** Which side it leans to, −1…1, nought as likely back as on. */
  bias: 0.4,
  /** The odds a move comes home to the song's own bed instead of travelling. */
  home: 0.25,
};

/**
 * Where that crawl has got to, said as a bed of the source and how far into it — the split both
 * ground pictures light and the readout states, so the picture and the sentence cannot disagree
 * about which bed is standing. Part-way into one is the normal case and the whole of the crawl.
 */
export const SKETCH_GROUND_STANDING = {
  bed: Math.floor(SKETCH_GROUND.standing / PLAYER_SLOTS),
  into: SKETCH_GROUND.standing % PLAYER_SLOTS,
};

/** What one pass of the run did to the arrangement: how tall it stood, and what the tray rolled. */
export type SketchPass = {
  /** How many parts stood in the arrangement on that pass — the height of the ladder. */
  parts: number;
  /** How long the newest part was given, in doublings of the run's own length (`arrangeSpan`). */
  span: number;
  /** How unlike its neighbour that part was drawn, nought to one (`arrangeApart`). */
  apart: number;
  /**
   * What became of the arrangement at the end of the pass: held as it was, one part redrawn, let
   * go for a new one, or let go and come back to the first one it ever drew.
   */
  roll: "held" | "redrawn" | "new" | "home";
};

/**
 * Sixteen passes of a made-up arrangement, so the ladder has something to climb and the tray
 * something to have rolled. A part is taken on every second pass and the run starts over from one
 * part each time it is let go, which is what `arrangeGrow` does (src/lib/copyKnobs.ts) — written
 * by hand because a picture of odds needs a run short enough to count and long enough to have a
 * shape, and no seed lands on both.
 */
export const SKETCH_ARRANGE: readonly SketchPass[] = [
  { parts: 1, span: 0, apart: 0.2, roll: "held" },
  { parts: 1, span: 0, apart: 0.2, roll: "held" },
  { parts: 2, span: 1, apart: 0.55, roll: "held" },
  { parts: 2, span: 1, apart: 0.55, roll: "redrawn" },
  { parts: 3, span: 2, apart: 0.3, roll: "held" },
  { parts: 3, span: 2, apart: 0.3, roll: "redrawn" },
  { parts: 4, span: 1, apart: 0.85, roll: "new" },
  { parts: 1, span: 0, apart: 0.15, roll: "held" },
  { parts: 1, span: 0, apart: 0.15, roll: "held" },
  { parts: 2, span: 3, apart: 0.6, roll: "held" },
  { parts: 2, span: 3, apart: 0.6, roll: "redrawn" },
  { parts: 3, span: 1, apart: 0.45, roll: "held" },
  { parts: 3, span: 1, apart: 0.45, roll: "home" },
  { parts: 1, span: 0, apart: 0.25, roll: "held" },
  { parts: 1, span: 0, apart: 0.25, roll: "redrawn" },
  { parts: 2, span: 2, apart: 0.7, roll: "redrawn" },
];

/**
 * The three odds the run above was rolled under, read back off it rather than written beside it —
 * the same rule `SKETCH_REACH` follows, and for the same reason: a tray showing odds the passes do
 * not obey is a legend rather than a reading of them.
 *
 * The keep is the one that is not an odds on the card at all — it is a count of rounds — so it is
 * restated here as the odds any one pass is the pass that lets go, which is what makes the three
 * comparable in one tray and is the trade the picture has to say out loud.
 */
export const SKETCH_ARRANGE_ODDS = ((): { chance: number; keep: number; return: number } => {
  const letGo = SKETCH_ARRANGE.filter((pass) => pass.roll === "new" || pass.roll === "home");
  // Not a nought: a run that never lets go has no share of let-gos that came home, and drawing
  // that as "never returns" would be a number the passes never rolled (principle 5).
  if (letGo.length === 0) {
    throw new Error("The arrangement fixture never lets go, so it has no keep and no return.");
  }
  return {
    chance: SKETCH_ARRANGE.filter((pass) => pass.roll === "redrawn").length / SKETCH_ARRANGE.length,
    keep: letGo.length / SKETCH_ARRANGE.length,
    return: letGo.filter((pass) => pass.roll === "home").length / letGo.length,
  };
})();

/** One song of the made-up run: a name a hand typed, how many times it goes round before the next,
 *  and the parts it is a run of — by name, so the two tiers are one fixture and not two. */
export type SketchSong = { name: string; plays: number; parts: readonly string[] };

/**
 * Three named songs in the order a hand put them, each carrying how many times it plays: the tier
 * over the parts (src/lib/playerSongs.ts), which is the one thing a card of dials has no room for.
 * Checked against the parts beside it rather than trusted — a song holding a part the arrangement
 * never had is a row drawn of nothing, never an empty one (principle 5).
 */
export const SKETCH_SONGS: readonly SketchSong[] = ((): readonly SketchSong[] => {
  const run: readonly SketchSong[] = [
    { name: "Intro", plays: 2, parts: ["Open", "Chew"] },
    { name: "Middle", plays: 4, parts: ["Chew", "Wide", "Chew Again"] },
    { name: "Out", plays: 1, parts: ["Wide", "Open"] },
  ];
  const held = new Set<string>(SKETCH_PARTS.map((part) => part.name));
  for (const song of run) {
    for (const part of song.parts) {
      if (!held.has(part)) throw new Error(`The song fixture holds no part "${part}".`);
    }
  }
  return run;
})();

/**
 * Where the run is standing while the bench is looked at: which song, which round of it, and which
 * of that song's parts. **The song itself and never an index into the run**, for the reason a place
 * carries an id one tier down (`SongPlace`, src/lib/playerSongs.ts): the songs are dragged into a
 * new order on the timeline, and a cursor held as an index would point at whichever song was
 * dragged under it. Resolved once, here, so nothing downstream looks it up again and disagrees.
 */
export const SKETCH_SONG_STANDING = ((): { song: SketchSong; play: number; part: number } => {
  const standing = { song: "Middle", play: 2, part: 1 };
  const song = SKETCH_SONGS.find((held) => held.name === standing.song);
  if (song === undefined) throw new Error(`No song of the fixture is named "${standing.song}".`);
  if (standing.play >= song.plays) {
    throw new Error(
      `${song.name} plays ${song.plays} times and cannot stand on round ${standing.play}.`,
    );
  }
  fixtureAt(song.parts, standing.part, "part");
  return { ...standing, song };
})();

/**
 * The two folds that are only dials, as they stand while the bench is looked at. Four numbers and
 * not two tables: everything either alternative draws is derived from its own one of these, which
 * is exactly what those alternatives claim — and an amount written out beside a derived one would
 * be the claim quietly abandoned (principle 1).
 */
export const SKETCH_SOUND = {
  /** Where the one axis the sound fold's alternative offers is standing, nought to one. */
  chew: 0.62,
  /** Which of the timing picker's grids it is standing on, by index into the picker's own list. */
  subdivision: 1,
  /** How long one landing sounds, in seconds, and how far that strays — the two amounts no
   *  subdivision of the loop can say, which is the whole of what the picker trades. */
  burst: 0.18,
  vary: 0.04,
};
