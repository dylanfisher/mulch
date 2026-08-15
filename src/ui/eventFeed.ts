/**
 * @role The one reading of the event ring for a human: the rows to show — every event, a break
 *   wherever seq skipped, and the tail window a fixed-height feed can hold — and the detail text
 *   a row carries beside its stamps.
 * @instead The ring itself → ring() on src/app/facade.ts. The two surfaces that draw these rows
 *   are src/ui/dev/LogPage.tsx and src/ui/DebugConsole.tsx; neither may detect a gap of its own.
 */
import type { Event } from "@/app/events";

/** A run of events the ring no longer holds — rendered as a break, in front of `beforeSeq`. */
export type Gap = { gap: number; beforeSeq: number };

/**
 * The rows to render, oldest first: every event, with a break row in front of any seq the stream
 * skipped. seq is gapless from 0 by contract, so a hole here is a drop — the one thing a feed
 * must never smooth over (plan §1).
 *
 * `limit` caps the rows returned to the newest that many, which is how a fixed-height window
 * stays fixed: the walk starts at the newest event and stops as soon as the window is full, so
 * rows above it are never visited and never formatted, whatever the ring is holding.
 */
export function withGaps(
  events: readonly Event[],
  limit: number = Number.POSITIVE_INFINITY,
): (Event | Gap)[] {
  if (limit < 1) throw new RangeError(`a feed window holds at least one row: ${limit}`);
  const rows: (Event | Gap)[] = [];
  for (let index = events.length - 1; index >= 0 && rows.length < limit; index--) {
    const event = events[index];
    if (event === undefined) throw new Error(`event ${index} is missing from the ring's view`);
    rows.push(event);
    // Nothing before it means the head of the ring, where the contract's gapless-from-0 says
    // the next seq is 0 — so events that fell off show as the break they are.
    const expected = (events[index - 1]?.seq ?? -1) + 1;
    if (event.seq > expected && rows.length < limit) {
      rows.push({ gap: event.seq - expected, beforeSeq: event.seq });
    }
  }
  // Collected newest first so the walk could stop at the window's edge. The array is local and
  // was built here, so reversing it in place mutates nothing any caller can see.
  // oxlint-disable-next-line unicorn/no-array-reverse
  return rows.reverse();
}

const STAMP_KEYS = new Set(["seq", "at", "wall", "t"]);

/** The event's own fields, minus the stamps a row's columns already show. */
export const eventDetail = (event: Event): string =>
  JSON.stringify(Object.fromEntries(Object.entries(event).filter(([k]) => !STAMP_KEYS.has(k))));
