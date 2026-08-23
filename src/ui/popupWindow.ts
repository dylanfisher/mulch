/**
 * @role A second browser window the instrument drives: opened by the gesture that asks for it,
 *   wearing the opener's own style sheets and theme class so one set of tokens dresses both
 *   documents, and closed with — or by — the window that opened it. It holds nothing. What is
 *   drawn in it is one React tree rendered from here into its body, reading the same store and
 *   peeking the same facade as everything in the opener, and every command it sends is sent by
 *   the opener (plan §2, 0138). Where a picture is drawn is a view preference: no command,
 *   nothing durable, no history entry. A browser that refuses the window says so, and the caller
 *   draws the same thing over its own page instead.
 * @instead What is drawn in one → src/ui/MoireStrip.tsx. A canvas's size, its display density and
 *   its colour, which belong to the document the canvas is actually in → src/ui/canvasSurface.ts,
 *   which reads all three off that document rather than off this module's own window. The frame
 *   loop stays the opener's one loop → src/ui/frame.ts; a second document does not get a second.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createRoot, type Root } from "react-dom/client";

import { useTheme } from "@/ui/theme";

/**
 * How large a second window opens: large enough to be the big picture the small one promises, and
 * small enough that it is a window beside the instrument rather than over it. A person moves and
 * resizes it afterwards, and the browser remembers that against the window's name.
 */
const POPUP_SIZE = { width: 720, height: 480 } as const;

/**
 * Everything that makes the opener look the way it does, into a document that starts with none of
 * it: every style sheet the app loaded — a `<link>` in a build, a `<style>` in dev — and the
 * classes the theme choice writes on `<html>` and the shell writes on `<body>`. Cloned rather than
 * shared: `adoptedStyleSheets` only takes sheets constructed by the document adopting them, and
 * these are the app's own tags.
 */
export function adoptStyles(from: Document, into: Document): void {
  for (const sheet of from.head.querySelectorAll("style, link[rel='stylesheet']")) {
    into.head.append(sheet.cloneNode(true));
  }
  into.documentElement.className = from.documentElement.className;
  into.body.className = from.body.className;
}

/**
 * A blank second window under `name`, dressed like the opener. Emptied first: a window the browser
 * hands back under a name it already had is the one from before this page load, still holding a
 * dead tree and the style sheets of a build that is gone.
 */
function openWindow(name: string, title: string): Window | null {
  const opened = window.open(
    "",
    name,
    `popup=yes,width=${POPUP_SIZE.width},height=${POPUP_SIZE.height}`,
  );
  if (opened === null) return null;
  opened.document.head.replaceChildren();
  opened.document.body.replaceChildren();
  opened.document.title = title;
  adoptStyles(document, opened.document);
  return opened;
}

export type SecondWindow = {
  /**
   * Whether the thing is showing over the opener's own page instead of in a window: what a browser
   * that refused the window leaves, and the caller's cue to render `draw` itself.
   */
  covering: boolean;
  /** Open it, or close whichever of the two is open. Call it from the gesture that asks for it:
   *  a window opened out of an effect has lost the user activation a popup blocker wants. */
  toggle: () => void;
  /** Close both, from anywhere — the thing drawn in the window is handed this as its own close. */
  close: () => void;
};

/**
 * Hold an open window until the returned teardown runs: its own React root, the report that a
 * person closed it, and the close that follows the opener going away — nothing would be driving a
 * window whose opener is gone.
 */
function own(held: Window, close: () => void, root: RefObject<Root | null>): () => void {
  const leave = (): void => {
    held.close();
  };
  held.addEventListener("pagehide", close);
  window.addEventListener("pagehide", leave);
  const made = createRoot(held.document.body);
  root.current = made;
  return () => {
    // Taken away before the close, so shutting it from here is not also a report that somebody
    // else did — that listener is how a person closing the window reaches this hook.
    held.removeEventListener("pagehide", close);
    window.removeEventListener("pagehide", leave);
    root.current = null;
    // In a microtask, because unmounting a root from inside another root's effect cleanup is a
    // render begun inside a render, which React refuses to do quietly — and the tree before the
    // window, because the popup's own subscription to the opener's frame loop (src/ui/frame.ts)
    // is the one thing in it that does not die with the document, and only the unmount takes it
    // out. `finally`, so a throw against a torn-down realm still leaves no window behind.
    queueMicrotask(() => {
      try {
        made.unmount();
      } finally {
        held.close();
      }
    });
  };
}

/**
 * A thing drawn in a window of its own, for as long as it is open. `draw` is called with that
 * window's document and the close it should offer, and its tree is rendered on every commit of the
 * tree that owns this hook, so the second window shows the props the first one is holding — one
 * component, two documents, and no state on this side of the seam.
 *
 * The window closes when the caller says so, when the opener goes away — nothing would be driving
 * it — and when the person closes it themselves, which lands here rather than leaving this holding
 * a window that is not there.
 */
export function useSecondWindow(
  name: string,
  title: string,
  draw: (doc: Document, close: () => void) => ReactNode,
): SecondWindow {
  const [held, setHeld] = useState<Window | null>(null);
  const [covering, setCovering] = useState(false);
  // Subscribed to rather than read: a theme choice made anywhere re-renders this, and the effect
  // below copies the classes `useTheme` just wrote onto the second document.
  useTheme();
  const root = useRef<Root | null>(null);

  const close = useCallback(() => {
    setHeld(null);
    setCovering(false);
  }, []);

  const toggle = useCallback(() => {
    if (held !== null || covering) {
      close();
      return;
    }
    const opened = openWindow(name, title);
    setHeld(opened);
    setCovering(opened === null);
  }, [close, covering, held, name, title]);

  useEffect(() => (held === null ? undefined : own(held, close, root)), [close, held]);

  useEffect(() => {
    if (held === null) return;
    // The theme is one choice and the second document has to wear it too: the same classes
    // `useTheme` just wrote on the opener, re-read when the choice moves rather than only when the
    // window opened. This is not a component reading the preference off `<html>`, which
    // src/ui/theme.ts forbids — it is one document's dress copied onto another.
    held.document.documentElement.className = document.documentElement.className;
    root.current?.render(draw(held.document, close));
  });

  return { covering, toggle, close };
}
