// A MessagePort's postMessage has no targetOrigin argument — that parameter belongs to
// window.postMessage, which this file never calls. The rule cannot tell the two apart.
// oxlint-disable unicorn/require-post-message-target-origin
// The voice is one closure over one buffer, one chain and one transport, and the length is
// mostly its delegating surface — each rack method is three lines that add no branch. Splitting
// it would separate the schedule-ahead state from the methods that read it (0007).
// oxlint-disable max-lines

/**
 * @role One deck's voice: a buffer, the chain it plays through, and a schedule-ahead transport.
 *   It reports what the graph did through callbacks — it never names an event, and it has never
 *   heard of a deck id, which is what keeps `audio` from having to import a tier above it.
 * @instead Deciding which deck this is, or turning a report into an event → src/app/engine.ts.
 */
import { clamp } from "@/lib/range";
import { cycleTimeAt, cyclesAt, playheadAt, type PlayPlan } from "@/lib/timeline";
import { buildDeckChain, type DeckChain } from "./chain";
import type { EffectInstanceId } from "./effects/contract";
import type { EffectId } from "./effects/registry";
import type { AutomationPoint } from "@/lib/automation";
import { paramKey, type AutomationParamId, type EffectParamValues, type ParamId } from "./params";
import {
  AUTOMATION_HORIZON_SECS,
  LOOKAHEAD_SECS,
  MAX_AUTOMATION_PASSES,
  RENDER_QUANTUM,
} from "./transport";

// Defined in ./transport — a leaf plain Node can import — but this file is the transport, so
// its importers get the constants here and never need to know about the split.
export {
  AUTOMATION_HORIZON_SECS,
  LOOKAHEAD_SECS,
  MAX_AUTOMATION_PASSES,
  RENDER_QUANTUM,
} from "./transport";

/**
 * What the graph tells the tier above. `at` is audio time, from the thread that knows it —
 * graph-input time, strictly: the master bus (compressor + oversampled shaper) delays the
 * audible output by a fixed few hundred frames, so an `at` correlated against rendered samples
 * leads the waveform by that much. The plan's own arithmetic is exact; the bus cost is flat.
 */
export type DeckReport = {
  started(at: number, offset: number): void;
  looped(at: number, cycle: number): void;
  stopped(reason: "ended" | "command"): void;
  xrun(detail: string): void;
};

/** The per-frame read, written in place so a 60fps caller allocates nothing (docs/plan.md §4). */
export type DeckPeek = { position: number; meter: number };

export type DeckVoice = {
  load(buffer: AudioBuffer): void;
  /** Starts LOOKAHEAD_SECS from now. Playing an already-playing deck restarts it. */
  play(at?: number): void;
  stop(): void;
  /** Whether a source is planned, including the lookahead before its started report. */
  planned(): boolean;
  /**
   * `out` at or below `in` clears the loop, as does anything shorter than a render quantum.
   * Returns what was actually applied, which is what the session and the log then carry.
   */
  setLoop(inSecs: number, outSecs: number): { in: number; out: number } | null;
  setParam(instance: EffectInstanceId | null, param: ParamId, value: number): void;
  /**
   * Hold a lane against this deck, or drop it when `lane` is empty. Nothing is heard until the
   * transport arms it: the points are gesture-relative, and this voice decides which pass each
   * copy of them belongs to (0028).
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
  /** Writes the playhead and meter into `out` — silence and zero when nothing is playing. */
  peek(out: DeckPeek): void;
  /** Resolves after the reporter has received every plan and returned every prior report. */
  syncReports(): Promise<void>;
  /** Permanently disconnect this voice and cancel its pending transport/report state. */
  dispose(): void;
};

type Loop = { in: number; out: number };

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
  let buffer: AudioBuffer | null = null;
  let loop: Loop | null = null;
  /** The playing source, and whether its end was asked for — `onended` fires either way. */
  let playing: { source: AudioBufferSourceNode; cancelled: boolean } | null = null;
  /** The reporter's plan, mirrored so peek() can read a position from the same arithmetic. */
  let plan: PlayPlan | null = null;
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
   * than scheduled on arrival: a lane recorded while the deck is stopped has no pass to play
   * against yet, and one recorded mid-pass is heard from wherever that pass has reached (0028).
   */
  const lanes = new Map<
    string,
    {
      instance: EffectInstanceId | null;
      param: AutomationParamId;
      points: readonly AutomationPoint[];
      base: number;
    }
  >();
  /** How many passes of the current plan have been armed — the next one to schedule. */
  let armedPasses = 0;

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
        // The boundary is also the schedule-ahead tick: each pass that completes moves the
        // horizon, so a lane keeps being armed for as long as the loop keeps going round.
        armLanes();
        report.looped(message.at, message.cycle);
        return;
      case "xrun":
        report.xrun(message.detail);
    }
  };
  reporter.port.addEventListener("message", onReport);
  // addEventListener on a port does not imply start(); assigning onmessage would have.
  reporter.port.start();

  /** Which pass of the running plan the clock is inside; 0 before it starts, and unlooped. */
  function currentPass(): number {
    if (plan === null) return 0;
    return cyclesAt(ctx.currentTime, plan);
  }

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
   * Schedule every held lane onto every pass that begins inside the horizon and has not been
   * armed yet. A lane's `at` is time from the start of its own gesture, so each pass gets the
   * same points offset by that pass's start: the recording repeats identically however it was
   * captured, and the phase the playhead happened to have when it was is discarded (0028).
   */
  function armLanes(): void {
    if (plan === null || lanes.size === 0) return;
    const horizon = Math.max(ctx.currentTime, plan.startTime) + AUTOMATION_HORIZON_SECS;
    // A pass lasts `period / rate` seconds, so the horizon holds fewer of them the slower the
    // deck runs — the same plan arithmetic the playhead and the reporter read (0031).
    const wanted =
      plan.period > 0
        ? Math.min(armedPasses + MAX_AUTOMATION_PASSES, cyclesAt(horizon, plan) + 1)
        : 1;
    // Ascending, and each pass replaces only what was scheduled from its own start, so arming
    // the next one never disturbs the one currently sounding.
    for (; armedPasses < wanted; armedPasses++) {
      const origin = plan.period > 0 ? cycleTimeAt(armedPasses, plan) : plan.startTime;
      for (const lane of lanes.values())
        chain.setAutomation(lane.instance, lane.param, lane.points, lane.base, origin);
    }
  }

  /** Give every automated parameter back to its manual value. What stopping sounds like. */
  function releaseLanes(): void {
    armedPasses = 0;
    for (const lane of lanes.values())
      chain.setParam(lane.instance, lane.param, lane.base, ctx.currentTime);
  }

  function halt(reason: "ended" | "command"): void {
    const current = playing;
    if (current === null) return;
    // Before the plan goes: the release reads the clock, and every value it cancels was scheduled
    // against the plan being torn down.
    releaseLanes();
    playing = null;
    plan = null;
    // Invalidates every report still in flight from the plan being halted (see planId above).
    planId += 1;
    // The `ended` listener stays registered and fires anyway — it reads this flag rather than
    // being removed, because a stop() and a natural end can be in flight at the same instant.
    current.cancelled = true;
    if (reason === "command") current.source.stop();
    current.source.disconnect();
    // The chain keeps speed and pitch; what it lets go of is the node they were written onto.
    chain.bindSource(null);
    reporter.port.postMessage(null);
    // Only a start the reporter confirmed gets a stop: a play cancelled inside the lookahead
    // never sounded, and a `stopped` for it would be an event for a transport that never ran.
    // So that pair logs *nothing* — deliberately: the log records what the instrument did,
    // and it did not play. probe() still answers for the session either way.
    if (started) report.stopped(reason);
    started = false;
  }

  function start(resumeAt?: number, startAt?: number): void {
    // The tier above checks that something is loaded and says so on the log; reaching here
    // without a buffer is a bug in that check, not a user error, so it is loud.
    if (buffer === null) throw new Error("deck.play with nothing loaded");
    halt("command");

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(chain.input);
    // Speed and pitch bind to AudioParams on this node, so the chain writes them onto it (0031).
    chain.bindSource(source);

    let offset = resumeAt ?? 0;
    if (loop !== null) {
      source.loop = true;
      source.loopStart = loop.in;
      source.loopEnd = loop.out;
      offset = loop.in;
    }

    const current = { source, cancelled: false };
    source.addEventListener(
      "ended",
      () => {
        if (!current.cancelled) halt("ended");
      },
      { once: true },
    );

    const when = startAt ?? ctx.currentTime + LOOKAHEAD_SECS;
    source.start(when, offset);
    playing = current;
    // One plan, three readers, all from src/lib/timeline.ts: cycle counts on the audio thread
    // (loop-reporter.js), the remainder as peek()'s position, and the lane arming's pass origins.
    // A play anchors it with nothing behind it — only a rebase gives `phase` a value (0031).
    plan = {
      startTime: when,
      offset,
      period: loop === null ? 0 : loop.out - loop.in,
      rate: chain.rate(),
      phase: 0,
    };
    planId += 1;
    cycleBase = 0;
    started = false;
    postPlan(false);
    armedPasses = 0;
    armLanes();
  }

  return {
    load: (next) => {
      halt("command");
      buffer = next;
      loop = null;
    },

    // Wrapped rather than exposed: start()'s resume offset is setLoop's business, not play's.
    play: (at) => {
      start(undefined, at);
    },

    stop: () => {
      halt("command");
    },

    planned: () => playing !== null,

    setLoop: (inSecs, outSecs) => {
      const length = buffer?.duration ?? 0;
      const from = clamp(inSecs, 0, length);
      const to = clamp(outSecs, 0, length);
      const wasPlaying = playing !== null;
      // Floored as well as clamped. A loop of 1e-9 is a well-formed command off the wire, and
      // anything below a render quantum cannot be reported once per cycle — it is an unbounded
      // catch-up on the audio thread, not a loop. So it is no loop: `to <= from` already means
      // "clear", and this widens that to "clear unless it is long enough to be real". Never
      // silent — the caller returns this, so `deck.loop.changed` carries the null.
      const previous = loop;
      loop = to - from >= minLoop() ? { in: from, out: to } : null;
      // Restarting is what keeps the cycle count honest: the reporter counts cycles from a
      // known start, so moving the loop under a running source would leave it counting from a
      // phase the source no longer has. A loop change is a transport change here — one code
      // path, the same one `play` uses, and it sounds like what it is. But only a *change*: a
      // command that resolves to the loop already playing (a refused drag, a repeated command)
      // has moved nothing, and restarting for it would throw the playhead away for free.
      const changed =
        previous === null || loop === null
          ? previous !== loop
          : previous.in !== loop.in || previous.out !== loop.out;
      if (wasPlaying && changed) {
        // A move restarts at the new loop's in — but a *clear* is not a move: the cycle-count
        // rationale above has nothing to count any more, and restarting a cleared deck at
        // offset 0 would audibly throw it back to the top of the file. It continues instead,
        // from where the playhead will be when the replacement source starts.
        const resumeAt =
          loop === null && plan !== null
            ? playheadAt(ctx.currentTime + LOOKAHEAD_SECS, plan, length)
            : undefined;
        start(resumeAt);
      }
      return loop;
    },

    setParam: (instance, param, value) => {
      const now = ctx.currentTime;
      chain.setParam(instance, param, value, now);
      // A rate change is a transport change, but it is emphatically not a restart: the source
      // keeps playing, its native loop keeps looping, and only the arithmetic has to be told.
      // Re-anchoring the plan at `now`, with the position the old rate had reached as its phase,
      // is what leaves the playhead exactly where it was and the cycle count where it was (0031).
      if (instance !== null || plan === null || chain.rate() === plan.rate) return;
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
      // The passes already armed were laid against the old rate's origins, so everything from
      // the pass the clock is inside is scheduled again against the new ones.
      armedPasses = currentPass();
      armLanes();
    },

    setAutomation: (instance, param, lane, base) => {
      const key = paramKey(instance, param);
      if (lane.length === 0) {
        lanes.delete(key);
        // Clearing is heard immediately, playing or not: the parameter is back to being the one
        // the performer left the knob at.
        chain.setParam(instance, param, base, ctx.currentTime);
        return;
      }
      lanes.set(key, { instance, param, points: lane, base });
      // Re-arm from the pass the clock is inside, so a lane released mid-pass is picked up
      // where that pass has already reached rather than waiting for the next one.
      armedPasses = currentPass();
      armLanes();
    },

    addEffect: (instance, effect, values) => chain.addEffect(instance, effect, values),

    setEffectBypass: (instance, bypassed) => {
      chain.setEffectBypass(instance, bypassed);
    },

    removeEffect: (instance) => {
      // Every lane this instance held goes with it: a lane belongs to the instance, and the
      // instance is gone (0030).
      for (const [key, lane] of lanes) if (lane.instance === instance) lanes.delete(key);
      chain.removeEffect(instance);
    },

    reorderEffects: (order) => {
      chain.reorderEffects(order);
    },

    peek: (out) => {
      out.position =
        plan === null || buffer === null ? 0 : playheadAt(ctx.currentTime, plan, buffer.duration);
      out.meter = chain.level();
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
      chain.dispose();
    },
  };
}
