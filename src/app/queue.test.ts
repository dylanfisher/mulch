import { describe, expect, it } from "vitest";
import { manualClock } from "./clock";
import type { Command } from "./commands";
import { CommandQueue } from "./queue";

const play = (deck: "a" | "b"): Command => ({ t: "deck.play", deck });
const loop = (n: number): Command => ({ t: "deck.loop", deck: "a", in: n, out: n });

describe("CommandQueue", () => {
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
