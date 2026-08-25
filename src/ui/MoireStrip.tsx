/**
 * @role The drift: one row per lane a yard is running, one per instance in its rack — an effect is
 *   drawn whether or not anything is automating it — and one for the jumps module wherever the yard
 *   is actually jumping, over a reference row of its loop, each a wave
 *   at that row's own period so the rows slide across each other — the interference is what a
 *   listener actually hears. Beside it, how long the whole thing takes to come back round, as one
 *   estimated human duration. Clicking it zooms the same picture large over this page, and that
 *   picture's own header carries the button, and the sentence, that hands it to a browser window
 *   of its own; a press with Option held skips the zoom and goes straight there, which the cursor
 *   says while the modifier is down — the same component either side of that seam, closed by that
 *   header's button, by Escape, or by the window itself; in a window of its own it is the picture
 *   corner to corner, with no header and none of the shell's measure, because there is nothing
 *   there for chrome to say; where the browser refuses a window the picture stays where it is
 *   (0138, 0139, 0140). Open, and which of the two it is open in, are
 *   view preferences and nothing else — no command, nothing durable (plan §2), and closed it costs
 *   nothing. A folded yard draws it in its header, where the slack is.
 * @instead What the rows are made of, and the window they are drawn across → src/ui/moireRows.ts.
 *   The estimate and the units it is said in → src/lib/recurrence.ts. Drawing the rows →
 *   src/ui/moireCanvas.ts. A lane's shape or its span → src/ui/AutomationPreview.tsx. The second
 *   window itself, its styles and its React root → src/ui/popupWindow.ts.
 */
// One import over the cap, and the one over it is the sentence the estimate cannot be read
// without (0080, P65). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";

import type { Instrument } from "@/app/facade";
import { deckRate } from "@/audio/params";
import { cn } from "@/lib/cn";
import {
  driftTitle,
  MOIRE_POP_OUT,
  MOIRE_POP_OUT_TOOLTIP,
  MOIRE_STRIP,
  RECURRENCE_TOOLTIP,
  yardLabel,
} from "@/lib/copy";
import type { MoireRow } from "@/lib/moire";
import { sourceCut } from "@/lib/moireSound";
import {
  describeRecurrence,
  loopPeriodSecs,
  recurrenceLabel,
  type RecurrenceLength,
} from "@/lib/recurrence";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import type { CanvasSurface } from "@/ui/canvasSurface";
import { useDriftSurface } from "@/ui/driftTiles";
import { playerJumps } from "@/audio/player";
import { playerRowPeriod } from "@/lib/playerDrift";
import { paintMoire } from "@/ui/moireCanvas";
import { deckLanes, moireRows, paintsPerFrame, refillRows } from "@/ui/moireRows";
import { useSecondWindow } from "@/ui/popupWindow";
import { Says } from "@/ui/Says";
import { SHELL_BODY, SHELL_HEADER, SHELL_HEADER_ROW } from "@/ui/shell";
import { useAltHeld } from "@/ui/shortcuts";
// oxlint-enable import/max-dependencies

/**
 * The one thing about the jumps module a row is built from, and null for a yard that is not
 * jumping: one with no pattern, and one whose loop has no grid to jump around (0159). Resolved
 * before the rows are and to a number, because the whole spec is a new object on every pointer move
 * of any of its two dozen dials (src/app/execute.ts) and only two of them can reach a row — keyed
 * on the spec, a hand on the Gate dial would rebuild every row in the picture.
 */
const jumpsPeriod = (player: DeckState["player"], loopPeriod: number): number | null =>
  player === null || !playerJumps(loopPeriod) ? null : playerRowPeriod(player);

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
): {
  rows: MoireRow[];
  windowSecs: number;
  recurrence: RecurrenceLength;
  refill: () => void;
} {
  const rate = deckRate(state.params);
  const loop = state.loop;
  const loopPeriod = loopPeriodSecs(loop, rate);
  // Keyed on the two things a row can live in and nothing else, so a load or a fold leaves the
  // rows — and through them the estimate — exactly as they were (P54). A knob an effect declared a
  // way into the picture for does move them, because the row is what the effect is set to (0139),
  // and `state.effects` is a new array on every `param.set` (src/app/execute.ts).
  const lanes = useMemo(
    () => deckLanes(state.automation, state.effects),
    [state.automation, state.effects],
  );
  // What this yard is playing, as the two things it says about the reference row. Re-cut when the
  // worker answers for a new source and never per frame: analysis is derived once per load (0025,
  // 0145), and a deck with nothing measured draws the cut the picture drew before it.
  const cut = useMemo(
    () => sourceCut(state.analysis, state.duration),
    [state.analysis, state.duration],
  );
  const playerPeriod = useMemo(
    () => jumpsPeriod(state.player, loopPeriod),
    [loopPeriod, state.player],
  );
  const { rows, reads, windowSecs, recurrence } = useMemo(
    () => moireRows(lanes, state.effects, loopPeriod, cut, playerPeriod),
    [cut, lanes, state.effects, loopPeriod, playerPeriod],
  );

  // The whole per-frame read, in one call that allocates nothing and enters no React state: the
  // rows were allocated with the set above and every painting refills them in place (0070).
  const refill = useCallback(() => {
    refillRows(rows, reads, instrument.peek(deck), rate, loop?.in ?? 0);
  }, [deck, instrument, loop, rate, reads, rows]);

  return { rows, windowSecs, recurrence, refill };
}

/**
 * The estimate, cached: recomputed when a lane, the loop or the rate moves and never per frame.
 * The length itself came back with the rows, which is where it is taken — the picture's own macro
 * row is a grating on it, so a second reading here would be the same answer computed twice
 * (principle 1) and could disagree with the row (0143).
 */
function useRecurrence(recurrence: RecurrenceLength): string {
  return useMemo(() => recurrenceLabel(describeRecurrence(recurrence)), [recurrence]);
}

/**
 * One yard's picture, ready to hang: the rows, the estimate beside them and the canvas that draws
 * them, animating for exactly as long as it is asked to. Both sizes come through here and both draw
 * across the one window the rows were built against — pulled back rather than zoomed in, and the
 * same number of cycles at the strip's height and at the overlay's, because a small picture is a
 * smaller picture and not a different one (0098).
 */
function useMoirePicture(
  instrument: Instrument,
  deck: DeckId,
  state: DeckState,
  animating: boolean,
): { rows: MoireRow[]; recurrence: string } & CanvasSurface {
  const { rows, windowSecs, recurrence, refill } = useMoireRows(instrument, deck, state);
  const said = useRecurrence(recurrence);
  const paint = useCallback(
    (canvas: HTMLCanvasElement, color: string) => {
      refill();
      paintMoire(canvas, rows, windowSecs, color);
    },
    [refill, rows, windowSecs],
  );
  const surface = useDriftSurface(paint, paintsPerFrame(animating, rows.length));
  return { rows, recurrence: said, ...surface };
}

/**
 * Escape closes the large picture. Bound on the document while the overlay is mounted and gone
 * with it — the overlay is not rendered while it is closed (plan §2), so a closed one is listening
 * for nothing. It is a view preference and not a command, which is why it is here rather than in
 * the registry every serialisable key is declared in (src/ui/shortcuts.ts).
 * On the document the picture is in: a key pressed in a window of its own never reaches the
 * opener's (0138).
 */
export function useClosedByEscape(onClose: () => void, doc?: Document): void {
  useEffect(() => {
    // Resolved here, not in the signature: a default is read on every render, document or not.
    const on = doc ?? document;
    const onKeyDown = (event: KeyboardEvent): void => {
      // The guard every key path in src/ui/shortcuts.ts opens with: a press something above this
      // has already answered — the palette's own dialog dismissing itself, a menu closing — is not
      // also this picture's, or one Escape would shut two things at once.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    };
    on.addEventListener("keydown", onKeyDown);
    return () => {
      on.removeEventListener("keydown", onKeyDown);
    };
  }, [doc, onClose]);
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
 * The shell's own header, worn by the screen the large picture covers: the yard's label sits where
 * every other title on this instrument sits and runs to the one measure both screens lay out to
 * (0074) — read from src/ui/shell.ts, never restated. It carries the estimate and the two words
 * the picture is moved by.
 */
const DriftHeader = ({
  deck,
  recurrence,
  onClose,
  onPopOut,
}: {
  deck: DeckId;
  recurrence: string;
  onClose: () => void;
  /** Absent for a picture already in a window of its own: there is nothing left to pop it into. */
  onPopOut: (() => void) | undefined;
}) => (
  <header className={SHELL_HEADER}>
    <div className={SHELL_HEADER_ROW}>
      <h2 className="type-title">{driftTitle(deck)}</h2>
      <span className="min-w-0 flex-1 truncate type-readout text-muted-foreground">
        {recurrence}
      </span>
      {/* The cheap gesture stops paying for a window: the click zooms in place and this is where
          the window is asked for, from the header of the picture already open (0139). A picture
          already in a window of its own is handed no pop-out and shows none. */}
      {onPopOut === undefined ? null : (
        <Says what={MOIRE_POP_OUT_TOOLTIP}>
          <Button size="sm" variant="ghost" onClick={onPopOut}>
            {MOIRE_POP_OUT}
          </Button>
        </Says>
      )}
      {/* Words rather than a picture: closing this is not one of the instrument's actions, so it
          borrows none of their icons (0055). Escape says the same thing from the keyboard. */}
      <Button size="sm" variant="ghost" onClick={onClose}>
        Close
      </Button>
    </div>
  </header>
);

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
  onPopOut,
  doc,
}: MoireProps & {
  onClose: () => void;
  /** Absent for a picture in a window of its own, and for one a refusal is holding here (0139). */
  onPopOut?: (() => void) | undefined;
  doc?: Document;
}) {
  const { recurrence, rootRef, canvasRef } = useMoirePicture(
    instrument,
    deck,
    state,
    state.playing,
  );
  useClosedByEscape(onClose, doc);
  /**
   * A window of its own is the picture and nothing else: no header, no measure, no padding — the
   * whole of it, corner to corner. The title is the window's, the close is the window's own, and
   * the pop-out has nowhere left to go, so a bar there is chrome over the only thing that window
   * exists to show. Over this page it keeps all three, because there the picture is a thing
   * covering the instrument and needs to say how to get back (0138, 0139).
   */
  const alone = doc !== undefined;

  return (
    <aside
      aria-label={driftTitle(deck)}
      // The scrim is for the instrument this covers; in a window of its own nothing is behind it,
      // so the blur would be a compositing pass a frame for no picture (0070).
      className={cn(
        "fixed inset-0 z-50 flex flex-col",
        alone ? "bg-background" : "bg-background/95 backdrop-blur",
      )}
    >
      {alone ? null : (
        <DriftHeader deck={deck} recurrence={recurrence} onClose={onClose} onPopOut={onPopOut} />
      )}
      {/* The one measure both screens lay out to is for a page of reading; a picture in a window
          of its own is full bleed and is not held to it (0074). */}
      <div
        ref={rootRef}
        className={cn("min-h-0 w-full flex-1 text-primary", alone ? null : SHELL_BODY)}
      >
        <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
      </div>
    </aside>
  );
}

/**
 * The two places the large picture can be, and the three gestures that move it between them: the
 * click zooms it over this page, the zoomed header pops it out into a window of its own, and either
 * one closes to nothing (0139). `covering` is true for exactly the first of the two — a window
 * covers no page, and a browser that refused one leaves the picture where the zoom put it (0138).
 * Both are view preferences: no command, nothing durable (plan §2).
 */
function useZoomedDrift(
  deck: DeckId,
  draw: (doc: Document, close: () => void) => ReactNode,
): {
  covering: boolean;
  zoom: () => void;
  popOut: (() => void) | undefined;
  close: () => void;
} {
  const [zoomed, setZoomed] = useState(false);
  // One window per yard, named after it, and one component either side of the seam.
  const drift = useSecondWindow(`mulch-drift-${deck}`, driftTitle(deck), draw);
  const { close, open, showing } = drift;
  // The pop-out hands the picture over: this page stops covering itself and the window takes it.
  const popOut = useCallback(() => {
    setZoomed(false);
    open();
  }, [open]);
  return {
    covering: zoomed || drift.covering,
    // Nothing while the picture is already up somewhere: a strip clicked again behind its own
    // popped-out window would draw the same yard twice, on two frame loops, for one picture (0070).
    zoom: useCallback(() => {
      if (showing) return;
      setZoomed(true);
    }, [showing]),
    // And no pop-out at all once a browser has refused the window: `covering` from a refusal is
    // exactly the state `open` declines, so the button would be a control that cannot work (0138).
    popOut: drift.covering ? undefined : popOut,
    close: useCallback(() => {
      setZoomed(false);
      close();
    }, [close]),
  };
}

/**
 * Which of the two gestures a press on the strip is. Option is the shortcut straight to a window:
 * a performer who wants the picture beside the instrument rather than over it should not have to
 * open it over the instrument first and then pop it out (0139). Nothing else on the strip reads
 * the modifier, and a browser that has already refused a window has no straight route to offer, so
 * that press zooms like any other (0138).
 */
export const driftPress = (
  alt: boolean,
  gestures: { zoom: () => void; popOut: (() => void) | undefined },
): (() => void) => (alt && gestures.popOut !== undefined ? gestures.popOut : gestures.zoom);

/**
 * The strip's one press, and the cursor that says where it goes — the alias arrow is what a browser
 * has for "this goes somewhere else", and Option is the modifier the knobs already arm on (0024).
 * The press reads the modifier the event carries rather than that reveal: a click in the instant
 * Option went down is a render ahead of it, and the gesture must not be.
 */
function useDriftGesture(
  zoom: () => void,
  popOut: (() => void) | undefined,
): { cursor: string; press: (event: MouseEvent<HTMLButtonElement>) => void } {
  const cursor = useAltHeld() && popOut !== undefined ? "cursor-alias" : "cursor-zoom-in";
  const press = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      driftPress(event.altKey, { zoom, popOut })();
    },
    [popOut, zoom],
  );
  return { cursor, press };
}

export function MoireStrip({
  instrument,
  deck,
  state,
  className,
}: MoireProps & { className?: string }) {
  const { covering, zoom, popOut, close } = useZoomedDrift(deck, (doc, shut) => (
    <MoireOverlay instrument={instrument} deck={deck} state={state} onClose={shut} doc={doc} />
  ));
  // Not while the overlay is over it: the same rows are painted large on top and the one underneath
  // draws where nobody can see it — two frame callbacks and two peeks a frame for one picture
  // (0070). A window of its own covers nothing, so the strip goes on drawing beside it.
  const { rows, recurrence, rootRef, canvasRef } = useMoirePicture(
    instrument,
    deck,
    state,
    state.playing && !covering,
  );
  const { cursor, press } = useDriftGesture(zoom, popOut);

  // A yard running nothing has no drift to draw and says so by not being there.
  if (rows.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* The glance: the whole strip is the control that opens the look. */}
      <button
        type="button"
        aria-label={`${yardLabel(deck)} ${MOIRE_STRIP}`}
        className={cn("min-w-0 flex-1 text-primary", cursor)}
        onClick={press}
      >
        <div ref={rootRef} className="h-8 w-full">
          <canvas ref={canvasRef} className="size-full" aria-hidden="true" />
        </div>
      </button>
      <Recurrence says={recurrence} />
      {covering ? (
        <MoireOverlay
          instrument={instrument}
          deck={deck}
          state={state}
          onClose={close}
          onPopOut={popOut}
        />
      ) : null}
    </div>
  );
}
