/**
 * @role The debug console: an overlay a player can toggle over the instrument, showing the live
 *   event feed and the counters that say whether it is keeping up. Open is a view preference —
 *   no command, nothing durable, no history entry — and closed it is one boolean: no rows, no
 *   subscription, no frame callback, nothing measured.
 * @instead Which rows a window holds, how a gap is found, and the whole ring as a file that
 *   leaves → src/ui/eventFeed.ts. The counters themselves → stats() on
 *   src/app/facade.ts, which reads each one from the owner that already had it.
 */
import { useEffect, useRef } from "react";

import type { Event } from "@/app/events";
import type { Instrument, Stats } from "@/app/facade";
import { COUNTER_TOOLTIPS } from "@/lib/copy";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/components/tooltip";
import { eventDetail, withGaps, type Gap } from "@/ui/eventFeed";
import { frameCostMs, measureFrameCost, useOnFrame } from "@/ui/frame";

/**
 * How many rows the feed holds. Fixed, and small: the window is the whole reason a stream of
 * `deck.looped` cannot cost the frame budget — rows above it are never visited, so nothing
 * accumulates and nothing off screen is ever formatted.
 */
export const FEED_ROWS = 16;

/**
 * What a counter reads when nobody can answer it. Not "0": a browser that will not report its
 * heap has not reported a heap of zero, and a reader who cannot tell those apart is reading a
 * number that is not there (principle 5, 0063).
 */
const UNKNOWN = "—";

/**
 * The counters, in the order they are shown: a name and how to read it. The cells are built once
 * from this list and refilled from it, so a counter is declared in exactly one place.
 */
export const COUNTERS: readonly (readonly [string, (stats: Readonly<Stats>) => string])[] = [
  ["frame", () => `${frameCostMs().toFixed(2)}ms`],
  ["events", (stats) => String(stats.events)],
  ["dropped", (stats) => String(stats.dropped)],
  ["queued", (stats) => String(stats.queued)],
  ["decoding", (stats) => String(stats.decoding)],
  ["analyzing", (stats) => String(stats.analyzing)],
  ["context", (stats) => stats.context],
  ["clock", (stats) => `${stats.at.toFixed(2)}s`],
  ["audio", ({ audioLoad }) => (audioLoad === null ? UNKNOWN : `${(audioLoad * 100).toFixed(0)}%`)],
  ["heap", ({ heapMb }) => (heapMb === null ? UNKNOWN : `${heapMb.toFixed(1)}MB`)],
  ["buffers", ({ bufferMb }) => `${bufferMb.toFixed(1)}MB`],
];

/**
 * The feed's columns, in the order they are shown: a name, the class that sizes the cell, and
 * what a row puts in it. Built once from this list and refilled from it, like COUNTERS above, so
 * the feed's width is declared in exactly one place and a fifth column is one entry.
 */
const FEED_COLUMNS: readonly (readonly [
  name: string,
  className: string,
  read: (content: Event | Gap) => string,
])[] = [
  ["seq", "w-12 text-right text-muted-foreground", (row) => ("gap" in row ? "✂" : String(row.seq))],
  ["at", "w-20 text-right text-muted-foreground", (row) => ("gap" in row ? "" : row.at.toFixed(3))],
  ["type", "w-32", (row) => ("gap" in row ? `${row.gap} dropped` : row.t)],
  // The only string building here, and only for rows that are on screen.
  [
    "detail",
    "min-w-0 truncate text-muted-foreground",
    (row) => ("gap" in row ? "" : eventDetail(row)),
  ],
];

/**
 * Write into the skeleton React rendered once. A missing cell is a bug in that skeleton.
 *
 * Unchanged text is not written at all: assigning `textContent` replaces the node's children
 * whether or not the string matches, so a counter standing still would still cost a text node
 * and a style invalidation sixty times a second (0070). The comparison is against the cell
 * rather than against a remembered string, as the knob's readout compares (src/ui/Knob.tsx):
 * every cell here is a leaf holding one text node, so reading it back is one concatenation of
 * one string — a rule that would need the knob's ref the day a cell holds anything else.
 * Exported for the test that counts those writes, the way COUNTERS is.
 */
export function write(cells: HTMLCollection, index: number, text: string): void {
  const cell = cells.item(index);
  if (cell === null) throw new Error(`the debug console is missing cell ${index}`);
  if (cell.textContent !== text) cell.textContent = text;
}

function paintCounters(list: HTMLElement | null, stats: Readonly<Stats>): void {
  if (list === null) throw new Error("the debug console painted its counters before they mounted");
  COUNTERS.forEach(([name, read], index) => {
    const pair = list.children.item(index);
    if (pair === null) throw new Error(`the debug console is missing counter ${name}`);
    write(pair.children, 1, read(stats));
  });
}

function paintRow(row: Element, content: Event | Gap | undefined): void {
  const cells = row.children;
  if (content === undefined) {
    // However many columns the skeleton has: an empty row clears what is there, not a count
    // of its own that a fifth column would silently leave behind.
    for (let index = 0; index < cells.length; index++) write(cells, index, "");
    return;
  }
  FEED_COLUMNS.forEach(([, , read], index) => {
    write(cells, index, read(content));
  });
}

function paintFeed(list: HTMLElement | null, events: readonly Event[]): void {
  if (list === null) throw new Error("the debug console painted its feed before it mounted");
  const rows = withGaps(events, FEED_ROWS);
  // Newest at the top, the same end the log page puts it (eventFeed.ts): row 0 is the newest
  // event, so a short feed pads below rather than moving as it fills.
  for (let index = 0; index < FEED_ROWS; index++) {
    const row = list.children.item(index);
    if (row === null) throw new Error(`the debug console is missing feed row ${index}`);
    paintRow(row, rows[index]);
  }
}

/**
 * The empty cells the frame loop fills. React renders this skeleton once and never again — the
 * tooltip on each label is part of that one render: a closed tooltip mounts no popup, and an
 * open one is portalled to the body, so the pair the painter walks is the same two children
 * either way and nothing per-frame gains a subscriber.
 */
const CounterCells = () =>
  COUNTERS.map(([name]) => {
    // A counter nobody wrote a sentence for is a missing word, not a bare label (principle 5).
    const says = COUNTER_TOOLTIPS[name];
    if (says === undefined) throw new Error(`no tooltip for counter ${name}`);
    return (
      <div key={name} className="flex items-baseline gap-2">
        {/* The trigger is a button inside the label rather than the `dt` itself: a sentence only
            a resting pointer can reach is one half the readers never see, and the tab order is
            what a keyboard reaches it by. */}
        <dt className="type-eyebrow text-muted-foreground">
          <Tooltip>
            <TooltipTrigger render={<button type="button">{name}</button>} />
            <TooltipContent>{says}</TooltipContent>
          </Tooltip>
        </dt>
        <dd className="type-readout" />
      </div>
    );
  });

const FeedRows = () =>
  Array.from({ length: FEED_ROWS }, (_, index) => (
    <li key={`row-${index}`} className="flex gap-4 type-readout">
      {FEED_COLUMNS.map(([name, className]) => (
        <span key={name} className={className} />
      ))}
    </li>
  ));

export function DebugConsole({ instrument, open }: { instrument: Instrument; open: boolean }) {
  const counters = useRef<HTMLDListElement | null>(null);
  const feed = useRef<HTMLOListElement | null>(null);
  /** The seq count the feed was last painted at — the ring is only re-read when it has moved. */
  const painted = useRef(-1);

  useEffect(() => {
    measureFrameCost(open);
    instrument.measureRenderLoad(open);
    painted.current = -1;
    return () => {
      measureFrameCost(false);
      instrument.measureRenderLoad(false);
    };
  }, [instrument, open]);

  // The existing loop, not a second one, and not a per-event subscription: every counter and
  // every row is written straight into the DOM here, so nothing per-frame enters React state.
  useOnFrame(() => {
    const stats = instrument.stats();
    paintCounters(counters.current, stats);
    if (stats.events === painted.current) return;
    painted.current = stats.events;
    paintFeed(feed.current, instrument.ring());
  }, open);

  if (!open) return null;

  return (
    <aside
      aria-label="Debug Console"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur"
    >
      {/* The provider carries the delay, and the primitive declares it once (0 in
          src/ui/components/tooltip.tsx). Without one the labels would open on Base UI's own
          600ms while the same primitive in the gallery opens at once. */}
      <TooltipProvider>
        <dl
          ref={counters}
          className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border px-4 py-2"
        >
          <CounterCells />
        </dl>
      </TooltipProvider>
      <ol ref={feed} className="flex flex-col px-4 py-2">
        <FeedRows />
      </ol>
    </aside>
  );
}
