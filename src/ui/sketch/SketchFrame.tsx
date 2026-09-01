/**
 * @role The frame every sketch on the bench sits in — its number, its name, the one sentence it
 *   argues, what it gives up to argue it, and the stage the sketch itself is drawn on.
 * @instead The bench's own layout and the two lists of what is on it → src/ui/sketch/SketchPage.tsx.
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
  children,
}: {
  id: string;
  index: number;
  title: string;
  thesis: string;
  /** What the approach cannot do, said out loud: every one of these trades something away. */
  trades: string;
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
      </header>
      <div className="rounded-lg border border-border bg-card p-4">{children}</div>
    </section>
  );
}

/**
 * The box a part sketch draws one picture in. Pinned rather than `w-full`, and one string rather
 * than five: at `h-40 w-80` a 320-by-160 viewBox is drawn a unit to the pixel, so a picture a hand
 * drags across reads a pointer's place in the element as its place in the picture. A `w-full` box
 * letterboxes the drawing inside itself and a drag then lags the pointer by the ratio between the
 * two — which is what the chipper's own fixed box has always avoided.
 */
export const SKETCH_PICTURE = "h-40 w-80 rounded bg-muted text-muted-foreground";

/** That box said as a viewBox, which is the half of the pairing a picture writes: `h-40 w-80` is
 *  160 by 320, and the two have to agree for a unit to be a pixel. Declared here beside the class
 *  rather than in each part sketch, because a class changed on one side and a viewBox left on the
 *  other is a drag that lags the pointer and nothing that says so (principle 1). */
export const SKETCH_VIEW = { wide: 320, high: 160 };

/** The eyebrow a sketch labels one of its own regions with, so six sketches label alike. */
export function SketchLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("type-eyebrow text-muted-foreground", className)}>{children}</div>;
}
