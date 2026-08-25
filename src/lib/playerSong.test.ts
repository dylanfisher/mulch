/**
 * @role What a song promises the walk: a voice at a part's first jump and nothing at any other,
 *   the parts in the order they are listed and coming round at the end, and the numbers a part
 *   carries handed back unchanged however many times it comes round (0176) — and what the other
 *   cursor beside it promises, over a run the pattern draws for itself rather than one it is
 *   handed (0158).
 */
import { describe, expect, it } from "vitest";

import { partVoice, type PlayerVoice } from "./player.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import { mulberry32 } from "./random.ts";
import { createDrawnSong, createSong, type ArrangementSpec, type SongPart } from "./playerSong.ts";

/** Every field a draw touches, which is the switch's own values but the song and the cast
 *  (0153, 0174). */
const { song: _song, cast: _cast, ...PLAIN } = PLAYER_DEFAULTS;

/**
 * A voice told apart by one number. What a part is drawn as is the caller's — this file never
 * sees a character — so a draw here is a counter, and `distance` is the field the count rides in.
 */
const voiceOf = (drawn: number): PlayerVoice => ({ ...PLAIN, distance: drawn });

/** A part, with the opaque id every one carries and a spec told apart by one number — counted
 *  here, so a case can name the one it expects the cursor to hand back (0157, 0176). */
let minted = 0;
const part = (fields: Partial<SongPart> = {}): SongPart => ({
  id: `part-${++minted}`,
  voice: partVoice(voiceOf(minted)),
  length: 2,
  ...fields,
});

/** The song's answers over `jumps` calls, with a resolve that counts how many times it was asked
 *  and hands back the numbers the part itself carries (0176). */
function walk(song: readonly SongPart[], jumps: number) {
  let asked = 0;
  const next = createSong(song, (held) => {
    asked++;
    return { ...PLAIN, ...held.voice };
  });
  const seen = Array.from({ length: jumps }, () => next());
  return {
    asked,
    at: seen.map((handed) => handed?.voice.distance ?? null),
    parts: seen.map((handed) => handed?.part.id ?? null),
  };
}

// One case per promise a song makes, and the list of them is what a song is: the length is how
// many such promises there are rather than how much this block decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a song of parts", () => {
  // An empty list is the whole of "no song", so a pattern holding none is the one the module
  // walked before it could be arranged: the walk is never handed a voice and never draws one.
  it("hands the walk nothing, and draws nothing, while there is no song", () => {
    const nothing = Array.from({ length: 8 }, () => null);
    expect(walk([], 8)).toEqual({ asked: 0, at: nothing, parts: nothing });
  });

  /**
   * And it says which part each voice belongs to. That is what the card's own section and its
   * header are lit from: a part is a thing a person points at, so the cursor names the one it is
   * handing a voice for rather than leaving the caller to count jumps into a list it can only
   * guess the boundaries of (0157).
   */
  it("names the part it hands a voice for, at every boundary and never between them", () => {
    const song = [part({ length: 2 }), part({ length: 1 })];
    const [one, two] = song;
    expect(walk(song, 6).parts).toEqual([one?.id, null, two?.id, one?.id, null, two?.id]);
  });

  // The whole of what makes a part a part: the voice is read once and then walked. A song that
  // answered every jump would be the card's dials read per step, which is not an arrangement
  // (0152, 0176).
  it("hands over a voice at a part's first jump and nothing at any other", () => {
    const song = [part({ length: 3 })];
    const held = song[0]?.voice.distance;
    const { at, asked } = walk(song, 6);
    expect(at).toEqual([held, null, null, held, null, null]);
    // Twice over six jumps, which is once per boundary: a part's numbers are read where they are
    // handed over and nowhere else.
    expect(asked).toBe(2);
  });

  // In the order they are listed, which is what makes the list the arrangement, and round again
  // at the end — a song is a loop of parts the way a figure is a loop of slots (0151).
  it("plays the parts in order and comes round at the end", () => {
    const [one, two, three] = [part({ length: 1 }), part({ length: 2 }), part({ length: 1 })];
    const song = [one, two, three];
    const at = song.map((held) => held.voice.distance);
    expect(walk(song, 8).at).toEqual([at[0], at[1], null, at[2], at[0], at[1], null, at[2]]);
  });

  /**
   * And every part comes back exactly as it was captured, every round: a part is the dials it was
   * taken from, so a song of two parts is two settings alternating rather than two characters
   * dealing a new hand each time round (0176). This is the whole of what 0153's chorus switch was
   * the exception to, and why the switch is gone with the redraw.
   */
  it("hands back the numbers a part carries, unchanged, every time it comes round", () => {
    const song = [part({ length: 1 }), part({ length: 1 })];
    const [one, two] = song;
    const { at, asked } = walk(song, 6);
    expect(at).toEqual([
      one?.voice.distance,
      two?.voice.distance,
      one?.voice.distance,
      two?.voice.distance,
      one?.voice.distance,
      two?.voice.distance,
    ]);
    // Once per boundary and never a draw: a written song takes nothing at all out of the stream a
    // seed reproduces (0089, 0176).
    expect(asked).toBe(6);
  });
});

/** The four amounts, at what a switch press leaves them: one arrangement, kept forever, never
 *  evolving and never coming home — the point every case below moves one field away from. */
const AMOUNTS: ArrangementSpec = {
  arrange: 3,
  arrangeKeep: 0,
  arrangeChance: 0,
  arrangeReturn: 0,
};

/**
 * The drawn cursor's answers over `jumps` calls. The part draw is the caller's, exactly as it is
 * in the walk: a counted id, and a spec whose one number comes off the generator standing in for
 * the character a walk would draw — so a case can tell two runs apart by what was drawn and not
 * only by when (0176).
 */
function drew(amounts: ArrangementSpec, jumps: number, seed = 3) {
  const random = mulberry32(seed);
  let drawn = 0;
  const next = createDrawnSong(
    amounts,
    random,
    () => ({ id: `d${drawn++}`, voice: partVoice(voiceOf(random())), length: 1 }),
    (laid) => ({ ...PLAIN, ...laid.voice }),
  );
  const seen = Array.from({ length: jumps }, () => next());
  return {
    laid: drawn,
    parts: seen.map((handed) => handed?.part.id ?? null),
    runs: seen.map((handed) => handed?.song.map((entry) => entry.id).join(",") ?? null),
  };
}

// One case per promise a drawn arrangement makes, which is `createFigure`'s list one tier up: the
// length is how many such promises there are rather than how much this block decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a song the pattern draws", () => {
  // Zero parts is the whole of "not drawn", so a cursor that is off hands nothing over and draws
  // nothing at all — the guard every amount in this module carries (0134, 0151).
  it("hands the walk nothing, and draws nothing, while it is off", () => {
    expect(drew({ ...AMOUNTS, arrange: 0 }, 8)).toEqual({
      laid: 0,
      parts: Array.from({ length: 8 }, () => null),
      runs: Array.from({ length: 8 }, () => null),
    });
  });

  // Laid one part at the jump it begins, so the run fills in as it is heard rather than a round
  // ahead of it — and it is the laying that is the first of the rounds a keep counts.
  it("lays its run one part at a time and then reads it back", () => {
    expect(drew(AMOUNTS, 7).parts).toEqual(["d0", "d1", "d2", "d0", "d1", "d2", "d0"]);
  });

  /** A round kept is the same parts; a round let go is not. The two halves of what the keep
   *  counts, over one seed so the only thing between them is the amount. */
  it("keeps a run for the rounds its keep asks and lets the next go", () => {
    expect(drew({ ...AMOUNTS, arrangeKeep: 1 }, 6).parts).toEqual([
      "d0",
      "d1",
      "d2",
      "d3",
      "d4",
      "d5",
    ]);
  });

  /** And a let-go run comes home on the return's odds, which at one is the first run it laid
   *  every time it is dropped — and never a run that went on evolving in place (0151). */
  it("returns a let-go run to the first one it laid", () => {
    expect(drew({ ...AMOUNTS, arrangeKeep: 1, arrangeReturn: 1 }, 6).parts).toEqual([
      "d0",
      "d1",
      "d2",
      "d0",
      "d1",
      "d2",
    ]);
  });

  /** Evolving is one part of a kept run redrawn at the top of a round, and exactly one: the run
   *  stays recognisable and is never twice the same. */
  it("redraws one part of a kept run on the chance", () => {
    const { parts, laid } = drew({ ...AMOUNTS, arrangeChance: 1 }, 9);
    expect(laid).toBe(5);
    expect(parts.slice(0, 3)).toEqual(["d0", "d1", "d2"]);
    expect(parts.slice(3, 6).filter((id) => id === "d3")).toHaveLength(1);
  });

  /** Every step is handed the run it was walked in, and a run already handed out is never moved
   *  under it: a surface reading an arrangement off a step reads the one that step was drawn in
   *  (0157). */
  it("hands out a run that is not moved under a step already given one", () => {
    const { runs } = drew({ ...AMOUNTS, arrangeChance: 1 }, 9);
    expect(runs[0]).toBe("d0");
    expect(runs[2]).toBe("d0,d1,d2");
    expect(runs[3]).not.toBe(runs[2]);
  });
});
