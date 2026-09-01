/**
 * @role Sketch 05 — the mulcher as somewhere to walk about: one field scattered with planted
 *   spots, where moving the cursor interpolates the whole patch between whichever are near, and a
 *   Wander toggle lets it drift on its own.
 * @instead The grounds this borrows its chips from → src/ui/PlayerBeds.tsx.
 */
// One surface, one argument — the length is the surface's (0247, 0007).
// oxlint-disable max-lines-per-function
import { useCallback, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { SketchLabel } from "@/ui/sketch/SketchFrame";
import { SKETCH_BEDS, SKETCH_CAST } from "@/ui/sketch/sketchWalk";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";

/**
 * The spots on the field: each is a whole saved patch, named for what it sounds like. Hand-placed
 * so the field has somewhere sparse to get lost in, which is the argument — a field with an even
 * grid of spots on it is a preset list with extra steps.
 */
const SPOTS = [
  { name: "flat", x: 0.16, y: 0.22, size: 1 },
  { name: "chewy", x: 0.36, y: 0.34, size: 1.4 },
  { name: "glassy", x: 0.68, y: 0.18, size: 0.9 },
  { name: "torn", x: 0.82, y: 0.52, size: 1.2 },
  { name: "wide open", x: 0.24, y: 0.72, size: 1.6 },
  { name: "hiccup", x: 0.55, y: 0.63, size: 0.8 },
  { name: "gone", x: 0.9, y: 0.86, size: 1 },
].map((spot) => ({
  name: spot.name,
  x: spot.x,
  y: spot.y,
  size: spot.size,
  /** The pool of pull under it, and the pin on top of it — both fixed, so both written once. */
  pool: {
    left: `${spot.x * 100}%`,
    top: `${spot.y * 100}%`,
    width: `${spot.size * 34}%`,
    height: `${spot.size * 44}%`,
  },
  pin: { left: `${spot.x * 100}%`, top: `${spot.y * 100}%` },
}));

export function SketchTerrain() {
  const field = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState({ x: 0.44, y: 0.42 });
  const [wander, setWander] = useState(false);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const box = field.current?.getBoundingClientRect();
    if (box === undefined) return;
    setAt({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height });
  }, []);

  /** Which spots the cursor is standing in, nearest first — the readout of where you are. */
  const near = useMemo(() => {
    const pulls = SPOTS.map((spot) => ({
      name: spot.name,
      pull: 1 / (Math.hypot(spot.x - at.x, spot.y - at.y) / spot.size + 0.08),
    }))
      // ES2022 has no toSorted; the array above is fresh, so sorting mutates nothing a caller holds.
      // oxlint-disable-next-line unicorn/no-array-sort
      .sort((a, b) => b.pull - a.pull)
      .slice(0, 3);
    const total = pulls.reduce((sum, one) => sum + one.pull, 0);
    return pulls.map((one) => ({
      name: one.name,
      share: Math.round((one.pull / total) * 100),
      bar: { width: `${(one.pull / total) * 100}%` },
    }));
  }, [at]);
  const cursor = useMemo(() => ({ left: `${at.x * 100}%`, top: `${at.y * 100}%` }), [at]);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex flex-col gap-2">
        <SketchLabel>Where You Are</SketchLabel>
        <div
          ref={field}
          onPointerMove={onPointerMove}
          className="relative h-72 w-96 touch-none overflow-hidden rounded-lg border border-border bg-muted"
        >
          {/* Each spot's pull drawn as a soft pool, so the field reads as terrain and not as pins. */}
          {SPOTS.map((spot) => (
            <div
              key={spot.name}
              style={spot.pool}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-xl"
            />
          ))}
          {SPOTS.map((spot) => (
            <div
              key={spot.name}
              style={spot.pin}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            >
              <div className="size-2 rounded-full bg-foreground" />
              <span className="type-eyebrow text-muted-foreground">{spot.name}</span>
            </div>
          ))}
          <div
            style={cursor}
            className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Toggle size="sm" pressed={wander} onPressedChange={setWander}>
            Wander
          </Toggle>
          <Button size="sm" variant="outline">
            Plant this spot
          </Button>
        </div>
      </div>

      <div className="flex min-w-64 flex-1 flex-col gap-4">
        <div>
          <SketchLabel>Which Is Mostly</SketchLabel>
          <div className="mt-2 flex flex-col gap-1">
            {near.map((one) => (
              <div key={one.name} className="flex items-center gap-3">
                <span className="w-24 type-body">{one.name}</span>
                <div className="h-2 flex-1 rounded bg-muted">
                  <div className="h-full rounded bg-primary" style={one.bar} />
                </div>
                <span className="type-readout text-muted-foreground">{one.share}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SketchLabel>Which Ground</SketchLabel>
          <div className="mt-2 flex flex-wrap gap-1">
            {SKETCH_BEDS.map((bed) => (
              <Toggle key={bed.name} size="sm" pressed={bed.name === "Break"}>
                {bed.name}
              </Toggle>
            ))}
          </div>
        </div>

        <p className="type-body text-muted-foreground">
          You never set a number here — you go somewhere. Wander drifts the cursor on its own, so
          the module mulches itself and the hand&apos;s job is to plant the places worth coming back
          to. The six names ({SKETCH_CAST.join(", ")}) are just spots someone planted first.
        </p>
      </div>
    </div>
  );
}
