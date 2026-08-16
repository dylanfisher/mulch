/** @role Undo and redo buttons that only produce their corresponding history commands. */
import { useCallback, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { Button } from "@/ui/components/button";
import { ACTION_ICONS } from "@/ui/icons";

export function HistoryControls({ instrument }: { instrument: Instrument }) {
  const state = useSyncExternalStore(
    instrument.history.subscribe,
    instrument.history.getState,
    instrument.history.getState,
  );
  const undo = useCallback(() => {
    instrument.send({ t: "history.undo" });
  }, [instrument]);
  const redo = useCallback(() => {
    instrument.send({ t: "history.redo" });
  }, [instrument]);
  return (
    <div className="flex items-center gap-1">
      <Button size="xs" variant="outline" disabled={!state.canUndo} onClick={undo}>
        <ACTION_ICONS.undo data-icon="inline-start" />
        Undo
      </Button>
      <Button size="xs" variant="outline" disabled={!state.canRedo} onClick={redo}>
        <ACTION_ICONS.redo data-icon="inline-start" />
        Redo
      </Button>
    </div>
  );
}
