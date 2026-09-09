/**
 * @role The counters `stats()` answers with, and the one of them nobody in this app owns: the
 *   browser's heap. A file of its own rather than a header on src/app/facade.ts, for the reason
 *   src/app/runtime.ts is one — the hard 800-line cap is not waivable, and this is the piece of
 *   that file with no coordination in it (0045, 0112).
 * @instead Who fills these in → src/app/facade.ts. What the debug console draws them as →
 *   src/ui/DebugConsole.tsx.
 */
/**
 * Whether the instrument is keeping up, as numbers: the counters the debug console shows. Each
 * one is read from the single owner that already has it — the bus, the queue, the pending loads,
 * the analyzer and the context — so nothing here is a second tally kept in parallel. The one
 * exception is `heapMb`, which has no in-app owner at all: only the browser knows the heap, and
 * only some browsers will say.
 */
export type Stats = {
  /** The clock every envelope is scheduled against. */
  at: number;
  /** Events ever stamped, and how many of them the ring no longer holds. */
  events: number;
  dropped: number;
  /** Envelopes waiting for a pump. */
  queued: number;
  /** Loads still decoding, and buffers the analysis worker has not answered. */
  decoding: number;
  analyzing: number;
  /** The audio clock's state, or "none" for a spine running with no graph at all. */
  context: AudioContextState | "none";
  /**
   * The audio thread's average load, 0..1, or null when the browser cannot answer and while
   * nothing is measuring. Never 0 for "unknown": a counter nobody measured must not read as a
   * measured zero (0063).
   */
  audioLoad: number | null;
  /** The JS heap in megabytes, or null in a browser that does not expose it (0063). */
  heapMb: number | null;
  /**
   * What the decode cache's buffers weigh, in megabytes. Not nullable: a spine with no audio
   * host holds no buffers, so its zero is a fact and not an unanswered question (0063).
   */
  bufferMb: number;
};

/**
 * `performance.memory` is a non-standard Chromium extension, absent everywhere else, so the
 * narrow shape read here is declared beside that one read rather than as a global.
 */
type HeapMemory = { memory?: { usedJSHeapSize: number } };

/** What a megabyte is, for the two counters that are said in them. */
export const BYTES_PER_MB = 1024 * 1024;

/**
 * How often the heap is actually asked for. Every other counter is a field somebody already
 * holds, but `performance.memory` is a getter that builds a fresh object per access — a per-frame
 * read of it would allocate sixty times a second inside the one function that must not
 * (docs/plan.md §3), and grow the very number it reports. Chromium quantises the value anyway, so
 * a slower read loses nothing.
 *
 * Timed on wall time and not on `clock.now()`: the audio clock stands still while the context is
 * suspended, which is exactly when a debugger is looking, and a counter frozen on a frozen clock
 * would report the heap it had when the page loaded forever.
 */
export const HEAP_READ_INTERVAL_MS = 500;

/**
 * The heap in megabytes, or null in a browser that does not expose it (0063). Read through the
 * narrow shape above rather than a global, because it is one non-standard getter and nothing else
 * in the app may reach for it.
 */
export function heapMb(): number | null {
  // The one place a non-standard getter is narrowed; there is no type guard for a shape the
  // platform does not declare.
  // oxlint-disable-next-line no-unsafe-type-assertion
  const heap = (performance as Performance & HeapMemory).memory?.usedJSHeapSize;
  return heap === undefined ? null : heap / BYTES_PER_MB;
}
