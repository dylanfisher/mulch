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
 * How far past the clock a deck arms its automation lanes. Every cycle of a lane that begins
 * inside this window is scheduled at once. It is a window rather than the single next cycle so that
 * every arming has a whole one of slack — see the re-arm cadence below, which both the live tick
 * and the offline pump keep to (0071).
 */
export const AUTOMATION_HORIZON_SECS = 8;

/**
 * How often a playing deck arms the next stretch of its lanes. Half the horizon, so every tick
 * has a whole horizon of slack: a lane is scheduled several seconds before it is heard, and a
 * missed tick costs nothing. A lane cycles on its own length rather than the deck's loop, so
 * there is no boundary report that could serve as this tick (0035).
 */
export const AUTOMATION_REARM_SECS = AUTOMATION_HORIZON_SECS / 2;

/**
 * The most cycles one arming may schedule. The horizon divided by a very short lane is a lot of
 * AudioParam events for a gesture nobody can hear repeat that fast; this is the ceiling on it.
 */
export const MAX_AUTOMATION_CYCLES = 64;

/**
 * The most steps one arming may schedule. Each is a source of its own, and a deck jumping around
 * the shortest slot it accepts would otherwise build one every 10ms across the whole horizon.
 * The cap has to cover the re-arm cadence or the pattern would starve between two ticks:
 * `PLAYER_MIN_SLOT_SECS * MAX_PLAYER_STEPS` is 5.12s against a 4s cadence.
 */
export const MAX_PLAYER_STEPS = 512;
