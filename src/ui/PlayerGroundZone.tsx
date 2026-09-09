/**
 * @role The zone on the ground's strip: the stretch of the source a hand said the loop may stand
 *   in, drawn as a wash with an edge at each end a pointer takes hold of (0318). The block's own
 *   arithmetic and the span two readings name are here beside it, because both are about the zone
 *   and nothing else.
 * @instead The strip itself, the gestures that write this one and the two blocks that are grounds
 *   rather than bounds → src/ui/PlayerGround.tsx. What a zone *is*, and the one place it narrows a
 *   ground → src/lib/playerZone.ts and `bedBounds`, src/lib/playerBed.ts. Split off so neither
 *   file crosses the length this repo warns at (0045).
 */
import type { PointerEvent } from "react";

import { PLAYER_ZONE_FROM, PLAYER_ZONE_LABEL, PLAYER_ZONE_TO } from "@/lib/copyGround";
import { bedBounds, bedGround } from "@/lib/playerBed";
import type { BedZone } from "@/lib/playerZone";
import type { Loop } from "@/lib/timeline";
import { pct } from "@/ui/peakCanvas";

/** One rectangle on the strip: where it begins and how wide it is, both as CSS percentages. */
export type Block = { left: string; width: string };

/**
 * And the zone itself as a block: the stretch of the source the ground may stand in, drawn off the
 * bounds it actually produces rather than off the pair a hand marked — so a zone reaching past the
 * end of a short file is drawn as the file, which is what it means there (`bedBounds`, 0318). One
 * loop-length wider than the offsets it spans, because the last ground inside it is still read a
 * whole loop long.
 */
export const zoneBlock = (loop: Loop, duration: number, zone: BedZone): Block => {
  const span = loop.out - loop.in;
  const { from, to } = bedBounds(loop.in, span, duration, zone);
  // Both ends through the one fold every other block on this strip goes through, rather than the
  // `/ PLAYER_SLOTS` written out again here: said twice it is a rectangle that can disagree with
  // the loop a press writes, which is the claim `bedGround`'s own doc makes (principle 1).
  const near = bedGround(loop.in, span, duration, from, zone).in;
  const far = bedGround(loop.in, span, duration, to, zone).in + span;
  return { left: pct(near, duration), width: pct(far - near, duration) };
};

/** The zone two readings name, whichever way round they arrived: an edge dragged past its partner
 *  turns the span over rather than refusing it, the way the loop's own handles do. */
export const spanning = (one: number, two: number): BedZone => ({
  from: Math.min(one, two),
  to: Math.max(one, two),
});

/** One edge, either end: the same target twice, because a zone's two ends are one control said
 *  twice and a second class string for the mirror of it is the drift these files avoid. */
const EDGE = "pointer-events-auto absolute inset-y-0 w-2 cursor-ew-resize bg-muted-foreground/60";

/**
 * The zone drawn, and the two things a pointer may take hold of on it. A component and not markup
 * inlined above because it is the whole of what the zone looks like — the strip's own file draws
 * grounds, and this draws the bound they stand inside.
 */
export function PlayerGroundZone({
  block,
  named,
  onDownFrom,
  onDownTo,
}: {
  block: Block;
  /** What the strip is called, which each edge's own name is said under. */
  named: string;
  onDownFrom: (event: PointerEvent<HTMLDivElement>) => void;
  onDownTo: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      data-slot="ground-zone"
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 bg-muted-foreground/15"
      style={block}
    >
      <div
        data-slot="zone-from"
        aria-label={`${named} ${PLAYER_ZONE_LABEL} From`}
        title={PLAYER_ZONE_FROM}
        className={`${EDGE} left-0 -translate-x-1/2`}
        onPointerDown={onDownFrom}
      />
      <div
        data-slot="zone-to"
        aria-label={`${named} ${PLAYER_ZONE_LABEL} To`}
        title={PLAYER_ZONE_TO}
        className={`${EDGE} right-0 translate-x-1/2`}
        onPointerDown={onDownTo}
      />
    </div>
  );
}
