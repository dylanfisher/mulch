/**
 * @role The drift: one row per lane a yard is running and one per instance in its rack — an effect
 *   is drawn whether or not anything is automating it — over a reference row of its loop, each a
 *   wave at that row's own period so the rows slide across each other — the interference is what
 *   a listener actually hears. Beside it, how long the whole thing takes to come back round, as one
 *   estimated human duration. Clicking it opens the same picture large — the same window at the
 *   shell's own header and measure, closed by that header's button or by Escape; open is a view
 *   preference and nothing else — no command, nothing durable (plan §2), and closed it costs
 *   nothing. A yard folded shut draws it in its header instead, where the slack is.
 * @instead The periods, the estimate and the units → src/lib/moire.ts. Drawing the rows →
 *   src/ui/moireCanvas.ts. A lane's shape or its span → src/ui/AutomationPreview.tsx.
 */
// One import over the cap, and the one over it is the sentence the estimate cannot be read
// without (0080, P65). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Instrument } from "@/app/facade";
import { DECK_AUTOMATION_PARAM_IDS, effectAutomationParamIds, paramKey } from "@/audio/params";
import { laneSpan } from "@/lib/automation";
import { cn } from "@/lib/cn";
import { fold, MOIRE_OVERLAY, MOIRE_STRIP, RECURRENCE_TOOLTIP, yardLabel } from "@/lib/copy";
import {
  describeRecurrence,
  effectRowPeriod,
  FLAT_BEND,
  laneBend,
  loopPeriodSecs,
  MOIRE_CYCLES,
  moireWindowSecs,
  recurrenceLabel,
  recurrenceLength,
} from "@/lib/moire";
import { playbackRate } from "@/lib/timeline";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { useCanvasSurface, type CanvasSurface } from "@/ui/canvasSurface";
import { paintMoire, type MoireRow } from "@/ui/moireCanvas";
import { Says } from "@/ui/Says";
import { SHELL_HEADER, SHELL_HEADER_ROW, SHELL_WIDTH } from "@/ui/shell";
// oxlint-enable import/max-dependencies

/**
 * One lane as a row: the key `peek()` files its phase under, the period it repeats on, the
 * waveform its parameter draws it with, and its own gesture across one cycle. The last two are
 * what keep two lanes of the same period on different parameters from drawing the same row.
 */
export type MoireLane = { key: string; period: number; shape: number; bend: readonly number[] };

/**
 * Every lane this deck is actually running — its own and every rack instance's — each with the
 * period `laneSpan` reports for it, which P53 made something a gesture edits (0079). A lane that
 * never moved has no period and is not a row: an unmoving line is not drift.
 */
export function deckLanes(
  automation: DeckState["automation"],
  effects: DeckState["effects"],
): MoireLane[] {
  const lanes: MoireLane[] = [];
  for (const param of DECK_AUTOMATION_PARAM_IDS) {
    const lane = automation[param];
    if (lane === undefined || laneSpan(lane) <= 0) continue;
    lanes.push({
      key: paramKey(null, param),
      period: laneSpan(lane),
      // The parameter and not the key: a row's shape says which knob is drifting, so the same
      // knob on two rack instances reads as the same kind of row and their gestures separate them.
      shape: fold(param),
      bend: laneBend(lane),
    });
  }
  for (const instance of effects) {
    for (const param of effectAutomationParamIds(instance.effect)) {
      const lane = instance.automation[param];
      if (lane === undefined || laneSpan(lane) <= 0) continue;
      lanes.push({
        key: paramKey(instance.id, param),
        period: laneSpan(lane),
        shape: fold(param),
        bend: laneBend(lane),
      });
    }
  }
  return lanes;
}

/**
 * The picture's rows at their own zero, and beside them where each one's phase is read from — a
 * lane's key, or null for a row no lane drives. Only `phase` moves after this.
 *
 * Every lane carries its own identity, the waveform its parameter draws and its own bend. Every
 * instance in the rack carries a row too, whether or not anything is automating it, folded out of
 * its own id the way its name already is (0076): a deck holding a rack and no lanes still has
 * something to beat against its loop, and a lane on that effect goes on bending the row it already
 * bends. The loop belongs to no parameter, so it draws the plainest row there is and bends
 * nothing: it is the reference the others are read against, not another gesture.
 */
export function moireRows(
  lanes: readonly MoireLane[],
  effects: DeckState["effects"],
  loopPeriod: number,
): { rows: MoireRow[]; keys: (string | null)[] } {
  const rows: MoireRow[] = lanes.map(({ period, shape, bend }) => ({
    period,
    phase: 0,
    reference: false,
    shape,
    bend,
  }));
  const keys: (string | null)[] = lanes.map(({ key }) => key);
  for (const instance of effects) {
    // One fold, both halves: the remainder picks the waveform and the quotient the period, so two
    // instances of one effect are two different rows and neither is its plugin's.
    const seed = fold(instance.id);
    rows.push({
      period: effectRowPeriod(seed),
      phase: 0,
      reference: false,
      shape: seed,
      bend: FLAT_BEND,
    });
    keys.push(null);
  }
  if (loopPeriod > 0) {
    rows.push({ period: loopPeriod, phase: 0, reference: true, shape: 0, bend: FLAT_BEND });
    keys.push(null);
  }
  return { rows, keys };
}

/**
 * Whether a surface holding these rows belongs on the frame loop. The one answer both sizes ask.
 * A halted yard is painted but not animated: `laneNow()` freezes on a halt and the playhead holds
 * where it stopped (0040), so every phase is the phase the last frame drew — an idle page runs
 * zero frames (src/ui/frame.ts), and a picture that is not moving is a commit, not a subscription.
 */
export const paintsPerFrame = (playing: boolean, rows: number): boolean => playing && rows > 0;

/**
 * The rows, allocated once per set of lanes and refilled in place — `refill` is the per-frame
 * read, and it allocates nothing and enters no React state (0070, docs/boundaries.md). The loop
 * is the last row and the reference one: its period is real seconds, because rate scales buffer
 * time and not lane time (0035).
 */
function useMoireRows(
  instrument: Instrument,
  deck: DeckId,
  state: DeckState,
): { rows: MoireRow[]; periods: number[]; loopPeriod: number; refill: () => void } {
  const rate = playbackRate(state.params["deck.speed"], state.params["deck.pitch"]);
  const loop = state.loop;
  const loopPeriod = loopPeriodSecs(loop, rate);
  // Keyed on the two things a lane can live in and nothing else, so a param tweak, a load or a
  // fold leaves the rows — and through them the estimate — exactly as they were (P54).
  const lanes = useMemo(
    () => deckLanes(state.automation, state.effects),
    [state.automation, state.effects],
  );
  const { rows, keys } = useMemo(
    () => moireRows(lanes, state.effects, loopPeriod),
    [lanes, state.effects, loopPeriod],
  );
  const periods = useMemo(() => rows.map(({ period }) => period), [rows]);

  const refill = useCallback(() => {
    const peek = instrument.peek(deck);
    // Where the playhead is since the top of the loop, in real seconds: buffer seconds divided by
    // the rate they are read at (0035). A deck read at no rate at all is a deck holding still, so
    // every row it drives holds the zero it was built at rather than a division by nothing.
    const into = rate > 0 ? (peek.position - (loop?.in ?? 0)) / rate : 0;
    rows.forEach((row, index) => {
      const key = keys[index] ?? null;
      // A lane the voice has not armed yet reports no phase; the row sits at its own zero
      // rather than vanishing, because the period is a fact about the lane either way.
      if (key !== null) {
        row.phase = peek.automation.get(key) ?? 0;
        return;
      }
      // The loop's row and a rack instance's: nothing automates either, so both run on the deck's
      // own clock, wrapped, and a deck sitting outside its loop still lands on the row.
      row.phase = row.period > 0 ? ((into % row.period) + row.period) % row.period : 0;
    });
  }, [deck, instrument, keys, loop, rate, rows]);

  return { rows, periods, loopPeriod, refill };
}

/** The estimate, cached: recomputed when a lane, the loop or the rate moves and never per frame. */
function useRecurrence(periods: readonly number[]): string {
  return useMemo(() => recurrenceLabel(describeRecurrence(recurrenceLength(periods))), [periods]);
}

/**
 * One yard's picture, ready to hang: the rows, the estimate beside them and the canvas that draws
 * them, animating for exactly as long as it is asked to. Both sizes come through here, so the
 * window they draw across is computed once — `MOIRE_CYCLES` at the strip's height and at the
 * overlay's, because a small picture is a smaller picture and not a different one (0098).
 */
function useMoirePicture(
  instrument: Instrument,
  deck: DeckId,
  state: DeckState,
  animating: boolean,
): { rows: MoireRow[]; recurrence: string } & CanvasSurface {
  const { rows, periods, loopPeriod, refill } = useMoireRows(instrument, deck, state);
  const recurrence = useRecurrence(periods);
  // Pulled back rather than zoomed in: at close zoom the band is wider than the canvas and the
  // pattern reads as static, which is the one thing this picture must not do.
  const windowSecs = useMemo(
    () => moireWindowSecs(loopPeriod, periods, MOIRE_CYCLES),
    [loopPeriod, periods],
  );
  const paint = useCallback(
    (canvas: HTMLCanvasElement, color: string) => {
      refill();
      paintMoire(canvas, rows, windowSecs, color);
    },
    [refill, rows, windowSecs],
  );
  const surface = useCanvasSurface(paint, paintsPerFrame(animating, rows.length));
  return { rows, recurrence, ...surface };
}

/**
 * Escape closes the large picture. Bound on the document while the overlay is mounted and gone
 * with it — the overlay is not rendered while it is closed (plan §2), so a closed one is listening
 * for nothing. It is a view preference and not a command, which is why it is here rather than in
 * the registry every serialisable key is declared in (src/ui/shortcuts.ts).
 */
export function useClosedByEscape(onClose: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // The guard every key path in src/ui/shortcuts.ts opens with: a press something above this
      // has already answered — the palette's own dialog dismissing itself, a menu closing — is not
      // also this picture's, or one Escape would shut two things at once.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
}

/**
 * The estimate beside the strip. A figure in a unit nobody expects — geological epochs, light
 * years — reads as a joke until something says what it is counting, and that sentence is the one
 * this number cannot be read without (0080, P65).
 */
const Recurrence = ({ says }: { says: string }) => (
  <Says what={RECURRENCE_TOOLTIP}>
    {/* A button, not a span: the sentence a resting pointer reaches is one a keyboard reaches
        too, which is the same call the debug console's counter labels make. */}
    <button type="button" className="shrink-0 type-readout text-muted-foreground">
      {says}
    </button>
  </Says>
);

/** What both sizes need to draw one yard's drift: who to peek, which yard, and what it holds. */
type MoireProps = { instrument: Instrument; deck: DeckId; state: DeckState };
/**
 * The overlay is mounted only while it is open — not rendered null while it is not. Closed it is
 * no canvas, no frame callback, no observer and no estimate, because it is not there at all
 * (plan §2, docs/decisions/0070).
 */
export function MoireOverlay({
  instrument,
  deck,
  state,
  onClose,
}: MoireProps & { onClose: () => void }) {
  const { recurrence, rootRef, canvasRef } = useMoirePicture(
    instrument,
    deck,
    state,
    state.playing,
  );
  useClosedByEscape(onClose);

  return (
    <aside
      aria-label={`${yardLabel(deck)} ${MOIRE_OVERLAY}`}
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur"
    >
      {/* The shell's own header, worn by the screen this covers: the yard's label sits where every
          other title on this instrument sits and runs to the one measure both screens lay out to
          (0074) — read from src/ui/shell.ts, never restated. */}
      <header className={SHELL_HEADER}>
        <div className={SHELL_HEADER_ROW}>
          <h2 className="type-title">
            {yardLabel(deck)} {MOIRE_OVERLAY}
          </h2>
          <span className="min-w-0 flex-1 truncate type-readout text-muted-foreground">
            {recurrence}
          </span>
          {/* Words rather than a picture: closing this is not one of the instrument's actions, so
              it borrows none of their icons (0055). Escape says the same thing from the keyboard. */}
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </header>
      <div
        ref={rootRef}
        className={cn("mx-auto min-h-0 w-full flex-1 px-6 py-8 text-primary", SHELL_WIDTH)}
      >
        <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
      </div>
    </aside>
  );
}

export function MoireStrip({
  instrument,
  deck,
  state,
  className,
}: MoireProps & { className?: string }) {
  /** A view preference: no command, nothing durable, no history entry (plan §2). */
  const [open, setOpen] = useState(false);
  // Not while the overlay is over it: the same rows are being painted large on top, and the one
  // underneath is drawing where nobody can see it — two frame callbacks and two peeks a frame for
  // one picture (0070).
  const { rows, recurrence, rootRef, canvasRef } = useMoirePicture(
    instrument,
    deck,
    state,
    state.playing && !open,
  );
  const toggle = useCallback(() => {
    setOpen((was) => !was);
  }, []);

  // A yard running nothing has no drift to draw and says so by not being there.
  if (rows.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* The glance: the whole strip is the control that opens the look. */}
      <button
        type="button"
        aria-label={`${yardLabel(deck)} ${MOIRE_STRIP}`}
        className="min-w-0 flex-1 cursor-zoom-in text-primary"
        onClick={toggle}
      >
        <div ref={rootRef} className="h-8 w-full">
          <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
        </div>
      </button>
      <Recurrence says={recurrence} />
      {open ? (
        <MoireOverlay instrument={instrument} deck={deck} state={state} onClose={toggle} />
      ) : null}
    </div>
  );
}
