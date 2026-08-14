import { describe, expect, it } from "vitest";
import { manualClock } from "./clock";
import type { Command, Envelope } from "./commands";
import { CommandQueue } from "./queue";

const play = (deck: "a" | "b"): Command => ({ t: "deck.play", deck });
const loop = (n: number): Command => ({ t: "deck.loop", deck: "a", in: n, out: n });

describe("scheduling", () => {
  it("runs an envelope with no `at` before enqueue returns", () => {
    const ran: Command[] = [];
    const queue = new CommandQueue(manualClock(), (cmd) => {
      ran.push(cmd);
    });
    queue.enqueue({ cmd: play("a") });
    expect(ran).toEqual([play("a")]);
  });

  it("fires a stamped envelope at its `at` against the test clock, and not before", () => {
    const clock = manualClock(0);
    const ran: Command[] = [];
    const queue = new CommandQueue(clock, (cmd) => {
      ran.push(cmd);
    });

    queue.enqueue({ at: 2, cmd: play("a") });
    expect(ran).toEqual([]);

    clock.set(1.999);
    queue.pump();
    expect(ran).toEqual([]);

    clock.set(2);
    queue.pump();
    expect(ran).toEqual([play("a")]);

    queue.pump();
    expect(ran).toHaveLength(1);
  });

  it("hands the run the moment the envelope could first have run, not an `at` already past", () => {
    const clock = manualClock(5);
    const dueAts: number[] = [];
    const queue = new CommandQueue(clock, (_cmd, dueAt) => {
      dueAts.push(dueAt);
    });

    // Already history at enqueue, the enqueue is the deadline; scheduled ahead, its `at` is.
    queue.enqueue({ at: 0, cmd: play("a") });
    queue.enqueue({ at: 7, cmd: play("a") });
    clock.set(8);
    queue.pump();
    expect(dueAts).toEqual([5, 7]);
  });
});

describe("guard rails", () => {
  it("refuses a non-finite `at` at the door instead of dropping the envelope silently", () => {
    const queue = new CommandQueue(manualClock(), () => {});
    expect(() => {
      queue.enqueue({ at: Number.NaN, cmd: play("a") });
    }).toThrow(/not a finite number/u);
    expect(() => {
      // What the wire can hand us: a string where a number belongs.
      // oxlint-disable-next-line no-unsafe-type-assertion -- untyped JSON is the point
      queue.enqueue(JSON.parse('{"at":"2","cmd":{"t":"deck.play","deck":"a"}}') as Envelope);
    }).toThrow(/not a finite number/u);
  });

  it("a command that throws costs itself, not the envelopes queued behind it", () => {
    const clock = manualClock(0);
    const ran: number[] = [];
    const queue = new CommandQueue(clock, (cmd) => {
      if (cmd.t !== "deck.loop") throw new Error("bad command");
      ran.push(cmd.in);
    });

    queue.enqueue({ at: 1, cmd: play("a") });
    queue.enqueue({ at: 1, cmd: loop(1) });

    clock.set(1);
    expect(() => {
      queue.pump();
    }).toThrow(/bad command/u);
    expect(ran).toEqual([]);

    queue.pump();
    expect(ran).toEqual([1]);
  });
});

describe("ordering", () => {
  it("an enqueue from inside the run loop waits its turn behind envelopes already due", () => {
    const clock = manualClock(0);
    const ran: number[] = [];
    const queue = new CommandQueue(clock, (cmd) => {
      if (cmd.t !== "deck.loop") return;
      ran.push(cmd.in);
      // The first command's follow-up: immediate, but another envelope is already due.
      if (cmd.in === 1) queue.enqueue({ cmd: loop(3) });
    });

    queue.enqueue({ at: 1, cmd: loop(1) });
    queue.enqueue({ at: 2, cmd: loop(2) });
    clock.set(5);
    queue.pump();

    expect(ran).toEqual([1, 2, 3]);
  });

  it("delivers due envelopes in `at` order, enqueue order within a tie", () => {
    const clock = manualClock(0);
    const ran: number[] = [];
    const queue = new CommandQueue(clock, (cmd) => {
      if (cmd.t === "deck.loop") ran.push(cmd.in);
    });

    queue.enqueue({ at: 3, cmd: loop(3) });
    queue.enqueue({ at: 1, cmd: loop(1) });
    queue.enqueue({ at: 1, cmd: loop(2) });

    clock.set(5);
    queue.pump();
    expect(ran).toEqual([1, 2, 3]);
  });
});
