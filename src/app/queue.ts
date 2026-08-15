/**
 * @role The envelope queue — the one queue that drains commands against the clock, live and
 *       offline alike; scheduling lives here and nowhere inside a command.
 */
import type { Clock } from "./clock";
import type { Command, Envelope } from "./commands";

type Pending = { at: number; dueAt: number; order: number; cmd: Command; ticket: unknown };

export class CommandQueue {
  #clock: Clock;
  /**
   * `dueAt` is when the envelope could first have run — its `at`, or the moment it was
   * enqueued if that had already passed; the gap to now is the only real deadline here. An
   * `at` that was history at enqueue time is a position in the order, not a deadline anyone
   * missed. `ticket` is whatever the enqueue passed, handed back verbatim so the caller can
   * tell its own envelope's run from a stale one draining inside it.
   */
  #run: (cmd: Command, dueAt: number, ticket: unknown) => void;
  #pending: Pending[] = [];
  #order = 0;
  #draining = false;

  constructor(clock: Clock, run: (cmd: Command, dueAt: number, ticket: unknown) => void) {
    this.#clock = clock;
    this.#run = run;
  }

  /**
   * An envelope with no `at` means now. Sent from outside a command it runs before enqueue
   * returns; sent from inside one it joins the drain in progress and runs once everything
   * already due has — the re-entrancy rule pump() documents.
   */
  enqueue(envelope: Envelope, ticket?: unknown): void {
    // `at` arrived as JSON: a NaN or a string would compare false against the clock in
    // both directions and sit in the queue forever — a silent drop. Refuse it at the door.
    const at: unknown = envelope.at;
    if (at !== undefined && (typeof at !== "number" || !Number.isFinite(at))) {
      const shown = typeof at === "number" ? String(at) : JSON.stringify(at);
      throw new TypeError(`envelope.at is not a finite number: ${shown}`);
    }
    const now = this.#clock.now();
    this.#pending.push({
      at: envelope.at ?? now,
      dueAt: Math.max(envelope.at ?? now, now),
      order: this.#order++,
      cmd: envelope.cmd,
      ticket,
    });
    this.pump();
  }

  /** Envelopes still waiting for their moment — how far behind, or ahead, the queue is. */
  depth(): number {
    return this.#pending.length;
  }

  /** Deliver everything due by the clock's now — in `at` order, enqueue order within a tie. */
  pump(): void {
    // A command that enqueues during the run loop re-enters here and must wait its
    // turn behind envelopes already due — the outer loop picks it up in order.
    if (this.#draining) return;
    this.#draining = true;
    try {
      for (;;) {
        const now = this.#clock.now();
        let next: Pending | undefined;
        for (const p of this.#pending) {
          if (p.at > now) continue;
          if (next === undefined || p.at < next.at || (p.at === next.at && p.order < next.order)) {
            next = p;
          }
        }
        if (next === undefined) return;
        // Remove one entry at a time, before running it: a command that throws costs
        // itself, never the envelopes queued behind it — they run on the next pump.
        this.#pending.splice(this.#pending.indexOf(next), 1);
        this.#run(next.cmd, next.dueAt, next.ticket);
      }
    } finally {
      this.#draining = false;
    }
  }
}
