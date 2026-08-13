// A MessagePort's postMessage has no targetOrigin argument — that parameter belongs to
// window.postMessage, which this file never calls. The rule cannot tell the two apart.
// oxlint-disable unicorn/require-post-message-target-origin

/**
 * @role One deck's voice: a buffer, the chain it plays through, and a schedule-ahead transport.
 *   It reports what the graph did through callbacks — it never names an event, and it has never
 *   heard of a deck id, which is what keeps `audio` from having to import a tier above it.
 * @instead Deciding which deck this is, or turning a report into an event → src/app/engine.ts.
 */
import { buildDeckChain, type DeckChain } from "./chain";
import type { ParamId } from "./params";

/**
 * How far ahead playback is scheduled. Everything is started at an explicit time in the future
 * rather than "now": react-on-time transport is at the mercy of whatever the main thread was
 * doing, and its errors are inaudible in a test and obvious in a room.
 */
export const LOOKAHEAD_SECS = 0.05;

/** What the graph tells the tier above. `at` is audio time, from the thread that knows it. */
export type DeckReport = {
  started(at: number, offset: number): void;
  looped(at: number, cycle: number): void;
  stopped(reason: "ended" | "command"): void;
  xrun(detail: string): void;
};

export type DeckVoice = {
  load(buffer: AudioBuffer): void;
  /** Starts LOOKAHEAD_SECS from now. Playing an already-playing deck restarts it. */
  play(): void;
  stop(): void;
  /** `out` at or below `in` clears the loop. Returns what was actually applied. */
  setLoop(inSecs: number, outSecs: number): { in: number; out: number } | null;
  setParam(param: ParamId, value: number): void;
  dispose(): void;
};

type Loop = { in: number; out: number };

/**
 * `reporter` is a node built on the loop-reporter processor, and the single source of the
 * "it started" and "it looped round" facts. It is connected by the caller.
 *
 * Over the line cap by design: what this holds is one transport's whole state machine —
 * buffer, loop, the source currently playing and whose end was asked for. Splitting it means
 * handing those four between helpers with one caller each, which is how the invariant that
 * `playing` and the reporter's plan move together gets broken. See
 * docs/decisions/0007-reviewed-oversized-functions.md.
 */
// oxlint-disable-next-line max-lines-per-function
export function createDeckVoice(
  ctx: AudioContext,
  destination: AudioNode,
  reporter: AudioWorkletNode,
  report: DeckReport,
): DeckVoice {
  const chain: DeckChain = buildDeckChain(ctx, destination);
  let buffer: AudioBuffer | null = null;
  let loop: Loop | null = null;
  /** The playing source, and whether its end was asked for — `onended` fires either way. */
  let playing: { source: AudioBufferSourceNode; cancelled: boolean } | null = null;

  /** What the processor posts back. Its own shape, declared where it is read (see worklets/). */
  type Reported =
    | { t: "started"; at: number; offset: number }
    | { t: "looped"; at: number; cycle: number };

  const onReport = (event: MessageEvent<Reported>) => {
    const message = event.data;
    if (message.t === "started") report.started(message.at, message.offset);
    else report.looped(message.at, message.cycle);
  };
  reporter.port.addEventListener("message", onReport);
  // addEventListener on a port does not imply start(); assigning onmessage would have.
  reporter.port.start();

  function halt(reason: "ended" | "command"): void {
    const current = playing;
    if (current === null) return;
    playing = null;
    // The `ended` listener stays registered and fires anyway — it reads this flag rather than
    // being removed, because a stop() and a natural end can be in flight at the same instant.
    current.cancelled = true;
    if (reason === "command") current.source.stop();
    current.source.disconnect();
    reporter.port.postMessage(null);
    report.stopped(reason);
  }

  function start(): void {
    // The tier above checks that something is loaded and says so on the log; reaching here
    // without a buffer is a bug in that check, not a user error, so it is loud.
    if (buffer === null) throw new Error("deck.play with nothing loaded");
    halt("command");

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(chain.input);

    let offset = 0;
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

    const when = ctx.currentTime + LOOKAHEAD_SECS;
    source.start(when, offset);
    playing = current;
    reporter.port.postMessage({
      startTime: when,
      offset,
      period: loop === null ? 0 : loop.out - loop.in,
    });

    // The deadline the lookahead bought. Missing it means the main thread was blocked for
    // longer than the whole schedule-ahead window, and the start is late by however much —
    // never swallowed, always a line on the log (docs/plan.md §1).
    const late = ctx.currentTime - when;
    if (late > 0) report.xrun(`start scheduled ${(late * 1000).toFixed(1)}ms in the past`);
  }

  return {
    load: (next) => {
      halt("command");
      buffer = next;
      loop = null;
    },

    play: start,

    stop: () => {
      halt("command");
    },

    setLoop: (inSecs, outSecs) => {
      const length = buffer?.duration ?? 0;
      const from = Math.min(Math.max(inSecs, 0), length);
      const to = Math.min(Math.max(outSecs, 0), length);
      const wasPlaying = playing !== null;
      loop = to > from ? { in: from, out: to } : null;
      // Restarting is what keeps the cycle count honest: the reporter counts cycles from a
      // known start, so moving the loop under a running source would leave it counting from a
      // phase the source no longer has. A loop change is a transport change here — one code
      // path, the same one `play` uses, and it sounds like what it is.
      if (wasPlaying) start();
      return loop;
    },

    setParam: (param, value) => {
      chain.setParam(param, value, ctx.currentTime);
    },

    dispose: () => {
      halt("command");
      reporter.port.removeEventListener("message", onReport);
      reporter.disconnect();
      chain.dispose();
    },
  };
}
