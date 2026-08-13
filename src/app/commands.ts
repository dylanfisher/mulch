/**
 * @role The command union and its envelope — the only way anything changes, JSON-serialisable
 *       by construction so a file of commands is a test, a macro and a repro.
 */
import type { ParamId } from "@/audio/params";
import type { DeckId } from "@/state/store";

/**
 * What a deck plays: real audio already in the blob store (via `ingest(file)`, the one
 * sanctioned pre-command step), or a synthetic source needing no fixture at all.
 */
export type SourceRef =
  | { blobId: string }
  | { gen: "sine" | "click-train" | "sweep" | "noise" | "silence"; secs: number; hz?: number };

// No `when`/`delay`/`time` field ever appears in here — scheduling belongs to the envelope.
export type Command =
  | { t: "deck.load"; deck: DeckId; source: SourceRef }
  | { t: "deck.play"; deck: DeckId }
  | { t: "deck.stop"; deck: DeckId }
  | { t: "deck.loop"; deck: DeckId; in: number; out: number }
  | { t: "param.set"; deck: DeckId; param: ParamId; value: number }
  | { t: "session.save" };

/**
 * When a command runs is the transport's business, not the command's. `at` is seconds on the
 * timeline; absent means now. A bare command is an envelope with no `at`.
 */
export type Envelope = { at?: number; cmd: Command };
