/**
 * @role The reach fan in the Where It Lands box: from wherever the pattern is standing, the jumps
 *   the next one can take and how often it takes each, as the four travel amounts shape them. The
 *   one surface on the card that says what the walk *might* do rather than what it did — pure, and
 *   redrawn on a commit when a dial moves rather than on a frame (0144).
 * @instead The odds themselves → `travelReach`, src/lib/playerTravel.ts. The draw they are the
 *   shape of → `travelFrom`, src/lib/playerWalk.ts. What the walk actually did → src/ui/PlayerScope.tsx.
 */
import { useMemo } from "react";

import { PLAYER_REACH_LABEL, PLAYER_REACH_TOOLTIP } from "@/lib/copy";
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import type { PlayerSpec } from "@/lib/player";
import { travelReach } from "@/lib/playerTravel";
import { Says } from "@/ui/Says";

/**
 * How many legs the fan draws, the home one among them. Five: the distance may reach every slot of
 * the grid, and thirty-two hairlines in a dial's worth of room is a smear rather than a picture.
 * The likeliest first, which is what makes the top of the fan readable at a glance — the rest of
 * the distribution is the Distance dial's own number and is read there.
 */
const REACH_LEGS = 5;

/** The geometry of one small fan, in the units its own viewBox is drawn in. */
const FAN = { width: 96, height: 44, hub: 6, reach: 24, top: 6 } as const;

/** One leg: how far the jump goes, how often, and what the label reads. */
type Leg = { says: string; weight: number };

/**
 * The legs to draw, likeliest first, with the home leg among them wherever there is one.
 *
 * Cut by **distance and never by leg**: at a lean of nothing the two ways of going three slots
 * weigh exactly the same, and a cut that took one of them would draw a forward lean the pattern
 * does not have. So the two signs of one distance stand or fall together, and a group that does
 * not fit whole is left out.
 */
function fanLegs(spec: PlayerSpec): Leg[] {
  const { home, legs } = travelReach(spec);
  /** Each distance, both ways, and what the pair weighs — which is what the ranking is over. */
  const far = new Map<number, Leg[]>();
  for (const leg of legs) {
    if (leg.weight <= 0) continue;
    const says = leg.offset > 0 ? `+${leg.offset}` : `${leg.offset}`;
    const held = far.get(Math.abs(leg.offset)) ?? [];
    held.push({ says, weight: leg.weight });
    far.set(Math.abs(leg.offset), held);
  }
  const groups = [...far.values()];
  // Home is a leg of its own and never part of a pair, so it is ranked among them rather than
  // ahead of them. The Home dial's own word, not a second one: the dial and this leg stand in the
  // same box and mean the same thing, so one declaration says it (principle 1, copyKnobs.ts).
  if (home > 0) groups.push([{ says: PLAYER_KNOB_LABELS.home, weight: home }]);
  // The likeliest pair first; a group that never happens has already been filtered out, and a
  // stride's whole-distance pair is the one that has to be at the top.
  groups.sort((one, two) => weighs(two) - weighs(one));
  const drawn: Leg[] = [];
  for (const group of groups) {
    if (drawn.length + group.length > REACH_LEGS) continue;
    drawn.push(...group);
  }
  drawn.sort((one, two) => two.weight - one.weight);
  return drawn;
}

/** What one distance weighs, both ways round — what the fan's own ranking is over. */
const weighs = (group: readonly Leg[]): number => group.reduce((odds, leg) => odds + leg.weight, 0);

/** Where one of `count` legs ends, top to bottom across the fan's own height. */
const legY = (at: number, count: number): number =>
  count <= 1 ? FAN.height / 2 : FAN.top + (at * (FAN.height - 2 * FAN.top)) / (count - 1);

// The fan is one figure: its caption, its legs and the hub they leave — over the cap by the
// paragraph on each of them, and neither half of it is a thing on its own. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerReach({
  named,
  player,
  disabled,
}: {
  /** What names this fan where the card's own word would not: a part's fold draws the very box the
   *  card draws, so with one open there are two fans in one yard and `aria-label` is the only
   *  thing between them (0055, 0176, `PlayerRunProps`). */
  named: string;
  player: PlayerSpec;
  /** Refused rather than absent while the card's switch is off, the flag every dial beside it
   *  carries (0121, 0173, `PlayerRunProps`). */
  disabled?: boolean | undefined;
}) {
  const legs = useMemo(() => fanLegs(player), [player]);
  const most = legs[0]?.weight ?? 1;

  return (
    <Says what={PLAYER_REACH_TOOLTIP}>
      {/* A figure and not a control: nothing here is turnable, so it takes no role, no focus and
          no name of a control's kind — the group's own eyebrow already says which box it is in.
          Refused rather than absent while the switch is off, the way every dial beside it is
          (0121, 0173). */}
      <figure
        data-slot="player-reach"
        aria-label={named === "" ? PLAYER_REACH_LABEL : `${named} ${PLAYER_REACH_LABEL}`}
        className={disabled === true ? "opacity-50" : undefined}
      >
        <figcaption className="type-eyebrow text-muted-foreground">{PLAYER_REACH_LABEL}</figcaption>
        <svg
          viewBox={`0 0 ${FAN.width} ${FAN.height}`}
          className="h-11 w-24 text-muted-foreground"
          role="presentation"
        >
          {legs.map((leg, at) => {
            const y = legY(at, legs.length);
            return (
              <g key={leg.says} opacity={0.35 + 0.65 * (leg.weight / most)}>
                {/* One curve from the hub, so the fan reads as a branching rather than as a bar
                    chart lying on its side: what it is a picture of is one jump going several
                    ways, which is the branching the walk actually is. */}
                <path
                  d={`M ${FAN.hub} ${FAN.height / 2} C ${FAN.reach / 2} ${FAN.height / 2}, ${FAN.reach / 2} ${y}, ${FAN.reach} ${y}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                />
                <text x={FAN.reach + 4} y={y + 3} fill="currentColor" className="type-readout">
                  {`${leg.says} ${Math.round(leg.weight * 100)}%`}
                </text>
              </g>
            );
          })}
          <circle cx={FAN.hub} cy={FAN.height / 2} r={2} fill="currentColor" />
        </svg>
      </figure>
    </Says>
  );
}
