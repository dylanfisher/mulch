/**
 * @role One deck's automation workspace: the target picker derived from its rack and the registry,
 *   the lane editor for the chosen target, and the command that clears it (0024).
 * @instead The lane's gestures → src/ui/AutomationLane.tsx. Which parameters are automatable →
 *   the `automation` field of their declaration in src/audio/params.ts.
 */
import { useCallback, useMemo, useState } from "react";

import type { Instrument } from "@/app/facade";
import {
  automationTargets,
  isAutomationParam,
  PARAMS,
  type AutomationParamId,
} from "@/audio/params";
import type { AutomationPoint } from "@/lib/automation";
import type { DeckId, DeckState } from "@/state/store";
import { AutomationLane } from "@/ui/AutomationLane";
import { Button } from "@/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";

const EMPTY_LANE: readonly AutomationPoint[] = [];

// Over the line cap by design: the picker, the clear command and the lane are one workspace, and
// most of the length is its markup. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function AutomationWorkspace({
  instrument,
  deck,
  state,
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
}) {
  const targets = useMemo(() => automationTargets(state.effects), [state.effects]);
  const [picked, setPicked] = useState<AutomationParamId | null>(null);
  // Which target is showing is a view preference, not session state — and a target whose effect
  // has just left the rack falls back to the first one rather than rendering a lane nobody owns.
  const param = picked !== null && targets.includes(picked) ? picked : (targets[0] ?? null);

  const onPick = useCallback((value: string[]) => {
    const [next] = value;
    if (isAutomationParam(next)) setPicked(next);
  }, []);

  const onClear = useCallback(() => {
    if (param === null) return;
    instrument.send({ t: "automation.set", deck, param, points: [] });
  }, [instrument, deck, param]);

  const selected = useMemo(() => (param === null ? [] : [param]), [param]);

  if (param === null) return null;

  return (
    <section className="flex flex-col gap-2" aria-label={`Deck ${deck} automation`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="type-eyebrow text-muted-foreground">automation</div>
        <ToggleGroup
          value={selected}
          onValueChange={onPick}
          variant="outline"
          size="sm"
          spacing={0}
          aria-label={`Deck ${deck} automation target`}
        >
          {targets.map((id) => (
            <ToggleGroupItem key={id} value={id} aria-label={`Automate ${PARAMS[id].label}`}>
              {PARAMS[id].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`Clear Deck ${deck} ${PARAMS[param].label} automation`}
          onClick={onClear}
        >
          clear
        </Button>
      </div>
      <AutomationLane
        instrument={instrument}
        deck={deck}
        param={param}
        points={state.automation[param] ?? EMPTY_LANE}
        duration={state.duration}
      />
    </section>
  );
}
