/**
 * @role The transport's scheduling constants — a leaf with no imports, so scripts/smoke (plain
 *   Node, type-stripping) reads the same numbers the graph schedules with instead of restating
 *   them.
 * @instead The transport itself → src/audio/deck.ts. Nothing here computes; a constant that
 *   needs a context or a buffer belongs beside the code that has one.
 */

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

/**
 * How far past the clock a deck arms its automation lanes. Every pass whose start falls inside
 * this window is scheduled at once, and the window moves forward again at each loop boundary the
 * reporter announces. It is a window rather than the single next pass because an offline render
 * has no main thread listening while it runs: what it hears is what was armed before it started.
 */
export const AUTOMATION_HORIZON_SECS = 8;

/**
 * The most passes one arming may schedule. The horizon divided by a very short loop is a lot of
 * AudioParam events for a gesture nobody can hear repeat that fast; this is the ceiling on it.
 */
export const MAX_AUTOMATION_PASSES = 64;
