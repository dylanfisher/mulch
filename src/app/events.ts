/**
 * @role The event union — every state change and audio milestone, stamped with a gapless
 *       `seq` and the audio clock. The log is the ground truth of what the instrument did.
 */
import type { PlayerSpec } from "@/lib/player";
import type { StopReason } from "@/audio/deck";
import type { ParamId } from "@/audio/params";
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { EffectId } from "@/audio/effects/registry";
import type { AutomationPoint } from "@/lib/automation";
import type { BlobId } from "@/lib/source";
import type { ClipId } from "@/state/session";
import type { DeckId } from "@/state/store";

export type EventBody =
  // A deck arriving and leaving are the two facts every other deck event depends on. Removal
  // says nothing about what it held: the log already carried all of it (0029).
  | { t: "deck.added"; deck: DeckId }
  | { t: "deck.removed"; deck: DeckId }
  // One yard copied onto another. The `deck.added` and the whole restoration the copy arrived
  // through are already on the log ahead of it; this says which yard it was taken from (0078).
  | { t: "deck.duplicated"; deck: DeckId; to: DeckId }
  // One yard moved in the list, from the slot it held to the slot it landed on — the same
  // reading `effect.reordered` gives one rack card down (0111).
  | { t: "deck.reordered"; deck: DeckId; from: number; to: number }
  | { t: "deck.activated"; deck: DeckId }
  // Loading is where a source becomes real: a decode can fail and a generated one has a length
  // nobody stated, so the log carries what was actually made rather than what was asked for.
  | { t: "deck.loaded"; deck: DeckId; duration: number }
  // Analysis answered for what this deck holds. The tempo and how many onset candidates were
  // found; the candidates themselves are on probe() rather than repeated per event (0025).
  | { t: "deck.analyzed"; deck: DeckId; bpm: number; onsets: number }
  | { t: "deck.started"; deck: DeckId; offset: number }
  | { t: "deck.looped"; deck: DeckId; cycle: number }
  // The loop as it was actually applied — clamped to what is loaded, or null when cleared.
  // Named for the change, not the crossing: `deck.looped` is playback coming round again.
  | { t: "deck.loop.changed"; deck: DeckId; loop: { in: number; out: number } | null }
  // The player as it was actually held — the whole spec, or null for one that was switched off.
  // The seed is in it, which is what makes the log enough to replay the performance (0089).
  | { t: "deck.player.changed"; deck: DeckId; player: PlayerSpec | null }
  // Audio the instrument minted rather than the user imported: which region of what the deck was
  // holding, and the blob those bytes now live under. The `deck.loaded` just before it is the
  // deck picking the new source up through the ordinary path (0047).
  | { t: "deck.cropped"; deck: DeckId; blob: BlobId; in: number; out: number }
  // "ended" is the source running out on its own; "command" is a deck.stop, a reload or a
  // restart; "paused" is a stop that kept the playhead, which probe() reads back as the deck's
  // `paused` (0038). All three are the same fact — this deck is no longer playing — from
  // different causes.
  | { t: "deck.stopped"; deck: DeckId; reason: StopReason }
  // `instance` is absent for a deck parameter and names the rack entry for an effect's: a value
  // belongs to the pair, not to the parameter alone (0030).
  | { t: "param.changed"; deck: DeckId; instance?: EffectInstanceId; param: ParamId; value: number }
  | {
      t: "automation.changed";
      deck: DeckId;
      instance?: EffectInstanceId;
      param: ParamId;
      points: AutomationPoint[];
    }
  // One instance copied onto the end of the same rack. The `effect.added`, the values and the
  // bypass the copy arrived through are already on the log ahead of it; this says which instance
  // it was taken from, the way `deck.duplicated` does for a yard (0092).
  | {
      t: "effect.duplicated";
      deck: DeckId;
      instance: EffectInstanceId;
      to: EffectInstanceId;
      effect: EffectId;
    }
  // Every rack event carries both the instance that moved and what it is an instance of, because
  // two of them can be the same effect (0030).
  | { t: "effect.added"; deck: DeckId; instance: EffectInstanceId; effect: EffectId; index: number }
  // The rack as it was actually rewired. Bypass is named for the change, like
  // `deck.loop.changed`, because it carries both directions (0023).
  | {
      t: "effect.bypass.changed";
      deck: DeckId;
      instance: EffectInstanceId;
      effect: EffectId;
      bypassed: boolean;
    }
  /** `index` is where the instance was, so a reader knows what left the signal order. */
  | {
      t: "effect.removed";
      deck: DeckId;
      instance: EffectInstanceId;
      effect: EffectId;
      index: number;
    }
  | {
      t: "effect.reordered";
      deck: DeckId;
      instance: EffectInstanceId;
      effect: EffectId;
      from: number;
      to: number;
    }
  // The shared jump clock as it was actually held, in seconds, or null for yards each keeping
  // their own time. One event for the session rather than one per yard: it is one fact (0097).
  | { t: "session.sync.changed"; sync: number | null }
  | { t: "session.saved"; reason: "manual" | "autosave" }
  | { t: "session.restored" }
  /** Stored data that is not this build's shape: dropped, never repaired — pre-release (0026). */
  | { t: "session.discarded"; detail: string }
  | { t: "session.imported" }
  // A captured clip says which deck it was taken from; an applied one says which deck it landed
  // on. Both carry the id, because that is what every later clip command names (0027).
  | { t: "clip.captured"; clip: ClipId; name: string; deck: DeckId }
  | { t: "clip.renamed"; clip: ClipId; name: string }
  | { t: "clip.deleted"; clip: ClipId }
  | { t: "clip.applied"; clip: ClipId; deck: DeckId }
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
