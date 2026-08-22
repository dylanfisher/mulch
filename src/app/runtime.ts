/**
 * @role The port the reducer is handed: the store, the bus and every capability a command may
 *   need that the reducer does not own — the graph, the storage, the render harness, history.
 * @instead What a command does with them → src/app/execute.ts. Who fills them in →
 *   src/app/facade.ts, which is the only implementation there is.
 */
// A type of its own file rather than a header on execute.ts: the hard 800-line cap is not
// waivable, and this is the piece of that file with no behaviour in it (0045, 0112).
import type { Engine } from "./engine";
import type { EventBody } from "./events";
import type { Command, GroupedEditCommand } from "./commands";
import type { RenderHost } from "./render";
import type { SessionRepository } from "@/state/repository";
import type { Session } from "@/state/session";
import type { DeckId, SessionStore } from "@/state/store";

/** The harness a `deck.flatten` renders through, re-exported so the facade reaches one name. */
export type { RenderHost };

export type Runtime = {
  store: SessionStore;
  bus: { emit(body: EventBody, at?: number): void };
  /** Absent when there is no audio host — pure tests under Node, where the spine still runs. */
  engine: Engine | null;
  repository: SessionRepository | null;
  /**
   * The one render harness, or null where there is none — a pure test, and a render's own
   * instrument, which is what stops a flatten inside a flatten (0112). Injected rather than
   * imported: src/app/render.ts builds an instrument of its own, so a facade that reached for it
   * would be a cycle.
   */
  render: RenderHost | null;
  save(reason: "manual" | "autosave"): void;
  beginLoad(deck: DeckId): number;
  isCurrentLoad(deck: DeckId, token: number): boolean;
  importArchive(handle: Extract<Command, { t: "session.import" }>["archive"]): Promise<void>;
  historyGroup(commands: GroupedEditCommand[]): Promise<void>;
  /**
   * Prove a whole durable session could be restored into this host — its blobs read, its graph
   * built and immediately discarded — without touching the live one. What lets clip.apply refuse
   * a missing or corrupt source before the deck or the graph moves (0027).
   */
  verifyRestorable(session: Session): Promise<void>;
  historyUndo(): Promise<void>;
  historyRedo(): Promise<void>;
  /** Close the open history transaction, so the next durable edit is an entry of its own. */
  historyEndGesture(): void;
};
