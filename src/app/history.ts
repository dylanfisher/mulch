/**
 * @role The bounded in-memory checkpoint ledger for durable command transactions.
 * @instead Restoring a checkpoint into the graph and store → src/app/facade.ts.
 */
import type { BlobId } from "@/lib/source";
import { sessionBlobIds, type SessionV3 } from "@/state/session";

/** The one bound on how many completed durable transactions can be undone. */
export const HISTORY_CAP = 100;

export type HistoryState = Readonly<{ canUndo: boolean; canRedo: boolean }>;

const sameSession = (left: SessionV3, right: SessionV3): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const copyCheckpoint = (session: SessionV3): SessionV3 => structuredClone(session);

export class SessionHistory {
  readonly #undo: SessionV3[] = [];
  readonly #redo: SessionV3[] = [];
  readonly #listeners = new Set<() => void>();
  #current: SessionV3;
  #state: HistoryState = { canUndo: false, canRedo: false };

  constructor(initial: SessionV3) {
    this.#current = copyCheckpoint(initial);
  }

  getState = (): HistoryState => this.#state;

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  #publish(): void {
    const next = { canUndo: this.#undo.length > 0, canRedo: this.#redo.length > 0 };
    if (next.canUndo === this.#state.canUndo && next.canRedo === this.#state.canRedo) return;
    this.#state = next;
    for (const listener of this.#listeners) listener();
  }

  /** Finish one single or grouped transaction against the latest completed checkpoint. */
  record(next: SessionV3): void {
    if (sameSession(this.#current, next)) return;
    this.#undo.push(this.#current);
    if (this.#undo.length > HISTORY_CAP) this.#undo.shift();
    this.#redo.length = 0;
    this.#current = copyCheckpoint(next);
    this.#publish();
  }

  /** Startup hydration establishes the first checkpoint; persisted history is deliberately absent. */
  reset(current: SessionV3): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
    this.#current = copyCheckpoint(current);
    this.#publish();
  }

  undoTarget(): SessionV3 | null {
    const target = this.#undo.at(-1);
    return target === undefined ? null : copyCheckpoint(target);
  }

  redoTarget(): SessionV3 | null {
    const target = this.#redo.at(-1);
    return target === undefined ? null : copyCheckpoint(target);
  }

  commitUndo(current: SessionV3): void {
    const target = this.#undo.pop();
    if (target === undefined) throw new Error("undo history is empty");
    this.#redo.push(copyCheckpoint(current));
    this.#current = target;
    this.#publish();
  }

  commitRedo(current: SessionV3): void {
    const target = this.#redo.pop();
    if (target === undefined) throw new Error("redo history is empty");
    this.#undo.push(copyCheckpoint(current));
    this.#current = target;
    this.#publish();
  }

  /** Blob reachability extends through every live checkpoint, but never into persistence JSON. */
  blobIds(): Set<BlobId> {
    const ids = sessionBlobIds(this.#current);
    for (const checkpoint of this.#undo) {
      for (const id of sessionBlobIds(checkpoint)) ids.add(id);
    }
    for (const checkpoint of this.#redo) {
      for (const id of sessionBlobIds(checkpoint)) ids.add(id);
    }
    return ids;
  }
}
