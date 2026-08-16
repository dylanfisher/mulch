/**
 * @role The file-drop affordance a surface wears: the handlers that make an element a drop
 *   target at all, and the highlight flag that says a drag is over it right now. The flag is
 *   component state — it is where the hand is this instant, so no command and nothing durable.
 * @instead What a dropped file then becomes → src/ui/Deck.tsx, which owns the one ingest, the
 *   refusal and the error surface every route into a deck shares. Nothing here reads a file or
 *   knows what a deck is; what a surface accepts is declared in src/lib/audioFile.ts.
 */
import { useCallback, useMemo, useState } from "react";

/**
 * Exactly what a drop gesture reads off the event and nothing else, so a real `DragEvent`
 * satisfies it and a test can hand these handlers a plain object with no DOM in the room.
 */
export type DragGesture = {
  preventDefault: () => void;
  dataTransfer: {
    types: readonly string[];
    dropEffect: "none" | "copy" | "link" | "move";
    files: { item: (index: number) => File | null };
  };
};

/** The props a drop surface spreads onto itself — the highlight it reports and its handlers. */
export type FileDrop = {
  "data-dropping": boolean;
  onDragOver: (event: DragGesture) => void;
  onDragLeave: (event: DragGesture) => void;
  onDrop: (event: DragGesture) => void;
};

/**
 * Makes whatever spreads the result a target for dropped files, handing `onFile` the first of
 * however many arrive — the first, rather than one of many landing silently.
 */
export function useFileDrop(onFile: (file: File) => void): FileDrop {
  const [dropping, setDropping] = useState(false);

  // Preventing the default on drag-over is what makes this a target at all — without it the
  // browser leaves the page to open the file — and it is offered only to a drag carrying files,
  // so dragging a selection across the surface lights nothing up.
  const onDragOver = useCallback((event: DragGesture) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDropping(true);
  }, []);

  // Unconditionally, whatever the pointer's coordinates say: a drag abandoned with Escape over
  // this surface is announced as a leave from exactly where it still is, so a highlight that
  // asks "did it really go?" is one that stays lit with nothing being dragged. Crossing onto a
  // child announces a leave too, but the browser fires the next drag-over in the same pass, so
  // the flag is back before anything paints.
  const onDragLeave = useCallback(() => {
    setDropping(false);
  }, []);

  const onDrop = useCallback(
    (event: DragGesture) => {
      event.preventDefault();
      setDropping(false);
      const file = event.dataTransfer.files.item(0);
      if (file !== null) onFile(file);
    },
    [onFile],
  );

  // One object per set of handlers, so spreading it onto an element is not a fresh prop bag on
  // every render (react-perf/jsx-no-new-object-as-prop).
  return useMemo(
    () => ({ "data-dropping": dropping, onDragOver, onDragLeave, onDrop }),
    [dropping, onDragOver, onDragLeave, onDrop],
  );
}
