/**
 * @role Which generator a yard plays, as a menu: a list of alternatives with one of them chosen,
 *   which is what a menu is and what stops the yard's own row growing a button every time a
 *   generator is added (P70). Picking one sends the ordinary `deck.load` its caller builds.
 * @instead What the generators are → GEN_KINDS in src/lib/waveform.ts, the one list this renders.
 *   The length and the pitch that load travels with → src/ui/LoadField.tsx.
 */
import { useCallback } from "react";

import { GENERATOR_LABEL, yardLabel } from "@/lib/copy";
import { GEN_KINDS, type GenKind } from "@/lib/waveform";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu";
import { INSTANT_POPUP } from "@/ui/shell";

/** The items depend on nothing, so they are built once rather than on every render. */
const SOURCE_ITEMS = GEN_KINDS.map((kind) => (
  <DropdownMenuRadioItem key={kind} value={kind}>
    {kind}
  </DropdownMenuRadioItem>
));

export function SourcePicker({
  deck,
  current,
  onPick,
}: {
  deck: DeckId;
  /** The generator loaded, or null for nothing and for an imported blob — no entry is checked. */
  current: GenKind | null;
  onPick: (kind: GenKind) => void;
}) {
  const onValueChange = useCallback(
    (value: unknown) => {
      // The menu hands back its own item's value, so a kind that is not one of ours is a value
      // nothing rendered — refused rather than loaded, which is what makes the list the one list.
      const kind = GEN_KINDS.find((k) => k === value);
      if (kind === undefined) return;
      onPick(kind);
    },
    [onPick],
  );

  return (
    <DropdownMenu>
      {/* The trigger says which generator is loaded, so the row carries the one name a person
          needs rather than five buttons of which one is pressed (P70). */}
      <DropdownMenuTrigger
        render={
          <Button size="sm" variant="outline" aria-label={`${yardLabel(deck)} ${GENERATOR_LABEL}`}>
            {current ?? GENERATOR_LABEL}
          </Button>
        }
      />
      {/* Opens instantly, like every other popup whose entries are pressed rather than read:
          waiting out an enter and an exit animation is what costs the gate (0056). */}
      <DropdownMenuContent align="start" className={`w-40 ${INSTANT_POPUP}`}>
        <DropdownMenuRadioGroup value={current ?? ""} onValueChange={onValueChange}>
          {SOURCE_ITEMS}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
