/**
 * @role One deck's voice: a buffer, the chain it plays through, and a schedule-ahead transport.
 *   It reports what the graph did through callbacks — it never names an event, and it has never
 *   heard of a deck id, which is what keeps `audio` from having to import a tier above it.
 * @instead Deciding which deck this is, or turning a report into an event → src/app/engine.ts.
 */
// A MessagePort's postMessage has no targetOrigin argument — that parameter belongs to
// window.postMessage, which this file never calls. The rule cannot tell the two apart.
// oxlint-disable unicorn/require-post-message-target-origin
// The voice is one closure over one buffer, one chain and one transport, and the length is
// mostly its delegating surface — each rack method is three lines that add no branch. Splitting
// it would separate the schedule-ahead state from the methods that read it (0007).
// oxlint-disable max-lines
// One import over the cap, and the one over it is the shape this file's `peek` fills: the type
// moved to ./deckPeek.ts when three tiers needed it and this file reached its hard line cap, so
// the eleventh dependency is a declaration that used to be written here (0007).
// oxlint-disable import/max-dependencies
import type { PlayerSpec } from "@/lib/player";
import { clamp } from "@/lib/range";
import { cyclesAt, insideLoop, playheadAt, type PlayPlan } from "@/lib/timeline";
import { buildDeckChain, type DeckChain } from "./chain";
import type { DeckPeek } from "./deckPeek";
import { createDeckPlayer } from "./player";
import type { EffectInstanceId } from "./effects/contract";
import type { EffectId } from "./effects/registry";
import { laneSpan, sameGesture, type AutomationPoint } from "@/lib/automation";
import { paramKey, type AutomationParamId, type EffectParamValues, type ParamId } from "./params";
import {
  AUTOMATION_HORIZON_SECS,
  AUTOMATION_REARM_SECS,
  LOOKAHEAD_SECS,
  MAX_AUTOMATION_CYCLES,
  RENDER_QUANTUM,
} from "./transport";
import type { Loop } from "@/lib/timeline";

/**
 * What the graph tells the tier above. `at` is audio time, from the thread that knows it —
 * graph-input time, strictly: the master bus (compressor + oversampled shaper) delays the
 * audible output by a fixed few hundred frames, so an `at` correlated against rendered samples
 * leads the waveform by that much. The plan's own arithmetic is exact; the bus cost is flat.
 */
export type DeckReport = {
  started(at: number, offset: number): void;
  looped(at: number, cycle: number): void;
  /**
   * `held` is where the playhead came to rest, in buffer seconds, for a pause — the position the
   * next play resumes from. Null for every other reason: a stop and an ending leave nothing held.
   */
  stopped(reason: StopReason, held: number | null): void;
  xrun(detail: string): void;
};

/**
 * Why a transport stopped. "ended" is the source running out on its own, "command" is a stop
 * — which is also what a reload, a loop move and a dispose are — and "paused" is a stop that
 * remembers where it was (0038).
 */
export type StopReason = "ended" | "command" | "paused";

// Re-exported so the voice and the shape it fills are one import for a caller that needs both;
// the declaration itself lives in ./deckPeek.ts, which three tiers share.
export type { DeckPeek };

export type DeckVoice = {
  load(buffer: AudioBuffer): void;
  /** The buffer this deck is holding, or null before its first load — what a crop reads (0047). */
  loaded(): AudioBuffer | null;
  /**
   * Starts LOOKAHEAD_SECS from now, from wherever a pause left the playhead — the top of the
   * loop, or of the buffer, when nothing is held. Playing an already-playing deck restarts it.
   */
  play(): void;
  /** Stops and forgets the playhead: the next play starts at the top of the loop (0038). */
  stop(): void;
  /** Stops and holds the playhead where it is, so the next play carries on from there (0038). */
  pause(): void;
  /**
   * Move the playhead to `position` seconds into the buffer, clamped to it. Stopped, it is where
   * the next play begins; playing, the transport is rescheduled from there without stopping being
   * asked for. Returns where the playhead was actually put (0041).
   */
  seek(position: number): number;
  /** Whether a source is planned, including the lookahead before its started report. */
  planned(): boolean;
  /**
   * `out` at or below `in` clears the loop, as does anything shorter than a render quantum.
   * Returns what was actually applied, which is what the session and the log then carry.
   */
  setLoop(inSecs: number, outSecs: number): Loop | null;
  /**
   * Hold the jump pattern, or drop it with null. Switching it on or off restarts a playing deck;
   * moving its numbers re-arms the pass (0089, P67). `setSync` holds the session's clock (0097).
   */
  setPlayer(player: PlayerSpec | null): void;
  setSync(sync: number | null): void;
  setParam(instance: EffectInstanceId | null, param: ParamId, value: number): void;
  /** The hand let go: every rebuild a plugin declared expensive is paid for now, once (P63). */
  endGesture(): void;
  /**
   * Hold a lane against this deck, or drop it when `lane` is empty. Nothing is heard until the
   * transport arms it: the points are gesture-relative, and this voice decides where each cycle
   * of them lands on the clock (0028, 0035).
   */
  setAutomation(
    instance: EffectInstanceId | null,
    param: AutomationParamId,
    lane: readonly AutomationPoint[],
    base: number,
  ): void;
  addEffect(instance: EffectInstanceId, effect: EffectId, values: EffectParamValues): number;
  setEffectBypass(instance: EffectInstanceId, bypassed: boolean): void;
  removeEffect(instance: EffectInstanceId): void;
  reorderEffects(order: readonly EffectInstanceId[]): void;
  /**
   * Arm every held lane, and every jump the player owes, across the horizon from wherever the
   * clock stands now — the tick's own work, done on demand. A live deck never needs this: its
   * interval is already running. An offline render does, because that interval is wall time and
   * nothing on the main thread runs while a render does, so the host arms the horizon from inside
   * the render (src/app/render.ts). It keeps the name it had when lanes were the only thing armed
   * ahead (0071, 0077); the player rides this tick because it needs the same one (0089).
   */
  armAutomation(): void;
  /** Writes the playhead and meter into `out` — silence and zero when nothing is playing. */
  peek(out: DeckPeek): void;
  /** Resolves after the reporter has received every plan and returned every prior report. */
  syncReports(): Promise<void>;
  /** Permanently disconnect this voice and cancel its pending transport/report state. */
  dispose(): void;
};

/**
 * `reporter` is a node built on the loop-reporter processor, and the single source of the
 * "it started" and "it looped round" facts. It is connected by the caller.
 *
 * `BaseAudioContext`, like the rest of the tier: a voice uses only `createBufferSource` and
 * `currentTime`, so an OfflineAudioContext drives this same transport at M3. Resuming a
 * suspended context is the one thing that needs the live type, and it lives a tier up.
 *
 * Over the line cap by design: what this holds is one transport's whole state machine —
 * buffer, loop, the source currently playing and whose end was asked for. Splitting it means
 * handing those four between helpers with one caller each, which is how the invariant that
 * `playing` and the reporter's plan move together gets broken. See
 * docs/decisions/0007-reviewed-oversized-functions.md.
 */
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
  /**
   * How many loop boundaries were crossed before the current plan's own anchor. A play resets it
   * to zero; a rate rebase carries the count forward, so `deck.looped` keeps counting up across
   * a speed change rather than starting again from one (0031).
   */
  let cycleBase = 0;
  /** Whether the reporter confirmed the current plan started. What makes `stopped` honest. */
  let started = false;
  /**
   * The lanes this deck is holding, each with the manual value it falls back to. Held rather
   * than scheduled on arrival: a lane has a period and a phase of its own, and only a playing
   * deck has a clock to lay them against (0035).
   */
  const lanes = new Map<
    string,
    {
      instance: EffectInstanceId | null;
      param: AutomationParamId;
      points: readonly AutomationPoint[];
      base: number;
      /** Its own period: the gesture's length. Zero for a lane that never moved. */
      span: number;
      /** When its counting began, on the lane clock below — the instant it was recorded (0035). */
      anchor: number;
      /** The next cycle of this lane to schedule, counted from `anchor`. */
      armed: number;
    }
  >();
  /** The tick that keeps the lanes armed ahead of the clock, running only while they sound. */
  let rearm: ReturnType<typeof setInterval> | null = null;
  /**
   * What the lane clock reads while it is frozen, or null while it runs with the transport. Lane
   * time advances only while the deck sounds: a pause or a stop freezes every lane exactly where
   * it stands and the next play carries it on from there, so the transport moves the waveform
   * and never the gesture (0040). Only `laneNow() - anchor` is ever read, so the number itself
   * means nothing beyond how far apart two readings are.
   */
  let laneHeldAt: number | null = ctx.currentTime;

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

  /** What the processor posts back. Its own shape, declared where it is read (see worklets/). */
  type Reported =
    | { t: "started"; id: number; at: number; offset: number }
    | { t: "looped"; id: number; at: number; cycle: number }
    | { t: "xrun"; id: number; detail: string }
    | { t: "synced"; token: number };

  let nextSyncToken = 0;
  const pendingSyncs = new Map<
    number,
    { done: () => void; timeout: ReturnType<typeof setTimeout> }
  >();

  const onReport = (event: MessageEvent<Reported>) => {
    const message = event.data;
    if (message.t === "synced") {
      const pending = pendingSyncs.get(message.token);
      if (pending === undefined) return;
      pendingSyncs.delete(message.token);
      clearTimeout(pending.timeout);
      pending.done();
      return;
    }
    if (message.id !== planId) return;
    switch (message.t) {
      case "started":
        started = true;
        report.started(message.at, message.offset);
        return;
      case "looped":
        report.looped(message.at, message.cycle);
        return;
      case "xrun":
        report.xrun(message.detail);
    }
  };
  reporter.port.addEventListener("message", onReport);
  // addEventListener on a port does not imply start(); assigning onmessage would have.
  reporter.port.start();

  /**
   * Hand the reporter the plan it counts against. `resume` says the source is already running
   * and this is a re-anchoring rather than a start, so the processor keeps its "it started" fact
   * and never reports a cycle number it has already reported (0031).
   */
  function postPlan(resume: boolean): void {
    if (plan === null) return;
    reporter.port.postMessage({ ...plan, id: planId, base: cycleBase, resume });
  }

  /**
   * The lane clock: the audio clock while the transport is sounding, and the reading it was frozen
   * at while it is not (0040). Never behind the source — inside the lookahead nothing sounds yet,
   * so nothing has advanced, and arming from `currentTime` there would lay a cycle down before the
   * first sample of it could be heard.
   */
  function laneNow(): number {
    if (laneHeldAt !== null) return laneHeldAt;
    // The two move together: `halt` is the only place a plan is torn down and it freezes the lane
    // clock, `start` is the only place one is built and it releases it. Running without one is a
    // bug in that pairing, and a silent `currentTime` here would be drift nobody could find.
    if (plan === null) throw new Error("lane clock running with no transport");
    return Math.max(ctx.currentTime, plan.startTime);
  }

  /**
   * Freeze the lanes where they stand. Every halt comes through here, so the phase a pause is
   * holding is the same phase a stop, a reload or a loop move holds (0040).
   */
  function holdLanes(): void {
    laneHeldAt ??= laneNow();
  }

  /**
   * Carry every lane over the gap the transport was silent for: the anchors move by exactly that
   * gap, so each lane's phase at `at` is the phase the halt froze it at, and cycle counting picks
   * up mid-cycle rather than starting the gesture again (0040).
   */
  function releaseLaneClock(at: number): void {
    if (laneHeldAt === null) throw new Error("lane clock released twice");
    const gap = at - laneHeldAt;
    for (const lane of lanes.values()) lane.anchor += gap;
    laneHeldAt = null;
  }

  /**
   * Schedule every cycle of every held lane that begins inside the horizon and has not been armed
   * yet. A lane repeats on its own length — the gesture's, not the loop's — from the anchor it
   * has carried since it was recorded, so two lanes of different lengths drift against each other
   * and against the waveform, and the same lane keeps its phase across a loop change, a rate
   * change, a pause and a stop (0035, 0040).
   */
  function armLanes(): void {
    if (plan === null || lanes.size === 0) return;
    const from = laneNow();
    for (const lane of lanes.values()) {
      if (lane.span <= 0) {
        // A lane that never moved has no cycle to repeat: one schedule, from here, and no more.
        if (lane.armed > 0) continue;
        lane.armed = 1;
        chain.setAutomation(lane.instance, lane.param, lane.points, lane.base, from);
        continue;
      }
      // The cycle the clock is already inside is the one to arm first, so a lane released
      // mid-cycle is heard from where that cycle has reached rather than at the next one, and a
      // lane that has been held through a long stop never lays its history out again.
      const current = Math.floor((from - lane.anchor) / lane.span);
      if (lane.armed < current) lane.armed = current;
      const wanted = Math.min(
        lane.armed + MAX_AUTOMATION_CYCLES,
        Math.floor((from + AUTOMATION_HORIZON_SECS - lane.anchor) / lane.span) + 1,
      );
      // Ascending, and each cycle replaces only what was scheduled from its own start, so arming
      // the next one never disturbs the one currently sounding.
      for (; lane.armed < wanted; lane.armed++) {
        const origin = lane.anchor + lane.armed * lane.span;
        chain.setAutomation(lane.instance, lane.param, lane.points, lane.base, origin);
      }
    }
  }

  /**
   * Start or stop the arming tick, which runs exactly while there are lanes and a transport to
   * play them. Offline it never fires — a render has no main thread listening — so the offline
   * host calls `armAutomation` at the same cadence from inside the render instead.
   */
  function retick(): void {
    const wanted = sounding() && (lanes.size > 0 || player.held() !== null);
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
    armLanes();
    player.arm();
  }

  /** Give every automated parameter back to its manual value. What stopping sounds like. */
  function releaseLanes(): void {
    for (const lane of lanes.values()) {
      lane.armed = 0;
      chain.setParam(lane.instance, lane.param, lane.base, ctx.currentTime);
    }
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
    const current = playing;
    if (current === null && !player.running()) return;
    // Both before the plan goes: the lane clock is read off it, and every value the release
    // cancels was scheduled against the plan being torn down.
    holdLanes();
    releaseLanes();
    playing = null;
    plan = null;
    // Every step still ahead of the clock goes with the pass — those are the ones that must not
    // sound — and the pattern goes too: the next play draws it again from the seed (0089).
    player.stop();
    // Invalidates every report still in flight from the plan being halted (see planId above).
    planId += 1;
    if (current !== null) {
      // The `ended` listener stays registered and fires anyway — it reads this flag rather than
      // being removed, because a stop() and a natural end can be in flight at the same instant.
      current.cancelled = true;
      if (reason !== "ended") current.source.stop();
      current.source.disconnect();
    }
    // The chain keeps speed and pitch; what it lets go of is the node they were written onto.
    chain.bindSource(null);
    reporter.port.postMessage(null);
    // Only a start the reporter confirmed gets a stop: a play cancelled inside the lookahead
    // never sounded, and a `stopped` for it would be an event for a transport that never ran.
    // So that pair logs *nothing* — deliberately: the log records what the instrument did,
    // and it did not play. probe() still answers for the session either way.
    if (started) report.stopped(reason, pausedAt);
    started = false;
    retick();
  }

  /**
   * Where a start begins in the buffer, and how far into the current cycle that is. A resume
   * inside the loop begins where it was held and wraps at the same edge; a fresh play, or a held
   * position the loop has since moved away from, begins at the top of the cycle (0038).
   */
  function startAt(resumeAt: number | undefined): { offset: number; phase: number } {
    if (loop === null) return { offset: resumeAt ?? 0, phase: 0 };
    const offset = resumeAt !== undefined && insideLoop(resumeAt, loop) ? resumeAt : loop.in;
    return { offset, phase: offset - loop.in };
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

  /**
   * The pass a deck with no pattern plays: one source over the whole loop, from wherever a pause
   * left the playhead. Returns the plan both readers count against — cycle counts on the audio
   * thread (loop-reporter.js) and the remainder as peek()'s position, both from lib/timeline.ts.
   */
  function ordinaryPass(held: AudioBuffer, resumeAt: number | undefined, at: number): PlayPlan {
    const source = ctx.createBufferSource();
    source.buffer = held;
    source.connect(chain.input);
    // Speed and pitch bind to AudioParams on this node, so the chain writes them onto it (0031).
    chain.bindSource(source);

    const { offset, phase } = startAt(resumeAt);
    if (loop !== null) {
      source.loop = true;
      source.loopStart = loop.in;
      source.loopEnd = loop.out;
    }

    const current = { source, cancelled: false };
    source.addEventListener(
      "ended",
      () => {
        if (!current.cancelled) halt("ended");
      },
      { once: true },
    );

    source.start(at, offset);
    playing = current;
    // One plan, two readers, both from src/lib/timeline.ts: cycle counts on the audio thread
    // (loop-reporter.js) and the remainder as peek()'s position. A play anchors it with nothing
    // behind it — a rate rebase (0031) and a resume mid-loop (0038) give `phase` a value.
    return {
      startTime: at,
      offset: loop === null ? offset : loop.in,
      period: loop === null ? 0 : loop.out - loop.in,
      rate: chain.rate(),
      phase,
    };
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
    plan = player.begin(buffer, loop, at, chain.rate()) ?? ordinaryPass(buffer, resumeAt, at);
    planId += 1;
    cycleBase = 0;
    started = false;
    postPlan(false);
    // The lanes count again from where the last halt left them, at the first audible sample.
    releaseLaneClock(at);
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
      const at = startAt(clamp(position, 0, buffer.duration)).offset;
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
    setSync: player.setSync,

    setParam: (instance, param, value) => {
      const now = ctx.currentTime;
      chain.setParam(instance, param, value, now);
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
      chain.endGesture();
    },

    setAutomation: (instance, param, lane, base) => {
      const key = paramKey(instance, param);
      if (lane.length === 0) {
        lanes.delete(key);
        // Clearing is heard immediately, playing or not: the parameter is back to being the one
        // the performer left the knob at.
        chain.setParam(instance, param, base, ctx.currentTime);
        retick();
        return;
      }
      // The anchor is the instant the gesture was recorded, on the lane clock, and the lane counts
      // its own cycles from there for as long as it is held — across loop changes, pauses, stops
      // and re-plays, none of which advance it (0035, 0040).
      // The same gesture arriving again is that lane being re-based onto a new manual value or
      // stretched onto a new span, not a new recording: it keeps the phase it is in the middle
      // of, and only its schedule is redrawn (0079).
      const held = lanes.get(key);
      const rebase = held !== undefined && sameGesture(held.points, lane);
      lanes.set(key, {
        instance,
        param,
        points: lane,
        base,
        span: laneSpan(lane),
        anchor: rebase ? held.anchor : laneNow(),
        armed: 0,
      });
      armLanes();
      retick();
    },

    addEffect: (instance, effect, values) => chain.addEffect(instance, effect, values),

    setEffectBypass: (instance, bypassed) => {
      chain.setEffectBypass(instance, bypassed);
    },

    removeEffect: (instance) => {
      // Every lane this instance held goes with it: a lane belongs to the instance, and the
      // instance is gone (0030).
      for (const [key, lane] of lanes) if (lane.instance === instance) lanes.delete(key);
      retick();
      chain.removeEffect(instance);
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
      chain.meters(out.meters);
      // The same clock the arming lays cycles against, so what a surface paints cannot drift from
      // what is scheduled — including inside the lookahead, and while the transport is halted,
      // where it is the phase the lanes are holding and will resume from (0040).
      const at = laneNow();
      // Refilled, never cleared: `Map.clear()` throws its backing table away and allocates a
      // fresh one — 28 bytes a call, measured, on the one read every surface makes every frame
      // (0070). Overwriting a key that is already there allocates nothing, so the only frame
      // that pays is the one where a lane actually went away.
      for (const [key, lane] of lanes) {
        out.automation.set(key, lane.span <= 0 ? 0 : (at - lane.anchor) % lane.span);
      }
      // Every live lane is now in `out`, so `out` holds the lanes and possibly some departed
      // ones — which is exactly what a bigger size means, and the only case worth walking.
      if (out.automation.size !== lanes.size) {
        for (const key of out.automation.keys()) if (!lanes.has(key)) out.automation.delete(key);
      }
    },

    syncReports: () =>
      new Promise<void>((done, reject) => {
        const token = nextSyncToken++;
        const timeout = setTimeout(() => {
          pendingSyncs.delete(token);
          reject(new Error(`audio reporter did not acknowledge sync ${token}`));
        }, 5_000);
        pendingSyncs.set(token, { done, timeout });
        reporter.port.postMessage({ t: "sync", token });
      }),
    dispose: () => {
      halt("command");
      reporter.port.removeEventListener("message", onReport);
      reporter.port.close();
      reporter.disconnect();
      for (const pending of pendingSyncs.values()) clearTimeout(pending.timeout);
      pendingSyncs.clear();
      lanes.clear();
      retick();
      chain.dispose();
    },
  };
}
