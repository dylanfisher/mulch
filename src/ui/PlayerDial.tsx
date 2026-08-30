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

import { cn } from "@/lib/cn";

import type { PlayerDefaults, PlayerKnob, PlayerSpec } from "@/lib/player";
import { isWholeKnob, PLAYER_KNOB_DIALS } from "@/lib/playerKnobs";
import { PLAYER_BED_DISTANCE_MAX } from "@/lib/playerBed";
import { PLAYER_KNOB_LABELS, PLAYER_KNOB_TOOLTIPS } from "@/lib/copyKnobs";
import { burstLabel, burstValue, Knob } from "@/ui/Knob";
import { readNumber, type ReadingParser, withoutUnit } from "@/ui/KnobReadout";

/**
 * How far one move of the ground may travel, spelled as the share of the file it may cross: whole
 * sixteenths in the spec, and a percentage of the dial's own reach here, so the top of it reads
 * `100%` — a move that may land anywhere in the song, which is what the dial is asked for (0193).
 * A decimal under ten percent because the crawl lives there and `0%` would be three different
 * crawls spelled alike; none above it, where a whole percent is finer than a hand can aim.
 */
const groundLabel = (slots: number): string => {
  const share = (100 * slots) / PLAYER_BED_DISTANCE_MAX;
  return `${share < 10 ? share.toFixed(1) : String(Math.round(share))}%`;
};

/** And read back: the same share, typed with or without the sign that was drawn after it, turned
 *  into the sixteenths the spec is written in (0201). */
export const groundValue: ReadingParser = (text, min, max) => {
  const share = readNumber(withoutUnit(text, "%"), min, max);
  return share === undefined ? undefined : (share / 100) * PLAYER_BED_DISTANCE_MAX;
};

/**
 * The two knobs whose value is a length of time, read in the two units a duration spanning three
 * orders of magnitude needs, and the ground's distance as a share of the file. A readout is how a
 * number is *spelled* rather than what it is allowed to be, which is why it is here and not beside
 * the range in src/lib/playerKnobs.ts — lib holds no words (docs/map.md).
 */
const READOUTS: Partial<Record<PlayerKnob, (value: number) => string>> = {
  burst: burstLabel,
  vary: burstLabel,
  bedDistance: groundLabel,
};

/**
 * And the way back from each of them, so a dial that reads in a unit of its own can be *told* a
 * number in that same unit rather than only turned to one (0201). One table beside the other,
 * keyed alike: a readout with no parser beside it is a reading a hand could type and not get back.
 */
const PARSERS: Partial<Record<PlayerKnob, ReadingParser>> = {
  burst: burstValue,
  vary: burstValue,
  bedDistance: groundValue,
};

/**
 * One of this module's numbers, spelled the way its own dial spells it — the dial's default is
 * `String`, which is what every knob but those two reads as (src/ui/Knob.tsx). Exported because a
 * part's signature reads three of them out in a row, and a second table of readouts would be a
 * burst saying `0.25` in one place and `250` in the other (principle 1, src/ui/PlayerPart.tsx).
 */
export const playerReadout = (knob: PlayerKnob, value: number): string =>
  (READOUTS[knob] ?? String)(value);

/**
 * A read of what the song is standing at for one knob, or null where it is standing in no part —
 * which is what an un-arranged pattern, a halted deck and the gap between two passes all look
 * like, and which paints the spec's own value (0157, src/ui/Knob.tsx).
 */
export type PlayerVoiceReader = (knob: PlayerKnob) => number | null;

/**
 * That reader as a prop set, for the runs that hand it down to the dials beside them. The
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
  named = "",
  size = "sm",
  voice,
  selected = false,
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
   * The same thing said as a prefix rather than as a whole name, which is what a *set* of dials
   * drawn twice on one card needs: a part's fold draws the very boxes the card draws, so every
   * caption in it is a second slider under one word unless the part it belongs to is in front of
   * it (0176, src/ui/PlayerPart.tsx). Empty — the card's own — is the caption alone.
   */
  named?: string;
  /**
   * How big the dial is drawn, which on this card is how it says what rank it holds: a dial whose
   * amounts stand beside it is drawn a size up from them, so the wall reads as the eight runs it
   * is rather than as forty controls at one distance from each other (0197, `PLAYER_RUN_KNOBS`).
   * Absent, the card's own — every dial was this size before the runs got a rank.
   *
   * Not `xs`: a compact dial draws no caption at all (src/ui/Knob.tsx), and an amount with no word
   * under it is exactly the control 0195 said a hand does not have.
   */
  size?: "sm" | "default";
  /**
   * What the pattern is actually reading this number as while a song plays, read once a frame.
   * Absent, the dial is the spec's own and is painted by React alone — which is every dial on a
   * card holding no song, and every dial in a menu drawing a character rather than a performance.
   * Handed down from the card rather than read here, so the peek is asked for once per card
   * instead of once per dial (0035, 0157).
   */
  voice?: PlayerVoiceReader;
  /**
   * Whether the card's dials are pointed at a part of its song, so this dial is reading and
   * writing that part rather than the pattern the card holds (0176). It is the other half of the
   * mark below: a dial the song may move wears one ink, a dial a hand has aimed at a part wears
   * another, and a dial doing neither wears none. Absent, the dial is the card's own.
   */
  selected?: boolean;
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
  const parser = PARSERS[knob];
  const called = named === "" ? name : `${named} ${PLAYER_KNOB_LABELS[knob]}`;
  const extra = {
    ...(readout === undefined ? {} : { format: readout }),
    ...(parser === undefined ? {} : { parse: parser }),
    ...(called === undefined ? {} : { name: called }),
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
      size={size}
      value={player[knob]}
      defaultValue={defaults[knob]}
      // Every dial on this card says whether a hand has been to it: most of the forty stand where
      // the switch left them, and which handful do not is the one thing the card could not be
      // skimmed for (0197). The rack's own dials do not — a parameter at its default there is a
      // parameter, not news (src/ui/ParameterKnob.tsx).
      marksDefault

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
          the other side, where the marker that opened a dial's own amounts used to be (0121,
          0195). It is a mark and not a control.

          Two inks and one corner: the instrument's own for a dial the walk is painting, and the
          selected row's for a dial a hand has pointed at one part — which is what the row it lights
          is lit in, so the card and the section under it say the same thing in the same colour
          (0172, 0176). Never both: a card pointed at a part paints no voice at all. */}
      {!selected && voice === undefined ? null : (
        <span
          aria-hidden="true"
          {...(selected ? { "data-selected": "true" } : { "data-voiced": "true" })}
          className={cn(
            "absolute top-0 left-0 size-2 rounded-md",
            selected ? "bg-foreground" : "bg-primary",
          )}
        />
      )}
    </div>
  );
}
