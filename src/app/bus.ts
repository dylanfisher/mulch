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

  constructor(clock: Clock) {
    this.#clock = clock;
  }

  /** Stamp and publish. Each fact is emitted from exactly one place — this is not it, its caller is. */
  emit(body: EventBody): Event {
    const event: Event = {
      seq: this.#seq++,
      at: this.#clock.now(),
      wall: performance.now(),
      ...body,
    };
    this.#ring[event.seq % RING_CAPACITY] = event;
    for (const listener of this.#listeners) listener(event);
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
