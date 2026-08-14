/**
 * @role The event bus — stamps every event with seq / clock / wall in the one place seq is
 *       assigned, forwards losslessly to subscribers, and keeps a fixed ring that drops loudly.
 */
import type { Clock } from "./clock";
import type { Event, EventBody } from "./events";

/** The ring is the UI's view of the stream; a seq gap at its head is a drop made visible. */
export const RING_CAPACITY = 4096;

export class EventBus {
  #clock: Clock;
  #seq = 0;
  // seq doubles as the write index, so the slot a seq lands in never moves.
  #ring = Array.from<Event | undefined>({ length: RING_CAPACITY });
  #listeners = new Set<(event: Event) => void>();
  #reportingBroken = false;

  constructor(clock: Clock) {
    this.#clock = clock;
  }

  /**
   * Stamp and publish. Each fact is emitted from exactly one place — this is not it, its caller is.
   *
   * `at` defaults to the clock, which is right for anything the main thread causes. A fact that
   * originated on the audio thread carries its own: the worklet knows the exact time a loop came
   * round, and the port hop before this call is latency in the reporting, not in the event.
   */
  emit(body: EventBody, at: number = this.#clock.now()): Event {
    // Body first, stamps last: a body that ever grows a field named seq/at/wall must lose to
    // the stamp, or a forged seq writes the wrong ring slot and the gap gets blamed on the bus.
    const event: Event = {
      ...body,
      seq: this.#seq++,
      at,
      wall: performance.now(),
    };
    this.#ring[event.seq % RING_CAPACITY] = event;
    const broken: unknown[] = [];
    for (const listener of this.#listeners) {
      try {
        listener(event);
      } catch (error) {
        broken.push(error);
      }
    }
    // A broken subscriber must not cost the others their event, nor unwind a send that
    // already happened — but it stays loud, as a fact on the log. The guard stops a
    // listener that throws on the error event too from recursing; that second failure
    // is the one thing this bus drops.
    if (broken.length > 0 && !this.#reportingBroken) {
      this.#reportingBroken = true;
      try {
        this.emit({ t: "error", detail: `subscriber threw: ${broken.map(String).join("; ")}` });
      } finally {
        this.#reportingBroken = false;
      }
    }
    return event;
  }

  /**
   * Lossless subscription: every event, as it is emitted, in order. This is the path
   * `./scripts/drive` forwards — a slow consumer queues, it never causes a drop.
   */
  on(listener: (event: Event) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /** The ring's survivors, oldest first. `ring()[0].seq > 0` means events fell off — loudly. */
  ring(): Event[] {
    const events: Event[] = [];
    for (let seq = Math.max(0, this.#seq - RING_CAPACITY); seq < this.#seq; seq++) {
      const event = this.#ring[seq % RING_CAPACITY];
      if (event === undefined) throw new Error(`ring slot for seq ${seq} is empty — a bus bug`);
      events.push(event);
    }
    return events;
  }
}
