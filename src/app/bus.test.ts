import { describe, expect, it } from "vitest";
import { EventBus, RING_CAPACITY } from "./bus";
import { manualClock } from "./clock";

describe("EventBus", () => {
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
