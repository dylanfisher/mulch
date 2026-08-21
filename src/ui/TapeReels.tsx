/**
 * @role The tape drawing itself: two reels turning at the rate the deck reads at, the tape wound
 *   between them by the repeat the effect is holding — so a rate change and a time change are both
 *   seen before they are heard. It draws only what the effect and its deck already hold: a
 *   declared parameter's value and the deck's own read rate, never a number the audio thread had
 *   to report for a picture (P71).
 * @instead A tone's own wave → src/ui/ToneScope.tsx. The drift's rows → src/ui/moireCanvas.ts.
 *   The canvas's size, its colour and its frame loop → src/ui/canvasSurface.ts, which this shares
 *   with both of them.
 */
import { useCallback, useRef } from "react";

import type { Instrument } from "@/app/facade";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { paramKey, PARAMS } from "@/audio/params";
import { automationValueAt, type AutomationPoint } from "@/lib/automation";
import { clamp, normalize } from "@/lib/range";
import type { DeckId } from "@/state/store";
import { useCanvasSurface } from "@/ui/canvasSurface";

const TAU = 2 * Math.PI;

/**
 * How much of a full reel its hub takes. Above nothing on purpose: an empty reel still turns, and
 * a radius of zero would be a division by nothing rather than a reel spinning fast.
 */
const HUB = 0.3;

/**
 * How much tape passes the head in one second at unit rate, in reel radii. Chosen for the eye
 * rather than from a machine: a reel most of the way full turns about two thirds of a turn a
 * second, which is fast enough to read as motion and slow enough to read as a direction.
 */
const TAPE_SPEED = 3;

/** How many spokes a reel carries. Enough that a turn is legible, few enough not to blur into a
 * disc at the far end of the drawing. */
const SPOKES = 3;

/**
 * How long a gap between frames the spin is allowed to take in one step, in seconds. A tab that
 * was in the background comes back to one enormous elapsed, and a reel that made up the missing
 * turns would land on an angle nothing watched it reach — the picture is where the tape is now.
 */
const MAX_STEP_SECS = 0.1;

/** How much of the ink the reel's flange and its wound tape carry, under the spokes' full weight. */
const FLANGE_ALPHA = 0.35;
const WOUND_ALPHA = 0.2;

/**
 * How much of the tape sits on the take-up reel: the whole of what `tape.time` says, read against
 * the range that parameter declares rather than against a second copy of its bounds (0030).
 */
export function reelFill(time: number): number {
  const spec = PARAMS["tape.time"];
  return normalize(time, spec.min, spec.max, spec.curve);
}

/**
 * The radius of a reel holding `wound` of the tape, as a fraction of a full one. The tape's own
 * area is what grows with it — a wound length is a ring and not a radius — so a reel filling up
 * slows down the way one on a machine does rather than linearly.
 */
export function reelRadius(wound: number): number {
  return Math.sqrt(HUB ** 2 + clamp(wound, 0, 1) * (1 - HUB ** 2));
}

/**
 * How many turns a second a reel of `radius` makes while the deck reads at `rate`. One linear tape
 * speed drives both reels, so the fuller one turns slower — which is what makes a repeat change
 * visible as something other than a resize.
 */
export const reelTurns = (rate: number, radius: number): number =>
  (rate * TAPE_SPEED) / (TAU * radius);

/**
 * Where both reels have turned to, in turns, and the clock reading the last step was taken at.
 * One per drawing, allocated once and advanced in place: this is the per-frame read and it
 * allocates nothing (0070).
 */
export type ReelSpin = { supply: number; takeUp: number; at: number };

export const newReelSpin = (): ReelSpin => ({ supply: 0, takeUp: 0, at: 0 });

/**
 * Turn both reels by however much tape has passed the head since the last step. Kept as an angle
 * carried forward rather than derived from a wall clock, so a deck that is halted — `rate` of
 * nothing — freezes where it is and resumes from there instead of jumping to wherever the clock
 * got to while nobody was turning.
 */
export function advanceReelSpin(spin: ReelSpin, nowSecs: number, rate: number, fill: number): void {
  const since = spin.at === 0 ? 0 : clamp(nowSecs - spin.at, 0, MAX_STEP_SECS);
  spin.at = nowSecs;
  if (!(rate > 0)) return;
  // Wrapped into one turn: a reel's angle is where it is pointing, and an hour of playing would
  // otherwise be thousands of turns of float the drawing throws away anyway.
  spin.supply = (spin.supply + since * reelTurns(rate, reelRadius(1 - fill))) % 1;
  spin.takeUp = (spin.takeUp + since * reelTurns(rate, reelRadius(fill))) % 1;
}

/** One reel: its flange, the tape wound on it, and the spokes that make the turn visible. */
function paintReel(
  context: CanvasRenderingContext2D,
  centre: { x: number; y: number },
  full: number,
  wound: number,
  turns: number,
): void {
  const radius = reelRadius(wound) * full;
  const hub = HUB * full;
  context.globalAlpha = FLANGE_ALPHA;
  context.beginPath();
  context.arc(centre.x, centre.y, full, 0, TAU);
  context.stroke();
  // The wound tape is the ring between the hub and where the tape has reached, drawn as one
  // stroke down its middle rather than as two arcs and a fill. A reel holding nothing is drawn
  // with nothing on it: a canvas ignores a line width of zero and would stroke the ring at
  // whatever width was set last, which is a full reel's ring drawn thin (principle 5).
  if (radius > hub) {
    context.globalAlpha = WOUND_ALPHA;
    context.lineWidth = radius - hub;
    context.beginPath();
    context.arc(centre.x, centre.y, (radius + hub) / 2, 0, TAU);
    context.stroke();
    context.lineWidth = Math.max(1, devicePixelRatio);
  }
  context.globalAlpha = 1;
  context.beginPath();
  for (let spoke = 0; spoke < SPOKES; spoke++) {
    const angle = TAU * (turns + spoke / SPOKES);
    context.moveTo(centre.x + hub * Math.cos(angle), centre.y + hub * Math.sin(angle));
    context.lineTo(centre.x + radius * Math.cos(angle), centre.y + radius * Math.sin(angle));
  }
  context.stroke();
}

/**
 * The repeat the reels are actually wound by: the lane's own value where one is bending this
 * instance's `tape.time`, and the held value everywhere else — a lane the voice has not armed yet
 * reports no phase, and a picture drawn from a lane that is not running would be a value nothing
 * is holding. The same reading the knob beside it paints its dial from (0035).
 */
export const woundTime = (
  time: number,
  lane: readonly AutomationPoint[] | null,
  at: number | null,
): number => (lane !== null && at !== null ? automationValueAt(lane, at, time) : time);

/**
 * The two sides of the tape's path, and the two reel centres it runs between — declared once and
 * refilled in place, because this is a per-frame paint and a per-frame paint allocates nothing
 * (0070). One drawing at a time, so one pair serves every tape on the screen.
 */
const SIDES = [-1, 1] as const;
const supplyCentre = { x: 0, y: 0 };
const takeUpCentre = { x: 0, y: 0 };

/**
 * Draw the two reels and the tape looped between them, in `color` — a token the caller resolved.
 * `fill` is the take-up reel's share of the tape and the supply reel holds the rest, so winding
 * one up empties the other: the same tape, in a different place on the machine.
 */
export function paintTapeReels(
  canvas: HTMLCanvasElement,
  color: string,
  fill: number,
  spin: ReelSpin,
): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  const full = Math.min(height * 0.45, width * 0.22);
  if (full <= 0) return;
  const middle = height / 2;
  supplyCentre.x = width / 2 - full * 1.15;
  takeUpCentre.x = width / 2 + full * 1.15;
  supplyCentre.y = middle;
  takeUpCentre.y = middle;
  context.strokeStyle = color;
  context.lineWidth = Math.max(1, devicePixelRatio);
  paintReel(context, supplyCentre, full, 1 - fill, spin.supply);
  paintReel(context, takeUpCentre, full, fill, spin.takeUp);
  // The tape itself: the path it takes across both reels, tangent to whatever each is holding —
  // a loop, because a tape echo is one.
  const supplyRadius = reelRadius(1 - fill) * full;
  const takeUpRadius = reelRadius(fill) * full;
  context.globalAlpha = FLANGE_ALPHA;
  for (const side of SIDES) {
    context.beginPath();
    context.moveTo(supplyCentre.x, middle + side * supplyRadius);
    context.lineTo(takeUpCentre.x, middle + side * takeUpRadius);
    context.stroke();
  }
  context.globalAlpha = 1;
}

/**
 * The tape's live picture. Both numbers it draws from are ones the interface is already holding —
 * the instance's own `tape.time`, live where a lane is bending it, out of the phase `peek()`
 * already files and the same `automationValueAt` the knob beside it reads through (0035); and the
 * rate the deck reads at, which is its speed and its pitch through the one function that says what
 * those two mean (0031). The player's drift multiplies that rate by a ratio nothing reports, so
 * the drawing goes without it rather than the graph growing a reporter for a picture (P71).
 */
export function TapeReels({
  instrument,
  deck,
  instance,
  time,
  lane,
  rate,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  instance: EffectInstanceId;
  /** What this instance holds for `tape.time` — the value a lane, where there is one, bends. */
  time: number;
  lane: readonly AutomationPoint[] | null;
  rate: number;
  playing: boolean;
}) {
  const spin = useRef(newReelSpin());
  // Built here rather than inside the paint: `paramKey` is a `JSON.stringify`, and this pair does
  // not change between renders let alone between frames (0070) — the knob's own note.
  const key = paramKey(instance, "tape.time");
  const paint = useCallback(
    (canvas: HTMLCanvasElement, color: string) => {
      // A halted deck answers with the phase it is holding, which is where its lane is holding the
      // value too (0040), so this is asked whether or not a frame is running.
      const at = lane === null ? null : (instrument.peek(deck).automation.get(key) ?? null);
      const fill = reelFill(woundTime(time, lane, at));
      advanceReelSpin(spin.current, performance.now() / 1000, playing ? rate : 0, fill);
      paintTapeReels(canvas, color, fill, spin.current);
    },
    [instrument, deck, key, lane, time, playing, rate],
  );
  const { rootRef, canvasRef } = useCanvasSurface(paint, playing);

  return (
    // A picture the size of the knobs it stands with, in the room the card has left to the right
    // of them — centred against them, because a knob sits on the baseline of a row and this is
    // the one thing in it whose height is not the row's (P73).
    <div ref={rootRef} className="h-12 w-28 shrink-0 self-center text-primary">
      <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
    </div>
  );
}
