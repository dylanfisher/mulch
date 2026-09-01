/**
 * @role What one landing of the walk is, in numbers: the readout beside the score, about the block
 *   a hand pressed and about nothing else. It says which slot of the loop the landing reads, which
 *   is the one thing the score's own height gave up saying (0258).
 * @instead The picture it reads off → src/ui/PlayerScope.tsx. What a block is →
 *   src/lib/playerScope.ts. The words → src/lib/copyCard.ts.
 */
import {
  PLAYER_LANDING_DROPPED,
  PLAYER_LANDING_LABEL,
  PLAYER_LANDING_NONE,
  PLAYER_LANDING_REVERSED,
  PLAYER_LANDING_TERMS,
} from "@/lib/copyCard";
import type { ScopeBlock } from "@/lib/playerScope";

/** A fraction of the sheet as the whole number a readout can carry: a percentage of one loop pass. */
const share = (fraction: number): string => `${Math.round(fraction * 1000) / 10}%`;

export function PlayerLanding({ block }: { block: ScopeBlock | null }) {
  // Nothing pressed is the gesture said in words rather than an empty grid: a box with four terms
  // and no values reads as a picture that failed to draw (principle 5).
  if (block === null) {
    return (
      <p className="type-body text-muted-foreground">
        <span className="type-eyebrow">{PLAYER_LANDING_LABEL}</span> · {PLAYER_LANDING_NONE}
      </p>
    );
  }
  const rows = [
    { term: PLAYER_LANDING_TERMS.at, value: share(block.from) },
    { term: PLAYER_LANDING_TERMS.span, value: share(block.to - block.from) },
    // The count *is* the number of split marks, which is what the block's own height is drawn from
    // — read off the one list rather than carried beside it (principle 1).
    { term: PLAYER_LANDING_TERMS.repeats, value: `${block.splits.length}×` },
    { term: PLAYER_LANDING_TERMS.slot, value: `${block.slot}` },
  ];
  const said = [
    block.dropped ? PLAYER_LANDING_DROPPED : null,
    block.reversed ? PLAYER_LANDING_REVERSED : null,
  ].filter((one) => one !== null);

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <span className="type-eyebrow text-muted-foreground">{PLAYER_LANDING_LABEL}</span>
      <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {rows.map((row) => (
          <div key={row.term} className="flex items-baseline gap-1.5">
            <dt className="type-body text-muted-foreground">{row.term}</dt>
            <dd className="type-readout">{row.value}</dd>
          </div>
        ))}
      </dl>
      {said.map((one) => (
        <span key={one} className="type-readout text-muted-foreground">
          {one}
        </span>
      ))}
    </div>
  );
}
