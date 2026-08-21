/**
 * @role The audio-thread half of the plan arithmetic, driven in Node — the worklet's own floor
 *   division of a plan into loop boundaries, at rate, and across a re-anchoring.
 * @instead The main-thread half of the same plan → src/lib/timeline.ts and its test. Nothing
 *   here renders audio: the processor produces silence and its output is the messages it posts.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { cycleTimeAt, type PlayPlan } from "@/lib/timeline";

/** What the processor posts. `synced` is the render barrier and never appears here. */
type Reported =
  | { t: "started"; id: number; at: number; offset: number }
  | { t: "looped"; id: number; at: number; cycle: number }
  | { t: "xrun"; id: number; detail: string };

/** The plan message: the shared PlayPlan, plus the reporter's own bookkeeping (src/audio/deck.ts). */
type Plan = PlayPlan & { id: number; base: number; resume: boolean };

/** The clock the processor reads. A worklet's `currentTime` is a global, so a test moves this. */
let clock = 0;
let Registered: new () => {
  process: () => boolean;
  port: {
    postMessage: (message: Reported) => void;
    listeners: ((event: { data: unknown }) => void)[];
  };
};

/**
 * A worklet is its own module graph: `AudioWorkletProcessor`, `registerProcessor` and
 * `currentTime` are globals the browser supplies and no bundler provides. Standing them up here
 * is what lets the real file — rather than a second copy of its arithmetic — be driven from Node.
 */
beforeAll(async () => {
  Object.defineProperty(globalThis, "currentTime", { get: () => clock, configurable: true });
  Object.assign(globalThis, {
    AudioWorkletProcessor: class {
      port = {
        listeners: [] as ((event: { data: unknown }) => void)[],
        addEventListener(_type: string, next: (event: { data: unknown }) => void) {
          this.listeners.push(next);
        },
        start: () => {},
        postMessage: (_message: Reported) => {},
      };
    },
    registerProcessor: (_name: string, ctor: typeof Registered) => {
      Registered = ctor;
    },
  });
  // Plain JavaScript on purpose (see that file's own header): importing it is how the real
  // processor registers itself on the stubs above. `allowJs` is what resolves it (tsconfig.json).
  await import("./loop-reporter.js");
});

/** One processor on the stubbed thread, its posts collected, driven a block at a time. */
function reporter() {
  const posted: Reported[] = [];
  const instance = new Registered();
  instance.port.postMessage = (message) => {
    posted.push(message);
  };
  return {
    posted,
    /** Deliver a plan, defaulted to the one a play posts: 1×, no phase, nothing behind it. */
    plan: (partial: Partial<Plan>) => {
      const message: Plan = {
        startTime: 0,
        offset: 0,
        period: 1,
        rate: 1,
        phase: 0,
        id: 1,
        base: 0,
        resume: false,
        ...partial,
      };
      for (const listener of instance.port.listeners) listener({ data: message });
      return message;
    },
    /** Run one render block whose start is `when` on the audio clock. */
    at: (when: number) => {
      clock = when;
      instance.process();
    },
    /** Every boundary reported so far, in order. */
    looped: () =>
      posted.flatMap((message) =>
        message.t === "looped" ? [{ at: message.at, cycle: message.cycle }] : [],
      ),
  };
}

// One processor's whole reporting contract: the rate the boundaries fall at, the re-anchoring
// that must not double-count one, and the refusal. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("loop-reporter", () => {
  it("crosses a boundary once per period / rate seconds", () => {
    const it2x = reporter();
    it2x.plan({ period: 1, rate: 2 });
    it2x.at(1.6);
    expect(it2x.looped()).toEqual([
      { at: 0.5, cycle: 1 },
      { at: 1, cycle: 2 },
      { at: 1.5, cycle: 3 },
    ]);

    const half = reporter();
    half.plan({ period: 1, rate: 0.5 });
    half.at(1.6);
    expect(half.looped()).toEqual([]);
    half.at(2.1);
    expect(half.looped()).toEqual([{ at: 2, cycle: 1 }]);
  });

  it("counts a re-anchored plan on from the base it was given, and never twice", () => {
    const deck = reporter();
    deck.plan({ period: 1, rate: 1 });
    deck.at(2.5);
    expect(deck.looped().map(({ cycle }) => cycle)).toEqual([1, 2]);

    // A rate change at 2.5s: two boundaries behind it, nine-tenths of a cycle of phase, now at
    // 4×. The re-anchoring is computed from the main thread's clock, which runs behind this one,
    // so it re-derives boundary 2 — which must not be reported a second time (0031).
    deck.plan({ startTime: 2.4, period: 1, rate: 4, phase: 0.9, id: 2, base: 2, resume: true });
    deck.at(2.6);
    expect(deck.looped().map(({ cycle }) => cycle)).toEqual([1, 2, 3]);
    // And it never re-announces a start it already announced.
    expect(deck.posted.filter((message) => message.t === "started")).toHaveLength(1);
  });

  it("still announces a boundary the re-anchoring counted before this thread saw it", () => {
    const deck = reporter();
    deck.plan({ period: 0.1, rate: 1 });
    deck.at(0.15);
    expect(deck.looped().map(({ cycle }) => cycle)).toEqual([1]);

    // The main thread re-anchors exactly on the second boundary, which this thread has not run a
    // block for yet. Its own count is one; the plan says two have been crossed — so two is due.
    deck.plan({ startTime: 0.2, period: 0.1, rate: 2, phase: 0, id: 2, base: 2, resume: true });
    deck.at(0.2);
    expect(deck.looped().map(({ cycle }) => cycle)).toEqual([1, 2]);
  });

  it("places a boundary where the main thread's own inverse puts it", () => {
    const deck = reporter();
    deck.plan({ period: 1, rate: 1 });
    deck.at(7.5);
    const plan = deck.plan({
      startTime: 2.4,
      period: 1,
      rate: 4,
      phase: 0.5,
      id: 2,
      base: 7,
      resume: true,
    });
    deck.at(3);
    const looped = deck.looped().slice(7);
    expect(looped.map(({ cycle }) => cycle)).toEqual([8, 9]);
    // The same arithmetic src/lib/timeline.ts states, from the other side of the seam.
    expect(looped[0]?.at).toBeCloseTo(cycleTimeAt(1, plan), 9);
    expect(looped[1]?.at).toBeCloseTo(cycleTimeAt(2, plan), 9);
  });

  it("counts nothing before a plan's own anchor", () => {
    const deck = reporter();
    deck.plan({ startTime: 4, period: 1, rate: 4 });
    deck.at(1);
    expect(deck.looped()).toEqual([]);
  });

  it("refuses a plan that owes more boundaries in one block than it can report", () => {
    const deck = reporter();
    deck.plan({ period: 1e-6, rate: 1 });
    deck.at(1);
    expect(deck.posted.some((message) => message.t === "xrun")).toBe(true);
  });
});
