/**
 * @role The player as a transport: the sources one pass of a pattern is made of, each looping its
 *   own slot of the deck's loop, started ahead of the clock and seamed with the equal-power fade.
 *   It moves where a deck reads from, which is the transport's and never an effect's (0089).
 * @instead The pattern itself — what a seed unfolds into → src/lib/player.ts, which knows what a
 *   burst's seconds are and nothing else about the clock. The deck that owns this →
 *   src/audio/deck.ts: it holds the buffer, the loop and the plan, and hands all three over here.
 *   Where the seams of one step fall, and the shapes they are drawn along →
 *   src/audio/playerSeam.ts. The companions a sparking landing hangs under its own fader →
 *   src/audio/playerSparks.ts. The contract this fills, which is read a tier up →
 *   src/audio/playerVoice.ts.
 */
// Over the 400-line cap by one section: the shared jump clock (0097) reaches four places in the
// one pass closure below, and every line of it is beside the arming it moves. The alternative is
// a file named for half a transport. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
// And one over the dependency cap, which is the window arithmetic handed to a file of its own
// under the hard cap: what the pass reads is one module more than it was, not one thing more.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { PLAYER_FADE_SECS, type PlayerSpec } from "@/lib/player";
import { bedStart, gridOf, gridSpan, loopIn, slotStart, zonedGrid, type Grid } from "./playerGrid";
import { seam } from "./playerSeam";
import { readInto, windowOf } from "./playerWindow";
import { syncedFrom } from "@/lib/playerClock";
import type { DeckPlayer, GroundClock } from "./playerVoice";
import {
  groundBedAt,
  groundIsLed,
  groundTicksBy,
  SESSION_GROUND_DEFAULTS,
  type SessionGround,
} from "@/lib/sessionGround";
import { songsOnset, soloSongs } from "@/lib/playerSongs";
import { songIsDrawn, type SongPartId } from "@/lib/playerSong";
import type { PlayerStep } from "@/lib/playerWalk";
import { playerWalk } from "@/lib/playerWalk";
import { buildSparks, type ReadSlot, type Spark } from "./playerSparks";
import { AUTOMATION_HORIZON_SECS, LOOKAHEAD_SECS, MAX_PLAYER_STEPS } from "./transport";

/** One step the transport has going: its source, the fader its seams are on, and where it reads. */
type Scheduled = {
  source: AudioBufferSourceNode;
  fader: GainNode;
  /**
   * The quieter sources this landing threw, empty where it threw none — held on the landing's own
   * entry and never as entries of their own. That is the whole of what a spark costs the queue:
   * `position` scans this list for the latest entry the clock is at or past, so a companion
   * sitting in it would win that scan and the deck's read head would follow the spark instead of
   * the landing, which is where the pattern actually is (P123).
   *
   * Their level gains are held here too, and for the reason the sources are: what a step is made
   * of is what a step has to let go of, and a node dropped from this list without being
   * disconnected is still wired into the chain.
   */
  sparks: Spark[];
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

export type { DeckPlayer } from "./playerVoice";

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
  /** Which part of the song is being heard on its own, or null for the whole song. The voice's own
   *  and nothing else's: carried by no session field and written into no log entry, which is what
   *  makes a solo transport rather than an arrangement (0041, 0190). It outlives a stop, so a yard
   *  played again opens on the part its toggle still says it is soloing. */
  let solo: SongPartId | null = null;
  /**
   * The part a hand queued to play next, and not yet drawn — the arming loop lands it on the next
   * step that opens a part and clears it. Two fields rather than one, because once the jump is
   * drawn it is still seconds from being heard: `landing` is that drawn jump and when it sounds,
   * so the read below can go on saying it is armed until the clock reaches it, and a re-arm that
   * drops it can queue it again rather than losing it.
   */
  let pending: SongPartId | null = null;
  let landing: { part: SongPartId; at: number; replaced: number } | null = null;
  /**
   * The clock this pass's next step begins on, or null for a deck keeping its own time. Held per
   * voice because a voice reaches nothing above itself: what makes it one clock is that the host
   * hands every voice the same number, not that they share a variable (0097).
   */
  let sync: number | null = null;
  /**
   * The session's shared ground, held per voice for the reason the clock is: a voice reaches
   * nothing above itself, and what makes it one ground is that the host hands every voice the
   * same shape (0097, 0313). Opened at the module's own, so a voice built before a host has said
   * otherwise still stands somewhere rather than nowhere (principle 5).
   */
  let shared: SessionGround = SESSION_GROUND_DEFAULTS;
  /**
   * How the host answers the two questions about that ground a voice cannot answer for itself:
   * where its count stands at an instant, and whether this yard is the one leading it. Null until
   * a host has said, which is every voice built outside one — and a voice with no host reads a
   * ground counted in seconds off the ground itself and a led one as standing still, because a
   * ground led by a yard nothing is counting is a ground that has not moved (principle 5, 0313).
   */
  let clock: GroundClock | null = null;
  /** Where the shared ground's count stands at `at`, by whichever of those two roads is live. */
  const ticksBy = (at: number): number => {
    if (clock !== null) return clock.ticksBy(at);
    return groundIsLed(shared) ? 0 : groundTicksBy(shared, at);
  };
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
    for (const spark of step.sparks) {
      spark.source.disconnect();
      spark.level.disconnect();
    }
  }

  /**
   * Build and schedule one step: a source looping exactly its slot, opened and closed along the
   * fade law, started at `at` and stopped a seam past its end. Returns when the next step begins.
   */
  // One step's whole arming: the window, the source, its loop, its seams and the entry the queue
  // keeps it as, and every line of it is one of the things a step is. See
  // docs/decisions/0007-reviewed-oversized-functions.md.
  // oxlint-disable-next-line max-lines-per-function
  function armStep(drawn: PlayerStep, ordinal: number, at: number): number {
    if (running === null) throw new Error("a player step with no pass to belong to");
    const { buffer, grid } = running;
    /**
     * The step as it is actually played: its own, or — where this pattern has Together on — the
     * same step reading on the session's ground instead of the one its walk drew (0313). Swapped
     * here and nowhere else, because this is the one place a step's own start time is known, and
     * a ground counted in wall seconds is a function of that instant and of nothing about this
     * yard: two yards arming the same instant read the same offset without either knowing the
     * other exists, exactly as they land on the same tick of the jump clock (0097).
     *
     * The whole step and not a second field beside it: everything below reads `step.bed`, and a
     * bed the walk drew sitting beside the bed the transport plays would be two answers to where
     * the loop is (principle 1).
     */
    // The other half of a shared ground first: where this yard is the one leading it, the
    // boundaries of *its* song are what the ground is counted on, so it says so as it arms them
    // (0313). Said at the arming and not at the sounding, because a follower arms its own steps in
    // the same window and a boundary reported later than that is one it has already passed.
    //
    // **Before the bed below it**, so a move the leader's own boundary caused lands on the first
    // jump of the part that caused it — which is what makes it audible as the part arriving
    // somewhere new, and is exactly where a yard's own `bedPer: "part"` ticks (0192).
    const crossed = clock?.crossed;
    // And a leader with nothing arranged reports one whole row of its walk instead, which is
    // exactly the fallback its own ground already counts on: a hand that pointed the shared ground
    // at a yard with no parts asked for a clock, and a row is the boundary that yard has (0192,
    // principle 5). Read off the step and not worked out again here, because the walk is what
    // knows where a row turned over (`PlayerStep.rows`, principle 1).
    if (crossed != null && (drawn.rows || (shared.per === "part" ? drawn.opens : drawn.first)))
      crossed(at);
    const step: PlayerStep =
      spec !== null && spec.bedTogether
        ? { ...drawn, bed: groundBedAt(shared, ticksBy(at)) }
        : drawn;
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
    // One slot read end to end — the source, its region, its start and the seam it stops past — and
    // it is a function precisely so the spark and the landing that threw it share one copy of that
    // arithmetic (P123, principle 1). See docs/decisions/0007-reviewed-oversized-functions.md.
    // oxlint-disable-next-line max-lines-per-function
    const readSlot: ReadSlot = (slot, into, begins, tune) => {
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
     * The companions, where this landing threw any — built where they are declared, and handed
     * the landing's own fader and the tuning of its own source so the two can differ by nothing
     * but a slot, a level and a start (P123, src/audio/playerSparks.ts).
     */
    const sparks = buildSparks(ctx, fader, step.sparked, at, ends, readSlot, (node) => {
      // The landing's own speed and pitch, copied off its source rather than bound: the chain
      // holds exactly one source and writes a live speed or pitch change onto that one (0031,
      // src/audio/chain.ts), so a companion handed to `bindSource` would take the move away from
      // the landing it is meant to hang under — and the two would then read at two rates, which is
      // the one thing a spark may never do (P123). The whole ladder and not only the rung it
      // starts on, for that same reason (P123, 0167).
      climb(node.playbackRate, deckSpeed);
      node.detune.value = source.detune.value;
    });

    seam(fader, step, at, ends, spans);

    const scheduled: Scheduled = {
      source,
      fader,
      sparks,
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
    for (let n = 0; queueEnd <= horizon && n < MAX_PLAYER_STEPS; n++) {
      let drawn = draw();
      // A queued part lands here, on the first step that opens a part: the walk is wound to that
      // part's own first jump — the wind a solo's release takes — and the step drawn again from
      // there, so the boundary the run was about to cross is crossed into the part a hand asked
      // for. The onset is over the written list, which `armPart` refused to queue under a solo.
      if (pending !== null && drawn.step.opens && spec !== null) {
        const onset = songsOnset(spec.songs, pending);
        if (onset === null) throw new Error(`a queued part ${pending} the song does not stand in`);
        laid = onset;
        walk = playerWalk(soloSongs(spec, solo), laid);
        landing = { part: pending, at: queueEnd, replaced: drawn.ordinal };
        pending = null;
        drawn = draw();
      }
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

  /**
   * Every step still ahead of `from`, stopped and let go. Answers the first of them — its ordinal
   * and when it began — or null where nothing was ahead, so the walk's own cursor can be wound
   * back to exactly where the steps a re-arm is about to replace began. The ordinal and not a
   * count: past a queued jump the ordinals in the queue are not contiguous, and a count
   * subtracted would wind the walk to a step nobody laid.
   */
  function dropAfter(from: number): { ordinal: number; at: number } | null {
    const dropping = queue.filter((entry) => entry.at > from);
    for (const step of dropping) {
      step.source.stop();
      // And its companions, which are started sources like any other: a landing dropped ahead of
      // the clock takes its sparks with it, or they sound over the pattern that replaced it (P123).
      for (const spark of step.sparks) spark.source.stop();
      release(step);
    }
    const first = dropping[0];
    return first === undefined ? null : { ordinal: first.ordinal, at: first.at };
  }

  /**
   * Drop every step still ahead of `from` and lay the pattern down again from there. The walk is
   * wound back over exactly the steps that were dropped and drawn again from the seed under
   * whatever spec is held now, so what is re-derived is the tail of the pattern and never a
   * wall-clock cursor — which is what keeps two renders of one session the same file (P67, 0068).
   */
  function rearm(from: number): void {
    if (running === null || spec === null) return;
    // A jump drawn and not yet heard goes with the steps it was drawn among, so it is queued again
    // and lands on the same boundary when the tail is derived again.
    const jump = landing;
    if (jump !== null && jump.at > from) {
      pending = jump.part;
      landing = null;
    }
    relay(from, jump);
  }

  /**
   * The re-arm's own tail: drop past `from` and lay again from the ordinal the walk stood at
   * there. `jump` is the queued landing that was standing in the queue, if any, and it is what
   * decides that ordinal: the steps after a jump are counted from the part it jumped to, so where
   * the drop begins at or past the jump the walk goes back to the ordinal the jump replaced —
   * the boundary itself — and where it begins before the jump, to the first step dropped.
   */
  function relay(from: number, jump: { at: number; replaced: number } | null): void {
    if (running === null || spec === null) return;
    const first = dropAfter(from);
    laid =
      jump !== null && jump.at > from && (first === null || first.at >= jump.at)
        ? jump.replaced
        : (first?.ordinal ?? laid);
    walk = playerWalk(soloSongs(spec, solo), laid);
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
   * Where one spark of `step` is reading at `at`, or null wherever it is not reading — no pass, or
   * a delayed one whose own start is still ahead.
   *
   * One answer per companion off the same entry and never a second queue: `position` goes on
   * answering off the landing, which is precisely why a spark rides the landing's entry (0166), so
   * the cursors the peaks paint for them are asked for separately (0175). The step is handed in
   * rather than scanned for again: `standingAt` walks the whole queue and `peek` has just called
   * it, and this is the per-frame read (0070).
   */
  const sparkPositionOf = (step: Scheduled, spark: Spark, at: number): number | null => {
    if (running === null) return null;
    const { grid } = running;
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
      // A queued jump goes with the part it named: a pattern gone, one drawing its own run, or a
      // list that no longer holds the part leaves nothing for the arming loop to land on.
      const queued = pending ?? landing?.part ?? null;
      if (
        queued !== null &&
        (next === null || songIsDrawn(next) || songsOnset(next.songs, queued) === null)
      ) {
        pending = null;
        landing = null;
      }
      // And the zone the pass is laid against, read again: it is the one thing about the grid a
      // hand can move without restarting the deck, and left alone the sound would go on arming
      // steps outside a zone every picture had already folded into (0318).
      if (running !== null) {
        running.grid = zonedGrid(running.grid, running.buffer.duration, next?.zone ?? null);
      }
      // A knob is heard where it is turned: the steps past the lookahead are cancelled and the
      // tail derived again. The step already sounding keeps its window and its seams, so a move
      // lands at the end of the burst being played rather than at the end of the arming horizon
      // (0096). Switching the module on or off is the
      // caller's: that is a transport change and it restarts the deck (0089).
      if (moved) rearm(ctx.currentTime + LOOKAHEAD_SECS);
    },
    setGround: (next, held) => {
      clock = held;
      if (next === shared) return;
      shared = next;
      // Heard where it was turned, by the road a moved number takes — and only where this pattern
      // is standing on it: a yard walking its own ground would be re-deriving a tail that could
      // not have changed (0096, 0313).
      if (running !== null && spec !== null && spec.bedTogether)
        rearm(ctx.currentTime + LOOKAHEAD_SECS);
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

    armPart: (part) => {
      if (running === null || spec === null) return false;
      if (part === null) {
        // Letting go takes a jump already drawn and not yet heard back out of the queue, and the
        // run is laid again in its own order from the boundary it was going to cross.
        pending = null;
        const jump = landing;
        const from = ctx.currentTime + LOOKAHEAD_SECS;
        if (jump !== null && jump.at > from) {
          landing = null;
          relay(from, jump);
        }
        return true;
      }
      if (solo !== null || songsOnset(spec.songs, part) === null) return false;
      pending = part;
      // Heard at the next boundary and not the first one past the horizon: the steps already laid
      // past the lookahead are dropped and derived again, which is the road a moved number takes,
      // and the arming loop lands the queued part on the first step that opens a part (0096).
      rearm(ctx.currentTime + LOOKAHEAD_SECS);
      return true;
    },

    solo: (part) => {
      if (running === null || spec === null) return false;
      if (part === solo) return true;
      if (part !== null && songsOnset(spec.songs, part) === null) return false;
      // Letting go winds the song to the part that was being heard, so it carries on from there
      // rather than from the top — the arithmetic the audition this replaced was made of (0181).
      // A part the song has stopped playing meanwhile is no onset at all, and the song opens at its
      // own top.
      const resume = part === null && solo !== null ? songsOnset(spec.songs, solo) : null;
      solo = part;
      // A solo's run is one part with no boundary a queued jump could land on, and its release
      // winds the song for itself: whichever way this goes, what was queued is let go of.
      pending = null;
      landing = null;
      const from = ctx.currentTime + LOOKAHEAD_SECS;
      // The steps past the horizon go first, so the wind is to the top of the pattern now being
      // played rather than back over what was dropped, which is the whole difference between this
      // and the re-arm a moved number takes (0096). `rearm`'s own drop then finds nothing left
      // ahead of `from`.
      dropAfter(from);
      laid = resume ?? 0;
      rearm(from);
      return true;
    },

    begin: (buffer, loop, at, startRate) => {
      // The zone the spec was holding when the pass began, folded into the grid's own bounds once
      // for the whole pass — the same shape the room the buffer answers for has (0318).
      const grid = gridOf(loop, startRate, buffer.duration, spec?.zone ?? null);
      if (spec === null || grid === null) return null;
      running = { buffer, grid };
      walk = playerWalk(soloSongs(spec, solo));
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
      // Written by index and shortened only on the frame the count actually changes, which is what
      // 0070 asks of every list a sixty-times-a-second read fills: `length = 0` on the way in is a
      // write per frame exactly as `clear()` is, and this list is the same length on almost all of
      // them. The same shape a rack trims its grown rows with (src/audio/effects/rack.ts).
      //
      // Only the ones actually reading are written, so a delayed spark whose own start is still
      // ahead has no cursor rather than a parked one — and since a spark's start rises with its
      // index, the ones sounding are always a prefix and a reading never lands on another's
      // cursor (src/lib/playerSpark.ts).
      let reading = 0;
      if (entry !== null) {
        for (const spark of entry.sparks) {
          const where = sparkPositionOf(entry, spark, at);
          if (where !== null) out.sparkPositions[reading++] = where;
        }
      }
      if (out.sparkPositions.length !== reading) out.sparkPositions.length = reading;
      // Armed until it is heard, not until it is drawn: a jump is drawn seconds ahead of the clock.
      out.armed = pending ?? (landing !== null && landing.at > at ? landing.part : null);
    },

    stop: () => {
      const stopping = queue;
      queue = [];
      running = null;
      walk = null;
      // An arm is a pending jump of this pass, and the pass is over — unlike a solo, which is a
      // state the next pass opens on (0190).
      pending = null;
      landing = null;
      for (const step of stopping) {
        // Every one of these has been started, which is the only thing `stop` refuses; one that
        // has already run out takes it as the no-op it is. What matters is the steps still ahead
        // of the clock: those are exactly the ones that must not sound.
        step.source.stop();
        step.source.disconnect();
        step.fader.disconnect();
        for (const spark of step.sparks) {
          spark.source.stop();
          spark.source.disconnect();
          spark.level.disconnect();
        }
      }
    },
  };
}
