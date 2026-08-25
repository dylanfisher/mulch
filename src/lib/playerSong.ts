/**
 * @role What a jumping pattern is arranged as: the parts a song is a run of, and the cursor that
 *   hands the walk a new voice at each part's first jump — a chorus drawn once and returned to,
 *   everything else drawn again every time it comes round (0153). Pure maths: no clock, no
 *   context, no PRNG of its own and no knowledge of what a character is, because the draw belongs
 *   to the one stream the pattern is a function of and the caller is the one holding it.
 * @instead What a character is, and the arithmetic a part's voice is drawn and blended by →
 *   src/lib/playerCharacter.ts. The walk that unfolds a part into steps → src/lib/playerWalk.ts.
 *   What a figure is — the same shape one tier down, a run of slots rather than a run of parts →
 *   src/lib/playerFigure.ts. Nothing here knows what a step is: a song is parts and nothing else.
 */
import type { PlayerCharacter, PlayerVoice } from "./player.ts";

/**
 * How many parts one song may hold. Eight, which is the longest arrangement a hand can read off a
 * list without counting — and long enough for the shape the field was grown for: a chorus, three
 * things between it, and the chorus twice more.
 *
 * Zero parts is the whole of "no song", the way `phrase: 0` is the whole of "no figure": there is
 * no second field that could disagree with the list about whether the pattern is arranged.
 */
export const PLAYER_SONG_MAX = 8;

/**
 * How many jumps one part lasts. Counted in jumps and not in loops, because a jump is the one
 * thing this module counts anything in — a hold is jumps, a keep is passes of a figure which is
 * `phrase` jumps each — and because a loop is not a length the pattern has: a landing sounds for
 * `repeats` bursts of wall seconds, so how much of the loop's own time a part covers is a fact
 * about the deck and never about the song (0119).
 *
 * The floor is one, a part that lasts a single jump; the ceiling is sixty-four, the count a burst
 * may repeat to, and past it a part outlasts anything a listener holds the part before it against.
 */
export const PLAYER_PART_MIN = 1;
export const PLAYER_PART_MAX = 64;

/** One part's own opaque durable id — a rack instance's id said for a part (0076, 0157). */
export type SongPartId = string;

/**
 * One part of a song: which character it is drawn as, how far into that character the draw is
 * taken, how long it lasts, and whether it is the same one every time it comes round.
 *
 * A part names a character rather than carrying a spec, which is the whole of what 0153 decided:
 * a part is a *region* the way a character is, so "another riff" is what a part already is and
 * needs no second control. What that costs is that a part cannot be edited dial by dial — what a
 * hand shapes is the character behind it, and every part drawn as that character moves with it.
 */
export type SongPart = {
  /**
   * What this part is, as against where it is: an opaque, caller-supplied, durable string minted
   * at the gesture that adds one, exactly like a rack instance's (0076). Two parts drawn as one
   * character for one length are alike in every other field, so without this the only thing
   * telling them apart is their place in the list — which is the very thing a reorder moves, and a
   * badge that moved when the part it names did not would be a name for a place (0157).
   *
   * Identity and never a second generator: a part's voice goes on being drawn from the walk's own
   * stream in the order it always was, because that stream is the whole of what a seed
   * reproduces (0089).
   */
  id: SongPartId;
  /** Which character this part's voice is drawn from — one of `PLAYER_CHARACTERS`. */
  character: PlayerCharacter;
  /** How far from the card's own dials toward that draw the part is taken, 0…1. */
  amount: number;
  /** How many jumps it lasts, `PLAYER_PART_MIN`…`PLAYER_PART_MAX`. Whole. */
  length: number;
  /**
   * Whether this part is the same one every time it comes round. A chorus is drawn at its first
   * jump and returned to unchanged for the rest of the song; anything else is drawn again every
   * time the song reaches it, so a riff between two choruses is a different riff each round.
   *
   * It is `phraseReturn` said for a part rather than for a slot, and said as a state rather than
   * as odds: a figure lets go on a count and may or may not come home, where a part is at a place
   * in a list a listener is counting — a chorus that only sometimes returned would not be one.
   */
  chorus: boolean;
};

/**
 * What adding a part leaves it at: a riff of eight jumps that is drawn again every time it comes
 * round. `PLAYER_DEFAULTS` said for a part — the point a hand starts from and moves away from,
 * declared once so the gesture that adds one and any test that reads it agree (principle 1).
 *
 * The id is not among them: which part this is, is minted at the gesture that adds one and is the
 * one field of a part that is not a value a hand chose (0157).
 *
 * Not a chorus, and deliberately: a part that came back the same without being asked to would be
 * an arrangement the hand did not make. The switch beside it is how a chorus is asked for, and the
 * menu's own sentence is what says so (0153).
 */
export const PLAYER_PART_DEFAULTS: Omit<SongPart, "id"> = {
  character: "riff",
  amount: 1,
  length: 8,
  chorus: false,
};

/**
 * What one call of the cursor below hands back: the part that jump begins, and the voice it is to
 * be walked under. The part travels with the voice rather than being left to the caller to count
 * out, because the one thing a surface asks of a playing song is *which* part is standing, and a
 * cursor that answered only with numbers would have that read off its own list a second time
 * (principle 1, 0157).
 */
export type SongDraw = { part: SongPart; voice: PlayerVoice };

/**
 * The song's cursor: call it once per jump for the part that jump begins and the voice it is drawn
 * under, or null while the part standing goes on. Null is the answer at every jump but a part's
 * first, which is what makes a part a part — the voice is drawn once and then walked, rather than
 * redrawn per step.
 *
 * `draw` is the caller's for the reason `createFigure`'s random is: a part's voice is drawn from
 * the walk's own generator, so the order of a pattern's draws stays its whole contract with a
 * seed. This file never sees a character, a region or a random number — it counts jumps and says
 * when one part is over.
 *
 * Stateful, and the state is a cursor rather than a fact: it is built fresh at every walk and
 * re-derived by replaying, which is what lets a knob moved mid-pattern re-derive its tail without
 * anything durable remembering where the song had reached (0089, 0096).
 */
export function createSong(
  song: readonly SongPart[],
  draw: (part: SongPart, index: number) => PlayerVoice,
): () => SongDraw | null {
  /** Which part the walk stands in, how many of its jumps are still to come, and whether it has
   *  stood in one at all — the first jump of a song begins its first part rather than the part
   *  after it, and a list of one part has no other way to tell those two apart. */
  let at = 0;
  let left = 0;
  let begun = false;
  /** Every chorus drawn so far, by the place in the list it was drawn at. A chorus is a part of
   *  *this* song rather than of its character, so two choruses drawn as one character are two
   *  different runs and each is remembered under its own index. */
  const kept = new Map<number, PlayerVoice>();

  return () => {
    if (song.length === 0) return null;
    if (left > 0) {
      left--;
      return null;
    }
    // The part the walk is about to stand in: the first at the first jump, and the one after
    // whichever has just run out at every boundary after that. Wrapped, so a song comes round.
    const index = begun ? (at + 1) % song.length : 0;
    const part = song[index];
    if (part === undefined) return null;
    at = index;
    begun = true;
    // This call is the part's own first jump, so what is left is every jump but it.
    left = part.length - 1;
    const standing = kept.get(index);
    if (standing !== undefined) return { part, voice: standing };
    const voice = draw(part, index);
    if (part.chorus) kept.set(index, voice);
    return { part, voice };
  };
}
