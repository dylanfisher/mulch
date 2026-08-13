import { describe, expect, it } from "vitest";
import { EventBus, RING_CAPACITY } from "./bus";
import { manualClock } from "./clock";

describe("stamping and forwarding", () => {
  it("stamps events with a gapless monotonic seq and the clock's now", () => {
    const clock = manualClock(1.5);
    const bus = new EventBus(clock);
    const first = bus.emit({ t: "error", detail: "one" });
    clock.set(2.25);
    const second = bus.emit({ t: "error", detail: "two" });

    expect(first.seq).toBe(0);
    expect(second.seq).toBe(1);
    expect(first.at).toBe(1.5);
    expect(second.at).toBe(2.25);
    expect(typeof first.wall).toBe("number");
  });

  it("forwards every event to subscribers as it is emitted, until unsubscribed", () => {
    const bus = new EventBus(manualClock());
    const seen: string[] = [];
    const off = bus.on((e) => {
      seen.push(`${e.seq}:${e.t}`);
    });
    bus.emit({ t: "error", detail: "a" });
    bus.emit({ t: "xrun", detail: "b" });
    off();
    bus.emit({ t: "error", detail: "after" });

    expect(seen).toEqual(["0:error", "1:xrun"]);
  });
});

describe("when delivery goes wrong", () => {
  it("a throwing subscriber costs the others nothing, and lands on the log as an error", () => {
    const bus = new EventBus(manualClock());
    bus.on(() => {
      throw new Error("broken subscriber");
    });
    const seen: string[] = [];
    bus.on((e) => {
      seen.push(`${e.seq}:${e.t}`);
    });

    const event = bus.emit({ t: "xrun", detail: "x" });

    expect(event.seq).toBe(0);
    // The healthy subscriber got the original event, then the report about the broken one.
    expect(seen).toEqual(["0:xrun", "1:error"]);
    const report = bus.ring().at(-1);
    expect(report).toMatchObject({ t: "error" });
    expect(report && "detail" in report && report.detail).toMatch(/broken subscriber/u);
  });

  it("overflows the ring by dropping the oldest, leaving a visible seq gap at the head", () => {
    const bus = new EventBus(manualClock());
    const total = RING_CAPACITY + 7;
    for (let i = 0; i < total; i++) bus.emit({ t: "error", detail: String(i) });

    const ring = bus.ring();
    expect(ring).toHaveLength(RING_CAPACITY);
    // The gap: seq 0–6 are gone, and the head says so — a renderer can show the break.
    expect(ring.map((e) => e.seq)).toEqual(ring.map((_, i) => 7 + i));
    expect(ring.at(-1)?.seq).toBe(total - 1);
  });
});
