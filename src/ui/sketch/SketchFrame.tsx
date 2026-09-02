/**
 * @role The frame every sketch on the bench sits in — its number, its name, the one sentence it
 *   argues, what it gives up to argue it, how it would be built where an entry says so, and the
 *   stage the sketch itself is drawn on.
 * @instead The bench's own layout and the list of what is on it → src/ui/sketch/SketchPage.tsx.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * A sketch is drawn full width and on a card, because the thing every one of them replaces is a
 * full-width card of the rack (src/ui/PlayerCard.tsx) — a sketch in a narrower box would be
 * arguing at a measure the real surface never gets.
 */
export function SketchFrame({
  id,
  index,
  title,
  thesis,
  trades,
  built,
  children,
}: {
  id: string;
  index: number;
  title: string;
  thesis: string;
  /** What the approach cannot do, said out loud: every one of these trades something away. */
  trades: string;
  /** Where in the real thing it would land, and what it costs there — for a bench whose entries
   *  are directions to build rather than surfaces to pick between. */
  built?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline gap-3">
          <span className="type-readout text-muted-foreground">
            {String(index).padStart(2, "0")}
          </span>
          <h3 className="type-title">{title}</h3>
        </div>
        <p className="type-body text-muted-foreground">{thesis}</p>
        <p className="type-body text-muted-foreground">
          <span className="type-eyebrow">Trades</span> {trades}
        </p>
        {built === undefined ? null : (
          <p className="type-body text-muted-foreground">
            <span className="type-eyebrow">Built</span> {built}
          </p>
        )}
      </header>
      <div className="rounded-lg border border-border bg-card p-4">{children}</div>
    </section>
  );
}

/**
 * The box a sketch draws one picture in. Pinned rather than `w-full`, and one string rather than
 * five: at `h-40 w-120` a 480-by-160 viewBox is drawn a unit to the pixel, so a picture a hand
 * works reads a pointer's place in the element as its place in the picture. A `w-full` box
 * letterboxes the drawing inside itself and a gesture then lags the pointer by the ratio between
 * the two.
 *
 * Widened from 320 by the shot that proved 0252's own trap: at 320 a readout naming its corner and
 * stating the amount beside it ran off the right-hand edge, and a clipped label reads as a smaller
 * number — `Every 4 sequences` drawn as `Every 4 sequence` — which is legible and wrong.
 */
export const SKETCH_PICTURE = "h-40 w-120 rounded bg-muted text-muted-foreground";

/** That box said as a viewBox, which is the half of the pairing a picture writes: `h-40 w-120` is
 *  160 by 480, and the two have to agree for a unit to be a pixel. Declared here beside the class
 *  rather than in each sketch, because a class changed on one side and a viewBox left on the other
 *  is a picture that lags the pointer and nothing that says so (principle 1). */
export const SKETCH_VIEW = { wide: 480, high: 160 };

/**
 * A point on a circle, with nought a turn at the top and a turn running clockwise — the way a
 * clock face is read, the way a ring of grounds advances, and the way a wheel of rounds goes. Up
 * here beside the box rather than on one bench, because it is now read by both of them and a
 * second copy is two pictures free to disagree about which way round is forwards (principle 1).
 */
export function atTurn(
  cx: number,
  cy: number,
  radius: number,
  turn: number,
): { x: number; y: number } {
  const angle = (turn - 0.25) * Math.PI * 2;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

/** The eyebrow a sketch labels one of its own regions with, so eight sketches label alike. */
export function SketchLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("type-eyebrow text-muted-foreground", className)}>{children}</div>;
}
