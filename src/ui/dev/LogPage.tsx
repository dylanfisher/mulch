/**
 * @role The event log at #/log — the ring, rendered: the same stream ./scripts/drive tails,
 *   for humans. A seq gap renders as a visible break in the list, never silently.
 */
import { useEffect, useState } from "react";

import type { Event } from "@/app/events";
import type { Instrument } from "@/app/facade";
import { DEV_ROUTE } from "@/ui/App";
import { Logo } from "@/ui/Logo";
import { ThemeToggle } from "@/ui/ThemeToggle";

/** A run of events the ring no longer holds — rendered as a break, in front of `beforeSeq`. */
type Gap = { gap: number; beforeSeq: number };

/**
 * The rows to render: every event, with a break row in front of any seq the stream skipped.
 * seq is gapless from 0 by contract, so a hole here is a drop — the one thing this panel
 * must never smooth over (plan §1).
 */
export function withGaps(events: Event[]): (Event | Gap)[] {
  const rows: (Event | Gap)[] = [];
  let expected = 0;
  for (const event of events) {
    if (event.seq > expected) rows.push({ gap: event.seq - expected, beforeSeq: event.seq });
    rows.push(event);
    expected = event.seq + 1;
  }
  return rows;
}

const STAMP_KEYS = new Set(["seq", "at", "wall", "t"]);

/** The event's own fields, minus the stamps the columns already show. */
const detail = (event: Event) =>
  JSON.stringify(Object.fromEntries(Object.entries(event).filter(([k]) => !STAMP_KEYS.has(k))));

function LogList({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <p className="type-body text-muted-foreground">
        No events yet — send a command: <code>window.mulch.send(…)</code> from the console, or{" "}
        <code>./scripts/drive</code> from a terminal.
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-1">
      {withGaps(events).map((row) =>
        "gap" in row ? (
          <li key={`gap-${row.beforeSeq}`} className="type-eyebrow text-destructive">
            ✂ {row.gap} {row.gap === 1 ? "event" : "events"} dropped
          </li>
        ) : (
          <li key={row.seq} className="flex gap-4 type-readout">
            <span className="w-12 text-right text-muted-foreground">{row.seq}</span>
            <span className="w-20 text-right text-muted-foreground">{row.at.toFixed(3)}</span>
            <span className="w-32">{row.t}</span>
            <span className="min-w-0 break-all text-muted-foreground">{detail(row)}</span>
          </li>
        ),
      )}
    </ol>
  );
}

export function LogPage({ instrument }: { instrument: Instrument }) {
  const [events, setEvents] = useState<Event[]>(() => instrument.ring());
  // The ring is the source, the subscription only says when to re-read it — so this
  // page and a late-arriving one render the same list.
  useEffect(() => {
    // Coalesced to one read per frame. Re-reading on every event rebuilds a list of up to
    // RING_CAPACITY entries and re-renders all of them, which a stream of deck.looped can
    // fire far faster than the screen changes. The ring already holds everything, so a frame's
    // worth of events is one read — no event goes unseen, they simply arrive together.
    let frame = 0;
    const read = () => {
      frame = 0;
      setEvents(instrument.ring());
    };
    const unsubscribe = instrument.on(() => {
      frame ||= requestAnimationFrame(read);
    });
    // Anything emitted between the useState snapshot and this subscription would stay
    // invisible until the next event healed it — and a stream that just went quiet has
    // no next event. Re-read once, now that the subscription is live.
    read();
    return () => {
      unsubscribe();
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [instrument]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
          <Logo className="type-title" />
          <span className="type-body text-muted-foreground">event log</span>
          <a
            href={DEV_ROUTE}
            className="ml-auto type-body text-muted-foreground transition-colors hover:text-foreground"
          >
            primitives →
          </a>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <LogList events={events} />
      </main>
    </div>
  );
}
