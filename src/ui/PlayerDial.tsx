/**
 * @role One number of the jumps spec as a dial: the range and curve it is drawn on, the readout it
 *   is spelled in, and the `deck.player` patch a turn sends. Named by the knob rather than built
 *   with one, so a menu can draw a set of dials it is handed — which is what lets a character's
 *   own knobs appear the moment its name is pressed (0153).
 * @instead The range, fineness and curve themselves → src/lib/playerKnobs.ts. The words under it →
 *   src/lib/copyKnobs.ts. The dial as a control → src/ui/Knob.tsx. The one command every one of these
 *   patches → src/ui/PlayerCard.tsx.
 */
import { useCallback } from "react";

import type { PlayerDefaults, PlayerKnob, PlayerSpec } from "@/lib/player";
import { isWholeKnob, PLAYER_KNOB_DIALS } from "@/lib/playerKnobs";
import { PLAYER_KNOB_LABELS, PLAYER_KNOB_TOOLTIPS } from "@/lib/copyKnobs";
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

/**
 * A read of what the song is standing at for one knob, or null where it is standing in no part —
 * which is what an un-arranged pattern, a halted deck and the gap between two passes all look
 * like, and which paints the spec's own value (0157, src/ui/Knob.tsx).
 */
export type PlayerVoiceReader = (knob: PlayerKnob) => number | null;

/**
 * That reader as a prop set, for the doors that hand it down to the dials behind them. The
 * project types optional props exactly (`exactOptionalPropertyTypes`), so a card holding no song
 * has to hand over no property at all rather than an `undefined` one — and that dance is one fact,
 * declared beside the prop it is about rather than at each of its wearers (principle 3).
 */
export const voiceProps = (voice?: PlayerVoiceReader): { voice?: PlayerVoiceReader } =>
  voice === undefined ? {} : { voice };

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
  voice,
  disabled = false,
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
  /**
   * What the pattern is actually reading this number as while a song plays, read once a frame.
   * Absent, the dial is the spec's own and is painted by React alone — which is every dial on a
   * card holding no song, and every dial in a menu drawing a character rather than a performance.
   * Handed down from the card rather than read here, so the peek is asked for once per card
   * instead of once per dial (0035, 0157).
   */
  voice?: PlayerVoiceReader;
  /**
   * Whether the dial is refused rather than absent: the card draws every one of these whether or
   * not its switch is on, painting `PLAYER_DEFAULTS` greyed and unturnable, so what the module
   * offers is legible before it is turned on (0121, 0173). Absent, the dial is live.
   */
  disabled?: boolean;
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
  const live = useCallback(() => voice?.(knob) ?? null, [voice, knob]);
  const onChange = useCallback(
    (value: number) => {
      // Rounded here rather than trusted from the gesture: a counted knob is whole in the spec,
      // and `assertPlayer` refuses a fractional one loudly rather than rounding it for us.
      patch({ [knob]: isWholeKnob(knob) ? Math.round(value) : value });
    },
    [patch, knob],
  );

  const dialled = (
    <Knob
      label={PLAYER_KNOB_LABELS[knob]}
      says={PLAYER_KNOB_TOOLTIPS[knob]}
      size="sm"
      value={player[knob]}
      defaultValue={defaults[knob]}
      {...dial}
      {...extra}
      disabled={disabled}
      // The voice, painted the way an automated dial paints its lane: the number the pattern is
      // reading rather than the number the spec holds, and null wherever no part is standing
      // (0035, 0157). Absent, the dial registers no frame callback at all.
      {...(voice === undefined ? {} : { live })}
      onChange={onChange}
    />
  );
  return (
    // The wrapper is drawn whether or not there is a song, and only the mark inside it comes and
    // goes: an element that changed type at this position would unmount the dial every time the
    // yard started or stopped, taking the focus and any drag in flight with it — which is why the
    // knob one control along keeps one box and swaps a class (src/ui/ParameterKnob.tsx).
    <div className="relative">
      {dialled}
      {/* A dial standing somewhere the hand did not leave it must never read as one the hand
          moved, so a dial the song can move says so beside it — the automation marker's corner, on
          the other side, because the corner opposite is the door to a dial's own amounts (0121,
          src/ui/PlayerMore.tsx). It is a mark and not a control: what the song is is edited in the
          section under these dials. */}
      {voice === undefined ? null : (
        <span
          aria-hidden="true"
          data-voiced="true"
          className="absolute top-0 left-0 size-2 rounded-md bg-primary"
        />
      )}
    </div>
  );
}
