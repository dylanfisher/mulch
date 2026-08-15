/**
 * @role The event union — every state change and audio milestone, stamped with a gapless
 *       `seq` and the audio clock. The log is the ground truth of what the instrument did.
 */
import type { ParamId } from "@/audio/params";
import type { EffectId } from "@/audio/effects/registry";
import type { AutomationPoint } from "@/lib/automation";
import type { DeckId } from "@/state/store";

export type EventBody =
  | { t: "deck.activated"; deck: DeckId }
  // Loading is where a source becomes real: a decode can fail and a generated one has a length
  // nobody stated, so the log carries what was actually made rather than what was asked for.
  | { t: "deck.loaded"; deck: DeckId; duration: number }
  | { t: "deck.started"; deck: DeckId; offset: number }
  | { t: "deck.looped"; deck: DeckId; cycle: number }
  // The loop as it was actually applied — clamped to what is loaded, or null when cleared.
  // Named for the change, not the crossing: `deck.looped` is playback coming round again.
  | { t: "deck.loop.changed"; deck: DeckId; loop: { in: number; out: number } | null }
  // "ended" is the source running out on its own; "command" is a deck.stop, a reload or a
  // restart. Both are the same fact — this deck is no longer playing — from different causes.
  | { t: "deck.stopped"; deck: DeckId; reason: "ended" | "command" }
  | { t: "param.changed"; deck: DeckId; param: ParamId; value: number }
  | { t: "automation.changed"; deck: DeckId; param: ParamId; points: AutomationPoint[] }
  | { t: "effect.added"; deck: DeckId; effect: EffectId; index: number }
  // The rack as it was actually rewired. Bypass is named for the change, like
  // `deck.loop.changed`, because it carries both directions (0023).
  | { t: "effect.bypass.changed"; deck: DeckId; effect: EffectId; bypassed: boolean }
  /** `index` is where the effect was, so a reader knows what left the signal order. */
  | { t: "effect.removed"; deck: DeckId; effect: EffectId; index: number }
  | { t: "effect.reordered"; deck: DeckId; effect: EffectId; from: number; to: number }
  | { t: "session.saved"; reason: "manual" | "autosave" }
  | { t: "session.restored"; version: number }
  | { t: "session.imported"; version: number }
  | { t: "history.undone" }
  | { t: "history.redone" }
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
