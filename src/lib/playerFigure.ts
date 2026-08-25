/**
 * @role What a jumping pattern remembers: the four amounts a figure is shaped by, and the figure
 *   itself — a run of slots the walk lays down, plays back, evolves and lets go of, either onto a
 *   new branch or back to the run the pass started from (0151). Pure maths: no clock, no context,
 *   and no PRNG of its own, because the draws it takes have to sit in the one stream the pattern
 *   is a function of.
 * @instead Everything else a step is drawn from — where it may travel, how many times it sounds,
 *   how long and how fast → src/lib/player.ts, which holds the spec these four fields are part of
 *   and is the only caller of the walk below. Nothing here knows what a step is: a figure is
 *   positions and nothing else, which is the whole of what 0151 decided.
 */

/**
 * How many passes keep one figure before it is let go. Zero keeps one forever, which is a pattern
 * locked to a run of slots and evolving only where the chance below moves it.
 *
 * Its own range rather than the hold's, and this is the one place in the module where two counts
 * that agree on their numbers are not one range: a hold is counted in **jumps** whatever it is
 * holding, which is why `repeatsHold` shares `PLAYER_HOLD_MIN…MAX`, and a keep is counted in
 * **passes of a figure**, which is `phrase` jumps each. Sixteen for the same reason a hold's
 * sixteen: past it the thing being kept outlasts anything a listener holds it against.
 */
export const PLAYER_PHRASE_KEEP_MIN = 0;
export const PLAYER_PHRASE_KEEP_MAX = 16;

/**
 * The odds a figure whose pass is over has one of its slots redrawn, 0…1. Zero replays it exactly
 * for as long as it is kept; one moves a slot of it every pass, so the figure stays recognisable
 * and is never twice the same. The redrawn slot is walked from the one before it in the figure, by
 * the same distance and sign an ordinary jump takes — an evolved figure is still a walk.
 *
 * Rolled at the top of every pass a figure is not let go on, so a failed roll is the same odds
 * again next pass and never an evolution postponed (0134, 0135).
 */
export const PLAYER_PHRASE_CHANCE_MIN = 0;
export const PLAYER_PHRASE_CHANCE_MAX = 1;

/**
 * The odds a figure that has been let go is the pass's own first figure again rather than a fresh
 * one, 0…1. Zero branches every time — each figure is laid from wherever the last one left the
 * walk, so the pattern goes on and never comes home. One returns to the root whenever it lets go,
 * which is a performance of exactly one figure however many times it is dropped. Between them is
 * the shape the field was grown for: a figure, some figures away from it, and the first one
 * coming back.
 */
export const PLAYER_PHRASE_RETURN_MIN = 0;
export const PLAYER_PHRASE_RETURN_MAX = 1;

/**
 * The four fields of a `PlayerSpec` a figure is shaped by, declared here because this is the file
 * that reads them — the spec above in src/lib/player.ts is this and the rest of the pattern's
 * amounts, so the four are said once (principle 1).
 */
export type FigureSpec = {
  /** Slots in one figure, 0…PLAYER_PHRASE_MAX. Whole; zero keeps no figure at all. */
  phrase: number;
  /** Passes that keep one figure, 0…PLAYER_PHRASE_KEEP_MAX. Whole; zero keeps it forever. */
  phraseKeep: number;
  /** The odds a kept figure has one slot redrawn at the top of a pass, 0…1. */
  phraseChance: number;
  /** The odds a let-go figure is the pass's first one again rather than a fresh one, 0…1. */
  phraseReturn: number;
};

/**
 * The walk's memory, as a cursor: call it with the slot the last step read from for the slot the
 * next one reads from. Keeping no figure it is `travelFrom` and nothing else, which is the
 * memoryless walk the module was before 0151 — so a pattern that keeps none draws exactly the
 * stream it drew before figures existed.
 *
 * `random` and `travelFrom` are the caller's on purpose. The order of a pattern's draws is its
 * whole contract with a seed, so this file may not open a generator of its own, and an evolving
 * figure has to move by the same jump an ordinary step takes or `distance` and the lean would stop
 * saying what the pattern's steps are like — which is why a homing walk evolves a kept figure home
 * as well, and that is the point rather than a leak (0162).
 *
 * Stateful, and the state is a cursor rather than a fact: it is built fresh at every `begin` and
 * re-derived by replaying, which is what lets a knob moved mid-pattern re-derive its tail without
 * anything durable remembering where the pattern had reached (0089, 0096).
 */
export function createFigure(
  spec: FigureSpec,
  random: () => number,
  travelFrom: (at: number) => number,
): (slot: number) => number {
  /** The figure being laid or read back, as the slots it is a run of, empty while there is none. */
  let figure: number[] = [];
  /** The pass's first complete figure: where a return goes back to, and what a branch must not
   *  overwrite. */
  let root: number[] = [];
  /** How far into the figure the read has got, and how many whole passes it has made of it. */
  let read = 0;
  let plays = 0;

  /**
   * What becomes of a figure whose pass is over, read at the top of the pass after it so the
   * decision lands before the slots it decides about are handed out.
   *
   * Let go on the keep's own count — back to the pass's first figure on the return's odds, and off
   * onto a fresh one laid from wherever the walk stands otherwise — or, while it is still being
   * kept, one of its slots redrawn on the chance's. The two are exclusive: a figure that has just
   * been dropped has nothing left to evolve.
   *
   * Every roll is taken whenever it is due and whatever it says, so the stream stays a pure
   * function of the spec and the step count (0096, 0134).
   */
  const letGo = (slot: number): void => {
    if (spec.phraseKeep > 0 && plays >= spec.phraseKeep) {
      plays = 0;
      // A copy either way: `root` is the pass's own figure and a returned-to one is about to be
      // evolved in place, which would otherwise reach back and move the root with it.
      figure = random() < spec.phraseReturn ? [...root] : [];
      return;
    }
    if (spec.phraseChance === 0 || random() >= spec.phraseChance) return;
    const at = Math.floor(random() * figure.length);
    // Walked from the slot before it in the figure — and from the last slot sounded for the first,
    // which is that slot's own predecessor in a run that comes round.
    figure[at] = travelFrom(at === 0 ? slot : (figure[at - 1] ?? slot));
  };

  return (slot) => {
    if (spec.phrase === 0) return travelFrom(slot);
    // A pass is over the moment the read is back at the top of a full figure.
    if (figure.length === spec.phrase && read === 0) letGo(slot);
    if (figure.length < spec.phrase) {
      // Laying, which is the ordinary walk with its slots kept.
      const next = travelFrom(slot);
      figure.push(next);
      if (figure.length === spec.phrase) {
        if (root.length === 0) root = [...figure];
        // Laying it down is the first of the passes a keep counts: the run has sounded once.
        plays = 1;
      }
      return next;
    }
    // Reading it back. No jump is drawn at all, because the figure is the jump — which is also why
    // a figure let go of leaves the walk standing where its last slot did.
    const next = figure[read] ?? slot;
    read = (read + 1) % spec.phrase;
    if (read === 0) plays++;
    return next;
  };
}
