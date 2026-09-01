/**
 * @role The four blends the cast sketch argues between — a labelled hexagon, a barycentric
 *   triangle, six levers and a wheel. Each one is the same seam, a hand's gesture → six weights
 *   over one, and each draws its own corner names inside its own picture.
 * @instead The square all four are drawn in, and the drag they share →
 *   src/ui/sketch/sketchBlendPad.tsx. The one readout they write, and the row that mounts them →
 *   src/ui/sketch/SketchCast.tsx.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { Button } from "@/ui/components/button";
import {
  BlendPad,
  CORNERS,
  CornerName,
  MIDDLE,
  normalise,
  PAD,
  placeOf,
  SPILL,
  RING,
  useAim,
  useHeld,
  type BlendProps,
  type WroteWeights,
} from "@/ui/sketch/sketchBlendPad";
import {
  cornerOf,
  HEXAGON_START,
  LEVER_START,
  MOUNTED,
  nameOf,
  SPARE,
  TRIANGLE,
  TRIANGLE_NAMES,
  weighHexagon,
  weighSweep,
  weighTriangle,
  weighWheel,
  WHEEL_START,
} from "@/ui/sketch/sketchBlendWeights";
import { SKETCH_CAST } from "@/ui/sketch/sketchWalk";

const HEXAGON = CORNERS.map((corner) => `${corner.x},${corner.y}`).join(" ");
/** A — the hexagon: what the bench already argued, now with its corners named. */
export function BlendHexagon({ wrote }: BlendProps) {
  const { pad, at, handlers } = useAim(HEXAGON_START, weighHexagon, wrote);
  const weights = weighHexagon(at);
  return (
    <BlendPad pad={pad} {...handlers}>
      <polygon points={HEXAGON} className="fill-background stroke-border" />
      {CORNERS.map((corner, index) => (
        <g key={corner.name}>
          {/* A leg to the puck whose weight *is* the weight: the pad says what it is doing. */}
          <line
            x1={corner.x}
            y1={corner.y}
            x2={at.x}
            y2={at.y}
            className="stroke-primary"
            strokeWidth={(weights[index] ?? 0) * 9}
            opacity={0.5}
          />
          <circle
            cx={corner.x}
            cy={corner.y}
            r={3 + (weights[index] ?? 0) * 30}
            className="fill-primary"
            opacity={0.25 + (weights[index] ?? 0)}
          />
          <CornerName name={corner.name} weight={weights[index] ?? 0} at={corner.label} />
        </g>
      ))}
      <circle
        cx={at.x}
        cy={at.y}
        r={8}
        strokeWidth={3}
        className="fill-primary stroke-background"
      />
    </BlendPad>
  );
}

/** The three that are mounted, each on its own corner of the triangle and under its own name. */
function MountedCorners({
  mounted,
  weights,
}: {
  mounted: readonly number[];
  weights: readonly number[];
}) {
  return mounted.map((index, corner) => (
    <g key={index}>
      <circle
        cx={cornerOf(TRIANGLE, corner).x}
        cy={cornerOf(TRIANGLE, corner).y}
        r={3 + (weights[index] ?? 0) * 30}
        className="fill-primary"
        opacity={0.25 + (weights[index] ?? 0)}
      />
      <CornerName
        name={nameOf(index)}
        weight={weights[index] ?? 0}
        at={cornerOf(TRIANGLE_NAMES, corner)}
      />
    </g>
  ));
}

/** The three not mounted, named at nought: the pad says what the swap would reach. */
function SpareNames({ mounted }: { mounted: readonly number[] }) {
  return SKETCH_CAST.filter((_, index) => !mounted.includes(index)).map((name, place) => (
    <text
      key={name}
      x={6 - SPILL}
      y={PAD - 34 + place * 12}
      fill="currentColor"
      className="type-readout"
      opacity={0.5}
    >
      {name} 0
    </text>
  ));
}

/** B — the barycentric triangle: three at the corners, and the other three a swap away. */
export function BlendTriangle({ wrote }: BlendProps) {
  const [swapped, setSwapped] = useState(false);
  const mounted = swapped ? SPARE : MOUNTED;
  const weigh = useMemo(() => weighTriangle(mounted), [mounted]);
  const { pad, at, handlers } = useAim({ x: MIDDLE, y: MIDDLE + 6 }, weigh, wrote);
  const weights = weigh(at);
  // A swap is a hand moving this blend: the three that carry the weight change, so the readout is
  // rewritten here as well as redrawn — one that kept the pre-swap six would be reading a place no
  // picture on the row is standing in.
  const swap = useCallback(() => {
    const next = swapped ? MOUNTED : SPARE;
    setSwapped(!swapped);
    wrote(weighTriangle(next)(at));
  }, [swapped, at, wrote]);

  return (
    <div className="flex flex-col gap-2">
      <BlendPad pad={pad} {...handlers}>
        <polygon
          points={TRIANGLE.map((corner) => `${corner.x},${corner.y}`).join(" ")}
          className="fill-background stroke-border"
        />
        <MountedCorners mounted={mounted} weights={weights} />
        <SpareNames mounted={mounted} />
        <circle
          cx={at.x}
          cy={at.y}
          r={8}
          strokeWidth={3}
          className="fill-primary stroke-background"
        />
      </BlendPad>
      <Button size="sm" variant="outline" onClick={swap} className="self-start">
        Mount The Other Three
      </Button>
    </div>
  );
}

/** A lever's column, the floor and ceiling its handle travels between, and where its name stands. */
const LANE = PAD / 6;
const HEAD = 30;
const FOOT = PAD - 60;
const NAME_FOOT = PAD - 6;

/** Six levers a hand drags one at a time, settling into shares of one when it lets go. */
function useLevers(wrote: WroteWeights) {
  const pad = useRef<SVGSVGElement>(null);
  const [raw, setRaw] = useState(LEVER_START);

  const drag = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const box = pad.current?.getBoundingClientRect();
      if (box === undefined) return;
      const at = placeOf(event, box);
      const lane = Math.min(SKETCH_CAST.length - 1, Math.max(0, Math.floor(at.x / LANE)));
      // A lever at nothing is reachable and legitimate; all six at nothing is the one place a
      // blend cannot stand, so the floor is a hair above it rather than a guess made later.
      const value = Math.min(1, Math.max(0.01, (FOOT - at.y) / (FOOT - HEAD)));
      const next = raw.map((one, index) => (index === lane ? value : one));
      setRaw(next);
      wrote(normalise(next));
    },
    [raw, wrote],
  );
  const handlers = useHeld(drag);
  // Normalised on release: the six settle into shares of one, and the row visibly shortens as
  // they do. A handle is its own amount and is drawn against the whole column, never against the
  // tallest of the six — that would make a press where a handle already stands move it.
  const { onPointerUp: release } = handlers;
  const onPointerUp = useCallback(() => {
    release();
    setRaw(normalise(raw));
  }, [release, raw]);

  return { pad, raw, handlers: { ...handlers, onPointerUp } };
}

/** One lever: its own amount against the whole column, its share of the six above it, its name. */
function Lever({
  name,
  index,
  share,
  weight,
}: {
  name: string;
  index: number;
  share: number;
  weight: number;
}) {
  const top = FOOT - share * (FOOT - HEAD);
  const x = index * LANE + LANE / 2;
  return (
    <g>
      <rect x={x - 7} y={HEAD} width={14} height={FOOT - HEAD} className="fill-background" />
      <rect x={x - 7} y={top} width={14} height={FOOT - top} className="fill-primary" />
      <text x={x} y={HEAD - 8} textAnchor="middle" fill="currentColor" className="type-readout">
        {Math.round(weight * 100)}
      </text>
      <text
        x={x}
        y={NAME_FOOT}
        textAnchor="start"
        fill="currentColor"
        className="type-readout"
        transform={`rotate(-90 ${x} ${NAME_FOOT})`}
      >
        {name}
      </text>
    </g>
  );
}

/** C — six levers: the place *is* the six numbers, so two patches that sound apart cannot meet. */
export function BlendLevers({ wrote }: BlendProps) {
  const { pad, raw, handlers } = useLevers(wrote);
  const weights = normalise(raw);
  return (
    <BlendPad pad={pad} {...handlers}>
      {SKETCH_CAST.map((name, index) => (
        <Lever
          key={name}
          name={name}
          index={index}
          share={raw[index] ?? 0}
          weight={weights[index] ?? 0}
        />
      ))}
    </BlendPad>
  );
}

/** An arc of the ring, drawn the short way round unless it is more than half of one. */
function arc(from: number, to: number, radius: number) {
  const a = { x: MIDDLE + Math.cos(from) * radius, y: MIDDLE + Math.sin(from) * radius };
  const b = { x: MIDDLE + Math.cos(to) * radius, y: MIDDLE + Math.sin(to) * radius };
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${to - from > Math.PI ? 1 : 0} 1 ${b.x} ${b.y}`;
}

/** D — the wheel: one dimension and a width, blending only what the sweep is standing between. */
export function BlendWheel({ wrote }: BlendProps) {
  const { pad, at, handlers } = useAim(WHEEL_START, weighSweep, wrote);
  const { angle, spread, weights } = weighWheel(at);
  return (
    <BlendPad pad={pad} {...handlers}>
      <circle cx={MIDDLE} cy={MIDDLE} r={RING} className="fill-background stroke-border" />
      {/* The width the sweep touches, drawn as the arc it touches — a number would say less. */}
      <path
        d={arc(angle - spread, angle + spread, RING)}
        className="stroke-primary"
        strokeWidth={6}
        fill="none"
        opacity={0.35}
      />
      <line
        x1={MIDDLE}
        y1={MIDDLE}
        x2={MIDDLE + Math.cos(angle) * RING}
        y2={MIDDLE + Math.sin(angle) * RING}
        className="stroke-primary"
        strokeWidth={3}
      />
      {CORNERS.map((corner, index) => (
        <g key={corner.name}>
          <circle
            cx={corner.x}
            cy={corner.y}
            r={3 + (weights[index] ?? 0) * 26}
            className="fill-primary"
            opacity={0.25 + (weights[index] ?? 0)}
          />
          <CornerName name={corner.name} weight={weights[index] ?? 0} at={corner.label} />
        </g>
      ))}
    </BlendPad>
  );
}

/**
 * The four, in the order they are read: the control first and then what each one trades for what
 * it buys. A blend's identity is written here beside its picture, for the reason a sketch's is
 * written beside its own (0247) — the argument cannot drift away from the drawing.
 */
export const SKETCH_BLENDS = [
  {
    key: "hexagon",
    title: "A — The Hexagon",
    trades: "a hand cannot read a weight off it; two very different patches share one place.",
    Picture: BlendHexagon,
  },
  {
    key: "triangle",
    title: "B — The Triangle",
    trades: "reach for legibility: three at a time, and the other three are a swap away.",
    Picture: BlendTriangle,
  },
  {
    key: "levers",
    title: "C — Six Levers",
    trades: "the one gesture — six drags where the pad takes one.",
    Picture: BlendLevers,
  },
  {
    key: "wheel",
    title: "D — The Wheel",
    trades:
      "every blend that is not a neighbourhood: no plain with slide unless what sits between them comes too.",
    Picture: BlendWheel,
  },
];
