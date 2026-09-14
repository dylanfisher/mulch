/**
 * @role What a yard's sequence is, and what it is worth at an instant: a run of steps — a fade in,
 *   a stretch of playing, a fade out, a rest — each a length in seconds, read as one level between
 *   nought and one that a yard's output is scaled by after its own fader. Pure maths: the level at
 *   an elapsed second, the ramps a window of it is laid as, and the one gate a durable sequence
 *   comes through from the wire or from storage (0379).
 * @instead The node that sounds it → src/audio/chain.ts. The clock it counts on, which holds
 *   through a pause and rewinds on a stop → src/audio/deckLanes.ts.
 */
import { exactKeys, objectAt, oneOf, whole } from "./guards.ts";

/** A step's kinds: a fade up to one, a stretch at one, a fade down to nought, a stretch at nought. */
export const SEQUENCE_STEP_KINDS = ["in", "play", "out", "rest"] as const;
export type SequenceStepKind = (typeof SEQUENCE_STEP_KINDS)[number];

/** One step: what it does, and how long it takes doing it. */
export type SequenceStep = { kind: SequenceStepKind; secs: number };

/** A yard's whole sequence. Empty is no sequence at all: the yard sounds at one throughout. */
export type DeckSequence = readonly SequenceStep[];

/** How long a step may take: a second, or an hour. Whole seconds — a hand sets these in minutes. */
export const SEQUENCE_SECS_MIN = 1;
export const SEQUENCE_SECS_MAX = 3600;
/** How many steps a sequence may hold. */
export const SEQUENCE_STEPS_MAX = 64;

/** The level a step starts at and the one it ends at. */
const LEVELS: Record<SequenceStepKind, readonly [from: number, to: number]> = {
  in: [0, 1],
  play: [1, 1],
  out: [1, 0],
  rest: [0, 0],
};

/** How long the whole sequence takes, in seconds. Nought for none. */
export const sequenceSpanSecs = (steps: DeckSequence): number =>
  steps.reduce((sum, step) => sum + step.secs, 0);

/**
 * The level at `elapsed` seconds into the sequence. Before it begins, the first step's own start;
 * past its end, the last step's own end — the sequence never touches the transport, so a yard
 * that has finished fading out goes on looping, silently, until a hand does (0379). One
 * throughout for no sequence.
 */
export function sequenceLevelAt(steps: DeckSequence, elapsed: number): number {
  if (steps.length === 0) return 1;
  let at = 0;
  for (const step of steps) {
    const [from, to] = LEVELS[step.kind];
    if (elapsed < at + step.secs) {
      const into = Math.max(0, elapsed - at) / step.secs;
      return from + (to - from) * into;
    }
    at += step.secs;
  }
  const last = steps.at(-1);
  if (last === undefined) throw new Error("a sequence with steps has a last one");
  return LEVELS[last.kind][1];
}

/**
 * The window `[from, until]` of a sequence that began at `origin`, as the points a linear ramp is
 * laid through: the level at `from` first, every step edge strictly inside the window, and the
 * level at `until` last. A function of its arguments and of nothing else, so the live pump and an
 * offline render laying the same window lay the same ramps (0204).
 */
export function sequenceRamps(
  steps: DeckSequence,
  origin: number,
  from: number,
  until: number,
): [value: number, at: number][] {
  const ramps: [number, number][] = [[sequenceLevelAt(steps, from - origin), from]];
  let edge = origin;
  for (const step of steps) {
    edge += step.secs;
    if (edge <= from) continue;
    if (edge >= until) break;
    ramps.push([sequenceLevelAt(steps, edge - origin), edge]);
  }
  ramps.push([sequenceLevelAt(steps, until - origin), until]);
  return ramps;
}

/**
 * The one gate a durable sequence comes through — the command wire and storage alike — and the
 * spelling a stored one is written back in: a list of steps, each exactly a kind and whole seconds
 * within the bounds above, and no longer than a sequence may be (0026, 0379).
 */
export function assertSequence(value: unknown, at: string): DeckSequence {
  if (!Array.isArray(value)) throw new TypeError(`${at} is not a list`);
  if (value.length > SEQUENCE_STEPS_MAX) {
    throw new RangeError(`${at} holds ${value.length} steps, at most ${SEQUENCE_STEPS_MAX}`);
  }
  return value.map((raw: unknown, index) => {
    const where = `${at}[${index}]`;
    const step = objectAt(raw, where);
    exactKeys(step, ["kind", "secs"], where);
    return {
      kind: oneOf(step["kind"], SEQUENCE_STEP_KINDS, `${where} kind`),
      secs: whole(step["secs"], SEQUENCE_SECS_MIN, SEQUENCE_SECS_MAX, `${where} secs`),
    };
  });
}
