/**
 * @role One deck's voice: a buffer, the chain it plays through, and a schedule-ahead transport.
 *   It reports what the graph did through callbacks — it never names an event, and it has never
 *   heard of a deck id, which is what keeps `audio` from having to import a tier above it.
 * @instead Deciding which deck this is, or turning a report into an event → src/app/engine.ts.
 */
// The voice is one closure over one buffer, one chain and one transport, and the length is
// mostly its delegating surface — each rack method is three lines that add no branch. Splitting
// it would separate the schedule-ahead state from the methods that read it (0007).
// oxlint-disable max-lines
// Two imports over the cap, and both of them are shapes that used to be written here: what this
// file's `peek` fills moved to ./deckPeek.ts when three tiers needed it, and what its `report`
// fills moved to ./deckReport.ts when an audition needed the lines — so the two dependencies over
// the cap are declarations this file already carried (0007, 0045).
// oxlint-disable import/max-dependencies
import { clamp } from "@/lib/range";
import { cyclesAt, insideLoop, playheadAt, type PlayPlan } from "@/lib/timeline";
import { buildDeckChain, type DeckChain } from "./chain";
import type { DeckPeek } from "./deckPeek";
import type { DeckReport, StopReason } from "./deckReport";
import { createDeckPlayer } from "./player";
import type { DeckVoice } from "./deckVoice";
import { createDeckLanes } from "./deckLanes";
import { createDeckReporter } from "./deckReporter";
import { ordinaryPass, startOffset } from "./deckPass";
import type { HoldEdge } from "./effects/contract";
import {
  AUTOMATION_HORIZON_SECS,
  AUTOMATION_REARM_SECS,
  LOOKAHEAD_SECS,
  RENDER_QUANTUM,
} from "./transport";
import type { Loop } from "@/lib/timeline";

// Re-exported so the voice, its contract and the shape it fills are one import for a caller that
// needs them; the declarations live in ./deckPeek.ts and ./deckVoice.ts, which other tiers share.
export type { DeckPeek };
export type { DeckVoice } from "./deckVoice";

/**
 * `reporter` is a node built on the loop-reporter processor, and the single source of the
 * "it started" and "it looped round" facts. It is connected by the caller.
 *
 * `BaseAudioContext`, like the rest of the tier: a voice uses the factories every context has —
 * `createBufferSource`, `createGain`, and `createBuffer` for the one copy a reversed landing reads
 * (P121) — and `currentTime`, so an OfflineAudioContext drives this same transport at M3. Resuming a
 * suspended context is the one thing that needs the live type, and it lives a tier up.
 *
 * Over the line cap by design: what this holds is one transport's whole state machine —
 * buffer, loop, the source currently playing and whose end was asked for. Splitting it means
 * handing those four between helpers with one caller each, which is how the invariant that
 * `playing` and the reporter's plan move together gets broken. See
 * docs/decisions/0007-reviewed-oversized-functions.md.
 */
/** Where an ask falls on the clock — a clear before everything, because it drops everything. */
const askInstant = (edge: HoldEdge): number => (edge.t === "clear" ? -Infinity : edge.at);

// oxlint-disable-next-line max-lines-per-function
export function createDeckVoice(
  ctx: BaseAudioContext,
  destination: AudioNode,
  reporter: AudioWorkletNode,
  report: DeckReport,
): DeckVoice {
  const chain: DeckChain = buildDeckChain(ctx, destination);
  /**
   * The jump pattern this deck plays under, and the sources one pass of it is made of. It owns
   * its own transport because a jump moves where the deck reads from, which is this file's and
   * never an effect's (0089) — but the chain it plays through is the one chain, above.
   */
  const player = createDeckPlayer(
    ctx,
    chain.input,
    (source) => {
      chain.bindSource(source);
    },
    () => chain.rate(),
  );
  let buffer: AudioBuffer | null = null;
  let loop: Loop | null = null;
  /** The playing source, and whether its end was asked for — `onended` fires either way. */
  let playing: { source: AudioBufferSourceNode; cancelled: boolean } | null = null;
  /** The reporter's plan, mirrored so peek() can read a position from the same arithmetic. */
  let plan: PlayPlan | null = null;
  /**
   * Where a pause left the playhead, in buffer seconds, or null when the deck is stopped rather
   * than held. It is the whole difference between the two: a stop forgets it, a pause writes it,
   * and a play consumes it. It is also what peek() reports while nothing is planned, so a held
   * deck's playhead stays where the performer left it instead of snapping back to zero (0038).
   */
  let pausedAt: number | null = null;
  /**
   * Which plan reports belong to. The worklet's clock runs ahead of the main thread's, so a
   * `started` for a plan this side has already halted can be in flight when the halt happens —
   * unfiltered, it would arrive after `stopped` and leave the session playing a silent deck.
   * Every posted plan carries this id and every report echoes it; a stale echo is dropped.
   */
  let planId = 0;
  /** Every id ever posted comes off this: a release laid ahead takes one too (0372). */
  let issued = 0;
  const mintPlanId = (): number => ++issued;
  /**
   * How many loop boundaries were crossed before the current plan's own anchor. A play resets it
   * to zero; a rate rebase carries the count forward, so `deck.looped` keeps counting up across
   * a speed change rather than starting again from one (0031).
   */
  let cycleBase = 0;
  /** Whether the reporter confirmed the current plan started. What makes `stopped` honest. */
  let started = false;
  /**
   * When the plan now standing began to sound, on the context clock, or null while nothing is —
   * the instant the reporter already carries with its `started`, kept rather than re-derived. It
   * is what `peek` answers `sounding` from, and **a halt sends it back to null**: an age that
   * survived a stop would make the picture a function of how many times a hand pressed play, which
   * is the class of thing 0128 keeps out of it. A pause is a halt like any other here, because a
   * held instrument is not a maturing one either — while a plan re-anchored in place (`resume`) is
   * not a halt at all and carries the age on, which is the reading being honest: nothing stopped
   * sounding, so nothing has been anywhere else (0242).
   */
  let soundingSince: number | null = null;
  /**
   * The rests the rack asked for and the transport scheduled, in order: each the plan it stops,
   * the instant, and where the playhead is held from then — read off that plan when the ask
   * arrived, so a hand pressing play mid-rest resumes exactly where the stop landed (0038, 0372).
   * `held` flips when the reporter says the stop happened; `release` is the source laid ahead to
   * end it, or null while the rack has not asked for one yet. A queue and not one, because one
   * tick may lay several rests inside its horizon, each stopping the release before it. Emptied
   * by every hand on the transport (0371).
   */
  const rests: {
    planId: number;
    at: number;
    pausedAt: number | null;
    held: boolean;
    release: {
      at: number;
      planId: number;
      plan: PlayPlan;
      current: { source: AudioBufferSourceNode; cancelled: boolean };
    } | null;
  }[] = [];
  /** The rack's asks, gathered on the tick and spent in order of their instants (0371). */
  const asks: HoldEdge[] = [];
  /**
   * The lanes this deck is holding and the clock they ride, which follows this transport: frozen
   * at every halt, released at every start (0035, 0040). Read off the plan standing here.
   */
  const lanes = createDeckLanes(ctx, chain, () => plan?.startTime ?? null);
  /** The tick that keeps the lanes armed ahead of the clock, running only while they sound. */
  let rearm: ReturnType<typeof setInterval> | null = null;

  /**
   * The shortest loop this context can report a boundary for. See RENDER_QUANTUM. Derived
   * from this context's rate, so the floor differs between a 44.1kHz device and the 48kHz
   * offline host — a loop within ~0.2ms of it can be accepted by one and refused by the other.
   *
   * Rate-aware, because the floor is a fact about wall time and a loop is a length of buffer: a
   * cycle costs `period / rate` seconds, so at 4× a loop has to be four quanta of buffer long to
   * still last one quantum of clock. Below 1× the floor stays where 1× put it — a slower deck
   * could report a shorter loop, but accepting one would mean refusing it again on the way back
   * up (0031).
   */
  const minLoop = (): number => (RENDER_QUANTUM / ctx.sampleRate) * Math.max(1, chain.rate());

  /** The port, read through the one reader below and posted down by everything that plans. */
  const port = createDeckReporter(reporter, (message) => {
    // A rest's own reports carry the plan the rest stopped, which the release's plan may have
    // already succeeded on this side (0372).
    if (message.id !== planId && !rests.some((rest) => rest.planId === message.id)) return;
    switch (message.t) {
      case "held":
        restHeld(message.id, message.at);
        return;
      case "started":
        started = true;
        // A release's start spends the held position the hold left; an ordinary start already
        // had it spent by the halt before it (0038, 0372).
        pausedAt = null;
        soundingSince = message.at;
        report.started(message.at, message.offset);
        return;
      case "looped":
        report.looped(message.at, message.cycle);
        return;
      case "xrun":
        report.xrun(message.detail);
    }
  });

  /**
   * Hand the reporter the plan it counts against. `resume` says the source is already running
   * and this is a re-anchoring rather than a start, so the processor keeps its "it started" fact
   * and never reports a cycle number it has already reported (0031).
   */
  function postPlan(resume: boolean): void {
    if (plan === null) return;
    // A plan re-posted under a rest keeps the instant it stops at (0372).
    const until = rests.find((rest) => rest.planId === planId)?.at;
    port.post({ ...plan, id: planId, base: cycleBase, resume, until });
  }

  /**
   * The reporter says the rest's stop happened: the paused half of a halt, at the instant the
   * stop was scheduled for. The release, if it was laid already, is the plan standing now.
   */
  function restHeld(id: number, at: number): void {
    const current = rests[0];
    if (current === undefined || current.held || current.planId !== id) return;
    current.held = true;
    const stopped = playing;
    playing = null;
    plan = null;
    if (stopped !== null) stopped.source.disconnect();
    chain.bindSource(null);
    // The lanes freeze where the stop found them and not where the report did (0040, 0372).
    lanes.hold(at);
    lanes.reset();
    pausedAt = current.pausedAt;
    if (started) report.stopped("paused", current.pausedAt);
    started = false;
    soundingSince = null;
    if (current.release !== null) takeRelease(current.release);
  }

  /** The release source becomes the transport: what a play does, at an instant already laid. */
  function takeRelease(release: NonNullable<(typeof rests)[number]["release"]>): void {
    rests.shift();
    playing = release.current;
    plan = release.plan;
    planId = release.planId;
    cycleBase = 0;
    started = false;
    // The held position stands until the release actually starts: a hand's play before then
    // resumes from it, and not from the top (0038).
    lanes.release(release.at);
    chain.bindSource(release.current.source);
    retick();
  }

  /** Every hand on the transport takes the rests with it: each stop, and each release laid ahead. */
  function cancelRests(): void {
    for (const { release } of rests.splice(0)) {
      if (release === null) continue;
      release.current.cancelled = true;
      release.current.source.stop();
      release.current.source.disconnect();
    }
  }

  /** Spend `n` of the rack's asks, soonest first; each is refused or taken by the transport. */
  function applyAsks(n: number): void {
    // The slice is a copy of this tick's asks, and it is the copy that is sorted.
    // oxlint-disable-next-line unicorn/no-array-sort
    const edges = asks.slice(0, n).sort((a, b) => askInstant(a) - askInstant(b));
    for (const edge of edges) {
      if (edge.t === "clear") {
        // The asker was redrawn: what it laid is dropped by the one road that drops a stop
        // already scheduled, a restart in place — whose own arming gathers the fresh run, so
        // the rest of this list, drawn before the reset that restart makes, is not applied.
        if (rests.length === 0) continue;
        releaseNow();
        return;
      }
      if (edge.t === "hold") holdAt(edge.at);
      else releaseAt(edge.at, edge.jump);
    }
  }

  function holdAt(at: number): boolean {
    // Only the ordinary pass is rested: a pattern's steps are its own transport, laid ahead by
    // the player, and a stop scheduled on one of them would hold nothing the next step does not
    // start again (0089, 0372).
    // A hold the tick arrived too late for is not taken: laid now it would stop the deck at once
    // and its release, clamped to the same instant, would start it again — a blip and not a rest.
    // The release that follows is refused with it, because no rest stands.
    if (player.running() || buffer === null || at < ctx.currentTime) return false;
    const last = rests.at(-1);
    if (last === undefined) {
      const current = playing;
      if (current === null || plan === null) return false;
      current.source.stop(at);
      // The `ended` the scheduled stop fires is the rest's and not a halt: the reporter says when.
      current.cancelled = true;
      rests.push({ planId, at, pausedAt: readsAt(at), held: false, release: null });
      postPlan(true);
      return true;
    }
    // A rest over a rest is nothing; a rest after one stops the release laid to end it, which is
    // the source sounding at that instant — and the reporter is told on the release's own plan,
    // which it replaces in its queue by the id (0372).
    const release = last.release;
    if (release === null || at <= release.at) return false;
    release.current.source.stop(at);
    release.current.cancelled = true;
    rests.push({
      planId: release.planId,
      at,
      pausedAt: playheadAt(at, release.plan, buffer.duration),
      held: false,
      release: null,
    });
    port.post({
      ...release.plan,
      id: release.planId,
      base: 0,
      resume: false,
      until: at,
    });
    return true;
  }

  /**
   * Every rest let go of at once, in place: the pass restarted from where the deck reads at the
   * lookahead, or from where a rest is holding it. A restart and not a release, because a stop
   * already scheduled on a source cannot be taken back — only a new source can play past it —
   * and a restart is the one road that takes every laid rest and release with it, the way a
   * hand's play does (0371).
   */
  function releaseNow(): void {
    if (rests.length === 0) return;
    start(readsAt(ctx.currentTime + LOOKAHEAD_SECS) ?? pausedAt ?? undefined);
  }

  function releaseAt(at: number, jump: number): boolean {
    const current = rests.at(-1);
    if (current === undefined || current.release !== null || buffer === null) return false;
    const from = current.pausedAt ?? 0;
    // Inside the loop and inside the buffer, the way a seek is kept (0041).
    const offset = clamp(from + jump, loop?.in ?? 0, loop?.out ?? buffer.duration);
    // Never before the stop it releases, and never in the past: a late release is the opposite
    // of a late hold — a deck held is a deck owed one — so it is clamped forward to the lookahead.
    const pass = ordinaryPass(
      ctx,
      chain,
      loop,
      buffer,
      offset,
      Math.max(at, current.at, ctx.currentTime + LOOKAHEAD_SECS),
      () => {
        halt("ended");
      },
    );
    const release = {
      at: pass.plan.startTime,
      planId: mintPlanId(),
      plan: pass.plan,
      current: pass.current,
    };
    current.release = release;
    // Posted now, under the release's own id, so the reporter queues it behind the rest and
    // takes it up at the stop — the release is on the audio thread before its instant (0372).
    port.post({ ...release.plan, id: release.planId, base: 0, resume: false });
    if (current.held) takeRelease(release);
    return true;
  }

  /**
   * Start or stop the arming tick, which runs exactly while there are lanes and a transport to
   * play them. Offline it never fires — a render has no main thread listening — so the offline
   * host calls `armAutomation` at the same cadence from inside the render instead.
   */
  function retick(): void {
    // A rack that grows something of its own is a third reason to keep ticking, beside the lanes
    // and the pattern: its population is laid ahead on the same horizon they are (0204).
    // And through a rest, where nothing sounds: the release is laid on this same tick, and a
    // rest longer than the horizon would otherwise never be let go of (0372).
    const wanted =
      (sounding() || rests.length > 0) &&
      (lanes.size() > 0 || player.held() !== null || chain.pumping());
    if (wanted === (rearm !== null)) return;
    if (rearm !== null) clearInterval(rearm);
    rearm = wanted ? setInterval(armAhead, AUTOMATION_REARM_SECS * 1000) : null;
  }

  /** Whether anything is going: the ordinary source, or a pass of the player's own (0089). */
  function sounding(): boolean {
    return playing !== null || player.running();
  }

  /** Both things armed ahead of the clock, on the one tick that keeps them there. */
  function armAhead(): void {
    lanes.arm();
    player.arm();
    // Laid across the same horizon, from the same clock, on the same tick — which is what makes an
    // export of this session the performance it would have given (0071, 0204).
    chain.pumpEffects(ctx.currentTime, AUTOMATION_HORIZON_SECS);
    // What the rack asks of this transport, gathered on the same horizon and scheduled ahead
    // the way the lanes and the steps are (0371).
    applyAsks(chain.holds(ctx.currentTime + AUTOMATION_HORIZON_SECS, asks));
  }

  /**
   * Where the deck will be reading at `at`, or null with nothing planned to read it from. A
   * jumping pass answers off its own schedule: only its first step's plan is ever posted, so the
   * plan carries the phase inside a slot and the pass says which slot that phase is in (0089).
   *
   * The one statement of it. Three callers ask: the painter, at the clock; and the two transport
   * changes that restart without seeking, at the instant the replacement source starts (0091).
   */
  function readsAt(at: number): number | null {
    if (plan === null || buffer === null) return null;
    return player.position(at) ?? playheadAt(at, plan, buffer.duration);
  }

  /** Where the playhead is right now. */
  const playhead = (): number | null => readsAt(ctx.currentTime);

  function halt(reason: StopReason): void {
    // Only a pause leaves something held, and it is the caller that put it there. Every other
    // way out of a transport — a stop, a reload, a loop move, the source ending — forgets it, so
    // the position can never outlive the buffer or the loop it was measured against.
    if (reason !== "paused") pausedAt = null;
    cancelRests();
    const current = playing;
    if (current === null && !player.running()) return;
    // Both before the plan goes: the lane clock is read off it, and every value the release
    // cancels was scheduled against the plan being torn down.
    lanes.hold();
    lanes.reset();
    playing = null;
    plan = null;
    // Every step still ahead of the clock goes with the pass — those are the ones that must not
    // sound — and the pattern goes too: the next play draws it again from the seed (0089).
    player.stop();
    // Invalidates every report still in flight from the plan being halted (see planId above).
    planId = mintPlanId();
    if (current !== null) {
      // The `ended` listener stays registered and fires anyway — it reads this flag rather than
      // being removed, because a stop() and a natural end can be in flight at the same instant.
      current.cancelled = true;
      if (reason !== "ended") current.source.stop();
      current.source.disconnect();
    }
    // The chain keeps speed and pitch; what it lets go of is the node they were written onto.
    chain.bindSource(null);
    port.post(null);
    // Only a start the reporter confirmed gets a stop: a play cancelled inside the lookahead
    // never sounded, and a `stopped` for it would be an event for a transport that never ran.
    // So that pair logs *nothing* — deliberately: the log records what the instrument did,
    // and it did not play. probe() still answers for the session either way.
    if (started) report.stopped(reason, pausedAt);
    started = false;
    soundingSince = null;
    retick();
  }

  /**
   * A loop moved out from under a playing deck without restarting it, or `false` when it cannot:
   * while the playhead still falls inside the new loop the source's loop points move under it and
   * the plan re-anchors from what survived rather than restarting for it (0091).
   */
  function moveInPlace(): boolean {
    const current = playing;
    if (loop === null || current === null || plan === null || buffer === null) return false;
    // A deck holding a player restarts whatever the playhead did: only a restart offers the pass
    // to `player.begin`, and a widened loop may be the first with a grid to jump around (0089).
    if (player.held() !== null) return false;
    // Anchored at the start while inside the lookahead: the clock would claim it began early.
    const anchor = Math.max(ctx.currentTime, plan.startTime);
    const position = playheadAt(anchor, plan, buffer.duration);
    if (!insideLoop(position, loop)) return false;
    current.source.loop = true;
    current.source.loopStart = loop.in;
    current.source.loopEnd = loop.out;
    cycleBase += cyclesAt(anchor, plan);
    plan = {
      startTime: anchor,
      offset: loop.in,
      period: loop.out - loop.in,
      rate: chain.rate(),
      phase: position - loop.in,
    };
    postPlan(true);
    return true;
  }

  function start(resumeAt?: number): void {
    // The tier above checks that something is loaded and says so on the log; reaching here
    // without a buffer is a bug in that check, not a user error, so it is loud.
    if (buffer === null) throw new Error("deck.play with nothing loaded");
    halt("command");

    const at = ctx.currentTime + LOOKAHEAD_SECS;
    // The player takes the whole pass when it can: it builds its own sources, one per step, and
    // hands back the one plan the reporter counts boundaries against. Null is a deck with no
    // pattern — or one whose loop has no grid to jump around — and it plays the ordinary way.
    // A jumping play begins at the top of the pattern, so a held position is not resumed into it.
    plan = player.begin(buffer, loop, at, chain.rate());
    if (plan === null) {
      const pass = ordinaryPass(ctx, chain, loop, buffer, resumeAt, at, () => {
        halt("ended");
      });
      plan = pass.plan;
      playing = pass.current;
    }
    planId = mintPlanId();
    // The rack counts again from here: a rest scheduled before the hand moved is one it refused,
    // and the play is the one road every restart takes (0371).
    chain.resetHolds(at);
    cycleBase = 0;
    started = false;
    postPlan(false);
    // The lanes count again from where the last halt left them, at the first audible sample.
    lanes.release(at);
    armAhead();
    retick();
  }

  return {
    load: (next) => {
      halt("command");
      buffer = next;
      loop = null;
      // The pattern goes with the loop, and for the same reason: both are ranges of a buffer this
      // deck is no longer holding, and a grid measured against the old one means nothing against
      // the new. The tier above clears the same two fields on the session (src/app/execute.ts).
      player.set(null);
    },

    loaded: () => buffer,

    // The held position is the only resume offset a play has, and the clock is this voice's: a
    // caller cannot ask to begin somewhere the transport is not, nor when (P66).
    play: () => {
      start(pausedAt ?? undefined);
    },

    stop: () => {
      halt("command");
    },

    pause: () => {
      // A hand's pause is never let go of by the rack: the release laid ahead goes (0371).
      cancelRests();
      // Nothing planned is nothing to hold: a pause on a stopped deck is not a way to move the
      // playhead, and one on a paused deck must not disturb where it already is.
      if (!sounding()) return;
      // A play still inside the lookahead never sounded, so it has nothing to be held at — the
      // same reason `halt` gives it no `stopped` report. Pausing it is simply stopping it.
      const at = started ? playhead() : null;
      pausedAt = at;
      halt(at === null ? "command" : "paused");
    },

    seek: (position) => {
      // The tier above refuses a seek on an empty deck and says so on the log; reaching here
      // without a buffer is a bug in that check, the same way a play without one is.
      if (buffer === null) throw new Error("deck.seek with nothing loaded");
      // Through the same rule a resume takes, so what is returned, what is held and what the
      // next start actually uses are one number: a point the loop does not cover lands at the
      // top of it either way, and a caller is never told the playhead went somewhere it did not.
      const at = startOffset(loop, clamp(position, 0, buffer.duration)).offset;
      // A seek under a rest is the hand's: the release laid ahead goes with it (0371).
      cancelRests();
      // Playing, it is one restart from the new offset — always, unlike a loop move, because the
      // whole gesture is to read somewhere else: both sides of the seam are re-anchored at a
      // start the reporter knows about, at whatever rate it is running (0031). Stopped, it is
      // exactly what a pause leaves behind —
      // `play` consumes `pausedAt`, so the two gestures put the deck in the same shape (0038).
      if (sounding()) {
        start(at);
      } else {
        pausedAt = at;
      }
      return at;
    },

    planned: () => sounding(),
    holdAt,
    releaseAt,
    releaseNow,
    setTempo: (bpm) => {
      chain.setTempo(bpm);
    },

    setLoop: (inSecs, outSecs) => {
      // The tier above refuses a loop on an empty deck and says so on the log; reaching here
      // without a buffer is a bug in that check, the same way a play or a seek without one is.
      // It was `buffer?.duration ?? 0` — which clamped both edges to zero and returned null, so
      // a caller could not tell "nothing is loaded" from "that range was too short" (0038).
      if (buffer === null) throw new Error("deck.loop with nothing loaded");
      const length = buffer.duration;
      const from = clamp(inSecs, 0, length);
      const to = clamp(outSecs, 0, length);
      const wasPlaying = sounding();
      // Floored as well as clamped. A loop of 1e-9 is a well-formed command off the wire, and
      // anything below a render quantum cannot be reported once per cycle — it is an unbounded
      // catch-up on the audio thread, not a loop. So it is no loop: `to <= from` already means
      // "clear", and this widens that to "clear unless it is long enough to be real". Never
      // silent — the caller returns this, so `deck.loop.changed` carries the null.
      const previous = loop;
      loop = to - from >= minLoop() ? { in: from, out: to } : null;
      // Only a *change* does anything: one resolving to the loop already playing moved nothing.
      const changed =
        previous === null || loop === null
          ? previous !== loop
          : previous.in !== loop.in || previous.out !== loop.out;
      if (wasPlaying && changed && !moveInPlace()) {
        // A move the playhead did not survive restarts at the new loop's in — but a *clear* is
        // not a move: restarting a cleared deck at 0 would throw it back to the top of the file.
        // It continues from where the deck will be reading when the replacement source starts,
        // which for a jumping pass is the step it is on and never the plan, that pass's metronome.
        const resumed = loop === null ? readsAt(ctx.currentTime + LOOKAHEAD_SECS) : null;
        start(resumed ?? undefined);
      }
      return loop;
    },

    setPlayer: (next) => {
      const switched = (next === null) !== (player.held() === null);
      // Read before the pattern goes, while the pass that answers for it is still up. Switching
      // the module is a transport change and restarts the deck the way a loop move does, but it is
      // emphatically not a seek: the restart continues from the position that survives it rather
      // than from the top of the loop (0091, P87). It is spent in `ordinaryPass` only — a pattern
      // that begins begins at the top of itself, drawn from the seed (docs/plan.md §4) — so what
      // it reaches is a switch off, and a switch on over a loop with no grid to jump around, which
      // plays straight and has no more business seeking than the other one does. Moving the
      // module's numbers is `set`'s to re-arm for and restarts nothing (P67).
      const resumed = switched ? readsAt(ctx.currentTime + LOOKAHEAD_SECS) : null;
      player.set(next);
      if (switched && sounding() && loop !== null) start(resumed ?? undefined);
      else retick();
    },
    soloPlayer: player.solo,
    armPlayer: player.armPart,
    setSync: (sync) => {
      player.setSync(sync);
      // The rack counts in it too: an automator paces its own ticks by the clock the yards walk on
      // (0097, 0204). Pushed down, because this tier may not read the session.
      chain.setSync(sync);
      retick();
    },
    // The shared ground reaches the pattern alone: it is where a landing reads, and the rack
    // counts nothing in it (0313).
    setGround: (ground, clock) => {
      player.setGround(ground, clock);
    },

    setParam: (instance, param, value) => {
      const now = ctx.currentTime;
      // A rebuilt run is laid from now, so a rebuild paid here is armed here and not a tick
      // later — which for a lull set to rest sooner than that is the first rest kept (0371).
      if (chain.setParam(instance, param, value, now) && (sounding() || rests.length > 0)) {
        armAhead();
      }
      // A rate change is a transport change, but it is emphatically not a restart: the source
      // keeps playing, its native loop keeps looping, and only the arithmetic has to be told.
      // Re-anchoring the plan at `now`, with the position the old rate had reached as its phase,
      // is what leaves the playhead exactly where it was and the cycle count where it was (0031).
      if (instance !== null || plan === null || chain.rate() === plan.rate) return;
      // A jumping pass lays every step out in the seconds the rate makes of a slot, so the steps
      // it has already built are windows measured in the old rate. Those still ahead of the
      // clock are replaced at the new one; the one sounding keeps the window it was given, and
      // the seam between them is faded like any other (0089).
      player.rearm(now + LOOKAHEAD_SECS);
      // The instant the new rate first applies, which is not always `now`: inside the lookahead
      // the source has not started, so re-anchoring at `now` would tell both sides of the seam
      // that playback began early and desync the playhead by the lookahead for good. A plan not
      // yet running re-anchors at its own start and only its slope changes (0031).
      const anchor = Math.max(now, plan.startTime);
      const crossed = cyclesAt(anchor, plan);
      const position = playheadAt(anchor, plan, buffer?.duration ?? 0);
      cycleBase += crossed;
      plan = {
        startTime: anchor,
        // A one-shot has no cycle to be inside, so it re-anchors at the position itself; a loop
        // keeps its wrap anchor and carries how far into the cycle it had reached.
        offset: plan.period > 0 ? plan.offset : position,
        period: plan.period,
        rate: chain.rate(),
        phase: plan.period > 0 ? position - plan.offset : 0,
      };
      postPlan(true);
      // Nothing to re-arm: a lane's cycles are seconds on the clock from its own anchor, and a
      // rate change moves the buffer under them without moving them (0035).
    },

    endGesture: () => {
      if (chain.endGesture() && (sounding() || rests.length > 0)) armAhead();
    },

    setAutomation: (instance, param, lane, base) => {
      lanes.set(instance, param, lane, base);
      retick();
    },

    addEffect: (instance, effect, values) => {
      const at = chain.addEffect(instance, effect, values);
      // The rack it joined may grow, and this one may be the first that does — and one that asks
      // for rests counts its first gap from now, so it is armed now rather than at the next tick,
      // which could be a whole tick after the gap it was set to (0371).
      retick();
      if (sounding()) armAhead();
      return at;
    },

    setEffectBounds: (instance, bounds) => {
      chain.setEffectBounds(instance, bounds);
    },
    dismissGrown: (instance, place) => chain.dismissGrown(instance, place),
    setEffectBypass: (instance, bypassed) => {
      chain.setEffectBypass(instance, bypassed);
      // The last asker switched off lets every rest go: a deck resting for an effect nobody is
      // running is a deck that stopped for no reason on the page (0371). And one switched back
      // on is armed now, for the reason a new one is.
      if (!chain.holding()) releaseNow();
      retick();
      if (sounding()) armAhead();
    },

    removeEffect: (instance) => {
      // Every lane this instance held goes with it: a lane belongs to the instance, and the
      // instance is gone (0030).
      lanes.forget(instance);
      chain.removeEffect(instance);
      if (!chain.holding()) releaseNow();
      retick();
    },

    reorderEffects: (order) => {
      chain.reorderEffects(order);
    },

    armAutomation: () => {
      armAhead();
    },

    peek: (out) => {
      // A held deck reports where it is holding, not zero: pausing must not move the playhead,
      // and this read is the only thing the surfaces paint it from (0038).
      out.position = playhead() ?? pausedAt ?? 0;
      out.meter = chain.level();
      out.crest = chain.crest();
      // How long this deck has sounded without a break, on the same clock the position above is
      // read at. Nought for a halted deck the way the empty read and the clear zero everything
      // else, and nought inside the lookahead, where the start is still ahead of the clock and
      // nothing has been heard yet.
      out.sounding = soundingSince === null ? 0 : Math.max(0, ctx.currentTime - soundingSince);
      chain.meters(out.meters);
      chain.growth(out.grown, out.waits);
      // What the pattern is standing in, off the step the clock is actually inside rather than off
      // the cursor, which is armed seconds ahead of it. Nulls for a deck holding no pattern, which
      // is what a card with no song draws from (0157).
      player.peek(ctx.currentTime, out.player);
      lanes.peek(out.automation);
    },

    syncReports: () => port.sync(),
    dispose: () => {
      halt("command");
      port.dispose();
      lanes.clear();
      retick();
      chain.dispose();
    },
  };
}
