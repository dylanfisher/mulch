/**
 * @role The one sketch of where the picture sits: the drift's weave painted under a whole yard
 *   card rather than in a strip at its foot, with the card's own controls read over the top and
 *   one dial for the veil between the two. A look and not a direction — the field is the drift
 *   bench's own stand-in weave and nothing about the painter is being argued here.
 * @instead The nine directions the picture itself could be pushed in →
 *   src/ui/sketch/drift/. The field this paints and the pixel loop it is written through →
 *   src/ui/sketch/sketchDrift.ts and src/ui/sketch/SketchDriftStage.tsx. The real card this
 *   stands in for → src/ui/PlayerCard.tsx, and the strip as it is mounted today →
 *   src/ui/MoireStrip.tsx. Neither is read: the bench wires to nothing (0247).
 */
// One stage is one function, the drift bench's reason exactly: the canvas, the veil over it, the
// card drawn on top and the dial that moves the two apart are read top to bottom as the one thing
// this picture is (0007, 0247).
// oxlint-disable max-lines-per-function
// And over the dependency count, for src/ui/PlayerCard.tsx's own reason: this stands in for that
// card, so every word on it is read from the module that declares it rather than re-typed here,
// and the count is the size of that vocabulary (0007, principle 1).
// oxlint-disable import/max-dependencies
import { useCallback, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { MOIRE_STRIP, PLAYER_GROUP_LABELS, PLAYER_LABEL, SEED_LABEL, yardLabel } from "@/lib/copy";
import { PLAYER_FINE_LABEL } from "@/lib/copyCard";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { useCanvasSurface } from "@/ui/canvasSurface";
import { Slider } from "@/ui/components/slider";
import { Switch } from "@/ui/components/switch";
import { inkOf } from "@/ui/moireScreenStops";
import { INKING_STOPS, paintField } from "@/ui/sketch/SketchDriftStage";
import { SketchLabel } from "@/ui/sketch/SketchFrame";
import { RAMP_DIAL, rampField, type SketchDial } from "@/ui/sketch/sketchDrift";
// oxlint-enable import/max-dependencies

/** The dial: how much of the card's own surface stands between the picture and the words. At one
 *  this is the card the instrument already has, and at nought the picture is the card. */
const VEIL_DIAL: SketchDial = { min: 0, max: 1, step: 0.05, rest: 0.55 };

/** A stand-in yard, named the way a real one is so the header row reads at its true length. */
const YARD = { deck: "c", seed: "bracken-04" } as const;

/** The standing row: which knob and what it stands at, paired here rather than zipped out of two
 *  lists by index — a fourth knob added to one of two lists draws a caption with a blank readout
 *  and says nothing about it (principle 5). The amounts mean nothing; they are there so the row of
 *  words over the picture is as long and as pale as the real one. */
const STANDING: readonly { knob: keyof typeof PLAYER_KNOB_LABELS; at: string }[] = [
  { knob: "bed", at: "6" },
  { knob: "distance", at: "0.40" },
  { knob: "stride", at: "2" },
];

export function SketchCardGround() {
  const [veil, setVeil] = useState(VEIL_DIAL.rest);
  const turn = useCallback((value: number | readonly number[]) => {
    // One thumb, so a list is the shape and not a case (src/ui/components/slider.tsx).
    const next = typeof value === "number" ? value : value[0];
    if (next === undefined) throw new Error("The card ground's veil dial handed back no amount.");
    setVeil(next);
  }, []);

  // The inks are read off the legend's own chips, the way every picture on the drift bench reads
  // them, so the card's ground and the strip's cannot resolve one token two ways.
  const legend = useRef<HTMLDivElement>(null);
  const stops = INKING_STOPS.ramp;
  const paint = useCallback(
    (canvas: HTMLCanvasElement) => {
      const chips = legend.current?.querySelectorAll("[data-chip]");
      if (chips === undefined || chips.length !== stops.length) {
        throw new Error(
          `The card ground has ${chips?.length ?? 0} chips for ${stops.length} inks.`,
        );
      }
      const inks = Array.from(chips, (chip) => inkOf(getComputedStyle(chip).backgroundColor));
      paintField(canvas, inks, rampField, RAMP_DIAL.rest);
    },
    [stops],
  );
  const { rootRef, canvasRef } = useCanvasSurface(paint, false);
  // The sheet's one changing value, held rather than minted in the render: a fresh object every
  // commit is a new prop on the element the veil is (react-perf).
  const sheet = useMemo(() => ({ opacity: veil }), [veil]);

  return (
    <div data-place="card" className="flex flex-col gap-2">
      <SketchLabel>
        {MOIRE_STRIP} under the whole card, with the card&apos;s surface turned down over it
      </SketchLabel>
      {/* No `text-*` token on this box, unlike every stage on the drift bench: there the class is
          what `useCanvasSurface` hands the painter as its colour, and here the inks are read off
          the legend's chips instead — so a token here would only recolour the card's own words,
          and the one question this picture asks is whether those words survive it. */}
      <div className="relative overflow-hidden rounded-lg border border-border">
        <div ref={rootRef} className="absolute inset-0">
          <canvas ref={canvasRef} className="size-full" aria-label="The card's ground" />
        </div>
        {/* The card's own surface as a sheet over the picture: what the veil turns is this and
            nothing about the painting under it, so moving the dial repaints no pixel. */}
        <div
          data-veil="card"
          className="absolute inset-0 bg-card"
          style={sheet}
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <span className="type-title">{yardLabel(YARD.deck)}</span>
            <span className="type-readout text-muted-foreground">
              {SEED_LABEL} {YARD.seed}
            </span>
            <Switch defaultChecked className="ml-auto" aria-label={`${PLAYER_LABEL} on`} />
          </div>
          <div className="flex flex-wrap items-baseline gap-6">
            {STANDING.map(({ knob, at }) => (
              <span key={knob} className="flex items-baseline gap-2">
                <span className="type-eyebrow text-muted-foreground">
                  {PLAYER_KNOB_LABELS[knob]}
                </span>
                <span className="type-readout">{at}</span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-6">
            {[PLAYER_FINE_LABEL, PLAYER_GROUP_LABELS.ground, PLAYER_GROUP_LABELS.arrange].map(
              (fold) => (
                <span key={fold} className="type-eyebrow text-muted-foreground">
                  {fold}
                </span>
              ),
            )}
          </div>
        </div>
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
        <span data-said="card" className="ml-auto type-readout text-foreground">
          card at {Math.round(veil * 100)}% over the picture
        </span>
      </div>
      <Slider
        value={veil}
        min={VEIL_DIAL.min}
        max={VEIL_DIAL.max}
        step={VEIL_DIAL.step}
        aria-label="How much of the card's own surface stands over the picture"
        onValueChange={turn}
      />
    </div>
  );
}
