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

/**
 * The render quantum — the block size every AudioWorkletProcessor is called with, fixed by the
 * spec. A loop shorter than one of these completes more than once between two consecutive
 * observations of the clock, which is where a well-formed command turns into an unbounded
 * catch-up on the audio thread: `{"t":"deck.loop","in":0,"out":1e-9}` is a second away from a
 * billion cycles to report. It is also the shortest loop that can mean anything musically.
 */
export const RENDER_QUANTUM = 128;

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
  /**
   * `out` at or below `in` clears the loop, as does anything shorter than a render quantum.
   * Returns what was actually applied, which is what the session and the log then carry.
   */
  setLoop(inSecs: number, outSecs: number): { in: number; out: number } | null;
  setParam(param: ParamId, value: number): void;
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

  /** The shortest loop this context can report a boundary for. See RENDER_QUANTUM. */
  const minLoop = RENDER_QUANTUM / ctx.sampleRate;

  /** What the processor posts back. Its own shape, declared where it is read (see worklets/). */
  type Reported =
    | { t: "started"; at: number; offset: number }
    | { t: "looped"; at: number; cycle: number }
    | { t: "xrun"; detail: string };

  const onReport = (event: MessageEvent<Reported>) => {
    const message = event.data;
    switch (message.t) {
      case "started":
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
      // Floored as well as clamped. A loop of 1e-9 is a well-formed command off the wire, and
      // anything below a render quantum cannot be reported once per cycle — it is an unbounded
      // catch-up on the audio thread, not a loop. So it is no loop: `to <= from` already means
      // "clear", and this widens that to "clear unless it is long enough to be real". Never
      // silent — the caller returns this, so `deck.loop.changed` carries the null.
      loop = to - from >= minLoop ? { in: from, out: to } : null;
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
  };
}
