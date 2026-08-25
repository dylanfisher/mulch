/**
 * @role What a jumping pattern is arranged as: the parts a song is a run of, and the two cursors
 *   that hand the walk a new voice at each part's first jump — one over a list a hand wrote, a
 *   chorus drawn once and returned to and everything else drawn again every time it comes round
 *   (0153); one over a run the pattern draws for itself, laid, kept, evolved and let go the way a
 *   figure is one tier down (0158). Pure maths: no clock, no
 *   context, no PRNG of its own and no knowledge of what a character is, because the draw belongs
 *   to the one stream the pattern is a function of and the caller is the one holding it.
 * @instead What a character is, and the arithmetic a part's voice is drawn and blended by →
 *   src/lib/playerCharacter.ts. The walk that unfolds a part into steps → src/lib/playerWalk.ts.
 *   What a figure is — the same shape one tier down, a run of slots rather than a run of parts →
 *   src/lib/playerFigure.ts. Nothing here knows what a step is: a song is parts and nothing else.
 */
import type { PlayerVoice } from "./player.ts";
import type { PlayerCharacter } from "./playerCast.ts";

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
 *
 * The arrangement travels with it for the same reason one tier along: a drawn song is not a list
 * anything holds, so the run in force at that jump is a thing only the cursor can say, and the
 * surfaces that read one read it here rather than deriving a second (0158).
 */
export type SongDraw = {
  part: SongPart;
  voice: PlayerVoice;
  /** The arrangement being walked: the written list itself, or the run a drawn song has laid. */
  song: readonly SongPart[];
};

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
    if (standing !== undefined) return { part, voice: standing, song };
    const voice = draw(part, index);
    if (part.chorus) kept.set(index, voice);
    return { part, voice, song };
  };
}

/**
 * How many parts one drawn arrangement is a run of, 0…`PLAYER_ARRANGE_MAX`. Zero is the whole of
 * "not drawn", the way `phrase: 0` is the whole of "no figure" and an empty list is the whole of
 * "no song": there is no second field that could disagree with it about which author is live.
 *
 * The same ceiling a written song has, and it has to be the same one — a run a hand could not have
 * typed would be an arrangement the list below it cannot show (0158).
 */
export const PLAYER_ARRANGE_MIN = 0;
export const PLAYER_ARRANGE_MAX = PLAYER_SONG_MAX;

/**
 * How many rounds keep one drawn arrangement before it is let go. Zero keeps one forever, which is
 * an arrangement drawn once and played for as long as the deck runs.
 *
 * Its own range rather than the figure's keep, and this is the second place in the module where
 * two counts that agree on their numbers are not one range (0151): a figure's keep is counted in
 * **passes of `phrase` jumps** and this one in **rounds of `arrange` parts**, which is a different
 * unit again. Sixteen for the reason both of theirs is sixteen — past it the thing being kept
 * outlasts anything a listener holds it against.
 */
export const PLAYER_ARRANGE_KEEP_MIN = 0;
export const PLAYER_ARRANGE_KEEP_MAX = 16;

/**
 * The odds a drawn arrangement whose round is over has one of its parts redrawn, 0…1. Zero replays
 * it exactly for as long as it is kept; one redraws a part of it every round, so the arrangement
 * stays recognisable and is never twice the same.
 */
export const PLAYER_ARRANGE_CHANCE_MIN = 0;
export const PLAYER_ARRANGE_CHANCE_MAX = 1;

/**
 * The odds an arrangement that has been let go is the walk's own first one again rather than a
 * fresh one, 0…1. Zero branches every time and never comes home; one is a performance of exactly
 * one arrangement however many times it is dropped.
 */
export const PLAYER_ARRANGE_RETURN_MIN = 0;
export const PLAYER_ARRANGE_RETURN_MAX = 1;

/**
 * The four fields of a `PlayerSpec` a drawn arrangement is shaped by — `FigureSpec`'s own four
 * said in parts and rounds instead of slots and passes, which is the whole of what keeps this
 * small (0151, 0158). Declared here because this is the file that reads them.
 */
export type ArrangementSpec = {
  /** Parts in one drawn arrangement, 0…PLAYER_ARRANGE_MAX. Whole; zero draws none at all. */
  arrange: number;
  /** Rounds that keep one arrangement, 0…PLAYER_ARRANGE_KEEP_MAX. Whole; zero keeps it forever. */
  arrangeKeep: number;
  /** The odds a kept arrangement has one part redrawn at the top of a round, 0…1. */
  arrangeChance: number;
  /** The odds a let-go arrangement is the walk's first one again rather than a fresh one, 0…1. */
  arrangeReturn: number;
};

/**
 * Which of the two authors is live. A rule and never a second field — an `arrange` above zero is
 * the whole of "the pattern is drawing its own", and the list a hand wrote is held untouched
 * meanwhile — so it is asked here rather than answered again at each of the three surfaces that
 * ask it (principle 1, 0158).
 */
export const songIsDrawn = (spec: ArrangementSpec): boolean => spec.arrange > PLAYER_ARRANGE_MIN;

/**
 * The song the pattern writes for itself: `createFigure`'s cursor one tier up, laying a run of
 * parts, playing it back for as many rounds as the keep asks, moving one of them on the chance,
 * and letting go either onto a new arrangement or back to the run the walk began with (0151,
 * 0158). Answers exactly what `createSong` answers, so the walk above and every surface below read
 * one shape whichever author is live.
 *
 * `random`, `drawPart` and `draw` are the caller's for the reason the figure's are: every draw an
 * arrangement takes has to sit in the one stream the pattern is a function of, and this file knows
 * what a character is no more than it did before (0089, 0096).
 *
 * Stateful, and the state is a cursor rather than a fact: nothing about a drawn arrangement is
 * stored, so it is built fresh at every walk and re-derived by replaying — which is what keeps a
 * session a thing no pattern rewrites while it plays (0158).
 */
// One branch per thing that may become of a run — laid, read back, evolved, let go, returned —
// each with the paragraph saying why it is decided where it is. The length is the arrangement's
// shape and not this function's, and it is `createFigure`'s own length one tier up. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function createDrawnSong(
  spec: ArrangementSpec,
  random: () => number,
  /** One part of the run, drawn: the caller mints its id and draws its character. */
  drawPart: () => SongPart,
  draw: (part: SongPart, index: number) => PlayerVoice,
): () => SongDraw | null {
  /** The run being laid or read back, empty while there is none. */
  let run: SongPart[] = [];
  /** The walk's first complete run: where a return goes back to, and what a branch must not
   *  overwrite. */
  let root: readonly SongPart[] = [];
  /** How far into the run the read has got, how many whole rounds it has made of it, and how many
   *  jumps of the standing part are still to come. */
  let read = 0;
  let plays = 0;
  let left = 0;

  /**
   * What becomes of an arrangement whose round is over, read at the top of the round after it so
   * the decision lands before the parts it decides about are handed out — `createFigure`'s rule,
   * for its reason (0151). Let go and evolve are exclusive: a run just dropped has nothing left to
   * evolve.
   */
  const letGo = (): void => {
    if (spec.arrangeKeep > 0 && plays >= spec.arrangeKeep) {
      plays = 0;
      run = random() < spec.arrangeReturn ? [...root] : [];
      return;
    }
    if (spec.arrangeChance === 0 || random() >= spec.arrangeChance) return;
    run[Math.floor(random() * run.length)] = drawPart();
  };

  return () => {
    if (spec.arrange === 0) return null;
    if (left > 0) {
      left--;
      return null;
    }
    // A round is over the moment the read is back at the top of a full run.
    if (run.length === spec.arrange && read === 0) letGo();
    let index = run.length;
    let part: SongPart;
    if (run.length < spec.arrange) {
      // Laying, one part at the jump it begins — so the run fills in as it is heard, and a part's
      // own draw sits beside the voice drawn under it rather than a round ahead of it.
      part = drawPart();
      run.push(part);
      // Laying it down is the first of the rounds a keep counts: the run has sounded once.
      if (run.length === spec.arrange) {
        if (root.length === 0) root = [...run];
        plays = 1;
      }
    } else {
      index = read;
      const held = run[index];
      if (held === undefined) return null;
      part = held;
      read = (read + 1) % spec.arrange;
      if (read === 0) plays++;
    }
    left = part.length - 1;
    // A copy per boundary, which is the one allocation this takes: a step carries the run it was
    // walked in, and a run that went on being mutated under a step already armed would be a
    // surface reading an arrangement the ear is not on yet (0157).
    return { part, voice: draw(part, index), song: [...run] };
  };
}
