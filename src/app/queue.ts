/**
 * @role The envelope queue — the one queue that drains commands against the clock, live and
 *       offline alike; scheduling lives here and nowhere inside a command.
 */
import type { Clock } from "./clock";
import type { Command, Envelope } from "./commands";

export class CommandQueue {
  #clock: Clock;
  #run: (cmd: Command) => void;
  #pending: { at: number; order: number; cmd: Command }[] = [];
  #order = 0;

  constructor(clock: Clock, run: (cmd: Command) => void) {
    this.#clock = clock;
    this.#run = run;
  }

  /** An envelope with no `at` means now, so it runs before enqueue returns. */
  enqueue(envelope: Envelope): void {
    this.#pending.push({
      at: envelope.at ?? this.#clock.now(),
      order: this.#order++,
      cmd: envelope.cmd,
    });
    this.pump();
  }

  /** Deliver everything due by the clock's now — in `at` order, enqueue order within a tie. */
  pump(): void {
    const now = this.#clock.now();
    const due = this.#pending.filter((p) => p.at <= now);
    if (due.length === 0) return;
    this.#pending = this.#pending.filter((p) => p.at > now);
    due.sort((a, b) => a.at - b.at || a.order - b.order);
    for (const { cmd } of due) this.#run(cmd);
  }
}
