/**
 * @role One control saying what it does: the sentence, and the control it belongs to. The trigger
 *   renders the control itself rather than wrapping it, so the element, its primitive, its
 *   accessible name and its handlers are exactly what they were and only the sentence is added
 *   (0094). Every surface that explains a control goes through here, so the composition is
 *   written once instead of at the thirty controls that offer it.
 * @instead The words themselves → src/lib/copy.ts, keyed by the list the control comes from. How
 *   long a rest opens it → TOOLTIP_DELAY_MS, declared where the one provider is mounted
 *   (src/ui/App.tsx). The primitive → src/ui/components/tooltip.tsx.
 */
import type { ReactElement } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/tooltip";

export function Says({ what, children }: { what: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{what}</TooltipContent>
    </Tooltip>
  );
}
