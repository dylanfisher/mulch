/**
 * @role The command union and its envelope — the only way anything changes, JSON-serialisable
 *       by construction so a file of commands is a test, a macro and a repro.
 */
import type { PlayerSpec } from "@/lib/player";
import type { ParamId } from "@/audio/params";
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { EffectId } from "@/audio/effects/registry";
import type { BlobId, SourceRef } from "@/lib/source";
import type { AutomationPoint } from "@/lib/automation";
import type { ClipId } from "@/state/session";
import type { DeckId } from "@/state/store";

/** What a deck plays. Defined in src/lib/source.ts, because the session records the same shape. */
export type { SourceRef };

/** A fully parsed archive staged outside the command boundary; raw File never enters the wire. */
export type SessionArchiveHandle = { archiveId: string };

// No `when`/`delay`/`time` field ever appears in here — scheduling belongs to the envelope.
export type DurableEditCommand =
  // A deck's id is opaque and given, never derived and never an index — the same rule a clip's
  // is, and what lets a JSONL file add a deck and then address it by the name it wrote (0029).
  // `emoji` and `name` are drawn at the call site and stored with the deck, the way the id is: a
  // reducer that drew its own would make replay, restore and the fingerprint non-deterministic
  // (0057).
  | { t: "deck.add"; deck: DeckId; emoji: string; name: string }
  | { t: "deck.remove"; deck: DeckId }
  // One yard again: `deck` is the one being copied and `to`, `emoji` and `name` are the new one's,
  // drawn at the call site exactly as `deck.add`'s are. One id enters the session per command, and
  // the reducer mints the copied rack instances' ids from it — a caller that had to name every
  // instance would be rebuilding the deck rather than duplicating it (0029, 0078).
  | { t: "deck.duplicate"; deck: DeckId; to: DeckId; emoji: string; name: string }
  | { t: "deck.activate"; deck: DeckId }
  | { t: "deck.load"; deck: DeckId; source: SourceRef }
  | { t: "deck.loop"; deck: DeckId; in: number; out: number }
  // The only command that writes audio. `id` names the blob it is about to mint, the way
  // `effect.add` names the instance it creates — so a JSONL file that crops can then address the
  // bytes it made, and the same file replayed makes the same session (0029, 0047).
  | { t: "deck.crop"; deck: DeckId; id: BlobId }
  | { t: "deck.loop.toggle"; deck: DeckId }
  // The whole player at once, or null for a deck that plays its loop straight. One command rather
  // than one per field: the spec is a single durable record like `loop`, and a pattern half moved
  // is a pattern nobody asked for (0089).
  | { t: "deck.player"; deck: DeckId; player: PlayerSpec | null }
  // A value lookup is (instance, param): `instance` is absent for a deck parameter and names the
  // rack entry for an effect's, because a rack may hold two delays (0030).
  | { t: "param.set"; deck: DeckId; instance?: EffectInstanceId; param: ParamId; value: number }
  | {
      t: "automation.set";
      deck: DeckId;
      instance?: EffectInstanceId;
      param: ParamId;
      points: AutomationPoint[];
    }
  // The length the lane it names repeats on, rewritten after the fact: the gesture's shape is
  // kept and every point's time is scaled onto this span, so a lane recorded once is sped up or
  // slowed without being re-performed (0035, 0079). One command per drag, never one per pointer
  // event (0065).
  | {
      t: "automation.span";
      deck: DeckId;
      instance?: EffectInstanceId;
      param: ParamId;
      span: number;
    }
  // Adding names the instance id it is creating, the way `deck.add` and `clip.capture` do — so a
  // JSONL file can add two delays and then address each by the name it wrote itself (0029, 0030).
  | { t: "effect.add"; deck: DeckId; id: EffectInstanceId; effect: EffectId }
  // The rack operations name an instance, never a rack index: an index is a fact about the rack
  // at the moment the command was written, and an id keeps meaning the same thing (0023).
  | { t: "effect.bypass"; deck: DeckId; instance: EffectInstanceId; bypassed: boolean }
  | { t: "effect.remove"; deck: DeckId; instance: EffectInstanceId }
  /** `index` is the destination position, clamped into the rack the way a param is clamped. */
  | { t: "effect.reorder"; deck: DeckId; instance: EffectInstanceId; index: number }
  | { t: "session.import"; archive: SessionArchiveHandle }
  // The clip commands name an id the caller minted, never a name and never a list index: a
  // label is not identity and an index is a fact about the list at the time of writing (0027).
  | { t: "clip.capture"; id: ClipId; name: string; deck: DeckId }
  | { t: "clip.rename"; id: ClipId; name: string }
  | { t: "clip.delete"; id: ClipId }
  /** Rewrites one deck to be exactly this clip — one grouped, undoable durable edit (0027). */
  | { t: "clip.apply"; id: ClipId; deck: DeckId };

/**
 * Import establishes a fresh history root, so it cannot sit inside an undoable transaction, and
 * a clip command is either a list edit no group needs or — for apply — a group of its own.
 * `deck.duplicate` is the second of those: it expands into ordinary commands and finishes through
 * `historyGroup`, so a group holding one would be a group inside a group (0078).
 */
export type GroupedEditCommand = Exclude<
  DurableEditCommand,
  { t: "session.import" | "deck.duplicate" | `clip.${string}` }
>;

/** One history entry for an ordered set of durable edits; history controls cannot nest in it. */
export type HistoryGroupCommand = { t: "history.group"; commands: GroupedEditCommand[] };

export type Command =
  | DurableEditCommand
  | HistoryGroupCommand
  | { t: "deck.play"; deck: DeckId }
  | { t: "deck.play.toggle"; deck: DeckId }
  | { t: "deck.pause"; deck: DeckId }
  | { t: "deck.stop"; deck: DeckId }
  // `position` is seconds into the buffer. Transport, not durable shape: a playhead is where the
  // deck is reading, so it enters neither history nor the session (0041).
  | { t: "deck.seek"; deck: DeckId; position: number }
  | { t: "decks.play.toggle" }
  | { t: "session.save" }
  // A hand let go. Not durable and not transport: it closes whatever history transaction the
  // drag it ends had open, which is the boundary that makes one drag one entry (0067). Sending
  // it with nothing open changes nothing, so a replayed file never has to know what was held.
  | { t: "gesture.end" }
  | { t: "history.undo" }
  | { t: "history.redo" };

/**
 * When a command runs is the transport's business, not the command's. `at` is seconds on the
 * timeline; absent means now. A bare command is an envelope with no `at`.
 */
export type Envelope = { at?: number; cmd: Command };
