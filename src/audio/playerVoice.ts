/**
 * @role The contract one deck's *pattern* fills: everything the transport above it may ask of a
 *   jumping pass — hold a spec, solo or arm a part, hold the session's clock and its shared
 *   ground, begin, arm, re-arm, seek, read and stop — and nothing about how any of it is done. Its
 *   own file for the reason ./deckVoice.ts is: the shape is read a tier up and the implementation
 *   beside it is one whole state machine that the contract has no business sharing a cap with
 *   (0007, 0045).
 * @instead The pass that fills it → src/audio/player.ts. The per-frame read it writes into →
 *   src/audio/deckPeek.ts. What a step is → `PlayerStep`, src/lib/playerWalk.ts.
 */
import type { PlayerSpec } from "@/lib/player";
import type { SongPartId } from "@/lib/playerSong";
import type { SessionGround } from "@/lib/sessionGround";
import type { PlayerPeek } from "./deckPeek";
import type { PlayPlan } from "@/lib/timeline";

/**
 * What a pass is handed about the session's shared ground beside the ground itself: the count it
 * is on at an instant, and — where this yard is the one leading it — the way to say a boundary has
 * been armed. A pair of functions and not a second field, because both answers belong to the host:
 * a voice reaches nothing above itself, and how many times a ground led by *another* yard has
 * moved is precisely a thing above it (0097, 0313).
 */
export type GroundClock = {
  /** How many times the shared ground has moved by audio time `at`. */
  ticksBy: (at: number) => number;
  /**
   * This yard has armed a step on a boundary the shared ground is counted on, at `at` — a part
   * beginning, or the arrangement coming round, as `per` says. **Null unless this yard is the
   * leader**, which is the host's answer and never the voice's: a voice does not know its own name.
   */
  crossed: ((at: number) => void) | null;
};
import type { Span } from "./playerGrid";

export type DeckPlayer = {
  /**
   * Hold this pattern, or drop it. A pattern replacing another is heard where it was turned: the
   * steps past the fade horizon are re-armed from it at once. Switching the module on or off is
   * the caller's transport change and is not (P67, 0089).
   */
  set(spec: PlayerSpec | null): void;
  /**
   * Hold the shared jump clock, or drop it with null. It moves when the next step may begin and
   * nothing else — the pattern is still this deck's seed's, so two decks under one clock land
   * together and sound nothing alike (0097).
   */
  // A property rather than a method: the deck hands this very function on as its own pass-through
  // (src/audio/deck.ts), which a method signature would call an unbound `this` (0007 is not the
  // waiver for that — the implementation is an arrow and has no `this` to lose).
  setSync: (sync: number | null) => void;
  /**
   * Hold the session's shared ground, whole. It moves where a landing reads and nothing else, and
   * only while this pattern has Together on — a yard walking its own ground is handed it just the
   * same and reads none of it, exactly as a yard that is not jumping holds a clock (0313).
   */
  // A property for the reason `setSync` above is one: the deck hands this very function on.
  setGround: (ground: SessionGround, clock: GroundClock) => void;
  /** The pattern being held, or null. The whole of "this deck is not a jumping deck". */
  held(): PlayerSpec | null;
  /**
   * Begin a pass at `at`, and return the plan the loop reporter counts boundaries against — or
   * null when this deck cannot jump, which the caller plays as an ordinary pass.
   */
  begin(buffer: AudioBuffer, loop: Span | null, at: number, rate: number): PlayPlan | null;
  /** Arm every jump beginning inside the horizon. The tick's work, and the render's (0071). */
  arm(): void;
  /**
   * Drop every step still ahead of `from` and lay the pattern down again from there, at whatever
   * rate the chain now reads. What a speed change costs a jumping pass: the steps it had already
   * built are windows measured in the old rate's seconds, and playing them at the new one is the
   * click the whole module is faded to avoid. `set` takes the same road for a moved number.
   */
  rearm(from: number): void;
  /**
   * Hear one part of the song being held on its own, over and over, or hand the whole song back
   * with null — answering whether it did. The walk is built from the song that one part *is*, and a
   * song of one part comes round (`soloSongs`, src/lib/playerSongs.ts, 0190). Pressed, that part is
   * heard from its own first jump; released, the song is wound to it and carries on from there —
   * the audition this replaced, which wound and let go (0181).
   *
   * A transport state and never an edit: nothing durable moves, the seed and the spec are the ones
   * already held, and the song that comes back is the one that was there all along — a seek's
   * sibling rather than a `set`'s (0041). It ends when the pass does.
   *
   * False is the one refusal it makes for itself: no pass to hold it over, or a part the
   * **written** list does not hold or passes over. The caller's own — a pattern nobody holds, and a
   * song the pattern is drawing for itself, whose run no press can name a part of — are made where
   * the durable spec is, and this reads that list on the caller's word (0158).
   */
  // A property rather than a method, for the reason `setSync` above is one: the deck hands this
  // very function on as its own pass-through (src/audio/deck.ts).
  solo: (part: SongPartId | null) => boolean;
  /**
   * Queue one part of the song to be played next: at the next part boundary the walk is wound to
   * that part's own first jump and carries on from there, which is what a launch grid's press is.
   * Null lets go of what was queued, a jump already drawn and not yet heard included. Answers
   * whether it did — false with no pass to queue over, under a solo (whose run of one part has no
   * boundary this could land on), or for a part the written list does not hold or passes over.
   *
   * Transport on the terms a solo is: nothing durable moves, and it dies with the pass rather
   * than outliving a stop — an arm is a pending jump of *this* pass and nothing else.
   */
  armPart: (part: SongPartId | null) => boolean;
  /** Whether a pass is running. */
  running(): boolean;
  /** Where the deck is reading at `at`, in buffer seconds, or null with no pass running. */
  position(at: number): number | null;
  /**
   * What the pattern is standing in at `at`, written into `out`: which part of its song the step
   * the clock is inside was drawn under, the numbers it was drawn from, and where the spark that
   * step threw is reading. Nulls with no pass running. Written in place because this is the
   * per-frame read (0070, 0157).
   */
  peek(at: number, out: PlayerPeek): void;
  /** Stop and release every source of the pass, sounding or still ahead of the clock. */
  stop(): void;
};
