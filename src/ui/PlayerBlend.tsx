/**
 * @role The cast as a place: a hexagon whose six corners are the six characters, each naming
 *   itself and its own share inside the picture, and a puck a hand drags to weigh the pattern out
 *   of all six at once. The card's one road into the cast — a corner's own name is the press that
 *   takes that character whole, and the pad is every place between them (0259). One
 *   `deck.player` per gesture, carrying the whole spec (0089).
 * @instead The same six names on a song part's row, where the road is a menu and an amount →
 *   src/ui/PlayerCharacter.tsx. Where the corners sit and how a place is weighed →
 *   src/lib/playerBlend.ts. What six weights are spent on → `blendCast`,
 *   src/lib/playerCharacter.ts.
 */
// Over the dependency cap by one card's worth: the pad draws the cast, the blend's own geometry,
// two words apiece for six characters and the two draws on its button row, and every import here
// is one of those rather than a decision this file makes. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

import { cn } from "@/lib/cn";
import {
  ACTION_TOOLTIPS,
  PLAYER_BLEND_LABEL,
  PLAYER_BLEND_TOOLTIP,
  PLAYER_CHARACTER_LABELS,
  PLAYER_CHARACTER_TOOLTIPS,
  PLAYER_REDRAW_LABEL,
  yardLabel,
} from "@/lib/copy";
import type { PlayerSpec, PlayerVoice } from "@/lib/player";
import {
  BLEND_BOX,
  BLEND_CORNERS,
  BLEND_NAMES,
  BLEND_PAD,
  BLEND_RING,
  BLEND_SPILL,
  BLEND_START,
  BLEND_VIEW,
  blendCorner,
  weighBlend,
  type BlendPlace,
  type BlendPoint,
} from "@/lib/playerBlend";
import { PLAYER_CHARACTERS, type PlayerCharacter } from "@/lib/playerCast";
import { blendCast, drawCharacter, shapedSpec } from "@/lib/playerCharacter";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Explains } from "@/ui/Explains";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

/** The hexagon itself, drawn once: its corners are the module's cast and never move. */
const HEXAGON = BLEND_CORNERS.map((corner) => `${corner.x},${corner.y}`).join(" ");

/**
 * One draw per character, at full strength. `Math.random()` is exactly right here and exactly
 * wrong a layer down, for the reason a character press's own draw is: this runs on a press and its
 * result travels in the command (0089). Nothing on a play-time or render path may call it, which
 * is why it is never reached from a render or an effect.
 */
const drawSix = (): PlayerVoice[] =>
  PLAYER_CHARACTERS.map((character) => drawCharacter(character, Math.random));

/**
 * A corner's own name, in its own picture, with its share beside it — and the press that stands on
 * it. A pad whose corners are unlabelled cannot answer the one question it exists to ask — can a
 * hand find the character it wants — so there is no legend underneath (0252), and since the names
 * are the only place that question is asked they are also how it is answered: a press takes that
 * character whole, which is the one thing a drag cannot reach (0259). The anchor turns with the
 * corner so a name never runs back across the pad, and the box spills past the square so none runs
 * off its own edge.
 *
 * A component of its own for the reason the effect picker's entries are
 * (src/ui/EffectPicker.tsx): the handler has to carry which corner it is, and a closure built in
 * the parent's own render is a new prop on every frame of a drag.
 */
/** Which way a name runs from its own corner, so none of them runs back across the pad. */
const anchorAt = (angle: number): "start" | "middle" | "end" => {
  const across = Math.cos(angle);
  if (Math.abs(across) < 0.3) return "middle";
  return across > 0 ? "start" : "end";
};

// One handler per gesture, a paragraph on each prop and a `<text>` that is a press as well as a
// word: the length is what a named corner is made of rather than how much it decides. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function CornerName({
  name,
  weight,
  at,
  index,
  press,
  disabled,
}: {
  name: PlayerCharacter;
  weight: number;
  at: BlendPlace;
  index: number;
  press: (index: number) => void;
  /** Refused rather than absent while the switch is off, the way the pad under it is (0121). */
  disabled: boolean;
}) {
  const stand = useCallback(
    (event: ReactPointerEvent<SVGTextElement> | ReactKeyboardEvent<SVGTextElement>) => {
      if (disabled) return;
      // The pad hears every pointer that comes down inside it, and a name is not a place on it:
      // without this a press on `stutter` would be a drag landing wherever the word is drawn.
      event.stopPropagation();
      press(index);
    },
    [disabled, press, index],
  );
  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGTextElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      stand(event);
    },
    [stand],
  );

  return (
    // What that corner sounds like, on the same terms every other press on this card explains
    // itself: the pad says which six there are and where a hand stands among them, and the
    // sentence is the only place it says what any of them *is* (0055, `PLAYER_CHARACTER_TOOLTIPS`).
    <Says what={PLAYER_CHARACTER_TOOLTIPS[name]}>
      <text
        x={at.x}
        y={at.y}
        textAnchor={anchorAt(at.angle)}
        dominantBaseline="middle"
        fill="currentColor"
        // SVG has no button element, and a `<foreignObject>` around six words would letterbox the
        // one drawing whose ratio the drag depends on (0252) — so the role is the only way to say
        // what this is. Everything the tag would carry is here: a name, a tab stop, Enter, Space.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        // Titlecase, where the drawn word is the cast's own key: this is the name a hand says out
        // loud and the one every other press of a character wears (`PLAYER_CHARACTER_LABELS`).
        aria-label={PLAYER_CHARACTER_LABELS[name]}
        // No ring: a focus box drawn round a word inside a picture is a rectangle in a drawing
        // that has none, and it stands over the legs and the puck (0252). The word says it is
        // focused the way it says it is hovered — in its own ink — and underlined besides, so it
        // is not colour alone (0094).
        className={cn(
          "type-readout outline-none",
          disabled
            ? ""
            : "cursor-pointer hover:fill-primary focus-visible:fill-primary focus-visible:underline",
        )}
        onPointerDown={stand}
        onKeyDown={onKeyDown}
      >
        {name} {Math.round(weight * 100)}
      </text>
    </Says>
  );
}

// One state cell and one handler per gesture, a paragraph on each prop, and a picture that draws
// six corners with their own names inside it (0252): the length is what the pad is made of rather
// than how much it decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function PlayerBlend({
  deck,
  player,
  patch,
  reseed,
  reseedLabel,
  disabled = false,
}: {
  deck: DeckId;
  /** The spec a drag reads and fills, which is the card's own (0089). */
  player: PlayerSpec;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** The card's own reseed, which draws the number every dial on it unfolds from. It stands on
   *  this pad's own row rather than under it: drawing another six and drawing the number they
   *  unfold from are the two ways to ask for a different performance, and a hand reaching for
   *  either is reaching for the same thing (0089, 0259). */
  reseed: () => void;
  /** What that button is called, built by the card because only it knows the yard and the part. */
  reseedLabel: string;
  /** Refused rather than absent while the switch is off, the way every dial on the card is
   *  (0121, 0173). */
  disabled?: boolean;
}) {
  const pad = useRef<SVGSVGElement>(null);
  /**
   * Where the puck stands, and the six draws it is standing among. Neither is durable and neither
   * may be: a spec is what the pattern is, and a field remembering the place it was blended at
   * would be a second answer to that question — one the dials could contradict the moment a hand
   * turned any of them (boundaries, 0152).
   *
   * The six are kept so the puck has something to move *among*. Redrawing them on every frame of a
   * drag would make the pad a die with a thousand faces; keeping them makes it a control over one
   * set of six, and `PLAYER_REDRAW_LABEL` is how a second set is asked for.
   */
  const [at, setAt] = useState<BlendPoint>(BLEND_START);
  const [draws, setDraws] = useState<PlayerVoice[] | null>(null);
  const [held, setHeld] = useState(false);
  /**
   * Which name was pressed, if the puck is standing on one rather than at a place of its own. It
   * is not the same question as where the puck is: the softening that keeps the middle an even six
   * leaves a puck sitting exactly on a corner carrying a fifth of everything else, and a name
   * pressed has to mean the name (`blendCorner`). A drag clears it, because a place between the
   * six is the other thing the pad says.
   */
  const [named, setNamed] = useState<number | null>(null);
  const weights = named === null ? weighBlend(at) : blendCorner(named);

  /**
   * A place under the pointer, in the pad's own coordinates. The element and the box share one
   * ratio (`BLEND_BOX`), so this stretch-fit is exact rather than a few units off the finger
   * (0252).
   */
  const aim = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const box = pad.current?.getBoundingClientRect();
      if (box === undefined) return;
      const next = {
        x: -BLEND_SPILL + ((event.clientX - box.left) / box.width) * BLEND_VIEW,
        y: ((event.clientY - box.top) / box.height) * BLEND_PAD,
      };
      setAt(next);
      setNamed(null);
      // The six are drawn on the press that first needs them rather than on mount: a draw is a
      // gesture's and a render is not one (0089). Until then the pad is a puck with nowhere to
      // travel, which is exactly what the Amount slider is before a name has been pressed.
      const six = draws ?? drawSix();
      if (draws === null) setDraws(six);
      patch(shapedSpec(blendCast(six, weighBlend(next)), player));
    },
    [draws, patch, player],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (disabled) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setHeld(true);
      aim(event);
    },
    [aim, disabled],
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

  /**
   * One name, taken whole: the puck goes to that corner and the spec is that character's own draw,
   * untouched by any weighing (`blendCast` returns a corner at a weight of one by name). This is
   * the gesture the six buttons on the card's front used to be — the pad carries both roads now,
   * because the names are already drawn on it and a hand that can read one can press it (0259).
   */
  const stand = useCallback(
    (index: number) => {
      const corner = BLEND_CORNERS[index];
      if (corner === undefined) return;
      const six = draws ?? drawSix();
      if (draws === null) setDraws(six);
      setAt({ x: corner.x, y: corner.y });
      setNamed(index);
      patch(shapedSpec(blendCast(six, blendCorner(index)), player));
    },
    [draws, patch, player],
  );

  /** A second set of six where the puck already stands: the pad moves, nothing else does. It is
   *  what `PLAYER_AGAIN_LABEL` is under a pressed name — another draw of the very same ask. */
  const redraw = useCallback(() => {
    const six = drawSix();
    setDraws(six);
    patch(shapedSpec(blendCast(six, weights), player));
  }, [weights, patch, player]);

  return (
    <section
      className="flex flex-col gap-1"
      aria-label={`${yardLabel(deck)} ${PLAYER_BLEND_LABEL}`}
    >
      <div className="flex items-center gap-1">
        <span className="type-eyebrow text-muted-foreground">{PLAYER_BLEND_LABEL}</span>
        <Explains what={PLAYER_BLEND_TOOLTIP} named={`${yardLabel(deck)} ${PLAYER_BLEND_LABEL}`} />
      </div>
      <svg
        ref={pad}
        data-slot="player-blend"
        viewBox={`${-BLEND_SPILL} 0 ${BLEND_VIEW} ${BLEND_PAD}`}
        className={cn(
          "touch-none rounded-lg bg-muted text-muted-foreground select-none",
          BLEND_BOX,
          disabled ? "opacity-50" : "cursor-grab",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <polygon points={HEXAGON} className="fill-background stroke-border" />
        {BLEND_CORNERS.map((corner, index) => (
          <g key={corner.name} data-corner={corner.name}>
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
            {/* The mark grows with the weight, and stops short of the word it belongs to: the
                names sit `BLEND_NAMES - BLEND_RING` out from the corners, and a disc that crossed
                that gap would cover the start of its own name at the very weight a hand asked for
                by pressing it — `stutter 100` drawn as `utter 100` (0252, 0259). */}
            <circle
              cx={corner.x}
              cy={corner.y}
              r={3 + (weights[index] ?? 0) * (BLEND_NAMES - BLEND_RING - 5)}
              className="fill-primary"
              opacity={0.25 + (weights[index] ?? 0)}
            />
            <CornerName
              name={corner.name}
              weight={weights[index] ?? 0}
              at={corner.label}
              index={index}
              press={stand}
              disabled={disabled}
            />
          </g>
        ))}
        <circle
          cx={at.x}
          cy={at.y}
          r={8}
          strokeWidth={3}
          className="fill-primary stroke-background"
        />
      </svg>
      {/* One row for the two draws: another six of the same cast, and the number every one of
          them unfolds from. They are the same question asked at two depths — make this sound
          different — so they stand together rather than a fold apart (0089, 0259). */}
      <div className="flex items-center justify-between gap-2">
        <Button size="xs" variant="outline" disabled={disabled || draws === null} onClick={redraw}>
          {PLAYER_REDRAW_LABEL}
        </Button>
        <Says what={ACTION_TOOLTIPS.reseed}>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={disabled}
            aria-label={reseedLabel}
            onClick={reseed}
          >
            <ACTION_ICONS.reseed />
          </Button>
        </Says>
      </div>
    </section>
  );
}
