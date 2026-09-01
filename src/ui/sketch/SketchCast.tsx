/**
 * @role Sketch 01 — the whole mulcher as one hexagonal blend pad: the six characters are the
 *   corners, a dragged puck weights them, and every one of the forty-five numbers is derived.
 * @instead The card this argues with → src/ui/PlayerCard.tsx. The six names themselves →
 *   src/lib/playerCast.ts.
 */
// A sketch is one surface making one argument, so its component is the length of that surface.
// Splitting it would name pieces of a shape that has not won yet, and the names would be the
// hardest part to throw away (0247). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function
import { useCallback, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { PLAYER_PART_KNOBS } from "@/lib/player";
import { SketchLabel } from "@/ui/sketch/SketchFrame";
import { SKETCH_CAST, SKETCH_WALK } from "@/ui/sketch/sketchWalk";
import { Button } from "@/ui/components/button";
import { Switch } from "@/ui/components/switch";

/** The pad is square in its own coordinates and the hexagon is inscribed in it. */
const PAD = 200;
const RING = 84;

/** Where each corner sits, starting at the top and going round. */
const CORNERS = SKETCH_CAST.map((name, index) => {
  const angle = (index / SKETCH_CAST.length) * Math.PI * 2 - Math.PI / 2;
  return { name, x: PAD / 2 + Math.cos(angle) * RING, y: PAD / 2 + Math.sin(angle) * RING };
});

const HEXAGON = CORNERS.map((corner) => `${corner.x},${corner.y}`).join(" ");

/** The walk's bars are fixed, so their heights are written once here rather than every render. */
const WALK_BARS = SKETCH_WALK.map((landing) => ({
  at: landing.at,
  style: { height: `${landing.level * 100}%`, opacity: 0.35 + landing.level * 0.65 },
}));

/** How much of each corner the puck is standing in: inverse square distance, normalised. */
function weigh(x: number, y: number) {
  const raw = CORNERS.map((corner) => 1 / (Math.hypot(corner.x - x, corner.y - y) ** 2 + 400));
  const total = raw.reduce((sum, one) => sum + one, 0);
  return raw.map((one) => one / total);
}

export function SketchCast() {
  const pad = useRef<SVGSVGElement>(null);
  const [puck, setPuck] = useState({ x: PAD / 2 + 26, y: PAD / 2 - 18 });
  const [held, setHeld] = useState(false);
  const weights = weigh(puck.x, puck.y);

  const aim = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const box = pad.current?.getBoundingClientRect();
    if (box === undefined) return;
    setPuck({
      x: ((event.clientX - box.left) / box.width) * PAD,
      y: ((event.clientY - box.top) / box.height) * PAD,
    });
  }, []);
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setHeld(true);
      aim(event);
    },
    [aim],
  );
  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (held) aim(event);
    },
    [held, aim],
  );
  const onPointerUp = useCallback(() => {
    setHeld(false);
  }, []);

  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="flex flex-col gap-2">
        <SketchLabel>Sounds Like</SketchLabel>
        <svg
          ref={pad}
          viewBox={`0 0 ${PAD} ${PAD}`}
          className="h-64 w-64 touch-none rounded-lg bg-muted select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <polygon points={HEXAGON} className="fill-background stroke-border" />
          {CORNERS.map((corner, index) => (
            <g key={corner.name}>
              {/* A leg to the puck whose weight *is* the weight: the pad says what it is doing. */}
              <line
                x1={corner.x}
                y1={corner.y}
                x2={puck.x}
                y2={puck.y}
                className="stroke-primary"
                strokeWidth={(weights[index] ?? 0) * 9}
                opacity={0.5}
              />
              <circle
                cx={corner.x}
                cy={corner.y}
                r={4 + (weights[index] ?? 0) * 40}
                className="fill-primary"
                opacity={0.25 + (weights[index] ?? 0)}
              />
            </g>
          ))}
          <circle
            cx={puck.x}
            cy={puck.y}
            r={9}
            strokeWidth={3}
            className="fill-primary stroke-background"
          />
        </svg>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {CORNERS.map((corner, index) => (
            <span key={corner.name} className="type-readout text-muted-foreground">
              {corner.name} {Math.round((weights[index] ?? 0) * 100)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-w-64 flex-1 flex-col gap-4">
        <div className="flex items-center gap-3">
          <Switch defaultChecked />
          <span className="type-body">Mulcher</span>
          <span className="ml-auto type-readout text-muted-foreground">Seed 4821</span>
          <Button size="sm" variant="outline">
            Reseed
          </Button>
        </div>

        <div>
          <SketchLabel>The Walk</SketchLabel>
          <div className="mt-2 flex h-16 items-end gap-px rounded bg-muted p-1">
            {WALK_BARS.map((bar) => (
              <div key={bar.at} className="flex-1 rounded-t bg-primary" style={bar.style} />
            ))}
          </div>
        </div>

        <p className="type-body text-muted-foreground">
          The pad writes all {PLAYER_PART_KNOBS.length} of a part&apos;s numbers at once. Nothing
          below is a control — it is a readout of what the pad just wrote, and Fine Tune is a drawer
          that stays shut unless one of them is wrong.
        </p>

        <DerivedNumbers weights={weights} />

        <Button variant="ghost" size="sm" className="self-start">
          Fine Tune ▸
        </Button>
      </div>
    </div>
  );
}

/** The forty-five, drawn as what they are here: an answer, not a question. */
function DerivedNumbers({ weights }: { weights: readonly number[] }) {
  const shown = useMemo(
    () =>
      PLAYER_PART_KNOBS.slice(0, 12).map((knob, index) => ({
        knob,
        at: Math.round(((weights[index % CORNERS.length] ?? 0) * 400 + index * 7) % 100),
      })),
    [weights],
  );
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded border border-border p-3 sm:grid-cols-4">
      {shown.map((one) => (
        <span key={one.knob} className="type-readout text-muted-foreground">
          {one.knob} {one.at}
        </span>
      ))}
      <span className="type-readout text-muted-foreground">
        +{PLAYER_PART_KNOBS.length - 12} more
      </span>
    </div>
  );
}
