/**
 * @role The event union — every state change and audio milestone, stamped with a gapless
 *       `seq` and the audio clock. The log is the ground truth of what the instrument did.
 */
import type { ParamId } from "@/audio/params";
import type { DeckId } from "@/state/store";

export type EventBody =
  // Loading is where a source becomes real: a decode can fail and a generated one has a length
  // nobody stated, so the log carries what was actually made rather than what was asked for.
  | { t: "deck.loaded"; deck: DeckId; duration: number }
  | { t: "deck.started"; deck: DeckId; offset: number }
  | { t: "deck.looped"; deck: DeckId; cycle: number }
  // "ended" is the source running out on its own; "command" is a deck.stop, a reload or a
  // restart. Both are the same fact — this deck is no longer playing — from different causes.
  | { t: "deck.stopped"; deck: DeckId; reason: "ended" | "command" }
  | { t: "param.changed"; deck: DeckId; param: ParamId; value: number }
  // xrun: a scheduling deadline we missed — never swallowed, always on the log.
  | { t: "xrun"; detail: string }
  | { t: "error"; detail: string };

export type Event = {
  /** Monotonic, gapless — a hole means the emitter dropped something. */
  seq: number;
  /** Clock time when it happened (ctx.currentTime once audio exists), not when reported. */
  at: number;
  /** performance.now(), for correlating with UI-thread work. */
  wall: number;
} & EventBody;
