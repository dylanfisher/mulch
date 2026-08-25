/**
 * @role One number of the jumps spec as a dial: the range and curve it is drawn on, the readout it
 *   is spelled in, and the `deck.player` patch a turn sends. Named by the knob rather than built
 *   with one, so a menu can draw a set of dials it is handed — which is what lets a character's
 *   own knobs appear the moment its name is pressed (0153).
 * @instead The range, fineness and curve themselves → src/lib/playerKnobs.ts. The words under it →
 *   src/lib/copy.ts. The dial as a control → src/ui/Knob.tsx. The one command every one of these
 *   patches → src/ui/PlayerCard.tsx.
 */
import { useCallback } from "react";

import type { PlayerDefaults, PlayerKnob, PlayerSpec } from "@/lib/player";
import { isWholeKnob, PLAYER_KNOB_DIALS } from "@/lib/playerKnobs";
import { PLAYER_KNOB_LABELS, PLAYER_KNOB_TOOLTIPS } from "@/lib/copy";
import { burstLabel, Knob } from "@/ui/Knob";

/**
 * The two knobs whose value is a length of time, read in the two units a duration spanning three
 * orders of magnitude needs. A readout is how a number is *spelled* rather than what it is allowed
 * to be, which is why it is here and not beside the range in src/lib/playerKnobs.ts — lib holds no
 * words (docs/map.md).
 */
const READOUTS: Partial<Record<PlayerKnob, (value: number) => string>> = {
  burst: burstLabel,
  vary: burstLabel,
};

// One prop per thing a dial is — the knob it draws, the spec it reads, what it snaps back to and
// what it patches — plus the paragraph on each of them. The length is the dial's shape and not
// this function's. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerDial({
  knob,
  player,
  defaults,
  patch,
  name,
}: {
  knob: PlayerKnob;
  player: PlayerSpec;
  /** What the dial snaps back to on a double-click: the switch's own values (0118). */
  defaults: PlayerDefaults;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /**
   * The dial's accessible name, where the caption alone would not tell it from another on screen.
   * A caption is a dial's whole accessible name (src/ui/Knob.tsx), so two dials carrying one word
   * are two sliders nothing can tell apart — and a character's menu draws the very knobs the
   * card's own row is drawing behind it. Absent, the caption is the name, which is every dial the
   * card and its marker menus draw (0153, src/ui/tooltips.test.ts).
   */
  name?: string;
}) {
  // Spread rather than named one by one, and it has to be: the project types optional props
  // exactly (`exactOptionalPropertyTypes`), so passing `step={undefined}` for a knob that declares
  // none is an error where leaving the property off is the default the dial documents. The
  // readout and the name are absent for most knobs and travel the same way.
  const dial = PLAYER_KNOB_DIALS[knob];
  const readout = READOUTS[knob];
  const extra = {
    ...(readout === undefined ? {} : { format: readout }),
    ...(name === undefined ? {} : { name }),
  };
  const onChange = useCallback(
    (value: number) => {
      // Rounded here rather than trusted from the gesture: a counted knob is whole in the spec,
      // and `assertPlayer` refuses a fractional one loudly rather than rounding it for us.
      patch({ [knob]: isWholeKnob(knob) ? Math.round(value) : value });
    },
    [patch, knob],
  );

  return (
    <Knob
      label={PLAYER_KNOB_LABELS[knob]}
      says={PLAYER_KNOB_TOOLTIPS[knob]}
      size="sm"
      value={player[knob]}
      defaultValue={defaults[knob]}
      {...dial}
      {...extra}
      onChange={onChange}
    />
  );
}
