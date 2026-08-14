/**
 * @role The command union and its envelope — the only way anything changes, JSON-serialisable
 *       by construction so a file of commands is a test, a macro and a repro.
 */
import type { ParamId } from "@/audio/params";
import type { EffectId } from "@/audio/effects/registry";
import type { SourceRef } from "@/lib/source";
import type { DeckId } from "@/state/store";

/** What a deck plays. Defined in src/lib/source.ts, because the session records the same shape. */
export type { SourceRef };

/** A fully parsed archive staged outside the command boundary; raw File never enters the wire. */
export type SessionArchiveHandle = { archiveId: string };

// No `when`/`delay`/`time` field ever appears in here — scheduling belongs to the envelope.
export type DurableEditCommand =
  | { t: "deck.activate"; deck: DeckId }
  | { t: "deck.load"; deck: DeckId; source: SourceRef }
  | { t: "deck.loop"; deck: DeckId; in: number; out: number }
  | { t: "deck.loop.toggle"; deck: DeckId }
  | { t: "param.set"; deck: DeckId; param: ParamId; value: number }
  | { t: "effect.add"; deck: DeckId; effect: EffectId }
  | { t: "session.import"; archive: SessionArchiveHandle };

/** Import establishes a fresh history root, so it cannot sit inside an undoable transaction. */
export type GroupedEditCommand = Exclude<DurableEditCommand, { t: "session.import" }>;

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
