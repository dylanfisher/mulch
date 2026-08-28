/**
 * @role The player as a transport: the sources one pass of a pattern is made of, each looping its
 *   own slot of the deck's loop, started ahead of the clock and seamed with the equal-power fade.
 *   It moves where a deck reads from, which is the transport's and never an effect's (0089).
 * @instead The pattern itself — what a seed unfolds into → src/lib/player.ts, which knows what a
 *   burst's seconds are and nothing else about the clock. The deck that owns this →
 *   src/audio/deck.ts: it holds the buffer, the loop and the plan, and hands all three over here.
 *   Where the seams of one step fall, and the shapes they are drawn along →
 *   src/audio/playerSeam.ts.
 */
// Over the 400-line cap by one section: the shared jump clock (0097) reaches four places in the
// one pass closure below, and every line of it is beside the arming it moves. The alternative is
// a file named for half a transport. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { PLAYER_FADE_SECS, PLAYER_MIN_SLOT_SECS, repeatSpans, type PlayerSpec } from "@/lib/player";
import { bedBounds, bedWrap } from "@/lib/playerBed";
import { seam } from "./playerSeam";
import { syncedFrom } from "@/lib/playerClock";
import { songOnset, type SongPartId } from "@/lib/playerSong";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import type { PlayerStep } from "@/lib/playerWalk";
import { playerWalk } from "@/lib/playerWalk";
import type { PlayPlan } from "@/lib/timeline";
import type { PlayerPeek } from "./deckPeek";
import { AUTOMATION_HORIZON_SECS, LOOKAHEAD_SECS, MAX_PLAYER_STEPS } from "./transport";
import type { Loop } from "@/lib/timeline";

/** A range of buffer seconds — the deck's loop, or the one slot of it a step is repeating. */
type Span = Loop;

/**
 * The grid a pattern jumps around: where it starts and how long one slot is, both in buffer
 * seconds, and how far through the source the loop may be moved, counted in those slots — the one
 * thing here the buffer answers for rather than the loop (0183, 0185).
 */
type Grid = { in: number; slot: number; from: number; to: number };

/** The loop's own start, for the plan a jumping pass posts. Never called with a null loop. */
const loopIn = (loop: Span | null): number => loop?.in ?? 0;

/** The whole grid's length: the loop, in the buffer seconds the reporter counts a cycle of. */
const gridSpan = (grid: Grid): number => grid.slot * PLAYER_SLOTS;

/**
 * Where one slot of that grid begins, in buffer seconds. Its own name at the third caller — the
 * source that reads a slot and the two cursors that report one (principle 3) — and since 0183 the
 * one place a ground becomes a position: the walk carries an unbounded offset, this folds it onto
 * the ground the buffer actually holds and moves the slot by that many sixteenths of the loop
 * (0185). Every read of a *sounding* jumping deck comes through here, so the loop and the playhead
 * cannot disagree about which ground the yard is on. The picture has its own route to the same
 * answer, on bounds it folds per frame rather than once per pass (`bedGround`, src/lib/playerBed.ts).
 */
const slotStart = (grid: Grid, slot: number, bed: number): number =>
  bedStart(grid, bed) + slot * grid.slot;

/**
 * The buffer second the bed the pattern is standing on begins at — the loop's own start, moved by
 * the walk's offset in the loop's own sixteenths. A slot of source and not a whole loop-length
 * since the crawl, so the bed a burst is clamped inside is still one loop long but need not begin
 * on a boundary of them (`PLAYER_BED_DISTANCE_MAX`, src/lib/playerBed.ts).
 */
const bedStart = (grid: Grid, bed: number): number =>
  grid.in + bedWrap(bed, grid.from, grid.to) * grid.slot;

/**
 * Whether a loop of `secs` real seconds divides into slots long enough to carry a seam — the whole
 * of what makes a yard *holding* a pattern a yard that is actually jumping. Exported because the
 * drift asks the same question: a module this plays straight past draws no row
 * (docs/decisions/0159-a-song-is-the-pictures-one-stepped-row.md), and the rule said twice is a
 * picture that can disagree with the sound (principle 1).
 */
export const playerJumps = (secs: number): boolean => secs / PLAYER_SLOTS >= PLAYER_MIN_SLOT_SECS;

/**
 * The grid this loop divides into, or null when its slots are too short to carry a seam.
 *
 * `duration` is the buffer's, and is here for the ground alone: how many of the loop's own
 * sixteenths of source lie either side of it is a fact about the file, so it is answered once per
 * pass at the one place holding both (0183, 0185). A loop with no room for a single sixteenth
 * either side answers one ground and never leaves it — this module before the ground could move.
 * A loop with no room for a whole *bed* still crawls, which is the crawl's whole point.
 */
function gridOf(loop: Span | null, rate: number, duration: number): Grid | null {
  if (loop === null || !playerJumps((loop.out - loop.in) / rate)) return null;
  const span = loop.out - loop.in;
  return { in: loop.in, slot: span / PLAYER_SLOTS, ...bedBounds(loop.in, span, duration) };
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
): { rates: number[]; burstSecs: number; spans: number[]; ends: number; next: number } {
  // The deck's own rate times the ratio each repeat of this step is climbed to: a step that let go
  // of the hold reads at a rate of its own, and a step that climbs reads at one per repeat (0167).
  const rates = step.rates.map((ratio) => deckRate * ratio);
  // The landing's own first rung is what the rest is measured in the seconds of, and what the
  // source's loop window is cut at: the climb moves how fast the region is read and never which
  // region it is, so everything about *where* this landing lives is the rung it landed on.
  const rate = rates[0] ?? deckRate;
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
  // Where the repeats end is the sum of their own lengths rather than the count times one of them:
  // they stand equal only until the ratchet shrinks them, and how long each of them is belongs to
  // the module rather than to the transport, because the picture runs its row on the same sum
  // (`repeatSpans`, src/lib/player.ts — P118).
  const spans = repeatSpans(burstSecs, step.repeats, step.ratchet);
  const ends = spans.reduce((end, secs) => end + secs, at);
  return { rates, burstSecs, spans, ends, next: ends + step.rest * slotSecs };
}

/**
 * How much buffer one landing has read `secs` into itself: every repeat it has finished, each at
 * the rung it was climbed to, plus the part of the one it is inside.
 *
 * A sum over the windows the landing is already cut into rather than one multiplication, and that
 * is what P124 costs the cursor: a rate that moves between repeats means the read head is no
 * longer a linear function of the wall clock across a whole landing (0167). It stays exact
 * arithmetic and never an integral, because the ladder is stepped — inside one repeat the rate
 * does stand still.
 *
 * `spans` sums to the landing's own length, so a call at exactly its end walks every repeat and
 * lands on the total; the caller clamps there rather than past it.
 */
function readInto(step: Scheduled, secs: number): number {
  let read = 0;
  let left = Math.max(0, secs);
  // An indexed loop and no iterator: this runs once per deck per frame, and `entries()` allocates
  // one iterator per call and one pair per repeat — up to 65 objects a frame on a landing at
  // `PLAYER_REPEATS_MAX` (0070). The two fallbacks below are unreachable: `armStep` refuses a
  // landing whose ladder and windows are not the same length, which is where that can be said
  // loudly (principle 5).
  for (let repeat = 0; repeat < step.spans.length; repeat++) {
    const span = step.spans[repeat] ?? 0;
    const rate = step.rates[repeat] ?? 0;
    if (left <= span) return read + left * rate;
    read += span * rate;
    left -= span;
  }
  return read;
}

/** One step the transport has going: its source, the fader its seams are on, and where it reads. */
type Scheduled = {
  source: AudioBufferSourceNode;
  fader: GainNode;
  /**
   * The second, quieter source this landing threw, or null where it threw none — held on the
   * landing's own entry and never as an entry of its own. That is the whole of what a spark costs
   * the queue: `position` scans this list for the latest entry the clock is at or past, so a
   * companion sitting in it would win that scan and the deck's read head would follow the spark
   * instead of the landing, which is where the pattern actually is (P123).
   *
   * Its level gain is held here too, and for the reason the source is: what a step is made of is
   * what a step has to let go of, and a node dropped from this list without being disconnected is
   * still wired into the chain.
   */
  spark: {
    source: AudioBufferSourceNode;
    level: GainNode;
    /** Where it reads and the window it loops there, so the cursor below can answer off it. */
    slot: number;
    span: number;
    /** And when it began, which is the one instant it does not share with the landing (0175). */
    at: number;
  } | null;
  at: number;
  ends: number;
  /**
   * When this step's own business is over — its end, plus whatever rest the pattern takes. Held
   * unsynced: the clock the next step waits for is whichever one is held when that step is armed,
   * so a clock turned down or off does not leave the tail waiting out the old one's tick (0097).
   */
  next: number;
  /** The buffer seconds its source loops, from the slot it starts in — the burst, at its rate. */
  span: number;
  /** The rate each of this step's repeats was armed at, and how long each of those repeats is.
   *  Read per step, not per pass: a speed change moves the ones armed after it and must not be
   *  applied to a window laid out for another rate. A pair rather than one number since P124,
   *  because the cursor now sums the repeats a landing has finished at the rungs they were read at
   *  rather than multiplying the whole landing by one rate (0167). Both are exactly `repeats`
   *  long, and `spans` sums to `ends - at`. */
  rates: readonly number[];
  spans: readonly number[];
  /**
   * The very step this entry was armed from, held rather than copied out of. Where it reads, which
   * way round, what it was standing in and the whole of what it was drawn as — a read at the clock
   * answers off the entry the clock is inside rather than off a cursor seconds ahead of it (0157,
   * 0158), and it answers with everything the step carries rather than the four fields this entry
   * used to keep a second copy of (principle 1, 0180). Held until `release`, which the queue's own
   * bound is what bounds.
   */
  step: PlayerStep;
  /**
   * Which landing of this pass it is, counting from the first one the pass laid down — `laid` at
   * the moment it was drawn. Handed to `armStep` rather than read off `laid` there, because both
   * call sites pass `draw()` straight in and a read beside it would be leaning on evaluation
   * order. It is what lets a surface line its own walk of the same spec up with the one sounding.
   */
  ordinal: number;
};

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
  /**
   * Wind this pass to the first jump of one part of the song being held and lay the pattern down
   * from there, answering whether it did. A transport cue and never an edit: nothing durable moves,
   * the seed and the spec are the ones already held, and pressing it twice hears the same thing
   * twice — which is what makes it a seek's sibling rather than a `set`'s (0041, 0181).
   *
   * False is the one refusal it makes for itself: no pass to wind, or a part the **written** list
   * does not hold. The caller's own refusals — a pattern nobody holds, and a song the pattern is
   * drawing for itself, whose run is not the written list at all and which no press can name a part
   * of — are made where the durable spec is, and this reads that list on the caller's word (0158).
   */
  // A property rather than a method, for the reason `setSync` above is one: the deck hands this
  // very function on as its own pass-through (src/audio/deck.ts).
  cue: (part: SongPartId) => boolean;
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
  /**
   * The deck's own audio backwards, and the buffer it was made from. There is no negative rate on
   * an `AudioBufferSourceNode`, so a landing that reads its slot in reverse reads a reversed copy
   * of the whole buffer at the mirrored offset — one copy per deck, minted at the first reversed
   * landing rather than at every load, and let go of the moment the deck is playing something
   * else. Durable nowhere: audio nobody imported is a crop's business, and a reversed read is not
   * a crop (0047, P121).
   */
  let mirrored: { of: AudioBuffer; buffer: AudioBuffer } | null = null;

  /** That copy, made if this is the first reversed landing over this buffer. Every channel
   *  reversed whole, which is what makes the mirror below one subtraction rather than a per-slot
   *  cut: the slot arithmetic is the same buffer's, read from the other end. */
  function mirrorOf(buffer: AudioBuffer): AudioBuffer {
    if (mirrored !== null && mirrored.of === buffer) return mirrored.buffer;
    const copy = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const samples = buffer.getChannelData(channel).slice();
      samples.reverse();
      copy.copyToChannel(samples, channel);
    }
    mirrored = { of: buffer, buffer: copy };
    return copy;
  }

  /** Let go of one step's nodes. Called when it ends, and when the pass is torn down. */
  function release(step: Scheduled): void {
    const at = queue.indexOf(step);
    if (at >= 0) queue.splice(at, 1);
    step.source.disconnect();
    step.fader.disconnect();
    step.spark?.source.disconnect();
    step.spark?.level.disconnect();
  }

  /**
   * Build and schedule one step: a source looping exactly its slot, opened and closed along the
   * fade law, started at `at` and stopped a seam past its end. Returns when the next step begins.
   */
  // One step's whole arming: the window, the source, its loop, its seams and the entry the queue
  // keeps it as, and every line of it is one of the things a step is. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  function armStep(step: PlayerStep, ordinal: number, at: number): number {
    if (running === null) throw new Error("a player step with no pass to belong to");
    const { buffer, grid } = running;
    const { rates, burstSecs, spans, ends, next } = windowOf(step, grid, rate(), at);
    // The rung this landing was let go onto: what its loop window is cut at, and what its first
    // repeat reads at. Every repeat after it is a step of the climb away (0167).
    const stepRate = rates[0] ?? rate();
    // One rung per repeat and one window per repeat, or the cursor and the graph are walking two
    // different landings. Structural — the walk builds both off one count — and said here because
    // this is the last place before a frame reads it, and a frame may not throw (0070).
    if (rates.length !== spans.length)
      throw new Error(`a landing with ${rates.length} rungs over ${spans.length} repeats`);
    /**
     * The ladder written onto one source's own rate: its first rung as the value the chain's own
     * speed is multiplied by, and every rung after it as a step at that repeat's boundary. Stepped
     * and never ramped, because a ladder is a ladder — what is between two rungs is not a rate this
     * module may read at, and a stepped automation is what keeps the cursor a sum over the repeats
     * rather than an integral over a slope (0167).
     *
     * `deckSpeed` is what the chain wrote on before this ran, so a held rate goes on being a ratio
     * of the deck's own speed and never a swap (P67). A live speed change cancels what is scheduled
     * here on whichever source the chain is holding, which is the last one armed — usually a step
     * still ahead of the clock, and one a `rearm` then drops and lays down again. Where the landing
     * being played is itself the last one armed, that cancel takes its whole remaining ladder and
     * the queue entry the cursor reads goes on climbing one the graph is no longer playing
     * (`write`, src/audio/chain.ts; docs/plan.md §4).
     */
    const climb = (param: AudioParam, deckSpeed: number): void => {
      // The step's own ratios rather than the absolute rates above them: what goes on a source is
      // a ratio of the speed the chain wrote, while `rates` already has the deck's own rate in it
      // and is what the windows are measured with.
      param.value = deckSpeed * (step.rates[0] ?? 1);
      let boundary = at;
      for (let repeat = 1; repeat < step.rates.length; repeat++) {
        boundary += spans[repeat - 1] ?? 0;
        const rung = step.rates[repeat] ?? 1;
        if (rung !== step.rates[repeat - 1]) param.setValueAtTime(deckSpeed * rung, boundary);
      }
    };

    /**
     * One looping source over one slot of the grid, wired into `into`, started with the step and
     * stopped a seam past its end. The whole of what reading a region of the loop is — and the one
     * thing a spark and the landing that threw it differ by, which is why it is a function of the
     * slot rather than two copies of the arithmetic (P123, principle 1).
     */
    const readSlot = (
      slot: number,
      into: AudioNode,
      begins: number,
      tune: (source: AudioBufferSourceNode) => void,
    ): { source: AudioBufferSourceNode; span: number } => {
      // The bed resolved once for the two things that need it — where the slot begins and where
      // its own bed ends — rather than folded twice per source (principle 1, and one modulo).
      const ground = bedStart(grid, step.bed);
      const from = ground + slot * grid.slot;
      const source = ctx.createBufferSource();
      // The deck's audio, or the same audio backwards. Nothing else about a reversed landing
      // differs — the same slot, the same window, the same seams — because the copy is the whole
      // buffer and so the grid still divides it (P121).
      source.buffer = step.reversed ? mirrorOf(buffer) : buffer;
      source.connect(into);
      source.loop = true;
      // A burst longer than the slot reads on through the slots after it, and never past the end
      // of the bed it is in: a jump is a move inside the loop's grid (0089), and since 0183 that
      // grid sits on one bed of the source at a time. Clamped there it wraps sooner, and sounds for
      // `burstSecs` either way. The bed's own end and not the loop's, or a landing on the last slot
      // of a moved loop would read on into whatever the file holds after it — audio the pattern
      // never chose, which is the one thing the clamp exists to refuse.
      //
      // The burst, and never a ratcheted repeat's own length: one looping source has one period, so
      // what the ratchet moves is the windows the landing is cut and ended on and not the grain
      // inside them (0161). A ratchet heard in the grain itself is a source per repeat, which is a
      // node count and a question of its own (docs/plan.md, the rung walk's step).
      const span = Math.min(burstSecs * stepRate, ground + gridSpan(grid) - from);
      // Where the source actually reads: the slot itself, or its mirror in the reversed copy. A
      // point `t` of the buffer is `duration - t` of the copy, so the window `[from, from + span)`
      // becomes `[duration - from - span, duration - from)` — the same audio, entered at the end
      // and walked to the start, which is the whole of what reading a slot backwards is. The head
      // starts at the window's own beginning either way, and the loop is the same length, so every
      // other number this step is made of is untouched (P121).
      //
      // Floored at zero, and it has to be: the forward path never subtracts, while this one takes
      // `from` and `span` — two independently rounded quantities whose sum is only nominally inside
      // the buffer — away from the duration. A loop ending on the clip's own end and starting after
      // zero recomputes its grid a couple of ulps past `loop.out`, so the last slot of it mirrors to
      // a few femtoseconds below zero, which `start` answers with a `RangeError` and `loopStart`
      // answers by ignoring the loop points and repeating the whole reversed clip.
      const reads = step.reversed ? Math.max(0, buffer.duration - from - span) : from;
      source.loopStart = reads;
      source.loopEnd = reads + span;
      tune(source);
      // `begins` is the landing's own `at` for the landing, and a fraction of its window later for
      // a spark held back — the one instant of a companion that is not the landing's. Its stop is
      // still the landing's, which is what keeps a delayed spark inside the entry it rides (0175).
      source.start(begins, reads);
      source.stop(ends + PLAYER_FADE_SECS);
      return { source, span };
    };

    /** The speed the chain wrote onto the landing's source, captured so the companion below can
     *  climb the same ladder from the same base — copied off the landing rather than bound, for
     *  the reason its pitch is (P123). */
    let deckSpeed = 1;
    const fader = ctx.createGain();
    // Silent until its own fade opens it: a value curve writes absolute values, so what the level
    // is beforehand has to be what that curve begins at.
    fader.gain.value = 0;
    fader.connect(input);
    const { source, span } = readSlot(step.slot, fader, at, (node) => {
      bindSource(node);
      // After the chain wrote the deck's own speed on: a held rate is a ratio of it, not a swap
      // (P67), and a landing that climbs is one such ratio per repeat rather than one for the
      // whole of it (0167).
      deckSpeed = node.playbackRate.value;
      climb(node.playbackRate, deckSpeed);
    });
    /**
     * The companion, where this landing threw one: a second source at another slot, through a gain
     * held at its level and into the landing's *own* fader. Everything a spark has that is not its
     * slot, its level and how far into the landing it begins it takes from the landing — the same
     * window, the same count, the same stop, the same direction, and every seam but the one it
     * opens on — because it hangs under the fader those seams are written on
     * (P123). It is held here rather than pushed onto the queue as an entry of its own: `position`
     * answers off the latest entry the clock is at or past, and a companion in that list would win
     * the scan and walk the cursor away from the pattern (docs/plan.md, P123).
     */
    const spark =
      step.sparked === null
        ? null
        : (() => {
            const level = ctx.createGain();
            level.connect(fader);
            // A fraction of the landing's own window less a seam, and the fraction is the whole
            // bound: no reading of the dial can start a spark at or after its own stop, at any
            // burst, count or rate, so nothing downstream checks that one did (0175, 0166).
            const begins = at + step.sparked.delay * Math.max(0, ends - at - PLAYER_FADE_SECS);
            // The one seam a spark writes for itself: undelayed it opens under a fader still at
            // zero, delayed it would step the sum by a whole second read in one sample (0104,
            // 0175). Straight rather than equal-power — it opens over its own silence — and no
            // automation at all at none, so that pattern lays the graph it always laid.
            if (begins > at) {
              level.gain.value = 0;
              level.gain.setValueAtTime(0, begins);
              level.gain.linearRampToValueAtTime(step.sparked.level, begins + PLAYER_FADE_SECS);
            } else {
              level.gain.value = step.sparked.level;
            }
            const read = readSlot(step.sparked.slot, level, begins, (node) => {
              // The landing's own speed and pitch, copied off its source rather than bound: the
              // chain holds exactly one source and writes a live speed or pitch change onto that
              // one (0031, src/audio/chain.ts), so a companion handed to `bindSource` would take
              // the move away from the landing it is meant to hang under — and the two would then
              // read at two rates, which is the one thing a spark may never do (P123).
              // The whole ladder and not only the rung it starts on: a spark that kept the
              // first rate while its landing climbed would be the two reading at two rates,
              // which is the one thing a spark may never do (P123, 0167).
              climb(node.playbackRate, deckSpeed);
              node.detune.value = source.detune.value;
            });
            return {
              source: read.source,
              level,
              slot: step.sparked.slot,
              span: read.span,
              at: begins,
            };
          })();

    seam(fader, step, at, ends, spans);

    const scheduled: Scheduled = {
      source,
      fader,
      spark,
      at,
      ends,
      next,
      span,
      rates,
      spans,
      step,
      ordinal,
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
    queue.push(scheduled);
    return syncedFrom(scheduled.next, sync);
  }

  /**
   * One step off the walk, counted — the one place the cursor moves. It answers the ordinal it was
   * drawn at along with the step, so `armStep` is handed the number rather than reading `laid`
   * beside a call that has already moved it (0180).
   */
  function draw(): { step: PlayerStep; ordinal: number } {
    if (walk === null) throw new Error("a player draw with no walk to draw from");
    const ordinal = laid;
    laid++;
    return { step: walk(), ordinal };
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
      const drawn = draw();
      queueEnd = armStep(drawn.step, drawn.ordinal, queueEnd);
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
      // And its companion, which is a started source like any other: a landing dropped ahead of the
      // clock takes its spark with it, or the spark sounds over the pattern that replaced it (P123).
      step.spark?.source.stop();
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

  /**
   * Where the spark of `step` is reading at `at`, or null wherever there is none — no pass, a
   * landing that threw none, or a delayed one whose own start is still ahead.
   *
   * A second answer off the same entry and never a second queue: `position` goes on answering off
   * the landing, which is precisely why a spark rides the landing's entry (0166), so the cursor
   * the peaks paint for it is asked for separately (0175). The step is handed in rather than
   * scanned for again: `standingAt` walks the whole queue and `peek` has just called it, and this
   * is the per-frame read (0070).
   */
  const sparkPositionOf = (step: Scheduled | null, at: number): number | null => {
    if (running === null) return null;
    const { grid } = running;
    const spark = step?.spark ?? null;
    if (step === null || spark === null) return null;
    // The landing's window is what `readInto` sums over, so a spark held back is the difference
    // of two reads of it: how far the landing has read now, less how far it had read when the
    // spark started. That keeps the two on one ladder — the companion is stepped at the
    // landing's own boundaries, so it reads at the landing's rate at every instant and differs
    // only by where it entered (0167, 0175).
    const held = Math.min(at - step.at, step.ends - step.at);
    const from = Math.min(spark.at - step.at, step.ends - step.at);
    if (held < from) return null;
    const into = readInto(step, held) - readInto(step, from);
    const read = into > 0 ? into % spark.span : 0;
    // Backwards where the landing is, for the reason the landing's cursor is: the spark takes
    // the landing's direction, so a cursor running the other way would be the picture saying one
    // thing while the graph plays another (P121).
    return (
      slotStart(grid, spark.slot, step.step.bed) + (step.step.reversed ? spark.span - read : read)
    );
  };

  return {
    set: (next) => {
      const moved = spec !== null && next !== null;
      spec = next;
      // The reversed copy goes with the pattern. Dropping it here is what "dropped when that
      // buffer is" comes to: a deck's `load` switches the module off before it holds anything new
      // (src/audio/deck.ts), so this is the one call that says the audio it was made from is not
      // the audio this deck is playing any more. A stop keeps it — a pause and a play must not
      // cost a copy of the whole buffer each (P121).
      if (next === null) mirrored = null;
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

    cue: (part) => {
      if (running === null || spec === null) return false;
      const onset = songOnset(spec.song, part);
      if (onset === null) return false;
      const from = ctx.currentTime + LOOKAHEAD_SECS;
      // The steps past the horizon go first, so the wind below is to the part's own first jump
      // rather than back over what was dropped — which is the whole difference between a cue and
      // the re-arm a moved number takes (0096). `rearm`'s own drop then finds nothing left ahead
      // of `from` and leaves the count exactly where this put it.
      dropAfter(from);
      laid = onset;
      rearm(from);
      return true;
    },

    begin: (buffer, loop, at, startRate) => {
      const grid = gridOf(loop, startRate, buffer.duration);
      if (spec === null || grid === null) return null;
      running = { buffer, grid };
      walk = playerWalk(spec);
      laid = 0;
      const first = draw();
      queueEnd = armStep(first.step, first.ordinal, at);
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
      // Its own rates, not the pass's: a speed change moves the steps armed after it and leaves
      // the ones already laid down reading at the rates their window was measured in. Held at the
      // step's own end — between two steps the pattern is resting and the read head is where the
      // burst left it — and wrapped on the burst's span, which is the slot's only at a burst
      // of one (P67).
      const into = readInto(step, Math.min(at - step.at, step.ends - step.at));
      const read = into > 0 ? into % step.span : 0;
      // A reversed landing walks that same span the other way, so the head is `span` in and coming
      // back rather than at the slot's own edge and going on. It has to be: the playhead and the
      // picture are drawn off this number, and a cursor running forwards under a landing playing
      // backwards is the instrument showing one thing and playing another (P121).
      return (
        slotStart(grid, step.step.slot, step.step.bed) +
        (step.step.reversed ? step.span - read : read)
      );
    },

    peek: (at, out) => {
      const entry = running === null ? null : standingAt(at);
      out.step = entry?.step ?? null;
      out.at = entry?.ordinal ?? null;
      out.sparkPosition = sparkPositionOf(entry, at);
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
        step.spark?.source.stop();
        step.spark?.source.disconnect();
        step.spark?.level.disconnect();
      }
    },
  };
}
