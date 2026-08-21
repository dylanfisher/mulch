/**
 * @role The drift: one row per lane a yard is running, over a reference row of its loop, each a
 *   wave at that row's own period so the rows slide across each other — the interference is what
 *   a listener actually hears. Beside it, how long the whole thing takes to come back round, as one
 *   estimated human duration. Clicking it opens the same picture large; open is a view preference
 *   and nothing else — no command, nothing durable (plan §2), and closed it costs nothing.
 * @instead The periods, the estimate and the units → src/lib/moire.ts. Drawing the rows →
 *   src/ui/moireCanvas.ts. A lane's shape or its span → src/ui/AutomationPreview.tsx.
 */
// One import over the cap, and the one over it is the sentence the estimate cannot be read
// without (0080, P65). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useMemo, useState } from "react";

import type { Instrument } from "@/app/facade";
import { DECK_AUTOMATION_PARAM_IDS, effectAutomationParamIds, paramKey } from "@/audio/params";
import { laneSpan } from "@/lib/automation";
import { fold, MOIRE_OVERLAY, MOIRE_STRIP, RECURRENCE_TOOLTIP, yardLabel } from "@/lib/copy";
import {
  describeRecurrence,
  FLAT_BEND,
  laneBend,
  loopPeriodSecs,
  moireWindowSecs,
  MOIRE_OVERLAY_CYCLES,
  MOIRE_STRIP_CYCLES,
  recurrenceLabel,
  recurrenceLength,
} from "@/lib/moire";
import { playbackRate } from "@/lib/timeline";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { paintMoire, useMoireCanvas, type MoireRow } from "@/ui/moireCanvas";
import { Says } from "@/ui/Says";
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
 * The lanes as rows, at their own zero: every row carries its lane's identity — the waveform its
 * parameter draws and its own bend — and only `phase` moves after this. The loop belongs to no
 * parameter, so it draws the plainest row there is and bends nothing: it is the reference the
 * others are read against, not another gesture.
 */
function moireRows(lanes: readonly MoireLane[], loopPeriod: number): MoireRow[] {
  const rows: MoireRow[] = lanes.map(({ period, shape, bend }) => ({
    period,
    phase: 0,
    reference: false,
    shape,
    bend,
  }));
  if (loopPeriod > 0) {
    rows.push({ period: loopPeriod, phase: 0, reference: true, shape: 0, bend: FLAT_BEND });
  }
  return rows;
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
  const rows = useMemo(() => moireRows(lanes, loopPeriod), [lanes, loopPeriod]);
  const periods = useMemo(() => rows.map(({ period }) => period), [rows]);

  const refill = useCallback(() => {
    const peek = instrument.peek(deck);
    lanes.forEach((lane, index) => {
      const row = rows[index];
      // A lane the voice has not armed yet reports no phase; the row sits at its own zero
      // rather than vanishing, because the period is a fact about the lane either way.
      if (row !== undefined) row.phase = peek.automation.get(lane.key) ?? 0;
    });
    const reference = rows.at(-1);
    if (reference === undefined || !reference.reference || loop === null) return;
    // Where the playhead is inside the loop, in real seconds: buffer seconds divided by the rate
    // they are read at, wrapped, so a deck sitting outside its loop still lands on the row.
    const into = (peek.position - loop.in) / rate;
    reference.phase = ((into % reference.period) + reference.period) % reference.period;
  }, [deck, instrument, lanes, loop, rate, rows]);

  return { rows, periods, loopPeriod, refill };
}

/** The estimate, cached: recomputed when a lane, the loop or the rate moves and never per frame. */
function useRecurrence(periods: readonly number[]): string {
  return useMemo(() => recurrenceLabel(describeRecurrence(recurrenceLength(periods))), [periods]);
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
function MoireOverlay({ instrument, deck, state, onClose }: MoireProps & { onClose: () => void }) {
  const { rows, periods, loopPeriod, refill } = useMoireRows(instrument, deck, state);
  const recurrence = useRecurrence(periods);
  // Pulled back rather than zoomed in: at close zoom the band is wider than the canvas and the
  // pattern reads as static, which is the one thing this picture must not do.
  const windowSecs = useMemo(
    () => moireWindowSecs(loopPeriod, periods, MOIRE_OVERLAY_CYCLES),
    [loopPeriod, periods],
  );
  const paint = useCallback(
    (canvas: HTMLCanvasElement, color: string) => {
      refill();
      paintMoire(canvas, rows, windowSecs, color);
    },
    [refill, rows, windowSecs],
  );
  const { rootRef, canvasRef } = useMoireCanvas(paint, paintsPerFrame(state.playing, rows.length));

  return (
    <aside
      aria-label={`${yardLabel(deck)} ${MOIRE_OVERLAY}`}
      className="fixed inset-0 z-50 flex flex-col gap-4 bg-background/95 p-8 backdrop-blur"
    >
      <header className="flex items-baseline gap-3">
        <h2 className="type-title">
          {yardLabel(deck)} {MOIRE_OVERLAY}
        </h2>
        <span className="min-w-0 flex-1 truncate type-readout text-muted-foreground">
          {recurrence}
        </span>
        {/* Words rather than a picture: closing this is not one of the instrument's actions, so
            it borrows none of their icons (0055). */}
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </header>
      <div ref={rootRef} className="min-h-0 flex-1 text-primary">
        <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
      </div>
    </aside>
  );
}

export function MoireStrip({ instrument, deck, state }: MoireProps) {
  /** A view preference: no command, nothing durable, no history entry (plan §2). */
  const [open, setOpen] = useState(false);
  const { rows, periods, loopPeriod, refill } = useMoireRows(instrument, deck, state);
  const recurrence = useRecurrence(periods);
  const windowSecs = useMemo(
    () => moireWindowSecs(loopPeriod, periods, MOIRE_STRIP_CYCLES),
    [loopPeriod, periods],
  );
  const paint = useCallback(
    (canvas: HTMLCanvasElement, color: string) => {
      refill();
      paintMoire(canvas, rows, windowSecs, color);
    },
    [refill, rows, windowSecs],
  );
  // Not while the overlay is over it: the same rows are being painted large on top, and the one
  // underneath is drawing where nobody can see it — two frame callbacks and two peeks a frame for
  // one picture (0070).
  const { rootRef, canvasRef } = useMoireCanvas(
    paint,
    paintsPerFrame(state.playing && !open, rows.length),
  );
  const toggle = useCallback(() => {
    setOpen((was) => !was);
  }, []);

  // A yard running nothing has no drift to draw and says so by not being there.
  if (rows.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
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
