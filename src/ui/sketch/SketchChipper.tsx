/**
 * @role Sketch 07 — the card laid out as the machine it is named for, top to bottom: the planted
 *   grounds dropped into a hopper, the six characters as a drum of blades whose size is their
 *   weight, and the walk thrown out the side as mulch.
 * @instead The same machine read from the output end, with no hopper and no drum →
 *   src/ui/sketch/SketchChips.tsx. The card both argue with → src/ui/PlayerCard.tsx.
 */
// One surface, one argument — the length is the surface's (0247, 0007).
// oxlint-disable max-lines-per-function
import { useCallback, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { PLAYER_GROUP_LABELS, PLAYER_SCOPE_LABEL } from "@/lib/copy";
import { Slider } from "@/ui/components/slider";
import { CornerName, normalise, useHeld, type Place } from "@/ui/sketch/sketchBlendPad";
import { SketchLabel } from "@/ui/sketch/SketchFrame";
import { SKETCH_BEDS, SKETCH_CAST, SKETCH_PARTS, SKETCH_WALK } from "@/ui/sketch/sketchWalk";

/**
 * The machine's own stage. One box holds all three of it, because the layout is the argument, and
 * it is drawn at 1:1 (`h-80 w-125`) so a name is never scaled down inside its own picture (0252).
 * The box starts left of nought: a name on the drum's left runs outward, and the room it needs is
 * the stage's to give rather than the name's to give up.
 */
const VIEW = { left: -60, w: 500, h: 320 };
/** The drum: where it turns, and how far its body reaches before a blade starts. */
const DRUM = { x: 150, y: 208, r: 34 };
/** How far past the drum's body the sharpest blade reaches, and the shortest a dull one keeps. */
const BLADE_REACH = 50;
const BLADE_STUB = 12;
/**
 * The names sit at a fixed radius outside the sharpest blade, so a name never moves when its own
 * blade is honed and never ends up under one — the rule 0252 set for the pad's corners.
 */
const NAME_RADIUS = DRUM.r + BLADE_REACH + 14;

/** The hopper's mouth, in the stage's own coordinates: what has been dropped in sits across it. */
const HOPPER = { left: 0, right: 300, top: 14, floor: 86, chipTop: 30, chipHeight: 18 };
/** The chute the mulch leaves by, and the line the thrown walk lands on. */
const CHUTE = { x: 320, y: 150, w: 116, h: 150, blocksLeft: 328, blocksWidth: 100, floor: 288 };

/** Where the nth blade points, at a given reach out of the drum's middle. */
function bladeAt(index: number, radius: number): Place {
  const angle = (index / SKETCH_CAST.length) * Math.PI * 2 - Math.PI / 2;
  return {
    angle,
    x: DRUM.x + Math.cos(angle) * radius,
    y: DRUM.y + Math.sin(angle) * radius,
  };
}

/** A point on the drum, written the way a polygon wants it. */
function pointAt(angle: number, radius: number) {
  return `${DRUM.x + Math.cos(angle) * radius},${DRUM.y + Math.sin(angle) * radius}`;
}

/** Where each blade draws its own name — fixed, so honing a blade never moves its label. */
const BLADE_NAMES = SKETCH_CAST.map((name, index) => ({ name, at: bladeAt(index, NAME_RADIUS) }));

/**
 * The dullest a blade may be honed. A blade dulled to nothing is a blade that is not there, and
 * six of those is the one place a blend cannot stand — `normalise` says so by throwing.
 */
const BLADE_FLOOR = 0.05;

/** How sharp each blade starts. Hand-written, so the drum is lopsided rather than a flower. */
const BLADE_START = [0.9, 0.55, 0.75, 0.35, 0.2, 0.45];

/** The grounds, laid across the hopper's mouth at the fraction of the source each was planted at. */
const DROPPED = SKETCH_BEDS.map((bed) => {
  const across = HOPPER.right - HOPPER.left;
  const width = Math.max(bed.span * across, 44);
  return {
    name: bed.name,
    x: HOPPER.left + 16 + bed.at * (across - 76),
    width,
  };
});

/**
 * What comes out of the chute, in the drum's rotation order rather than in the loop's: the blade
 * that cut a landing is what a hand is looking at here, so the mulch is grouped by which one did.
 */
const THROWN = (() => {
  const whole = SKETCH_WALK.reduce((sum, landing) => sum + landing.span, 0);
  // ES2022 has no toSorted; the array above is fresh, so sorting mutates nothing a caller holds.
  // oxlint-disable-next-line unicorn/no-array-sort
  const order = [...SKETCH_WALK].sort(
    (a, b) => SKETCH_CAST.indexOf(a.character) - SKETCH_CAST.indexOf(b.character) || a.at - b.at,
  );
  const gap = 2;
  const room = CHUTE.blocksWidth - gap * (order.length - 1);
  let x = CHUTE.blocksLeft;
  const blocks = [];
  for (const landing of order) {
    const width = Math.max((landing.span / whole) * room, 3);
    const height = 6 + landing.level * 46;
    blocks.push({
      at: landing.at,
      x,
      width,
      height,
      y: CHUTE.floor - height,
      opacity: 0.35 + landing.level * 0.6,
    });
    x += width + gap;
  }
  return blocks;
})();

export function SketchChipper() {
  const stage = useRef<SVGSVGElement>(null);
  const [blades, setBlades] = useState<readonly number[]>(BLADE_START);

  /** Honing: a drag over the drum sets the blade it is over to the reach the finger is at. */
  const hone = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const box = stage.current?.getBoundingClientRect();
    if (box === undefined) return;
    const x = VIEW.left + ((event.clientX - box.left) / box.width) * VIEW.w - DRUM.x;
    const y = ((event.clientY - box.top) / box.height) * VIEW.h - DRUM.y;
    const out = Math.hypot(x, y);
    if (out > NAME_RADIUS) return;
    const turn = (Math.atan2(y, x) + Math.PI / 2) / (Math.PI * 2);
    const index = Math.round(turn * SKETCH_CAST.length + SKETCH_CAST.length) % SKETCH_CAST.length;
    const weight = Math.min(1, Math.max(BLADE_FLOOR, (out - DRUM.r) / BLADE_REACH));
    setBlades((was) => was.map((one, at) => (at === index ? weight : one)));
  }, []);

  const handlers = useHeld(hone);

  // What a blade's own name says beside it is its share of the mulch, not its reach — six numbers
  // in the pad's readout are read as shares (0252), and six independent reaches would sum to
  // anything. The drum is the blend of 0252: the geometry is how sharp, the number is how much.
  const shares = useMemo(() => normalise(blades), [blades]);

  const cut = useMemo(
    () =>
      blades.map((weight, index) => {
        const angle = bladeAt(index, 0).angle;
        const spread = 0.2 + weight * 0.12;
        const tip = DRUM.r + BLADE_STUB + weight * (BLADE_REACH - BLADE_STUB);
        return {
          key: SKETCH_CAST[index] ?? String(index),
          weight,
          points: [
            pointAt(angle - spread, DRUM.r),
            pointAt(angle, tip),
            pointAt(angle + spread, DRUM.r),
          ].join(" "),
        };
      }),
    [blades],
  );

  return (
    <div className="flex flex-wrap items-start gap-6">
      <svg
        ref={stage}
        data-machine="chipper"
        viewBox={`${VIEW.left} 0 ${VIEW.w} ${VIEW.h}`}
        {...handlers}
        className="h-80 w-125 touch-none rounded-lg bg-muted text-muted-foreground select-none"
      >
        {/* The hopper: the source goes in at the top, and what has been planted is what is in it. */}
        <polygon
          points={`${HOPPER.left},${HOPPER.top} ${HOPPER.right},${HOPPER.top} ${HOPPER.right - 84},${HOPPER.floor} ${HOPPER.left + 84},${HOPPER.floor}`}
          className="fill-background stroke-border"
        />
        <text x={HOPPER.left} y={10} className="type-eyebrow" fill="currentColor">
          {PLAYER_GROUP_LABELS.ground}
        </text>
        {DROPPED.map((bed) => (
          <g key={bed.name}>
            <rect
              x={bed.x}
              y={HOPPER.chipTop}
              width={bed.width}
              height={HOPPER.chipHeight}
              rx={3}
              className="fill-primary"
              opacity={0.55}
            />
            <text
              x={bed.x + bed.width / 2}
              y={HOPPER.chipTop + HOPPER.chipHeight + 12}
              textAnchor="middle"
              className="type-readout"
              fill="currentColor"
            >
              {bed.name}
            </text>
          </g>
        ))}

        {/* Queued at the mouth: what is waiting to be dropped in is the arrangement. */}
        <text x={306} y={22} className="type-eyebrow" fill="currentColor">
          {PLAYER_GROUP_LABELS.arrange}
        </text>
        {SKETCH_PARTS.map((part, index) => (
          <g key={part.name}>
            <rect
              x={306}
              y={32 + index * 20}
              width={part.bars * 5}
              height={10}
              rx={2}
              className="fill-primary"
              opacity={0.4}
            />
            <text
              x={306 + part.bars * 5 + 6}
              y={41 + index * 20}
              className="type-readout"
              fill="currentColor"
            >
              {part.name}
            </text>
          </g>
        ))}

        {/* The drum. Six blades, one per character, and a blade's size is its weight. */}
        <circle cx={DRUM.x} cy={DRUM.y} r={DRUM.r} className="fill-background stroke-border" />
        {cut.map((blade) => (
          <polygon key={blade.key} points={blade.points} className="fill-primary" opacity={0.85} />
        ))}
        {BLADE_NAMES.map((blade, index) => (
          <CornerName
            key={blade.name}
            name={blade.name}
            weight={shares[index] ?? 0}
            at={blade.at}
          />
        ))}

        {/* The chute, and the mouth it leaves the drum by — threaded between two blade names, so
            what the machine throws never lands on what it is called. */}
        <polygon
          points={`${DRUM.x + DRUM.r},${DRUM.y - 14} ${CHUTE.x},${DRUM.y - 30} ${CHUTE.x},${DRUM.y + 30} ${DRUM.x + DRUM.r},${DRUM.y + 14}`}
          className="fill-background stroke-border"
        />
        <rect
          x={CHUTE.x}
          y={CHUTE.y}
          width={CHUTE.w}
          height={CHUTE.h}
          rx={6}
          className="fill-background stroke-border"
        />
        <text x={CHUTE.x + 8} y={CHUTE.y + 16} className="type-eyebrow" fill="currentColor">
          {PLAYER_SCOPE_LABEL}
        </text>
        {THROWN.map((block) => (
          <rect
            key={block.at}
            x={block.x}
            y={block.y}
            width={block.width}
            height={block.height}
            rx={1}
            className="fill-primary"
            opacity={block.opacity}
          />
        ))}
      </svg>

      <div className="flex min-w-64 flex-1 flex-col gap-4">
        <div>
          <SketchLabel>{PLAYER_GROUP_LABELS.timing}</SketchLabel>
          <p className="type-body text-muted-foreground">How fast the drum turns.</p>
          <Slider
            aria-label={PLAYER_GROUP_LABELS.timing}
            defaultValue={62}
            className="mt-2 max-w-64"
          />
        </div>

        <p className="type-body text-muted-foreground">
          Drag across the drum to hone a blade. How big a blade is, is its share of the mix, which
          is the whole of the character blend — nothing here is a slider over six numbers. It is one
          machine, and the mix is how it is set up.
        </p>

        <p className="type-body text-muted-foreground">
          It runs one way. Source at the top, character in the middle, walk out of the side — so a
          hand always knows which end it is working from, and anything that feeds back has nowhere
          to be drawn.
        </p>
      </div>
    </div>
  );
}
