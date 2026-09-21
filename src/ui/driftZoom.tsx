/**
 * @role The two places the large picture can be, the three gestures that move it between them, and
 *   which of them a press on the strip is. Its own file because src/ui/MoireStrip.tsx stood at the
 *   800-line hard cap when the drift's switch landed (0045, 0397) — so what moved is the whole of
 *   the picture's *placing* and never half of it: the zoom, the window, the close and the press
 *   that chooses between them are all here.
 * @instead The picture itself, at either size, and the header the zoomed one wears →
 *   src/ui/MoireStrip.tsx. The second window, its styles and its React root →
 *   src/ui/popupWindow.ts. Whether the picture is drawn at all → src/ui/driftShown.ts.
 */
import { useCallback, useState, type MouseEvent, type ReactNode } from "react";

import { driftTitle } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { useSecondWindow } from "@/ui/popupWindow";
import { useAltHeld } from "@/ui/shortcuts";

/**
 * The two places the large picture can be, and the three gestures that move it between them: the
 * click zooms it over this page, the zoomed header pops it out into a window of its own, and either
 * one closes to nothing (0139). `covering` is true for exactly the first of the two — a window
 * covers no page, and a browser that refused one leaves the picture where the zoom put it (0138).
 * Both are view preferences: no command, nothing durable (plan §2).
 */
export function useZoomedDrift(
  deck: DeckId,
  draw: (doc: Document, close: () => void) => ReactNode,
): {
  covering: boolean;
  /** True while the picture is in a window of its own — showing, and covering nothing here. */
  apart: boolean;
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
    apart: showing && !drift.covering,
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
export function useDriftGesture(
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
