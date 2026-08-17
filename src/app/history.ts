/**
 * @role The bounded in-memory checkpoint ledger for durable command transactions.
 * @instead Restoring a checkpoint into the graph and store → src/app/facade.ts.
 */
import { paramKey } from "@/audio/params";
import type { BlobId } from "@/lib/source";
import { sessionBlobIds, type Session } from "@/state/session";
import type { Command, GroupedEditCommand } from "./commands";

/** The one bound on how many completed durable transactions can be undone. */
export const HISTORY_CAP = 100;

/**
 * The backstop, not the boundary. A drag says when it is over — the pointer comes up and the
 * surface sends `gesture.end` — and this only bounds a gesture whose end never arrived: a knob
 * nudged from a keyboard, a command file that sends values and nothing else. Long enough that a
 * hand resting mid-drag is still the same drag, short enough that an edit minutes later is not.
 * Wall time, not the audio clock, for the reason the facade reads the heap on wall time: a hand
 * moves in the room, and a suspended context's clock stands still.
 */
export const GESTURE_IDLE_MS = 2000;

export type HistoryState = Readonly<{ canUndo: boolean; canRedo: boolean }>;

/**
 * What one gesture is, as a key: the deck and the (instance, parameter) a value edit is about,
 * named through the one lookup that already spells that pair (0030). Consecutive commits carrying
 * the same key are one hand on one control, which is the whole of what makes a drag one history
 * entry rather than one per value. Everything else is null and is an entry of its own.
 */
export const gestureOf = (cmd: Command): string | null =>
  cmd.t === "param.set" || cmd.t === "automation.set"
    ? `${cmd.deck} ${paramKey(cmd.instance ?? null, cmd.param)}`
    : null;

/**
 * The same key for a whole group, when every command in it is about that one value — which is
 * what the first move of a drag over an automated knob is: the lane cleared and the value that
 * replaced it, in one transaction the rest of the drag then joins (0024).
 */
export const groupGesture = (commands: readonly GroupedEditCommand[]): string | null => {
  const first = commands[0];
  if (first === undefined) return null;
  const key = gestureOf(first);
  return key !== null && commands.every((command) => gestureOf(command) === key) ? key : null;
};

const sameSession = (left: Session, right: Session): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const copyCheckpoint = (session: Session): Session => structuredClone(session);

export class SessionHistory {
  readonly #undo: Session[] = [];
  readonly #redo: Session[] = [];
  readonly #listeners = new Set<() => void>();
  readonly #now: () => number;
  #current: Session;
  #state: HistoryState = { canUndo: false, canRedo: false };
  /** The open transaction's gesture key, or null when the next commit starts a new entry. */
  #gesture: string | null = null;
  /** When that open transaction last took a commit, on the same wall clock `#now` reads. */
  #gestureAt = 0;
  /** Whether that transaction still has its opening checkpoint on the undo stack. */
  #open = false;

  constructor(initial: Session, now: () => number = () => performance.now()) {
    this.#current = copyCheckpoint(initial);
    this.#now = now;
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

  /**
   * Finish one single or grouped transaction against the latest completed checkpoint.
   *
   * `gesture` is what makes a drag one entry rather than one per value: a commit carrying the key
   * an open transaction already holds moves that transaction's end instead of opening another, so
   * undo takes back the whole movement and lands on the value the hand started from. A commit with
   * no key, a different key, or one that arrives after the gesture has gone quiet opens a new
   * entry, and so does the first commit after any boundary — see `endGesture`.
   */
  record(next: Session, gesture: string | null = null): void {
    const at = this.#now();
    const sameGesture =
      gesture !== null && gesture === this.#gesture && at - this.#gestureAt <= GESTURE_IDLE_MS;
    // Kept alive by every commit under the open key, not only the ones that change something: a
    // knob dragged inside one step re-sends the value it already holds, and a hand that has not
    // moved the value has not let go of the control.
    if (sameGesture) this.#gestureAt = at;
    if (sameSession(this.#current, next)) return;
    this.#gesture = gesture;
    this.#gestureAt = at;
    if (sameGesture && this.#open) {
      // The open transaction's start checkpoint is already on the undo stack, and redo was
      // truncated when it opened: only where the gesture has reached moves.
      this.#current = copyCheckpoint(next);
      const start = this.#undo.at(-1);
      // Unless the gesture has come back to where it began, in which case there is nothing left
      // to take back: the entry goes rather than sitting on the stack as a press that does
      // nothing. Moving further on turns it into an entry again, through the push below.
      if (start !== undefined && sameSession(start, next)) {
        this.#undo.pop();
        this.#open = false;
        this.#publish();
      }
      return;
    }
    this.#undo.push(this.#current);
    if (this.#undo.length > HISTORY_CAP) this.#undo.shift();
    this.#redo.length = 0;
    this.#open = true;
    this.#current = copyCheckpoint(next);
    this.#publish();
  }

  /**
   * Close whatever transaction is open, so the next commit is an entry of its own. A group is
   * always its own beginning — a `history.group` is by definition one entry — and a restore has
   * moved the ledger out from under whatever hand was on a knob.
   */
  endGesture = (): void => {
    this.#gesture = null;
  };

  /** Startup hydration establishes the first checkpoint; persisted history is deliberately absent. */
  reset(current: Session): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
    this.#current = copyCheckpoint(current);
    this.endGesture();
    this.#publish();
  }

  undoTarget(): Session | null {
    const target = this.#undo.at(-1);
    return target === undefined ? null : copyCheckpoint(target);
  }

  redoTarget(): Session | null {
    const target = this.#redo.at(-1);
    return target === undefined ? null : copyCheckpoint(target);
  }

  commitUndo(current: Session): void {
    const target = this.#undo.pop();
    if (target === undefined) throw new Error("undo history is empty");
    this.#redo.push(copyCheckpoint(current));
    this.#current = target;
    this.endGesture();
    this.#publish();
  }

  commitRedo(current: Session): void {
    const target = this.#redo.pop();
    if (target === undefined) throw new Error("redo history is empty");
    this.#undo.push(copyCheckpoint(current));
    this.#current = target;
    this.endGesture();
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
