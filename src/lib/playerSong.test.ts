/**
 * @role What a song promises the walk: a voice at a part's first jump and nothing at any other,
 *   the parts in the order they are listed and coming round at the end, and a chorus drawn once
 *   and handed back unchanged every time it comes round (0153).
 */
import { describe, expect, it } from "vitest";

import type { PlayerVoice } from "./player.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import { createSong, type SongPart } from "./playerSong.ts";

/** Every field a draw touches, which is the switch's own values but the song (0153). */
const { song: _song, ...PLAIN } = PLAYER_DEFAULTS;

/**
 * A voice told apart by one number. What a part is drawn as is the caller's — this file never
 * sees a character — so a draw here is a counter, and `distance` is the field the count rides in.
 */
const voiceOf = (drawn: number): PlayerVoice => ({ ...PLAIN, distance: drawn });

/** A part, with the opaque id every one carries — counted here, so a case can name the one it
 *  expects the cursor to hand back (0157). */
let minted = 0;
const part = (fields: Partial<SongPart> = {}): SongPart => ({
  id: `part-${++minted}`,
  character: "riff",
  amount: 1,
  length: 2,
  chorus: false,
  ...fields,
});

/** The song's answers over `jumps` calls, with a draw that counts how many times it was asked. */
function walk(song: readonly SongPart[], jumps: number) {
  let drawn = 0;
  const next = createSong(song, () => voiceOf(++drawn));
  const seen = Array.from({ length: jumps }, () => next());
  return {
    draws: drawn,
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
    expect(walk([], 8)).toEqual({ draws: 0, at: nothing, parts: nothing });
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

  // The whole of what makes a part a part: the voice is drawn once and then walked. A song that
  // answered every jump would be a character redrawn per step, which is a die and not an
  // arrangement (0152).
  it("hands over a voice at a part's first jump and nothing at any other", () => {
    expect(walk([part({ length: 3 })], 6).at).toEqual([1, null, null, 2, null, null]);
  });

  // In the order they are listed, which is what makes the list the arrangement, and round again
  // at the end — a song is a loop of parts the way a figure is a loop of slots (0151).
  it("plays the parts in order and comes round at the end", () => {
    const song = [part({ length: 1 }), part({ length: 2 }), part({ length: 1 })];
    expect(walk(song, 8).at).toEqual([1, 2, null, 3, 4, 5, null, 6]);
  });

  /**
   * A chorus is drawn at its first jump and returned to unchanged; anything else is drawn again
   * every time the song reaches it. That is the shape the field was grown for — a chorus, things
   * between it, and the chorus itself coming back — and it is `phraseReturn` said one tier up.
   */
  it("draws a chorus once and returns to it, and draws every other part again", () => {
    const song = [part({ length: 1, chorus: true }), part({ length: 1 })];
    const { at, draws } = walk(song, 6);
    // The chorus is the same voice at every one of its jumps; the part between it is a new one.
    expect(at).toEqual([1, 2, 1, 3, 1, 4]);
    // And it costs one draw however many times it comes round, so a chorus takes nothing from the
    // seed's stream after the first — which is what makes the arrangement replayable (0089).
    expect(draws).toBe(4);
  });

  // Two choruses of one character are two runs, each remembered under its own place in the list:
  // a chorus is a part of *this* song rather than a property of the character behind it.
  it("remembers each chorus under its own place in the list", () => {
    const song = [part({ length: 1, chorus: true }), part({ length: 1, chorus: true })];
    expect(walk(song, 6).at).toEqual([1, 2, 1, 2, 1, 2]);
  });
});
