/**
 * @role What a wait between jumps is: how long it lasts, the two amounts that roll one, and the
 *   two that place them instead — a Bjorklund pattern spreading its pulses as evenly as whole
 *   numbers allow over a span of jumps (0163). Pure maths: no clock, no PRNG and no knowledge of
 *   what a step is, because a placement is a function of a count and nothing else.
 * @instead The step the wait is a field of, and the draw that reads these → `drawRest` in
 *   src/lib/playerWalk.ts. Everything else a step is drawn from → src/lib/player.ts, which holds
 *   the spec these five fields are part of. The dial each is turned on → src/lib/playerKnobs.ts;
 *   the door they are drawn behind → src/ui/PlayerRest.tsx.
 */

/**
 * How long the pattern rests before the next jump, in slots. Zero runs the bursts continuously,
 * which is the whole of what the module did before it had a rest to take — and it is zero whoever
 * is authoring, because the length is the one thing neither author draws.
 */
export const PLAYER_REST_MIN = 0;
export const PLAYER_REST_MAX = 4;

/**
 * The odds a wait is actually taken, 0…1. One waits before every jump, which is what the rest did
 * before it had a chance behind it; anything less makes the wait a maybe and the pattern's rhythm
 * uneven without a second dial for it. Rolled per jump, so a failed roll is a jump that runs on.
 *
 * Read only while the pattern below is off: a placed rest is the other author of this one field,
 * and two authors of it would be one instruction arriving from two places (0163, principle 1).
 */
export const PLAYER_REST_CHANCE_MIN = 0;
export const PLAYER_REST_CHANCE_MAX = 1;

/**
 * How far a taken wait may stray from the dial, as a fraction of it, either way — the spread the
 * rate walk has, said for a wait instead, and captioned with the same word for that reason. Zero
 * waits exactly as long every time; one may halve the wait or leave it a moment shy of double.
 * There is no drift beside it: a wait is drawn fresh at every jump rather than walked, so there is
 * no rest it could be travelling from (P87). Read while the pattern is off, with the chance above.
 */
export const PLAYER_REST_SPREAD_MIN = 0;
export const PLAYER_REST_SPREAD_MAX = 1;

/**
 * How many jumps one turn of the pattern is spread over, 1…`PLAYER_REST_SPAN_MAX`. Counted in
 * jumps, like every hold and keep in this module, and never in slots: what the pattern places is
 * which *jumps* wait, and how far each of those jumps travelled is the Distance dial's business.
 *
 * Sixteen at the top for the reason a hold's sixteen is: past it the figure being placed outlasts
 * anything a listener holds it against, and a span of sixteen already reaches every pattern the
 * grid itself is cut into.
 */
export const PLAYER_REST_SPAN_MIN = 1;
export const PLAYER_REST_SPAN_MAX = 16;

/**
 * How many of the span's jumps take a wait, 0…`PLAYER_REST_PULSES_MAX`. Zero is the whole of "no
 * pattern": the roll above is then the author of the wait, which is what the module did before it
 * could place one. Anything else takes the field over — where the pattern breathes stops being a
 * roll per jump and becomes the same figure every time round, which is the emergent rhythm a
 * chance cannot ask for (0163).
 *
 * Bounded by the span's own maximum rather than by the span, because a bound is a fact about a
 * dial and not about another dial's value: more pulses than the span holds is every jump resting,
 * which is what `restPattern` answers and needs no clamp of its own. The bound above rather than a
 * second sixteen, so raising the span raises what may be placed inside it (principle 1).
 */
export const PLAYER_REST_PULSES_MIN = 0;
export const PLAYER_REST_PULSES_MAX = PLAYER_REST_SPAN_MAX;

/**
 * The five fields of a `PlayerSpec` a wait is shaped by, declared here because this is what a wait
 * is — the same arrangement `FigureSpec` and `TravelSpec` have, and for the same reason
 * (src/lib/playerFigure.ts, src/lib/playerTravel.ts).
 */
export type RestSpec = {
  /** How long the pattern waits before the next jump, in slots, 0…PLAYER_REST_MAX. */
  rest: number;
  /** The odds a wait is taken, 0…1. Read only while `restPulses` is zero. */
  restChance: number;
  /** How far a taken wait may stray from that, as a fraction of it, 0…1. Read with the chance. */
  restSpread: number;
  /** How many jumps of the span wait, 0…PLAYER_REST_PULSES_MAX. Whole; zero leaves it to the roll. */
  restPulses: number;
  /** How many jumps one turn of the pattern spans, 1…PLAYER_REST_SPAN_MAX. Whole. */
  restSpan: number;
};

/**
 * Which of the two authors of the wait is live, which is a rule and never a second field — the
 * same shape 0158 gave the song's two authors, and for the same reason: a switch beside these
 * numbers could disagree with them, and one that did would leave a dial saying something the
 * pattern was not doing (0163, principle 1).
 */
export const restIsPlaced = (spec: RestSpec): boolean => spec.restPulses > 0;

/**
 * The pattern itself: `pulses` waits spread as evenly over `span` jumps as whole numbers allow —
 * Bjorklund's algorithm, which pairs each pulse with a gap and then pairs the remainder again
 * until one group is left over, so E(3,8) is `x..x..x.` and E(5,8) is `x.xx.xx.`. Deterministic
 * and total: no draw is taken, which is what lets a placed pattern leave the walk's stream exactly
 * where it found it.
 *
 * The two ends are answered rather than iterated toward: no pulses is a span nothing waits on, and
 * as many pulses as the span holds — or more, since the two dials are bounded independently — is a
 * span every jump waits on.
 */
export function restPattern(pulses: number, span: number): boolean[] {
  if (pulses <= 0) return Array.from({ length: span }, () => false);
  if (pulses >= span) return Array.from({ length: span }, () => true);
  let groups: boolean[][] = Array.from({ length: pulses }, () => [true]);
  let spare: boolean[][] = Array.from({ length: span - pulses }, () => [false]);
  while (spare.length > 1) {
    const pairs = Math.min(groups.length, spare.length);
    const paired: boolean[][] = [];
    for (let at = 0; at < pairs; at++) paired.push((groups[at] ?? []).concat(spare[at] ?? []));
    spare = groups.length > pairs ? groups.slice(pairs) : spare.slice(pairs);
    groups = paired;
  }
  return [...groups, ...spare].flat();
}
