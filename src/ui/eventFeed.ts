/**
 * @role The one reading of the event ring for a human: the rows to show, newest first — every
 *   event, a break wherever seq skipped, and the tail window a fixed-height feed can hold — the
 *   detail text a row carries beside its stamps, and the whole ring as a file that leaves.
 * @instead The ring itself → ring() on src/app/facade.ts. The surface that draws these rows is
 *   src/ui/DebugConsole.tsx; it may not detect a gap of its own. The menu entry that hands the
 *   file below to the browser → src/ui/FileMenu.tsx.
 */
import type { Event } from "@/app/events";

/** A run of events the ring no longer holds — a break on the older side of `beforeSeq`. */
export type Gap = { gap: number; beforeSeq: number };

/**
 * The rows to render, newest first: every event, with a break row wherever seq skipped. seq is
 * gapless from 0 by contract, so a hole here is a drop — the one thing a feed must never smooth
 * over (plan §1).
 *
 * Newest first is the reading, not a reversal a surface does after the fact: the newest event is
 * row 0 for both the log page and the debug console, so the two cannot disagree about which end
 * of the list is live. A break belongs to the event whose seq jumped, so it sits immediately
 * *after* that event here — the older side of it, which is where the missing events were.
 *
 * `limit` caps the rows returned to the newest that many, which is how a fixed-height window
 * stays fixed: the walk starts at the newest event and stops as soon as the window is full, so
 * older rows are never visited and never formatted, whatever the ring is holding.
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
  return rows;
}

const STAMP_KEYS = new Set(["seq", "at", "wall", "t"]);

/** The event's own fields, minus the stamps a row's columns already show. */
export const eventDetail = (event: Event): string =>
  JSON.stringify(Object.fromEntries(Object.entries(event).filter(([k]) => !STAMP_KEYS.has(k))));

/** The one public file identity for an exported event log, shared by the writer and its tests. */
export const EVENT_LOG_FILE = {
  extension: ".jsonl",
  mediaType: "application/x-ndjson",
  name: "mulch-events.jsonl",
} as const;

/**
 * The ring as JSONL: one whole event per line, oldest first, stamps included — the opposite
 * order from the feed above, because a log that is read by a tool is read forwards and `seq`
 * is what a reader sorts on anyway.
 *
 * What the ring no longer holds is not written as a break row the way the feed draws one: the
 * first line's `seq` says how many events fell off, which is the same fact without a line that
 * is not an event in a format whose whole contract is that every line is one (0060).
 *
 * An empty ring is an empty file, not a blank line — a trailing newline terminates a record,
 * so there is no record to terminate.
 */
export function eventLogJsonl(events: readonly Event[]): string {
  return events.map((event) => `${JSON.stringify(event)}\n`).join("");
}

/** The same lines, as the file the browser is handed. */
export function eventLogFile(events: readonly Event[]): File {
  return new File([eventLogJsonl(events)], EVENT_LOG_FILE.name, {
    type: EVENT_LOG_FILE.mediaType,
  });
}
