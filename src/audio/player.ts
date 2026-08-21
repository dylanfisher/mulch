/**
 * @role The player as a transport: the sources one pass of a pattern is made of, each looping its
 *   own slot of the deck's loop, started ahead of the clock and seamed with the equal-power fade.
 *   It moves where a deck reads from, which is the transport's and never an effect's (0089).
 * @instead The pattern itself — what a seed unfolds into → src/lib/player.ts, which knows nothing
 *   about a second. The deck that owns this → src/audio/deck.ts: it holds the buffer, the loop
 *   and the plan, and hands all three over here.
 */
import { fadeCurve } from "@/lib/crossfade";
import { PLAYER_SLOTS, playerWalk, type PlayerSpec, type PlayerStep } from "@/lib/player";
import type { PlayPlan } from "@/lib/timeline";
import {
  AUTOMATION_HORIZON_SECS,
  LOOKAHEAD_SECS,
  MAX_PLAYER_STEPS,
  PLAYER_FADE_SECS,
  PLAYER_MIN_SLOT_SECS,
} from "./transport";

/** The two shapes a step's own fader opens and closes along (0089, src/lib/crossfade.ts). */
const FADE_IN = fadeCurve("in");
const FADE_OUT = fadeCurve("out");

/** A range of buffer seconds — the deck's loop, or the one slot of it a step is repeating. */
type Span = { in: number; out: number };

/** The grid a pattern jumps around: where it starts, and how long one slot is, in buffer seconds. */
type Grid = { in: number; slot: number };

/** The loop's own start, for the plan a jumping pass posts. Never called with a null loop. */
const loopIn = (loop: Span | null): number => loop?.in ?? 0;

/** The whole grid's length: the loop, in the buffer seconds the reporter counts a cycle of. */
const gridSpan = (grid: Grid): number => grid.slot * PLAYER_SLOTS;

/** The grid this loop divides into, or null when its slots are too short to carry a seam. */
function gridOf(loop: Span | null, rate: number): Grid | null {
  if (loop === null) return null;
  const slot = (loop.out - loop.in) / PLAYER_SLOTS;
  if (slot / rate < PLAYER_MIN_SLOT_SECS) return null;
  return { in: loop.in, slot };
}

/** One step the transport has going: its source, the fader its seams are on, and where it reads. */
type Scheduled = {
  source: AudioBufferSourceNode;
  fader: GainNode;
  at: number;
  ends: number;
  slot: number;
  /** The rate this step was armed at. Read per step, not per pass: a speed change moves the
   *  ones armed after it and must not be applied to a window laid out for another rate. */
  rate: number;
};

/** One seam, along the equal-power law, beginning at `at`. */
function fade(fader: GainNode, direction: "in" | "out", at: number): void {
  fader.gain.setValueCurveAtTime(direction === "in" ? FADE_IN : FADE_OUT, at, PLAYER_FADE_SECS);
}

/**
 * Every seam of one step, on its own fader. A step nothing cuts opens at its own start and closes
 * over the next one's opening, so the two cross at equal power rather than either landing on a
 * discontinuity; a cut one opens and closes once per repeat.
 *
 * A gated repeat carries three curves in its slot — its own opening, its closing, and the next
 * repeat's opening — and Web Audio throws on two that overlap by so much as a float's last bit.
 * So the drawn fraction is only cut where it leaves a whole fade of daylight on both sides of the
 * closing one; anything tighter is played whole rather than pinned to a margin of exactly zero,
 * which is a rounding error away from a NotSupportedError mid-pattern (0089).
 */
function seam(fader: GainNode, step: PlayerStep, at: number, ends: number, slotSecs: number): void {
  const room = PLAYER_FADE_SECS / slotSecs;
  const hold = step.gate >= 3 * room && step.gate <= 1 - room ? step.gate : 1;
  if (hold >= 1) {
    fade(fader, "in", at);
    fade(fader, "out", ends);
    return;
  }
  for (let repeat = 0; repeat < step.repeats; repeat++) {
    const opens = at + repeat * slotSecs;
    fade(fader, "in", opens);
    fade(fader, "out", opens + hold * slotSecs - PLAYER_FADE_SECS);
  }
}

export type DeckPlayer = {
  /** Hold this pattern, or drop it. Heard from the next `begin`, never in the middle of a pass. */
  set(spec: PlayerSpec | null): void;
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
   * click the whole module is faded to avoid.
   */
  rearm(from: number): void;
  /** Whether a pass is running. */
  running(): boolean;
  /** Where the deck is reading at `at`, in buffer seconds, or null with no pass running. */
  position(at: number): number | null;
  /** Stop and release every source of the pass, sounding or still ahead of the clock. */
  stop(): void;
};

/**
 * One pass is one closure over the pattern, the grid it is laid against and the queue of steps it
 * has built — splitting it would hand those three between helpers with one caller each, which is
 * how the invariant that a step's stop and its place in the queue move together gets broken. See
 * docs/decisions/0007-reviewed-oversized-functions.md.
 *
 * `input` is what a source connects into — the deck chain's own input, so a jumping deck's signal
 * goes through exactly the chain every other pass goes through. `bindSource` is the chain writing
 * speed and pitch onto each source the transport builds, and `rate` is the buffer seconds per wall
 * second those two come to — read again for every step, so the pattern follows the knob (0031).
 */
// oxlint-disable-next-line max-lines-per-function
export function createDeckPlayer(
  ctx: BaseAudioContext,
  input: AudioNode,
  bindSource: (source: AudioBufferSourceNode) => void,
  rate: () => number,
): DeckPlayer {
  let spec: PlayerSpec | null = null;
  /**
   * The pattern's cursor for the pass being played, drawn again from the seed by every `begin`.
   * That is what makes two plays of one session the same performance with nothing durable
   * carrying a cursor (0089).
   */
  let walk: (() => PlayerStep) | null = null;
  let queue: Scheduled[] = [];
  /** What the pass is laid against: fixed at `begin` and read by every arming after it. */
  let running: { buffer: AudioBuffer; grid: Grid } | null = null;
  /** The audio time the last armed step ends, which is when the next one starts. */
  let queueEnd = 0;

  /** Let go of one step's nodes. Called when it ends, and when the pass is torn down. */
  function release(step: Scheduled): void {
    const at = queue.indexOf(step);
    if (at >= 0) queue.splice(at, 1);
    step.source.disconnect();
    step.fader.disconnect();
  }

  /**
   * Build and schedule one step: a source looping exactly its slot, opened and closed along the
   * fade law, started at `at` and stopped a seam past its end. Returns when the next step begins.
   */
  function armStep(step: PlayerStep, at: number): number {
    if (running === null) throw new Error("a player step with no pass to belong to");
    const { buffer, grid } = running;
    const stepRate = rate();
    const slotSecs = grid.slot / stepRate;
    const ends = at + step.repeats * slotSecs;
    const from = grid.in + step.slot * grid.slot;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const fader = ctx.createGain();
    // Silent until its own fade opens it: a value curve writes absolute values, so what the level
    // is beforehand has to be what that curve begins at.
    fader.gain.value = 0;
    source.connect(fader).connect(input);
    source.loop = true;
    source.loopStart = from;
    source.loopEnd = from + grid.slot;

    seam(fader, step, at, ends, slotSecs);

    const scheduled: Scheduled = { source, fader, at, ends, slot: step.slot, rate: stepRate };
    // Its end is asked for at the moment it is built, so the `ended` that follows is this step
    // finishing and never the transport running out — which is the deck's own fact, not a step's.
    source.addEventListener(
      "ended",
      () => {
        release(scheduled);
      },
      { once: true },
    );
    bindSource(source);
    source.start(at, from);
    source.stop(ends + PLAYER_FADE_SECS);
    queue.push(scheduled);
    return ends;
  }

  function arm(): void {
    if (running === null || walk === null) return;
    const now = ctx.currentTime;
    // Let go of the steps that have finished — through `release`, which is the one teardown: a
    // step dropped from this list without being disconnected is still wired into the chain, and
    // offline nothing delivers an `ended` event until the render is over, so the prune is the
    // only thing that reaches them. Over a copy, because `release` splices the list it walks.
    for (const step of queue.filter((entry) => entry.ends + PLAYER_FADE_SECS < now)) release(step);
    // A tick that arrives late leaves the cursor behind the clock — a stalled main thread, or a
    // background tab whose interval Chrome throttles to one a minute. Every step armed from there
    // would start and stop in the same instant, and the cursor could never catch up, so the deck
    // would read as playing and be silent for good. It skips to the clock instead: the steps
    // nobody could have heard are not laid down at all. Offline this is never taken — the pump's
    // stops are exact — so a render and a live pass still lay down the same pattern (0068).
    queueEnd = Math.max(queueEnd, now + LOOKAHEAD_SECS);
    const horizon = now + AUTOMATION_HORIZON_SECS;
    for (let armed = 0; queueEnd <= horizon && armed < MAX_PLAYER_STEPS; armed++) {
      queueEnd = armStep(walk(), queueEnd);
    }
  }

  /** Every step still ahead of `from`, stopped and let go — what a re-arm replaces. */
  function dropAfter(from: number): void {
    for (const step of queue.filter((entry) => entry.at > from)) {
      step.source.stop();
      release(step);
    }
  }

  return {
    set: (next) => {
      spec = next;
    },
    held: () => spec,
    running: () => running !== null,

    begin: (buffer, loop, at, startRate) => {
      const grid = gridOf(loop, startRate);
      if (spec === null || grid === null) return null;
      running = { buffer, grid };
      walk = playerWalk(spec);
      queueEnd = armStep(walk(), at);
      arm();
      // The one plan a jumping pass posts, and it is the loop's own grid rather than any step's:
      // a jumping deck does not come round, but the length that would have brought it round is
      // still the thing `deck.looped` counts, and a boundary every sixteenth would both change
      // what that number means and flood the ring. Nothing here is a position — a jumping deck
      // answers `peek` off its schedule (0089) — so this plan is a metronome and nothing else.
      return {
        startTime: at,
        offset: loopIn(loop),
        period: gridSpan(grid),
        rate: startRate,
        phase: 0,
      };
    },

    arm,

    rearm: (from) => {
      if (running === null) return;
      dropAfter(from);
      // The cursor goes back to the end of what is left standing, so the replacement steps butt
      // up against the last one still sounding and the seam between them is faded as any other.
      queueEnd = queue.reduce((end, step) => Math.max(end, step.ends), from);
      arm();
    },

    position: (at) => {
      if (running === null) return null;
      const { grid } = running;
      // The step the clock is inside, or the first one still ahead of it — inside the lookahead
      // nothing has sounded yet, and the pass begins at the top of that step.
      let step: Scheduled | null = null;
      for (const scheduled of queue) {
        if (step === null || scheduled.at <= at) step = scheduled;
      }
      if (step === null) return null;
      // Its own rate, not the pass's: a speed change moves the steps armed after it and leaves
      // the ones already laid down reading at the rate their window was measured in.
      const into = (at - step.at) * step.rate;
      return grid.in + step.slot * grid.slot + (into > 0 ? into % grid.slot : 0);
    },

    stop: () => {
      const stopping = queue;
      queue = [];
      running = null;
      walk = null;
      for (const step of stopping) {
        // Every one of these has been started, which is the only thing `stop` refuses; one that
        // has already run out takes it as the no-op it is. What matters is the steps still ahead
        // of the clock: those are exactly the ones that must not sound.
        step.source.stop();
        step.source.disconnect();
        step.fader.disconnect();
      }
    },
  };
}
