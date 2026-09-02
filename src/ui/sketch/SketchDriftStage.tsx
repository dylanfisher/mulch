/**
 * @role The stage every picture on the drift bench is written through: one canvas in the bench's
 *   own box, a field painted pixel by pixel into it through a ramp of the instrument's own inks,
 *   the dial the picture is drawn under, and the one readout that says what the dial stands at.
 *   Eight pictures each opening their own canvas would be eight chances to read a token a ninth
 *   way — so the inks are read here, once, off the element the way the real painter reads them
 *   (`inkOf`, src/ui/moireScreen.ts), and never parsed.
 * @instead The fields themselves → src/ui/sketch/sketchDrift.ts. The moves they are built out of →
 *   src/ui/sketch/sketchField.ts. The box, the ground bench's stage and the frame around every
 *   entry → src/ui/sketch/SketchFrame.tsx and src/ui/sketch/SketchStage.tsx.
 */
// One stage is one function: the canvas, its legend, its readout and its dial are read top to
// bottom as the one thing a picture on this bench is, and cutting it into helpers to satisfy a line
// count would scatter one stage across four scopes. The waiver every picture on the bench carries,
// for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { useCanvasSurface } from "@/ui/canvasSurface";
import { Slider } from "@/ui/components/slider";
import { type Ink, inkOf } from "@/ui/moireScreen";
import type { SketchDial, SketchDriftField } from "@/ui/sketch/sketchDrift";
import { ramp } from "@/ui/sketch/sketchField";
import { SKETCH_PICTURE, SketchLabel } from "@/ui/sketch/SketchFrame";

/**
 * The two ways a picture is inked. `ink` is the instrument today — its ground and one ink, which
 * is the box's own `text-*` token. `ramp` is the reference: the ground, the cool ink, the green
 * channel, the primary and the hot ink, in that order, which is the one direction on the bench
 * that spends a second colour and says so.
 */
export type SketchInking = "ink" | "ramp";

/**
 * The stops of each inking, as the classes the legend chips are drawn in — the same token the
 * painter reads, so the chip under the picture and the pixel in it cannot come from two places.
 * Read off the chips' own computed backgrounds rather than off the canvas's custom properties:
 * an unregistered property computes to its token text, and a chip is a colour the engine has
 * already resolved (principle 5).
 */
export const INKING_STOPS: Record<SketchInking, readonly { name: string; chip: string }[]> = {
  ink: [
    { name: "ground", chip: "bg-muted" },
    { name: "ink", chip: "bg-foreground" },
  ],
  ramp: [
    { name: "ground", chip: "bg-muted" },
    { name: "cool", chip: "bg-(--drift-cool)" },
    { name: "green", chip: "bg-(--screen-green)" },
    { name: "primary", chip: "bg-primary" },
    { name: "hot", chip: "bg-(--drift-hot)" },
  ],
};

/** The canvas is written at the box's own scale: one unit of the field is the picture's height. */
function paintField(
  canvas: HTMLCanvasElement,
  stops: readonly Ink[],
  field: SketchDriftField,
  amount: number,
): void {
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("The drift stage was handed a canvas with no context.");
  const { width, height } = canvas;
  if (width === 0 || height === 0) return;
  const image = context.createImageData(width, height);
  const { data } = image;
  let at = 0;
  for (let py = 0; py < height; py += 1) {
    const y = (py + 0.5) / height;
    for (let px = 0; px < width; px += 1) {
      const pixel = ramp(stops, field((px + 0.5) / height, y, amount));
      data[at] = pixel[0];
      data[at + 1] = pixel[1];
      data[at + 2] = pixel[2];
      data[at + 3] = 255;
      at += 4;
    }
  }
  context.putImageData(image, 0, 0);
}

/** One picture's stage: the canvas, its legend, its dial and its readout. */
export function SketchDriftStage({
  reading,
  label,
  inking = "ink",
  field,
  dial,
  said,
  dialLabel,
}: {
  reading: string;
  label: string;
  inking?: SketchInking;
  field: SketchDriftField;
  dial: SketchDial;
  /** What the dial stands at, in the picture's own words — drawn under the picture. */
  said: (amount: number) => string;
  /** What a hand is told the dial does. */
  dialLabel: string;
}) {
  const [amount, setAmount] = useState(dial.rest);
  const turn = useCallback(
    (value: number | readonly number[]) => {
      // One thumb, so a list is the shape and not a case (src/ui/components/slider.tsx).
      const next = typeof value === "number" ? value : value[0];
      if (next === undefined) throw new Error(`The ${reading} dial handed back no amount.`);
      setAmount(next);
    },
    [reading],
  );

  const stops = INKING_STOPS[inking];
  // The legend is where the inks are read from, so it is reached by its own ref and never by
  // walking up from the canvas: a wrapper added between the two would read the wrong element.
  const legend = useRef<HTMLDivElement>(null);
  const paint = useCallback(
    (canvas: HTMLCanvasElement) => {
      const chips = legend.current?.querySelectorAll("[data-chip]");
      if (chips === undefined || chips.length !== stops.length) {
        throw new Error(
          `The ${reading} stage has ${chips?.length ?? 0} chips for ${stops.length} inks.`,
        );
      }
      const inks = Array.from(chips, (chip) => inkOf(getComputedStyle(chip).backgroundColor));
      paintField(canvas, inks, field, amount);
    },
    [amount, field, reading, stops.length],
  );
  const { rootRef, canvasRef } = useCanvasSurface(paint, false);

  return (
    <div data-drift={reading} className="flex flex-col gap-2">
      <SketchLabel>{label}</SketchLabel>
      <div
        ref={rootRef}
        className={cn(
          SKETCH_PICTURE,
          "overflow-hidden",
          inking === "ramp" ? "text-primary" : "text-foreground",
        )}
      >
        <canvas ref={canvasRef} className="size-full" aria-label={`${label} picture`} />
      </div>
      <div ref={legend} className="flex flex-wrap items-center gap-3">
        {stops.map((stop) => (
          <span
            key={stop.name}
            className="flex items-center gap-1 type-readout text-muted-foreground"
          >
            <span
              data-chip={stop.name}
              className={cn("inline-block size-3 rounded-sm", stop.chip)}
            />
            {stop.name}
          </span>
        ))}
        <span data-said={reading} className="ml-auto type-readout text-foreground">
          {said(amount)}
        </span>
      </div>
      <Slider
        value={amount}
        min={dial.min}
        max={dial.max}
        step={dial.step}
        aria-label={dialLabel}
        onValueChange={turn}
      />
    </div>
  );
}
