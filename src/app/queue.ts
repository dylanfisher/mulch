/**
 * @role The envelope queue — the one queue that drains commands against the clock, live and
 *       offline alike; scheduling lives here and nowhere inside a command.
 */
import type { Clock } from "./clock";
import type { Command, Envelope } from "./commands";

type Pending = { at: number; order: number; cmd: Command };

export class CommandQueue {
  #clock: Clock;
  #run: (cmd: Command) => void;
  #pending: Pending[] = [];
  #order = 0;
  #draining = false;

  constructor(clock: Clock, run: (cmd: Command) => void) {
    this.#clock = clock;
    this.#run = run;
  }

  /**
   * An envelope with no `at` means now. Sent from outside a command it runs before enqueue
   * returns; sent from inside one it joins the drain in progress and runs once everything
   * already due has — the re-entrancy rule pump() documents.
   */
  enqueue(envelope: Envelope): void {
    // `at` arrived as JSON: a NaN or a string would compare false against the clock in
    // both directions and sit in the queue forever — a silent drop. Refuse it at the door.
    const at: unknown = envelope.at;
    if (at !== undefined && (typeof at !== "number" || !Number.isFinite(at))) {
      const shown = typeof at === "number" ? String(at) : JSON.stringify(at);
      throw new TypeError(`envelope.at is not a finite number: ${shown}`);
    }
    this.#pending.push({
      at: envelope.at ?? this.#clock.now(),
      order: this.#order++,
      cmd: envelope.cmd,
    });
    this.pump();
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
        this.#run(next.cmd);
      }
    } finally {
      this.#draining = false;
    }
  }
}
