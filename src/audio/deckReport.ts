/**
 * @role The shape of what one deck's graph tells the tier above: the four things a transport
 *   reports as they happen, and the reason it stopped.
 * @instead The voice that fills it → src/audio/deck.ts, which is at its hard line cap — this is
 *   the piece of it with no behaviour in it, moved out for the reason ./deckPeek.ts was and when
 *   an audition needed the room (0045, 0181). Turning a report into an event → src/app/engine.ts.
 */

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
