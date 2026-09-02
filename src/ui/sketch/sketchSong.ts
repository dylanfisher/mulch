/**
 * @role The arithmetic all eight playback sketches are drawn off: the run the two tiers unfold
 *   into, one turn per part played once, which turn the cursor is standing on, and the three
 *   phrases the eight say that place in. Out of the pictures for the reason the ground eight's is
 *   (src/ui/sketch/sketchGround.ts) — eight drawings each unfolding the same run is eight chances
 *   to disagree about how long it is, and a static render never throws, so this is the only place
 *   the unfolding can be proven.
 * @instead The fixtures it reads back → src/ui/sketch/sketchWalk.ts. The eight pictures →
 *   src/ui/sketch/song/. The real tier over a part, and the cursor that walks it →
 *   src/lib/playerSongs.ts. The list the card draws it as today → src/ui/PlayerSong.tsx.
 */
import { READOUT_JOIN } from "@/lib/copy";
import { PLAYER_PLAYS_LABEL } from "@/lib/copySongs";
import {
  fixtureAt,
  SKETCH_PARTS,
  SKETCH_SONG_STANDING,
  SKETCH_SONGS,
  type SketchSong,
} from "@/ui/sketch/sketchWalk";

/**
 * The word the bench gives one part played once — the tick this bench counts in, the way a lap of
 * the walk is the ground bench's (`SKETCH_PER`). `plays` counts whole rounds of a song and a part
 * carries jumps (src/lib/playerSongs.ts), so the thing between the two has no word on the card at
 * all: eight pictures naming it for themselves would be eight words for one cell.
 */
export const SKETCH_TURN = "turn";

/** One part of the made-up arrangement, by the shape the fixture wrote it in. */
export type SketchPart = (typeof SKETCH_PARTS)[number];

/** The part of that name, or a throw saying what was asked for: a song names its parts, so a name
 *  the arrangement never held is a cell drawn of nothing rather than an empty one (principle 5). */
export function partOf(name: string): SketchPart {
  const part = SKETCH_PARTS.find((held) => held.name === name);
  if (part === undefined) throw new Error(`The arrangement holds no part "${name}".`);
  return part;
}

/** One turn of the run: where it falls, which song and round it belongs to, and what plays. */
export type SketchTurn = {
  /** Which turn of the whole run it is, from nought. */
  index: number;
  /** The song it belongs to — the song itself, for the reason the cursor holds one (0157). */
  song: SketchSong;
  /** Which round of that song, from nought. */
  play: number;
  /** Which of the song's own parts it is. */
  partAt: number;
  /** The part being played. */
  part: SketchPart;
  /** How many bars of the run have gone before it starts. */
  from: number;
  /** Whether the cursor is standing here. Exactly one turn of the run is. */
  standing: boolean;
};

/**
 * The two tiers unfolded into the one run every picture here reads back: each song's parts in
 * turn, once per round it plays. Built rather than written beside the fixture, and checked as it
 * is built — a song that plays no times at all is a row on the arrangement and no turn on the run,
 * and a cursor standing on a place the run never reaches would light nothing in eight pictures at
 * once (principle 5).
 */
export const SKETCH_RUN: readonly SketchTurn[] = ((): readonly SketchTurn[] => {
  const run: SketchTurn[] = [];
  let bars = 0;
  // Each song stands for its own stretch of the run, and `SKETCH_SPANS` gathers that stretch by
  // the song itself — so one song listed twice would be bracketed as a single stretch across
  // everything between its two halves. A fixture the pictures cannot draw, said here (principle 5).
  if (new Set(SKETCH_SONGS.map((song) => song.name)).size !== SKETCH_SONGS.length) {
    throw new Error("The song fixture lists one song twice, and a run is an order of its own.");
  }
  for (const song of SKETCH_SONGS) {
    if (song.plays < 1) {
      throw new Error(`${song.name} plays ${song.plays} times and is never on the run.`);
    }
    if (song.parts.length === 0) throw new Error(`${song.name} is a run of no parts.`);
    for (const name of song.parts) {
      // The run's own length is the divisor two pictures are drawn across, so a part of no bars is
      // a strip of NaN rather than a blank cell — a shape that fails loudly here (principle 5).
      if (partOf(name).bars < 1) throw new Error(`The part "${name}" lasts no bars.`);
    }
    for (let play = 0; play < song.plays; play += 1) {
      for (const [partAt, name] of song.parts.entries()) {
        const part = partOf(name);
        run.push({
          index: run.length,
          song,
          play,
          partAt,
          part,
          from: bars,
          standing:
            song === SKETCH_SONG_STANDING.song &&
            play === SKETCH_SONG_STANDING.play &&
            partAt === SKETCH_SONG_STANDING.part,
        });
        bars += part.bars;
      }
    }
  }
  const standing = run.filter((turn) => turn.standing);
  if (standing.length !== 1) {
    throw new Error(`The cursor stands on ${standing.length} turns of the run and not on one.`);
  }
  return run;
})();

/** The turn the cursor is standing on — resolved once, so nothing downstream finds it again. */
export const SKETCH_AT: SketchTurn = ((): SketchTurn => {
  const at = SKETCH_RUN.find((turn) => turn.standing);
  if (at === undefined) throw new Error("No turn of the run is the one being played.");
  return at;
})();

/**
 * The turn after it, which is what a launch grid queues. The run comes round past the last song
 * (`PLAYER_SONGS_TOOLTIP`, src/lib/copySongs.ts), so the one after the last is the first and never
 * a turn nobody wrote.
 */
export const SKETCH_NEXT: SketchTurn = fixtureAt(
  SKETCH_RUN,
  (SKETCH_AT.index + 1) % SKETCH_RUN.length,
  SKETCH_TURN,
);

/**
 * The song the run comes to after the one being played, which is what a picture of rounds counting
 * down has to name to be about anything. The run comes round past the last song, so after the last
 * is the first — the same wrap `SKETCH_NEXT` takes, one tier up.
 */
export const SKETCH_SONG_AFTER: SketchSong = fixtureAt(
  SKETCH_SONGS,
  (SKETCH_SONGS.indexOf(SKETCH_AT.song) + 1) % SKETCH_SONGS.length,
  "song",
);

/** How many bars the whole run lasts — what a picture drawn end to end is drawn across. */
export const SKETCH_RUN_BARS = SKETCH_RUN.reduce((all, turn) => all + turn.part.bars, 0);

/** Where a count of bars falls across the whole run, as a fraction of it. */
export const acrossRun = (bars: number): number => bars / SKETCH_RUN_BARS;

/** How many turns one song is: its parts, once per round it plays. */
export const turnsOf = (song: SketchSong): number => song.plays * song.parts.length;

/** One song's stretch of the run, in bars, for the two pictures drawn end to end. */
export const SKETCH_SPANS = SKETCH_SONGS.map((song) => {
  const held = SKETCH_RUN.filter((turn) => turn.song === song);
  const first = fixtureAt(held, 0, SKETCH_TURN);
  const last = fixtureAt(held, held.length - 1, SKETCH_TURN);
  return { song, from: first.from, to: last.from + last.part.bars, turns: held.length };
});

/**
 * Where the cursor stands, said the one way all eight say it: the song, and the part under it.
 * Both tiers, because a song is a run and a cursor over it and half of that place is a picture of
 * a list — which is the thing on the card these eight are all arguing with.
 */
export const SKETCH_STANDING_SAID = `${SKETCH_AT.song.name}${READOUT_JOIN}${SKETCH_AT.part.name}`;

/** Which round of that song, of how many — the one amount the tier over a part carries. */
export const SKETCH_PLAYS_SAID = `${PLAYER_PLAYS_LABEL} ${SKETCH_AT.play + 1} of ${SKETCH_AT.song.plays}`;

/** And how far into the whole run, in the bench's own word for a part played once: the count that
 *  would drift first if any of the eight worked it out for itself. */
export const SKETCH_RUN_SAID = `${SKETCH_TURN} ${SKETCH_AT.index + 1} of ${SKETCH_RUN.length}`;

/** How many rounds of the standing song are still to come after this one. */
export const SKETCH_PLAYS_LEFT = SKETCH_AT.song.plays - SKETCH_AT.play - 1;

/**
 * Whether the run has left a song behind — every turn of it already past the cursor. The one fact
 * a purse of rounds is drawn off, here rather than in the picture that spends them: a case
 * checking a picture against its own copy of this rule can only catch a wiring slip and never a
 * wrong rule (principle 1).
 */
export const spentBy = (song: SketchSong): boolean =>
  SKETCH_RUN.filter((turn) => turn.song === song).every((turn) => turn.index < SKETCH_AT.index);

/**
 * How many of a song's rounds are still to play, counting the one under way: all of them for a song
 * the run has not reached, none for one it has left, and the rest of the count for the one it is
 * standing in.
 */
export const playsLeft = (song: SketchSong): number =>
  song === SKETCH_AT.song ? song.plays - SKETCH_AT.play : spentBy(song) ? 0 : song.plays;

/** How long a part is, in the unit the fixture wrote it in — said here so the three pictures drawn
 *  across the run's own length cannot word one measure three ways. */
export const barsSaid = (part: SketchPart): string => `${part.bars} bars`;
