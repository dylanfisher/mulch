/**
 * @role The player as a transport: the sources one pass of a pattern is made of, each looping its
 *   own slot of the deck's loop, started ahead of the clock and seamed with the equal-power fade.
 *   It moves where a deck reads from, which is the transport's and never an effect's (0089).
 * @instead The pattern itself — what a seed unfolds into → src/lib/player.ts, which knows what a
 *   burst's seconds are and nothing else about the clock. The deck that owns this →
 *   src/audio/deck.ts: it holds the buffer, the loop and the plan, and hands all three over here.
 */
// Over the 400-line cap by one section: the shared jump clock (0097) reaches four places in the
// one pass closure below, and every line of it is beside the arming it moves. The alternative is
// a file named for half a transport. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { fadeCurve } from "@/lib/crossfade";
import {
  PLAYER_FADE_SECS,
  PLAYER_MIN_SLOT_SECS,
  PLAYER_SLOTS,
  syncedFrom,
  type PlayerSpec,
  type PlayerVoice,
} from "@/lib/player";
import type { PlayerStep } from "@/lib/playerWalk";
import type { SongPart, SongPartId } from "@/lib/playerSong";
import { playerWalk } from "@/lib/playerWalk";
import type { PlayPlan } from "@/lib/timeline";
import type { PlayerPeek } from "./deckPeek";
import { AUTOMATION_HORIZON_SECS, LOOKAHEAD_SECS, MAX_PLAYER_STEPS } from "./transport";
import type { Loop } from "@/lib/timeline";

/** The two shapes a step's own fader opens and closes along (0089, src/lib/crossfade.ts). */
const FADE_IN = fadeCurve("in");
const FADE_OUT = fadeCurve("out");

/** A range of buffer seconds — the deck's loop, or the one slot of it a step is repeating. */
type Span = Loop;

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

/**
 * The seconds one step occupies: the rate it reads at, how long one burst of it sounds, when the
 * whole step ends and when the step after it begins. The player's own clock, and no longer the
 * grid's at all: only `rest` is measured in slots now, so a pattern's rhythm follows the loop
 * while the grain inside it does not (0119, P67).
 */
function windowOf(
  step: PlayerStep,
  grid: Grid,
  deckRate: number,
  at: number,
): { rate: number; burstSecs: number; ends: number; next: number } {
  // The deck's own rate times the ratio this step's hold is on: a step that let go of the hold
  // reads at a rate of its own, which is what its rest is still measured in the seconds of.
  const rate = deckRate * step.rate;
  const slotSecs = grid.slot / rate;
  // The burst is already wall seconds and is neither scaled by the grid nor divided by the rate:
  // a grain sounds for as long as it says, on any loop and at any speed, and the rate then decides
  // only how much buffer it gets through (0119). The floor is the shortest window that can carry
  // its fades — the same floor a loop too short to jump around is refused by. Below it two seams
  // overlap, which is a NotSupportedError (0089). `PLAYER_BURST_MIN` is now this same number, so
  // the clamp is unreachable from a valid spec and kept anyway: it is what keeps one arming ahead
  // of the next — `PLAYER_MIN_SLOT_SECS` per repeat is what makes `MAX_PLAYER_STEPS` cover the
  // re-arm cadence, and that has to hold whatever the knob's own floor becomes.
  const burstSecs = Math.max(step.burst, PLAYER_MIN_SLOT_SECS);
  const ends = at + step.repeats * burstSecs;
  return { rate, burstSecs, ends, next: ends + step.rest * slotSecs };
}

/** One step the transport has going: its source, the fader its seams are on, and where it reads. */
type Scheduled = {
  source: AudioBufferSourceNode;
  fader: GainNode;
  at: number;
  ends: number;
  /**
   * When this step's own business is over — its end, plus whatever rest the pattern takes. Held
   * unsynced: the clock the next step waits for is whichever one is held when that step is armed,
   * so a clock turned down or off does not leave the tail waiting out the old one's tick (0097).
   */
  next: number;
  slot: number;
  /** The buffer seconds its source loops, from the slot it starts in — the burst, at its rate. */
  span: number;
  /** The rate this step was armed at. Read per step, not per pass: a speed change moves the
   *  ones armed after it and must not be applied to a window laid out for another rate. */
  rate: number;
  /** What the pattern was standing in when this step was drawn — the part's own id and the voice
   *  it was drawn under, both carried over from the step so a read at the clock answers off the
   *  entry the clock is inside rather than off a cursor seconds ahead of it (0157). */
  part: SongPartId | null;
  voice: PlayerVoice | null;
  /** And the arrangement it was walked in, carried on for the same reason: a drawn song is a list
   *  nothing holds, so the entry the clock is inside is the only place one can be read (0158). */
  song: readonly SongPart[] | null;
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
function seam(
  fader: GainNode,
  step: PlayerStep,
  at: number,
  ends: number,
  burstSecs: number,
): void {
  const room = PLAYER_FADE_SECS / burstSecs;
  // The fraction of a repeat that sounds — never `hold`, which is the spec's count of jumps on
  // one read rate and would name two things in this one file (P82).
  const sounds = step.gate >= 3 * room && step.gate <= 1 - room ? step.gate : 1;
  if (sounds >= 1) {
    fade(fader, "in", at);
    fade(fader, "out", ends);
    return;
  }
  for (let repeat = 0; repeat < step.repeats; repeat++) {
    const opens = at + repeat * burstSecs;
    fade(fader, "in", opens);
    fade(fader, "out", opens + sounds * burstSecs - PLAYER_FADE_SECS);
  }
}

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
  /** Whether a pass is running. */
  running(): boolean;
  /** Where the deck is reading at `at`, in buffer seconds, or null with no pass running. */
  position(at: number): number | null;
  /**
   * What the pattern is standing in at `at`, written into `out`: which part of its song the step
   * the clock is inside was drawn under, and the numbers it was drawn from. Nulls with no pass
   * running. Written in place because this is the per-frame read (0070, 0157).
   */
  peek(at: number, out: PlayerPeek): void;
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
   * The clock this pass's next step begins on, or null for a deck keeping its own time. Held per
   * voice because a voice reaches nothing above itself: what makes it one clock is that the host
   * hands every voice the same number, not that they share a variable (0097).
   */
  let sync: number | null = null;
  /**
   * The pattern's cursor for the pass being played, drawn again from the seed by every `begin`.
   * That is what makes two plays of one session the same performance with nothing durable
   * carrying a cursor (0089).
   */
  let walk: (() => PlayerStep) | null = null;
  /**
   * How many steps of this pass the walk has drawn. The cursor as a count rather than a closure,
   * so a re-arm can wind a fresh walk forward to exactly here and re-derive the tail instead of
   * continuing a walk that was built from a spec nobody is holding any more (P67).
   */
  let laid = 0;
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
  // One step's whole arming: the window, the source, its loop, its seams and the entry the queue
  // keeps it as — over the cap by the two fields a step now carries about the song it was drawn
  // under, and every line of it is one of the things a step is. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  function armStep(step: PlayerStep, at: number): number {
    if (running === null) throw new Error("a player step with no pass to belong to");
    const { buffer, grid } = running;
    const { rate: stepRate, burstSecs, ends, next } = windowOf(step, grid, rate(), at);
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
    // A burst longer than the slot reads on through the slots after it, and never past the loop's
    // own end: a jump is a move inside the loop's grid (0089). Clamped there it wraps sooner, and
    // sounds for `burstSecs` either way.
    const span = Math.min(burstSecs * stepRate, grid.in + gridSpan(grid) - from);
    source.loopEnd = from + span;

    seam(fader, step, at, ends, burstSecs);

    const scheduled: Scheduled = {
      source,
      fader,
      at,
      ends,
      next,
      slot: step.slot,
      span,
      rate: stepRate,
      part: step.part,
      voice: step.voice,
      song: step.song,
    };
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
    // After the chain wrote the deck's own speed on: a held rate is a ratio of it, not a swap (P67).
    source.playbackRate.value *= step.rate;
    source.start(at, from);
    source.stop(ends + PLAYER_FADE_SECS);
    queue.push(scheduled);
    return syncedFrom(scheduled.next, sync);
  }

  /** One step off the walk, counted — the one place the cursor moves. */
  function draw(): PlayerStep {
    if (walk === null) throw new Error("a player draw with no walk to draw from");
    laid++;
    return walk();
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
    // Onto the shared clock either way, so a pass that skipped rejoins the grid rather than
    // free-running from wherever the stall left it (0097).
    queueEnd = syncedFrom(Math.max(queueEnd, now + LOOKAHEAD_SECS), sync);
    const horizon = now + AUTOMATION_HORIZON_SECS;
    for (let armed = 0; queueEnd <= horizon && armed < MAX_PLAYER_STEPS; armed++) {
      queueEnd = armStep(draw(), queueEnd);
    }
  }

  /**
   * The step the clock is inside, or the first one still ahead of it — inside the lookahead
   * nothing has sounded yet, and the pass begins at the top of that step. The one answer to "which
   * step is this", asked by the position the surfaces paint from and by the part they light (0157).
   */
  function standingAt(at: number): Scheduled | null {
    let step: Scheduled | null = null;
    for (const scheduled of queue) {
      if (step === null || scheduled.at <= at) step = scheduled;
    }
    return step;
  }

  /** Every step still ahead of `from`, stopped and let go. Answers how many, so the walk's own
   *  cursor can be wound back over exactly the steps a re-arm is about to replace. */
  function dropAfter(from: number): number {
    const dropping = queue.filter((entry) => entry.at > from);
    for (const step of dropping) {
      step.source.stop();
      release(step);
    }
    return dropping.length;
  }

  /**
   * Drop every step still ahead of `from` and lay the pattern down again from there. The walk is
   * wound back over exactly the steps that were dropped and drawn again from the seed under
   * whatever spec is held now, so what is re-derived is the tail of the pattern and never a
   * wall-clock cursor — which is what keeps two renders of one session the same file (P67, 0068).
   */
  function rearm(from: number): void {
    if (running === null || spec === null) return;
    laid -= dropAfter(from);
    walk = playerWalk(spec, laid);
    // The cursor goes back to the end of what is left standing, so the replacement steps butt
    // up against the last one still sounding and the seam between them is faded as any other —
    // and onto the clock held now rather than the one those steps were armed under, so a clock
    // turned down or off does not leave the tail waiting out the old one's tick (0097).
    queueEnd = syncedFrom(
      queue.reduce((end, step) => Math.max(end, step.next), from),
      sync,
    );
    arm();
  }

  return {
    set: (next) => {
      const moved = spec !== null && next !== null;
      spec = next;
      // A knob is heard where it is turned: the steps past the lookahead are cancelled and the
      // tail derived again. The step already sounding keeps its window and its seams, so a move
      // lands at the end of the burst being played rather than at the end of the arming horizon
      // (0096). Switching the module on or off is the
      // caller's: that is a transport change and it restarts the deck (0089).
      if (moved) rearm(ctx.currentTime + LOOKAHEAD_SECS);
    },
    setSync: (next) => {
      if (next === sync) return;
      sync = next;
      // Heard where it was turned, by the road a moved number takes: the steps past the lookahead
      // are dropped and laid down again on the clock being held now (0096, 0097).
      if (running !== null && spec !== null) rearm(ctx.currentTime + LOOKAHEAD_SECS);
    },
    held: () => spec,
    running: () => running !== null,

    begin: (buffer, loop, at, startRate) => {
      const grid = gridOf(loop, startRate);
      if (spec === null || grid === null) return null;
      running = { buffer, grid };
      walk = playerWalk(spec);
      laid = 0;
      queueEnd = armStep(draw(), at);
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

    rearm,

    position: (at) => {
      if (running === null) return null;
      const { grid } = running;
      const step = standingAt(at);
      if (step === null) return null;
      // Its own rate, not the pass's: a speed change moves the steps armed after it and leaves
      // the ones already laid down reading at the rate their window was measured in. Held at the
      // step's own end — between two steps the pattern is resting and the read head is where the
      // burst left it — and wrapped on the burst's span, which is the slot's only at a burst
      // of one (P67).
      const into = Math.min((at - step.at) * step.rate, (step.ends - step.at) * step.rate);
      return grid.in + step.slot * grid.slot + (into > 0 ? into % step.span : 0);
    },

    peek: (at, out) => {
      const step = running === null ? null : standingAt(at);
      out.part = step?.part ?? null;
      out.voice = step?.voice ?? null;
      out.song = step?.song ?? null;
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
