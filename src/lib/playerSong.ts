/**
 * @role What a jumping pattern is arranged as: the parts a song is a run of, whose voices are the
 *   dials they were captured from (0176), and the cursor over the run a pattern draws for itself —
 *   laid, kept, evolved and let go the way a figure is one tier down (0158). Pure maths: no clock,
 *   no context, no PRNG of its own and no knowledge of what a character is, because the draw
 *   belongs to the one stream the pattern is a function of and the caller is the one holding it.
 * @instead The songs and albums a hand's own parts stand in, the cursor that walks them, and what
 *   a solo and an audition are said against → src/lib/playerAlbum.ts (P147). What a character is,
 *   and the arithmetic a part's voice is drawn and blended by → src/lib/playerCharacter.ts. The
 *   walk that unfolds a part into steps → src/lib/playerWalk.ts. What a figure is — the same shape
 *   one tier down, a run of slots rather than a run of parts → src/lib/playerFigure.ts. Nothing
 *   here knows what a step is: a song is parts and nothing else.
 */
import type { PartVoice, PlayerVoice } from "./player.ts";
// The place a draw carries is the tiers' own shape, declared beside them and reached from here as
// a type alone — so nothing about an album is imported into a file that knows only about parts.
import type { SongPlace } from "./playerAlbum.ts";
import type { PartStep } from "./playerStrip.ts";

/**
 * How many parts one song may hold. Eight, which is the longest arrangement a hand can read off a
 * list without counting — and long enough for the shape the field was grown for: a part that
 * comes back, three things between it, and that part twice more.
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
 * One part of a song: the dials it was captured from, and how long it lasts.
 *
 * A part is a spec and a length, which is the whole of what 0176 decided. It was a character, an
 * amount of it and a switch until then (0153), and what that cost is the thing this replaces:
 * there was no way to say "this part, exactly as the card stands right now", because a part named
 * a *plan* to draw one rather than a pattern. The character menu is now one way of filling that
 * spec rather than the whole of what a part is, and the card's own dials are the other.
 *
 * What it costs in turn is the draw a part used to take at each of its first jumps: a riff part no
 * longer deals a new riff every time it comes round, so the chorus switch — which said which part
 * was the exception to that redraw — is gone with the redraw itself. An arrangement that draws
 * itself is what `arrange` is (0158).
 */
export type SongPart = {
  /**
   * What this part is, as against where it is: an opaque, caller-supplied, durable string minted
   * at the gesture that adds one, exactly like a rack instance's (0076). Two parts captured from
   * one set of dials for one length are alike in every other field, so without this the only thing
   * telling them apart is their place in the list — which is the very thing a reorder moves, and a
   * badge that moved when the part it names did not would be a name for a place (0157).
   *
   * Identity and never a second generator: what a seed reproduces is the walk's own stream, and a
   * part that carries its own numbers takes nothing out of it at all (0089).
   */
  id: SongPartId;
  /**
   * What a hand called this part. Durable text and never the empty string — `assertDurableText`
   * refuses that, so there is no absent case and no default that could mask a missing one
   * (principle 5): a part is minted with its own badge as its name, and renaming replaces it.
   *
   * A name and not a character. A part no longer stores which character it came from (0176), and a
   * list of names has no nearest (0174), so a label derived from the numbers would be an invention
   * — what tells two parts apart is this, which a hand typed, and the signature, which is read off
   * the dials themselves.
   */
  name: string;
  /**
   * Whether the walk passes this part over. Held in the song rather than taken out of it, which is
   * the whole point: a part skipped is one an arrangement still has and is not playing, so trying
   * the song without it costs one press instead of a remove and an add that would mint a new id.
   */
  skip: boolean;
  /**
   * The pattern this part plays: every number a hand turns but the four the song itself is drawn
   * by, captured from the card's dials at the gesture that added it and written by those same
   * dials while it is the part they are pointed at (0176). The four are the card's own — a part
   * that could turn one would be an arrangement rewriting the arrangement it is inside (0158).
   */
  voice: PartVoice;
  /** How many jumps it lasts, `PLAYER_PART_MIN`…`PLAYER_PART_MAX`. Whole. */
  length: number;
  /**
   * The run of cells a hand wrote this part as, or an empty list where the part is drawn instead
   * (0188). Non-empty, it is the other author of where the pattern goes and how long it stays —
   * the shape 0163 settled for the placed rest, one tier up: the walk reads the cell rather than
   * drawing a slot, a count and a wait, and the dials those three came off go quiet.
   *
   * Read round and round for the part's own `length`, which is what makes that length the number
   * of times the row repeats (`stripStep`, src/lib/playerStrip.ts).
   */
  steps: readonly PartStep[];
};

/**
 * What adding a part leaves it at, beside the spec the gesture captures: eight jumps, which is the
 * length a hand starts from and moves away from. Declared once so the gesture that adds one, the
 * run a pattern draws for itself and any test that reads either agree (principle 1).
 *
 * Three fields of a part are not among them, and none of them is a value this file could have an
 * opinion about: which part this is, is minted at the gesture that adds one (0157), what it plays
 * is read off the dials it was captured from (0176), and what it is called is minted from the id —
 * so the name is written beside the mint rather than defaulted here, where it could only be a
 * constant every part shared.
 */
export const PLAYER_PART_DEFAULTS: Omit<SongPart, "id" | "name" | "voice"> = {
  /** Played, which is what adding a part is for. The switch is there to take one out again. */
  skip: false,
  length: 8,
  /** Drawn, which is what a part was before one could be written: the dials author it (0188). */
  steps: [],
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
  /**
   * Whether this boundary is the top of the arrangement — the first part of the run, which is
   * where a song comes round. Answered here rather than counted again by a caller, because this
   * cursor is the one thing that knows which part of the run it just handed out: a walk comparing
   * ids would be a second reader of the order (principle 1, 0192, src/lib/playerWalk.ts).
   */
  first: boolean;
  /**
   * Where in the three tiers this boundary falls, and how much of each of them is still to come —
   * or **null** wherever there are no tiers to stand in, which is every draw of a run the pattern
   * wrote for itself: an arrangement that moves as it plays is not a place a hand could point at
   * (0158). The whole answer to `first` is inside it for the album cursor, which is why it is here
   * rather than counted again by a surface (principle 1, src/lib/playerAlbum.ts).
   */
  place: SongPlace | null;
};

/**
 * Whether a written song has anything for the walk to stand in: one part it does not pass over. A
 * rule and never a second field, asked here rather than answered again at each surface that reads
 * it (principle 1) — a song of nothing but skipped parts is the empty song, so a card that called
 * it an arrangement would run a frame loop for a part that never stands and read out a list the
 * walk is not playing.
 */
export const songIsPlayed = (song: readonly SongPart[]): boolean => song.some((part) => !part.skip);

/**
 * How much of the song one part is, 0…1 — its jumps over the jumps of every part the walk actually
 * plays. What a row draws its bar the width of, so a hand reads the arrangement's proportions off
 * the list rather than counting four dials against each other (0119).
 *
 * A skipped part is none of it, and it is none of the total either: the bar says how much of what
 * is *heard* this part is, and a passed-over part that still took its share of the row would be a
 * picture of a song nobody is playing. Every part skipped is a total of zero, which is the empty
 * song the cursor one tier up walks as no arrangement at all — so every share is zero rather than a division
 * that is not a number (principle 5).
 */
export function songShare(song: readonly SongPart[], part: SongPart): number {
  if (part.skip) return 0;
  let total = 0;
  for (const each of song) if (!each.skip) total += each.length;
  return total === 0 ? 0 : part.length / total;
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
 * How much of the character it is drawn as a part of a drawn arrangement takes, 0…1. Zero is the
 * card's own dials exactly — an arrangement of one sound, moving only where the walk moves it —
 * and one is the character at full strength, which is what a name pressed on the card's front
 * leaves (0152, `blendCharacter`).
 *
 * **The guardrail of the four added by 0199, and the general one.** A run that draws parts at full
 * strength draws them anywhere their regions reach: a Breathe with the gap right out, a Stutter
 * with the burst right down, one after another, and an arrangement that evolves into something
 * nobody would sit through. Pulled back toward the dials, every part is a version of the sound a
 * hand has already decided it likes — so the thing the amount bounds is not one knob but all of
 * them at once, which is why there is one dial here and not a floor and a ceiling per knob.
 *
 * The same arithmetic the front's own amount runs and deliberately so (`PLAYER_AMOUNT_MIN`,
 * src/lib/playerCharacter.ts): what differs is only that this one is durable, because it shapes
 * every part the pattern will draw rather than the one press a hand just made.
 */
export const PLAYER_ARRANGE_AMOUNT_MIN = 0;
export const PLAYER_ARRANGE_AMOUNT_MAX = 1;

/**
 * How many rounds of the run stand between one part being added and the next, 0…16. Zero lays the
 * whole arrangement down at once, which is what a drawn song did before 0199 and what it still
 * does until this is turned.
 *
 * Above zero the run **grows**: it opens on one part, plays it, and takes on another every this
 * many rounds until it is `arrange` parts long — so an arrangement arrives rather than starting
 * complete, and the keep does not begin counting until it has. Letting go drops it back to one and
 * it grows again, which is the shape a set has: something builds, breaks, and builds differently.
 *
 * Counted in rounds and not in jumps, because what it is spacing out is rounds of an arrangement —
 * the unit `arrangeKeep` is already counted in, and the same ceiling for its reason: past sixteen
 * the part that arrives has nothing left to arrive *against*.
 */
export const PLAYER_ARRANGE_GROW_MIN = 0;
export const PLAYER_ARRANGE_GROW_MAX = PLAYER_ARRANGE_KEEP_MAX;

/**
 * How far a drawn part's own length may stray from `PLAYER_PART_DEFAULTS.length`, counted in
 * doublings, 0…3. Zero draws every part the same eight jumps, which is what a drawn song did
 * before 0199.
 *
 * **Doublings and not jumps.** A length drawn evenly between one and sixty-four is a run of
 * arbitrary section lengths that no two parts hold against each other; a length drawn from the
 * eight doubled and halved — four, eight, sixteen — is the shape a section actually has. So one
 * is `4…16`, two is `2…32`, and three is the whole of `PLAYER_PART_MIN…PLAYER_PART_MAX`. The
 * ceiling is three because that is the doubling at which the range is already the whole range.
 */
export const PLAYER_ARRANGE_SPAN_MIN = 0;
export const PLAYER_ARRANGE_SPAN_MAX = 3;

/**
 * The odds a part being drawn is refused the character the part drawn before it took, 0…1. Zero
 * draws each part from the whole cast and lets two alike stand together; one never repeats a name
 * twice running, so every part in the run is audibly a different thing from its neighbour.
 *
 * The second guardrail, and the one about the *run* rather than about a part: an arrangement of
 * six parts that came up Riff four times is a song with one section in it, which is the failure a
 * hand notices as "this stopped going anywhere". It narrows the cast for that one draw rather than
 * redrawing until the name differs — a redraw loop would spend an unknown number off the seed's
 * stream, and what a seed reproduces is the stream (0089, 0174).
 *
 * It has no answer where the cast permits one name: that name is every part, and the odds cannot
 * change it. The draw is taken anyway so the stream is the same either way.
 */
export const PLAYER_ARRANGE_APART_MIN = 0;
export const PLAYER_ARRANGE_APART_MAX = 1;

/**
 * The eight fields of a `PlayerSpec` a drawn arrangement is shaped by — `FigureSpec`'s own four
 * said in parts and rounds instead of slots and passes (0151, 0158), and the four 0199 adds
 * beside them: how far a part is taken from the dials, how the run grows, how long a part lasts
 * and how unlike its neighbour it is. Declared here because this is the file that reads them.
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
  /** How much of its character a drawn part takes, 0…1. Zero is the card's own dials (0199). */
  arrangeAmount: number;
  /** Rounds between one part being added and the next, 0…16. Whole; zero lays the run at once. */
  arrangeGrow: number;
  /** Doublings a drawn part's length may stray from eight jumps, 0…3. Whole. */
  arrangeSpan: number;
  /** The odds a drawn part is refused the character drawn before it, 0…1. */
  arrangeApart: number;
};

/**
 * One drawn part's length in jumps: the default doubled or halved up to `span` times, drawn evenly
 * across the `2 * span + 1` lengths that reaches and clamped to what a part may be. A span of zero
 * has one length in it, so the draw is spent and the answer is the default — the stream a walk
 * spends is the same however this stands, which is the rule every draw in this module keeps
 * (0089, `drawCast`).
 *
 * Here rather than in the walk that calls it because it is the arithmetic of `arrangeSpan`, and a
 * range is declared beside what reads it (0045).
 */
export function songLength(span: number, draw: number): number {
  const steps = 2 * span + 1;
  const doublings = Math.min(steps - 1, Math.floor(draw * steps)) - span;
  const length = PLAYER_PART_DEFAULTS.length * 2 ** doublings;
  return Math.min(PLAYER_PART_MAX, Math.max(PLAYER_PART_MIN, Math.round(length)));
}

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
 * 0158). Answers exactly what `createAlbums` answers, so the walk and every surface below read
 * one shape whichever author is live.
 *
 * `random`, `drawPart` and `voiceOf` are the caller's for the reason the figure's are: every draw an
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
  /** One part of the run, drawn: the caller mints its id and draws the spec it carries. */
  drawPart: () => SongPart,
  voiceOf: (part: SongPart, index: number) => PlayerVoice,
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
   * How many parts the run is laying toward *now*, and how many rounds it has made since it last
   * took one on. Without a grow this is the whole arrangement from the first jump, which is the
   * run that has always been laid; with one it opens at a single part and climbs (0199).
   */
  let want = 0;
  let since = 0;
  /** What a fresh run opens at: one part where it is to grow, and the whole of it where it is not. */
  const opening = (): number => (spec.arrangeGrow === 0 ? spec.arrange : 1);

  /**
   * What becomes of an arrangement whose round is over, read at the top of the round after it so
   * the decision lands before the parts it decides about are handed out — `createFigure`'s rule,
   * for its reason (0151). Let go and evolve are exclusive: a run just dropped has nothing left to
   * evolve.
   */
  const letGo = (): void => {
    if (spec.arrangeKeep > 0 && plays >= spec.arrangeKeep) {
      plays = 0;
      since = 0;
      // A run come home is a complete one and stands at its full length; a fresh one opens where a
      // fresh one opens, so a growing arrangement grows again rather than starting whole (0199).
      const home = random() < spec.arrangeReturn;
      run = home ? [...root] : [];
      want = home ? spec.arrange : opening();
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
    if (want === 0) want = opening();
    // A round is over the moment the read is back at the top of a full run. A run still growing is
    // not one: what a keep counts is rounds of the arrangement, and an arrangement that has not
    // finished arriving is not yet the thing being kept (0199).
    if (run.length === spec.arrange && read === 0) letGo();
    let index = run.length;
    let part: SongPart;
    if (run.length < want) {
      // Laying, one part at the jump it begins — so the run fills in as it is heard, and a part's
      // own draw sits beside the voice drawn under it rather than a round ahead of it.
      part = drawPart();
      run.push(part);
      // Laying the last of them is the first of the rounds a keep counts: the run has sounded once.
      if (run.length === spec.arrange) {
        if (root.length === 0) root = [...run];
        plays = 1;
      }
    } else {
      index = read;
      const held = run[index];
      if (held === undefined) return null;
      part = held;
      // Round the run it actually has, which is not the whole arrangement while one is growing.
      read = (read + 1) % run.length;
      if (read === 0) {
        plays++;
        since++;
        // And the part this round earns it, where there is one still to come: the growth lands at
        // the top of a round for the reason a let-go does — before the parts it decides about are
        // handed out (0151, 0199).
        if (want < spec.arrange && since >= spec.arrangeGrow) {
          want++;
          since = 0;
        }
      }
    }
    left = part.length - 1;
    // A copy per boundary, which is the one allocation this takes: a step carries the run it was
    // walked in, and a run that went on being mutated under a step already armed would be a
    // surface reading an arrangement the ear is not on yet (0157).
    // No place: a drawn run stands in no album and no song, and one it could be pointed at would be
    // a row on a list nothing holds (0158).
    return { part, voice: voiceOf(part, index), song: [...run], first: index === 0, place: null };
  };
}
