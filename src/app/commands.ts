/**
 * @role The command union and its envelope — the only way anything changes, JSON-serialisable
 *       by construction so a file of commands is a test, a macro and a repro.
 */
import type { ParamId } from "@/audio/params";
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { EffectId } from "@/audio/effects/registry";
import type { SourceRef } from "@/lib/source";
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
  | { t: "deck.add"; deck: DeckId }
  | { t: "deck.remove"; deck: DeckId }
  | { t: "deck.activate"; deck: DeckId }
  | { t: "deck.load"; deck: DeckId; source: SourceRef }
  | { t: "deck.loop"; deck: DeckId; in: number; out: number }
  | { t: "deck.loop.toggle"; deck: DeckId }
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
 */
export type GroupedEditCommand = Exclude<
  DurableEditCommand,
  { t: "session.import" | `clip.${string}` }
>;

/** One history entry for an ordered set of durable edits; history controls cannot nest in it. */
export type HistoryGroupCommand = { t: "history.group"; commands: GroupedEditCommand[] };

export type Command =
  | DurableEditCommand
  | HistoryGroupCommand
  | { t: "deck.play"; deck: DeckId }
  | { t: "deck.play.toggle"; deck: DeckId }
  | { t: "deck.stop"; deck: DeckId }
  | { t: "decks.play.toggle" }
  | { t: "session.save" }
  | { t: "history.undo" }
  | { t: "history.redo" };

/**
 * When a command runs is the transport's business, not the command's. `at` is seconds on the
 * timeline; absent means now. A bare command is an envelope with no `at`.
 */
export type Envelope = { at?: number; cmd: Command };
